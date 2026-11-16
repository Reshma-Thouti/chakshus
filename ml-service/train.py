"""
train.py — Diabetic Retinopathy (DR) Deep Learning Training Pipeline

Trains a convolutional neural network (ResNet-18 Transfer Learning)
on retinal fundus imagery across the 5 standard ICDR severity grades:
  0: No DR
  1: Mild NPDR
  2: Moderate NPDR
  3: Severe NPDR
  4: Proliferative DR

Features:
  - ResNet-18 backbone pre-trained on ImageNet
  - Custom 5-class classification head with dropout regularization
  - Full data augmentation (horizontal/vertical flips, rotations, color jitter)
  - CrossEntropyLoss + AdamW optimizer + StepLR scheduler
  - Exports trained PyTorch weights to models/dr_model.pth
  - Generates training loss & accuracy visualization curves (models/training_metrics.png)
  - Self-contained: includes a procedural fundus pattern generator so it can train
    immediately even before a large multi-gigabyte dataset is downloaded.
"""

import os
import json
import time
import math
import random
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for server environments
import matplotlib.pyplot as plt
from PIL import Image, ImageDraw

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms
from sklearn.metrics import accuracy_score, cohen_kappa_score

# ── Reproducibility ──────────────────────────────────────────
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

DR_CLASSES = [
    "No DR",
    "Mild NPDR",
    "Moderate NPDR",
    "Severe NPDR",
    "Proliferative DR",
]


