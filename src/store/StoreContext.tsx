import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { AppState } from '../types';
import { reducer, type Action } from './reducer';
import { loadState, saveState } from './persistence';
import { emptyState } from './seed';
import { auth, onAuthStateChanged } from '../firebase';
import LoginScreen from '../components/LoginScreen';

interface StoreValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const StoreCtx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined as unknown as AppState, emptyState);
  const [uid, setUid] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevStateRef = useRef<AppState | undefined>(undefined);

  // Same email/password account on every device resolves to the same uid,
  // so every read/write below can be scoped to /users/{uid}/... regardless
  // of which device signed in.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user ? user.uid : null);
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  // Once we have a uid, hydrate the reducer from Firestore.
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    loadState(uid)
      .then((loaded) => {
        if (cancelled) return;
        prevStateRef.current = loaded;
        dispatch({ type: 'HYDRATE', payload: loaded });
        setReady(true);
      })
      .catch((err) => setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [uid]);

  // After hydration, every subsequent state change writes only what changed
  // back to Firestore (see saveState's diffing against prevStateRef).
  useEffect(() => {
    if (!ready || !uid) return;
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    saveState(uid, prev, state).catch((err) => setError(err.message));
  }, [state, ready, uid]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  if (error) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#b33' }}>
        Couldn't connect to Firebase: {error}
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}>
        Loading…
      </div>
    );
  }

  if (!uid) {
    return <LoginScreen />;
  }

  if (!ready) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)' }}>
        Loading…
      </div>
    );
  }

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
