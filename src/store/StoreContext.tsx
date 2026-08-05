import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { AppState } from '../types';
import { reducer, type Action } from './reducer';
import { loadState, saveState } from './persistence';
import { emptyState } from './seed';
import { auth, onAuthStateChanged, signInAnonymously } from '../firebase';

interface StoreValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const StoreCtx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined as unknown as AppState, emptyState);
  const [uid, setUid] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevStateRef = useRef<AppState | undefined>(undefined);

  // Sign in anonymously (or pick up the existing session) so every read/write
  // below can be scoped to /users/{uid}/... without a login screen.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
      } else {
        signInAnonymously(auth).catch((err) => setError(err.message));
      }
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
