import { useSyncExternalStore } from "react";
import type { NotchApi, NotchConfig, NotchGeometry, NotchState } from "../../shared/types";
import { createMockApi } from "./mock";

declare global {
  interface Window {
    notch?: NotchApi;
  }
}

/** Electron では preload の API、ブラウザでは見た目確認用のモック */
export const isPreview = !window.notch;
export const api: NotchApi = window.notch ?? createMockApi();

let state: NotchState;
let geometry: NotchGeometry;
let config: NotchConfig;
let hover = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function initStore() {
  const init = await api.getInitial();
  state = init.state;
  geometry = init.geometry;
  config = init.config;
  api.onState((s) => {
    state = s;
    emit();
  });
  api.onHover((h) => {
    hover = h;
    emit();
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useNotchState = () => useSyncExternalStore(subscribe, () => state);
export const useHover = () => useSyncExternalStore(subscribe, () => hover);
export const getGeometry = () => geometry;
export const getConfig = () => config;
