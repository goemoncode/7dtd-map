import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AppState } from '.';

type State = {
  prefabNameFilterPresets: [string, string][];
  prefabTagsFilterPresets: [string, string][];
  blocksUsedFilterPresets: [string, string][];
};

const prefabNameFilterPresetsDefault = new Map([
  ['trader', '^trader'],
  ['store', 'store'],
  ['skyscraper', 'skyscraper'],
  ['downtown', '^downtown_'],
]);
const prefabTagsFilterPresetsDefault = new Map([['Hide RWG Parts', '^(?!.*(part|rwgonly|hideui))']]);
const blocksUsedFilterPresetsDefault = new Map([
  ['Super Corn', '(Grace|Super)Corn'],
  [
    'Steel with Wrench',
    '^(cntVendingMachine.*Broken|cntATMInsecure|utilityTransformer|chandelierLight|streetLight(d+|Broken(Destroyed)?)|cntGasPump)',
  ],
  ['Book Containers', '^cnt.*book(case|shelf|pile|store)(?!.*Empty$)'],
  ['Meats', '^sleeper(?!Zombie|Vulture).*Animal$'],
  ['Working Vending-Machine', '^cntVendingMachine.*(?<!RandomLootHelper|Broken|Trader|Empty)$'],
  ['Hidden Stash', '^cntLootCrateHero'],
]);

const initialState: State = {
  prefabNameFilterPresets: Array.from(prefabNameFilterPresetsDefault),
  prefabTagsFilterPresets: Array.from(prefabTagsFilterPresetsDefault),
  blocksUsedFilterPresets: Array.from(blocksUsedFilterPresetsDefault),
};

const module = createSlice({
  name: 'presets',
  initialState,
  reducers: {
    setPrefabNameFilterPresets(state: State, action: PayloadAction<typeof initialState.prefabNameFilterPresets>) {
      state.prefabNameFilterPresets = action.payload;
    },
    resetPrefabNameFilterPresetsToDefault(state: State) {
      state.prefabNameFilterPresets = Array.from(prefabNameFilterPresetsDefault);
    },
    setPrefabTagsFilterPresets(state: State, action: PayloadAction<typeof initialState.prefabTagsFilterPresets>) {
      state.prefabTagsFilterPresets = action.payload;
    },
    resetPrefabTagsFilterPresetsToDefault(state: State) {
      state.prefabTagsFilterPresets = Array.from(prefabTagsFilterPresetsDefault);
    },
    setBlocksUsedFilterPresets(state: State, action: PayloadAction<typeof initialState.blocksUsedFilterPresets>) {
      state.blocksUsedFilterPresets = action.payload;
    },
    resetBlocksUsedFilterPresetsToDefault(state: State) {
      state.blocksUsedFilterPresets = Array.from(blocksUsedFilterPresetsDefault);
    },
  },
});

export const {
  setPrefabNameFilterPresets,
  resetPrefabNameFilterPresetsToDefault,
  setPrefabTagsFilterPresets,
  resetPrefabTagsFilterPresetsToDefault,
  setBlocksUsedFilterPresets,
  resetBlocksUsedFilterPresetsToDefault,
} = module.actions;
export const selectPrefabNameFilterPresets = (state: AppState) => state.presets.prefabNameFilterPresets;
export const selectBlocksUsedFilterPresets = (state: AppState) => state.presets.blocksUsedFilterPresets;
export const selectPrefabTagsFilterPresets = (state: AppState) => state.presets.prefabTagsFilterPresets;
export default module;
