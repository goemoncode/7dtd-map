import BigNumber from 'bignumber.js';

type RangeValueKeys = keyof Omit<MapPreference, 'showSpawnpoints' | 'showPrefabMarker' | 'showPrefabArea'>;

type RangeValueProps = {
  min: number;
  max: number;
  step: number;
};

const alphaRangeDefault: RangeValueProps = {
  min: 0,
  max: 1,
  step: 0.1,
};

export const rangeInputSettings: { [key in RangeValueKeys]: RangeValueProps } = {
  scale: {
    min: 0.1,
    max: 2,
    step: 0.01,
  },
  brightness: {
    min: 0,
    max: 100,
    step: 1,
  },
  biomesAlpha: {
    ...alphaRangeDefault,
  },
  splat3Alpha: {
    ...alphaRangeDefault,
  },
  splat4Alpha: {
    ...alphaRangeDefault,
  },
  radAlpha: {
    ...alphaRangeDefault,
  },
  markerAlpha: {
    ...alphaRangeDefault,
  },
  markerScale: {
    min: 0.2,
    max: 1.8,
    step: 0.1,
  },
};

export interface MapPreference {
  scale: number;
  brightness: number;
  biomesAlpha: number;
  splat3Alpha: number;
  splat4Alpha: number;
  radAlpha: number;
  markerAlpha: number;
  markerScale: number;
  showSpawnpoints: boolean;
  showPrefabMarker: boolean;
  showPrefabArea: boolean;
}

export const defaultPreference: MapPreference = {
  scale: 0.2,
  brightness: 60,
  biomesAlpha: 1,
  splat3Alpha: 1,
  splat4Alpha: 0.7,
  radAlpha: 0.5,
  markerAlpha: 1,
  markerScale: 1,
  showSpawnpoints: true,
  showPrefabMarker: true,
  showPrefabArea: true,
};

export function stepUp(key: RangeValueKeys, value: number, delta: number) {
  return clamp(
    BigNumber(value)
      .plus(rangeInputSettings[key].step * delta)
      .toNumber(),
    rangeInputSettings[key].min,
    rangeInputSettings[key].max
  );
}

export function scaleUp(value: number, delta: number, scaleFactor = 1.5) {
  if (delta === 0) return value;
  const bigNum = delta < 0 ? BigNumber(value).dividedBy(scaleFactor) : BigNumber(value).multipliedBy(scaleFactor);
  return clamp(bigNum.decimalPlaces(2).toNumber(), rangeInputSettings.scale.min, rangeInputSettings.scale.max);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
