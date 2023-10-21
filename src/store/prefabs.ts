import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from '.';
import { GameCoords } from '../utils';
import { MatchedPrefab, PrefabsFilterResult } from '../worker/lib/PrefabsFilter';

export const prefabOffcanvasTabs = ['properties', 'blocks-used'] as const;

type State = {
  cursorCoords: GameCoords | null;
  markerCoords: GameCoords | null;
  difficultyFilter: number[];
  prefabNameFilter: string;
  prefabTagsFilter: string;
  blocksUsedFilter: string;
  filterStatus: string;
  matched: MatchedPrefab[];
  prefabs: MatchedPrefab[];
  remains: MatchedPrefab[];
  activePrefab: MatchedPrefab | null;
  activeTab: string;
};

const SLICE_NUM = 20;

const initialState: State = {
  cursorCoords: null,
  markerCoords: null,
  difficultyFilter: [],
  prefabNameFilter: '',
  prefabTagsFilter: '',
  blocksUsedFilter: '',
  filterStatus: '',
  matched: [],
  prefabs: [],
  remains: [],
  activePrefab: null,
  activeTab: prefabOffcanvasTabs[0],
};

const module = createSlice({
  name: 'prefabs',
  initialState,
  reducers: {
    setCursorCoords(state: State, action: PayloadAction<typeof initialState.cursorCoords>) {
      state.cursorCoords = action.payload;
    },
    setMarkerCoords(state: State, action: PayloadAction<typeof initialState.markerCoords>) {
      state.markerCoords = action.payload;
    },
    setDifficultyFilter(state: State, action: PayloadAction<typeof initialState.difficultyFilter>) {
      // state.difficultyFilter = action.payload;
      state.difficultyFilter = Array.from(new Set(action.payload).values());
    },
    setPrefabNameFilter(state: State, action: PayloadAction<typeof initialState.prefabNameFilter>) {
      state.prefabNameFilter = action.payload;
    },
    setPrefabTagsFilter(state: State, action: PayloadAction<typeof initialState.prefabTagsFilter>) {
      state.prefabTagsFilter = action.payload;
    },
    setBlocksUsedFilter(state: State, action: PayloadAction<typeof initialState.blocksUsedFilter>) {
      state.blocksUsedFilter = action.payload;
    },
    setFilterResult(state: State, action: PayloadAction<PrefabsFilterResult>) {
      const { status = '', markerCoords = null, prefabs = [] } = action.payload ?? {};
      state.filterStatus = status;
      state.markerCoords = markerCoords;
      state.matched = prefabs;
      state.prefabs = prefabs.slice(0, SLICE_NUM);
      state.remains = prefabs.slice(SLICE_NUM);
      state.activePrefab = null;
    },
    showMorePrefabs(state: State) {
      const { prefabs, remains } = state;
      if (remains.length > 0) {
        state.prefabs = [...prefabs, ...remains.slice(0, SLICE_NUM)];
        state.remains = remains.slice(SLICE_NUM);
      }
    },
    setActivePrefab(state: State, action: PayloadAction<typeof initialState.activePrefab>) {
      state.activePrefab = action.payload;
    },
    setActiveTab(state: State, action: PayloadAction<string | null>) {
      state.activeTab = action.payload ?? initialState.activeTab;
    },
    reset() {
      return { ...initialState };
    },
  },
});

export const {
  setCursorCoords,
  setMarkerCoords,
  setDifficultyFilter,
  setPrefabNameFilter,
  setBlocksUsedFilter,
  setPrefabTagsFilter,
  setFilterResult,
  showMorePrefabs,
  setActivePrefab,
  setActiveTab,
  reset,
} = module.actions;
export const selectCursorCoords = (state: AppState) => state.prefabs.cursorCoords;
export const selectMarkerCoords = (state: AppState) => state.prefabs.markerCoords;
export const selectDifficultyFilter = (state: AppState) => state.prefabs.difficultyFilter;
export const selectPrefabNameFilter = (state: AppState) => state.prefabs.prefabNameFilter;
export const selectPrefabTagsFilter = (state: AppState) => state.prefabs.prefabTagsFilter;
export const selectBlocksUsedFilter = (state: AppState) => state.prefabs.blocksUsedFilter;
export const selectFilterStatus = (state: AppState) => state.prefabs.filterStatus;
export const selectMatched = (state: AppState) => state.prefabs.matched;
export const selectPrefabs = (state: AppState) => state.prefabs.prefabs;
export const selectHasMorePrefabs = (state: AppState) => state.prefabs.remains.length > 0;
export const selectActivePrefab = (state: AppState) => state.prefabs.activePrefab;
export const selectActiveTab = (state: AppState) => state.prefabs.activeTab;
export default module;
