import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { createAppStore, type StoreState } from './appStore';

const storage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
  setItemSync: (key: string, value: string) => {
    if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(key, value);
  }
};

export const puzzleStore = createAppStore(storage);

export function usePuzzleStore<T>(selector: (state: StoreState) => T): T {
  return useSyncExternalStore(
    puzzleStore.subscribe,
    () => selector(puzzleStore.getSnapshot()),
    () => selector(puzzleStore.getSnapshot())
  );
}