# ── Procedural Retinal Image Generator ────────────────────────
def create_synthetic_fundus_sample(grade: int, size: int = 224) -> Image.Image:
    """
    Generates a realistic synthetic retinal fundus disc containing characteristic
    hallmarks of Diabetic Retinopathy for training demonstration:
      - Dark orange/red retinal background disc
      - Bright optic disc and darker macula
      - Grade 0: Clean vascular arches
      - Grade 1: Microaneurysms (tiny isolated red dots)
      - Grade 2: Hard exudates (yellow-white lipid spots) + hemorrhages
      - Grade 3: Multiple blot hemorrhages and cotton-wool patches
      - Grade 4: Extensive neovascularization and vitreous bleeding
    """
    img = Image.new("RGB", (size, size), color=(10, 10, 10))
    draw = ImageDraw.Draw(img)

    center = size // 2
    radius = int(size * 0.44)

    # 1. Base orange/red retinal disc
    base_color = (random.randint(180, 220), random.randint(70, 100), random.randint(20, 40))
    draw.ellipse(
        [center - radius, center - radius, center + radius, center + radius],
        fill=base_color,
    )

    # 2. Optic Disc (yellowish-cream circle on nasal side)
    od_x = center - int(radius * 0.45)
    od_y = center
    od_r = int(radius * 0.16)
    draw.ellipse([od_x - od_r, od_y - od_r, od_x + od_r, od_y + od_r], fill=(245, 220, 140))

    # 3. Retinal Blood Vessels (branching arcs originating from optic disc)
    vessel_color = (130, 25, 20)
    for _ in range(6):
        x1, y1 = od_x, od_y
        x2 = center + random.randint(-radius // 2, radius // 2)
        y2 = center + random.randint(-radius // 2, radius // 2)
        draw.line([(x1, y1), (x2, y2)], fill=vessel_color, width=random.randint(2, 4))

    # 4. Pathological Lesions according to ICDR Grade
    if grade >= 1:
        # Microaneurysms (small red dots)
        num_ma = random.randint(3, 8) if grade == 1 else random.randint(10, 25)
        for _ in range(num_ma):
            mx = center + random.randint(-int(radius * 0.6), int(radius * 0.6))
            my = center + random.randint(-int(radius * 0.6), int(radius * 0.6))
            draw.ellipse([mx - 2, my - 2, mx + 2, my + 2], fill=(100, 0, 0))

    if grade >= 2:
        # Hard Exudates (bright yellow lipid deposits)
        num_ex = random.randint(4, 12) if grade == 2 else random.randint(15, 30)
        for _ in range(num_ex):
            ex = center + random.randint(-int(radius * 0.5), int(radius * 0.5))
            ey = center + random.randint(-int(radius * 0.5), int(radius * 0.5))
            draw.ellipse([ex - 3, ey - 3, ex + 3, ey + 3], fill=(255, 245, 120))

    if grade >= 3:
        # Blot Hemorrhages (larger irregular dark red patches)
        num_hem = random.randint(5, 14)
        for _ in range(num_hem):
            hx = center + random.randint(-int(radius * 0.7), int(radius * 0.7))
            hy = center + random.randint(-int(radius * 0.7), int(radius * 0.7))
            hr = random.randint(4, 8)
            draw.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=(80, 0, 0))

    if grade == 4:
        # Neovascularization (tangled fine new vessels + vitreous hemorrhage)
        for _ in range(8):
            nx1 = center + random.randint(-radius // 3, radius // 3)
            ny1 = center + random.randint(-radius // 3, radius // 3)
            nx2 = nx1 + random.randint(-20, 20)
            ny2 = ny1 + random.randint(-20, 20)
            draw.line([(nx1, ny1), (nx2, ny2)], fill=(160, 10, 10), width=1)
        # Large preretinal hemorrhage
        px, py = center + 10, center - 10
        draw.ellipse([px - 14, py - 14, px + 14, py + 14], fill=(70, 0, 0))

    return img


# ── PyTorch Dataset Class ─────────────────────────────────────
class DiabeticRetinopathyDataset(Dataset):
    """
    Dataset loader for Diabetic Retinopathy classification.
    Generates structured training & validation samples with data augmentation.
    """
    def __init__(self, samples_per_class: int = 50, transform=None):
        self.transform = transform
        self.data = []
        for grade in range(5):
            for _ in range(samples_per_class):
                img = create_synthetic_fundus_sample(grade=grade, size=224)
                self.data.append((img, grade))
        # Shuffle
        random.shuffle(self.data)

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        img, label = self.data[idx]
        if self.transform:
            img = self.transform(img)
        return img, torch.tensor(label, dtype=torch.long)


# ── Model Definition: ResNet-18 Transfer Learning ────────────
def build_dr_model(num_classes: int = 5, pretrained: bool = True) -> nn.Module:
    """
    Constructs a ResNet-18 model with custom classification head for DR grading.
    """
    weights = models.ResNet18_Weights.DEFAULT if pretrained else None
    model = models.resnet18(weights=weights)

    # Freeze early convolutional layers for fast feature reuse
    for param in list(model.parameters())[:-12]:
        param.requires_grad = False

    # Replace 1000-class ImageNet head with 5-class DR classifier
    num_ftrs = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(p=0.35),
        nn.Linear(num_ftrs, 128),
        nn.ReLU(),
        nn.Dropout(p=0.2),
        nn.Linear(128, num_classes),
    )
    return model


# ── Main Training Loop ────────────────────────────────────────
def train_model(
    epochs: int = 5,
    batch_size: int = 16,
    learning_rate: float = 1e-3,
    save_path: str = "models/dr_model.pth",
):
    print("=" * 65)
    print("🩺 DIABETIC RETINOPATHY DEEP LEARNING TRAINING PIPELINE")
    print("=" * 65)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"🚀 Execution Device : {device}")
    print(f"📦 Model Backbone   : ResNet-18 (Transfer Learning)")
    print(f"🎯 Target Classes   : 5 (Grades 0 to 4)")
    print(f"🔄 Epochs Planned   : {epochs}")
    print("─" * 65)

    # 1. Transforms & Data Augmentation
    train_transforms = transforms.Compose([
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomRotation(degrees=20),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    val_transforms = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    # 2. Datasets & Loaders
    print("📂 Preparing training and validation datasets...")
    train_dataset = DiabeticRetinopathyDataset(samples_per_class=60, transform=train_transforms)
    val_dataset = DiabeticRetinopathyDataset(samples_per_class=20, transform=val_transforms)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    print(f"   Training samples   : {len(train_dataset)} ({len(train_dataset)//5} per class)")
    print(f"   Validation samples : {len(val_dataset)} ({len(val_dataset)//5} per class)")

    # 3. Model, Loss, Optimizer, Scheduler
    model = build_dr_model(num_classes=5, pretrained=True).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=learning_rate, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=2, gamma=0.5)

    # Tracking metrics
    history = {
        "train_loss": [],
        "val_loss": [],
        "train_acc": [],
        "val_acc": [],
        "val_kappa": [],
    }

    start_time = time.time()
    best_val_acc = 0.0

    # 4. Epoch Loop
    for epoch in range(1, epochs + 1):
        # ── Training Phase ──
        model.train()
        train_loss = 0.0
        train_preds, train_targets = [], []

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()

            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * images.size(0)
            preds = torch.argmax(outputs, dim=1).cpu().numpy()
            train_preds.extend(preds)
            train_targets.extend(labels.cpu().numpy())

        scheduler.step()
        epoch_train_loss = train_loss / len(train_dataset)
        epoch_train_acc = accuracy_score(train_targets, train_preds)

        # ── Validation Phase ──
        model.eval()
        val_loss = 0.0
        val_preds, val_targets = [], []

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)

                val_loss += loss.item() * images.size(0)
                preds = torch.argmax(outputs, dim=1).cpu().numpy()
                val_preds.extend(preds)
                val_targets.extend(labels.cpu().numpy())

        epoch_val_loss = val_loss / len(val_dataset)
        epoch_val_acc = accuracy_score(val_targets, val_preds)
        epoch_kappa = cohen_kappa_score(val_targets, val_preds, weights="quadratic")

        history["train_loss"].append(epoch_train_loss)
        history["val_loss"].append(epoch_val_loss)
        history["train_acc"].append(epoch_train_acc)
        history["val_acc"].append(epoch_val_acc)
        history["val_kappa"].append(epoch_kappa)

        print(
            f"Epoch [{epoch:02d}/{epochs:02d}] | "
            f"Train Loss: {epoch_train_loss:.4f} | Train Acc: {epoch_train_acc*100:.1f}% | "
            f"Val Loss: {epoch_val_loss:.4f} | Val Acc: {epoch_val_acc*100:.1f}% | "
            f"Kappa: {epoch_kappa:.3f}"
        )

        if epoch_val_acc > best_val_acc:
            best_val_acc = epoch_val_acc
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            torch.save({
                "model_state_dict": model.state_dict(),
                "backbone": "resnet18",
                "num_classes": 5,
                "best_val_acc": best_val_acc,
                "classes": DR_CLASSES,
                "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            }, save_path)

    elapsed = time.time() - start_time
    print("─" * 65)
    print(f"✅ Training completed in {elapsed:.1f} seconds!")
    print(f"💾 Best Model Saved to: {save_path} (Val Accuracy: {best_val_acc*100:.1f}%)")

    # 5. Export Performance Visualizations
    plot_path = os.path.join(os.path.dirname(save_path), "training_metrics.png")
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4.5))

    # Loss subplot
    ax1.plot(range(1, epochs + 1), history["train_loss"], "o-", label="Train Loss", color="#0F4C81", lw=2)
    ax1.plot(range(1, epochs + 1), history["val_loss"], "s--", label="Val Loss", color="#E53E3E", lw=2)
    ax1.set_title("Cross-Entropy Loss Curve", fontsize=12, fontweight="bold")
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Loss")
    ax1.grid(True, linestyle="--", alpha=0.5)
    ax1.legend()

    # Accuracy & Kappa subplot
    ax2.plot(range(1, epochs + 1), [a * 100 for a in history["train_acc"]], "o-", label="Train Acc (%)", color="#00A878", lw=2)
    ax2.plot(range(1, epochs + 1), [a * 100 for a in history["val_acc"]], "s--", label="Val Acc (%)", color="#3182CE", lw=2)
    ax2.set_title("Validation Accuracy & Convergence", fontsize=12, fontweight="bold")
    ax2.set_xlabel("Epoch")
    ax2.set_ylabel("Accuracy (%)")
    ax2.grid(True, linestyle="--", alpha=0.5)
    ax2.legend()

    plt.tight_layout()
    plt.savefig(plot_path, dpi=200)
    plt.close()
    print(f"📊 Training curves plot exported to: {plot_path}")

    # 6. Save metadata JSON
    meta_path = os.path.join(os.path.dirname(save_path), "model_metadata.json")
    with open(meta_path, "w") as f:
        json.dump({
            "model_name": "Diabetic Retinopathy ResNet-18",
            "weights_file": os.path.basename(save_path),
            "final_val_acc": round(best_val_acc, 4),
            "epochs": epochs,
            "classes": DR_CLASSES,
            "framework": f"PyTorch {torch.__version__}",
            "device": str(device),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        }, f, indent=2)
    print(f"📝 Metadata JSON saved to: {meta_path}")
    print("=" * 65)


if __name__ == "__main__":
    train_model(epochs=5, batch_size=16, learning_rate=1e-3)
