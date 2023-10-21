import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from '.';
import { MapPreference, defaultPreference } from '../utils/MapPreference';
import { TerrainViewStatus } from '../worker/lib/TerrainRenderer';

type State = {
  mapId: number;
  mapPreference: MapPreference;
  isLoading?: boolean;
  terrainViewStatus?: TerrainViewStatus;
  isTerrainViewOpen?: boolean;
  hudTipsVisible?: boolean;
};

const initialState: State = {
  mapId: 0,
  mapPreference: { ...defaultPreference },
  hudTipsVisible: true,
};

const module = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setMapId(state: State, action: PayloadAction<typeof initialState.mapId>) {
      state.mapId = action.payload;
    },
    setMapPreference(state: State, action: PayloadAction<typeof initialState.mapPreference>) {
      state.mapPreference = action.payload;
    },
    setMapPreferenceToDefault(state: State) {
      state.mapPreference = { ...defaultPreference };
    },
    setMapScale(state: State, action: PayloadAction<typeof initialState.mapPreference.scale>) {
      state.mapPreference = { ...state.mapPreference, scale: action.payload };
    },
    setIsLoading(state: State, action: PayloadAction<typeof initialState.isLoading>) {
      state.isLoading = action.payload;
      if (state.isLoading) {
        document.body.dataset.mapState = 'loading';
      } else {
        delete document.body.dataset.mapState;
      }
    },
    setTerrainViewStatus(state: State, action: PayloadAction<typeof initialState.terrainViewStatus>) {
      state.terrainViewStatus = action.payload;
    },
    setIsTerrainViewOpen(state: State, action: PayloadAction<typeof initialState.isTerrainViewOpen>) {
      state.isTerrainViewOpen = action.payload;
      if (state.isTerrainViewOpen) {
        document.body.dataset.viewMode = 'terrain';
      } else {
        delete document.body.dataset.viewMode;
      }
    },
    setHudTipsVisible(state: State, action: PayloadAction<typeof initialState.hudTipsVisible>) {
      state.hudTipsVisible = action.payload;
    },
  },
});

export const {
  setIsLoading,
  setMapId,
  setMapPreference,
  setMapPreferenceToDefault,
  setMapScale,
  setTerrainViewStatus,
  setIsTerrainViewOpen,
  setHudTipsVisible,
} = module.actions;
export const selectMapId = (state: AppState) => state.map.mapId;
export const selectMapPreference = (state: AppState) => state.map.mapPreference;
export const selectMapScale = (state: AppState) => state.map.mapPreference.scale;
export const selectIsLoading = (state: AppState) => state.map.isLoading;
export const selectTerrainViewStatus = (state: AppState) => state.map.terrainViewStatus;
export const selectIsTerrainViewOpen = (state: AppState) => state.map.isTerrainViewOpen;
export const selectHudTipsVisible = (state: AppState) => state.map.hudTipsVisible;
export const blacklist = ['isLoading', 'terrainViewStatus', 'isTerrainViewOpen'] as (keyof State)[];
export default module;
