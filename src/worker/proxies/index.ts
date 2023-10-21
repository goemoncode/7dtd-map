export * from './MapRendererProxy';
export * from './PrefabsFilterProxy';
export * from './MapStatsUpdaterProxy';

export function lazy<T>(Class: new () => T) {
  class Lazy {
    private _value: T | null = null;
    get value(): T {
      if (!this._value) this._value = new Class();
      return this._value;
    }
  }
  return new Lazy();
}
