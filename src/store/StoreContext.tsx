import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { AppState } from '../types';
import { reducer, type Action } from './reducer';
import { loadState, saveState } from './persistence';

interface StoreValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const StoreCtx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined as unknown as AppState, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
