"""
app/services/aptos_pipeline.py — Clinical Preprocessing & Data Ingestion Pipeline for APTOS 2019

Features:
  - Automated Bounding Box Retinal Cropping (removes useless black borders to zoom into the retina)
  - Circular Retinal Masking (standardizes aperture field of view)
  - Ben Graham's Illumination Normalization (local average subtraction to highlight microaneurysms and exudates)
  - Specialized Ophthalmology Data Augmentations (rotations, flips, color jitter, ImageNet normalization)
  - Robust APTOSDataset loader with class weight balancing for imbalanced medical distributions
"""

import os
import math
import numpy as np
import pandas as pd
from PIL import Image, ImageFilter, ImageOps

try:
    import torch
    from torch.utils.data import Dataset
    from torchvision import transforms
except ImportError:
    torch = None
    Dataset = object
    transforms = None


# ── 1. Retinal Bounding Box Crop (Removes Unilluminated Black Margins) ────
def crop_image_from_gray(img: Image.Image, tol: int = 7) -> Image.Image:
    """
    Crops away dark empty borders from fundus photographs to focus directly
    on the illuminated retinal region of interest (ROI).
    """
    arr = np.array(img)
    if arr.ndim == 2:
        mask = arr > tol
        if not mask.any():
            return img
        return Image.fromarray(arr[np.ix_(mask.any(1), mask.any(0))])
    elif arr.ndim == 3:
        gray = np.mean(arr, axis=-1)
        mask = gray > tol
        if not mask.any():
            return img
        rows = mask.any(axis=1)
        cols = mask.any(axis=0)
        cropped_arr = arr[np.ix_(rows, cols)]
        if cropped_arr.shape[0] == 0 or cropped_arr.shape[1] == 0:
            return img
        return Image.fromarray(cropped_arr)
    return img


# ── 2. Circular Retinal Masking ──────────────────────────────────────────
def circle_crop(img: Image.Image) -> Image.Image:
    """
    Masks the retinal photograph into a standardized circular aperture,
    smoothing out outer boundary artifacts.
    """
    w, h = img.size
    min_dim = min(w, h)
    
    # Center crop to square first
    left = (w - min_dim) // 2
    top = (h - min_dim) // 2
    img_square = img.crop((left, top, left + min_dim, top + min_dim))
    
    # Create circular mask
    mask = Image.new("L", (min_dim, min_dim), 0)
    from PIL import ImageDraw
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, min_dim, min_dim), fill=255)
    
    result = Image.new("RGB", (min_dim, min_dim), (0, 0, 0))
    result.paste(img_square, mask=mask)
    return result


# ── 3. Ben Graham's Illumination Normalization ───────────────────────────
def ben_graham_enhancement(img: Image.Image, sigma: float = 10.0) -> Image.Image:
    """
    Applies Ben Graham's color enhancement technique (local average subtraction).
    Formula: 4 * img - 4 * GaussianBlur(img, sigma) + 128
    Standardizes lighting variations across different hospital camera models
    and enhances the visual contrast of microaneurysms, hemorrhages, and exudates.
    """
    arr = np.array(img, dtype=np.float32)
    blurred = np.array(img.filter(ImageFilter.GaussianBlur(radius=sigma)), dtype=np.float32)
    enhanced = 4.0 * arr - 4.0 * blurred + 128.0
    enhanced = np.clip(enhanced, 0, 255).astype(np.uint8)
    return Image.fromarray(enhanced)


# ── 4. Full Clinical Preprocessing Function ──────────────────────────────
def preprocess_fundus_image(
    img: Image.Image,
    target_size: int = 224,
    use_ben_graham: bool = False,
    sigma: float = 10.0,
) -> Image.Image:
    """
    Full clinical preprocessing pipeline for raw fundus scans:
      1. Crop black unilluminated margins to maximize retinal area.
      2. Apply circular aperture masking.
      3. (Optional) Apply Ben Graham local contrast enhancement.
      4. Resize to target dimension using Lanczos high-quality filter.
    """
    # Step 1: Crop black margins
    img = crop_image_from_gray(img, tol=7)
    
    # Step 2: Circular mask
    img = circle_crop(img)
    
    # Step 3: Optional Ben Graham enhancement
    if use_ben_graham:
        img = ben_graham_enhancement(img, sigma=sigma)
        
    # Step 4: Resize
    img = img.resize((target_size, target_size), Image.Resampling.LANCZOS)
    return img


