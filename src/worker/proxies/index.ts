export * from './MapRendererProxy.ts';
export * from './PrefabsFilterProxy.ts';
export * from './MapStatsUpdaterProxy.ts';

export function lazy<T>(factory: () => T) {
  class Lazy {
    private _value: T | null = null;
    get value(): T {
      if (!this._value) this._value = factory();
      return this._value;
    }
  }
  return new Lazy();
}
