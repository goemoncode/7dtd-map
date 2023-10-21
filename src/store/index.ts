import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import storageSession from 'redux-persist/lib/storage/session';
import sessionModule, { blacklist as sessionModuleBlacklist } from './session';
import localModule from './local';
import mapModule, { blacklist as mapModuleBlacklist } from './map';
import prefabsModule from './prefabs';
import presetsModule from './presets';

const rootReducer = combineReducers({
  [sessionModule.name]: persistReducer(
    { key: sessionModule.name, storage: storageSession, blacklist: sessionModuleBlacklist },
    sessionModule.reducer
  ),
  [localModule.name]: persistReducer({ key: localModule.name, storage }, localModule.reducer),
  [mapModule.name]: persistReducer({ key: mapModule.name, storage, blacklist: mapModuleBlacklist }, mapModule.reducer),
  [prefabsModule.name]: prefabsModule.reducer,
  [presetsModule.name]: persistReducer({ key: presetsModule.name, storage }, presetsModule.reducer),
});

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    }),
});

export default store;
export const persistor = persistStore(store);
export type AppState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = useDispatch<AppDispatch>;
export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector;