# ── 5. PyTorch Transform Builders ────────────────────────────────────────
def get_aptos_transforms(
    image_size: int = 224,
    is_training: bool = True,
):
    """
    Builds data augmentation transforms designed for retinal fundus imaging.
    Fundus photographs possess bilateral radial symmetry, allowing horizontal
    and vertical flipping without losing diagnostic validity.
    """
    if transforms is None:
        return None

    if is_training:
        return transforms.Compose([
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.RandomVerticalFlip(p=0.5),
            transforms.RandomRotation(degrees=30),
            transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.1),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])
    else:
        return transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])


# ── 6. Class Weight Balancing ────────────────────────────────────────────
def calculate_class_weights(df: pd.DataFrame, target_col: str = "diagnosis"):
    """
    Calculates balanced class weights to penalize underrepresented severe stages
    (Grade 3 & 4) more heavily in the Cross-Entropy loss function:
      weight_c = total_samples / (n_classes * count_c)
    """
    class_counts = df[target_col].value_counts().sort_index()
    total_samples = len(df)
    n_classes = len(class_counts)
    
    weights = [
        total_samples / (n_classes * max(1, class_counts.get(c, 1)))
        for c in range(n_classes)
    ]
    if torch is not None:
        return torch.tensor(weights, dtype=torch.float)
    return weights


# ── 7. PyTorch Dataset Loader for APTOS 2019 ──────────────────────────────
class APTOSDataset(Dataset):
    """
    Production PyTorch Dataset class for the APTOS 2019 Blindness Detection dataset.
    Loads real high-resolution fundus images, applies clinical ROI cropping,
    and returns normalized tensors with ground truth diagnosis labels (0-4).
    """
    def __init__(
        self,
        csv_file: str,
        images_dir: str,
        transform=None,
        target_size: int = 224,
        preprocess_crop: bool = True,
        use_ben_graham: bool = False,
    ):
        self.images_dir = images_dir
        self.transform = transform
        self.target_size = target_size
        self.preprocess_crop = preprocess_crop
        self.use_ben_graham = use_ben_graham

        # Read CSV file
        df_raw = pd.read_csv(csv_file)
        
        # Verify valid records and resolve image paths
        valid_records = []
        for _, row in df_raw.iterrows():
            id_code = str(row["id_code"]).strip()
            diagnosis = int(row["diagnosis"]) if "diagnosis" in row else -1
            
            # Check for <id_code>.png or <id_code>.jpg
            img_path = os.path.join(self.images_dir, f"{id_code}.png")
            if not os.path.exists(img_path):
                img_path = os.path.join(self.images_dir, f"{id_code}.jpg")
                if not os.path.exists(img_path):
                    # Check in nested subdirectory if present
                    nested_path = os.path.join(self.images_dir, os.path.basename(self.images_dir), f"{id_code}.png")
                    if os.path.exists(nested_path):
                        img_path = nested_path
                    else:
                        continue  # Skip missing file
            
            valid_records.append({
                "id_code": id_code,
                "image_path": img_path,
                "diagnosis": diagnosis,
            })
            
        self.df = pd.DataFrame(valid_records)
        print(f"📦 [APTOSDataset] Loaded {len(self.df)} valid scans from {os.path.basename(csv_file)}")

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img_path = row["image_path"]
        diagnosis = row["diagnosis"]
        
        try:
            with Image.open(img_path) as raw_img:
                img = raw_img.convert("RGB")
        except Exception as exc:
            # Fallback black image if corrupt
            img = Image.new("RGB", (self.target_size, self.target_size), (0, 0, 0))

        # Apply clinical ROI cropping & resizing
        if self.preprocess_crop:
            img = preprocess_fundus_image(
                img,
                target_size=self.target_size,
                use_ben_graham=self.use_ben_graham,
            )
        else:
            img = img.resize((self.target_size, self.target_size), Image.Resampling.LANCZOS)

        # Apply augmentations / tensor conversion
        if self.transform:
            img_tensor = self.transform(img)
        else:
            if transforms is not None:
                img_tensor = transforms.ToTensor()(img)
            else:
                img_tensor = np.array(img).transpose(2, 0, 1) / 255.0

        label_tensor = torch.tensor(diagnosis, dtype=torch.long) if torch is not None else diagnosis
        return img_tensor, label_tensor, row["id_code"]
