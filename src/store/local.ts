import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from '.';
import { Language, resolveLang } from '../utils/language';

type State = {
  theme?: 'light' | 'dark';
  language: Language;
  hasVisitedBefore?: boolean;
};

const initialState: State = {
  language: resolveLang(navigator.languages),
};

const module = createSlice({
  name: 'local',
  initialState,
  reducers: {
    setTheme(state: State, action: PayloadAction<typeof initialState.theme>) {
      state.theme = action.payload;
    },
    updateTheme(state: State) {
      if (state.theme === 'light' || window.matchMedia('(prefers-color-scheme: light)').matches) {
        document.documentElement.dataset.bsTheme = 'light';
      } else if (state.theme === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.dataset.bsTheme = 'dark';
      }
    },
    setLanguage(state: State, action: PayloadAction<typeof initialState.language>) {
      state.language = action.payload;
    },
    setHasVisitedBefore(state: State, action: PayloadAction<typeof initialState.hasVisitedBefore>) {
      state.hasVisitedBefore = action.payload;
    },
  },
});

export type AppTheme = typeof initialState.theme;
export const { setTheme, updateTheme, setLanguage, setHasVisitedBefore } = module.actions;
export const selectTheme = (state: AppState) => state.local.theme;
export const selectLanguage = (state: AppState) => state.local.language;
export const selectHasVisitedBefore = (state: AppState) => state.local.hasVisitedBefore;
export default module;
