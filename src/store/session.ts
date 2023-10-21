import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AccordionEventKey } from 'react-bootstrap/esm/AccordionContext';
import type { AppState } from '.';

export const sidebarMenuTabs = ['map-selection', 'map-preference', 'prefabs'] as const;

type State = {
  activeTab: AccordionEventKey;
  howToUseVisible: boolean;
};

const initialState: State = {
  activeTab: sidebarMenuTabs[0],
  howToUseVisible: false,
};

const module = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setActiveTab(state: State, action: PayloadAction<typeof initialState.activeTab>) {
      state.activeTab = action.payload;
    },
    setHowToUseVisible(state: State, action: PayloadAction<typeof initialState.howToUseVisible>) {
      state.howToUseVisible = action.payload;
    },
  },
});

export const { setActiveTab, setHowToUseVisible } = module.actions;
export const selectActiveTab = (state: AppState) => state.session.activeTab;
export const selectHowToUseVisible = (state: AppState) => state.session.howToUseVisible;
export const blacklist = ['howToUseVisible'] as (keyof State)[];
export default module;
