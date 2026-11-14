/**
 * context/AppContext.jsx
 *
 * Global application state using React Context + useReducer.
 *
 * Why useReducer over useState?
 *   Multiple related state pieces (selectedPatient, patients list, notifications)
 *   that change together are easier to manage with a reducer's single dispatch
 *   rather than multiple useState setters that must be called in sequence.
 *
 * What lives here:
 *   - selectedPatient: the currently active patient (used across both views)
 *   - patients: the full patient list (fetched once, shared everywhere)
 *   - notification: global toast/alert state
 *
 * What does NOT live here (kept local to components):
 *   - Form input values (local to BiometricForm)
 *   - File upload state (local to ScanUpload)
 *   - Chart zoom state (local to ProgressionChart)
 */

import React, { createContext, useContext, useReducer, useCallback } from 'react';

// ── Initial State ────────────────────────────────────────────
const initialState = {
  selectedPatient: null,  // { _id, fullName, diabetesType, ... }
  patients: [],           // array of Patient documents
  notification: null,     // { type: 'success'|'error'|'warning'|'info', message: string }
  isLoading: false,
};

// ── Action Types ─────────────────────────────────────────────
const ACTIONS = {
  SET_PATIENTS:         'SET_PATIENTS',
  SELECT_PATIENT:       'SELECT_PATIENT',
  SET_NOTIFICATION:     'SET_NOTIFICATION',
  CLEAR_NOTIFICATION:   'CLEAR_NOTIFICATION',
  SET_LOADING:          'SET_LOADING',
};

// ── Reducer ──────────────────────────────────────────────────
function appReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_PATIENTS:
      return { ...state, patients: action.payload };

    case ACTIONS.SELECT_PATIENT:
      return { ...state, selectedPatient: action.payload };

    case ACTIONS.SET_NOTIFICATION:
      return { ...state, notification: action.payload };

    case ACTIONS.CLEAR_NOTIFICATION:
      return { ...state, notification: null };

    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload };

    default:
      return state;
  }
}

// ── Context Creation ─────────────────────────────────────────
const AppContext = createContext(null);

// ── Provider Component ───────────────────────────────────────
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  /**
   * Show a notification for 4 seconds then auto-clear.
   * type: 'success' | 'error' | 'warning' | 'info'
   */
  const notify = useCallback((type, message) => {
    dispatch({ type: ACTIONS.SET_NOTIFICATION, payload: { type, message } });
    setTimeout(() => {
      dispatch({ type: ACTIONS.CLEAR_NOTIFICATION });
    }, 4000);
  }, []);

  const setPatients = useCallback((patients) => {
    dispatch({ type: ACTIONS.SET_PATIENTS, payload: patients });
  }, []);

  const selectPatient = useCallback((patient) => {
    dispatch({ type: ACTIONS.SELECT_PATIENT, payload: patient });
  }, []);

  const setLoading = useCallback((bool) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: bool });
  }, []);

  const value = {
    ...state,
    notify,
    setPatients,
    selectPatient,
    setLoading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ── Custom Hook ──────────────────────────────────────────────
// Components consume context through this hook, never directly.
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
