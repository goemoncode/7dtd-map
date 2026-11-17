import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import store, { persistor } from './store/index.ts';
import { DATABASE_NAME, DATABASE_SCHEMA_VERSION, db } from './store/db/index.ts';
import App from './App.tsx';
import './index.scss';

// TanStack Query v5 に対応した QueryClient インスタンスの生成
const queryClient = new QueryClient();

const rootElement = document.getElementById('root')!;
window.addEventListener('load', () => {
  const desktopReady = (window as Window & { desktopReady?: () => Promise<unknown> }).desktopReady;
  if (desktopReady) void desktopReady();
});

void startApp();

async function startApp() {
  try {
    if (await prepareDebugDatabase()) {
      ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
          <QueryClientProvider client={queryClient}>
            <Provider store={store}>
              <PersistGate loading={null} persistor={persistor}>
                <App />
              </PersistGate>
            </Provider>
          </QueryClientProvider>
        </React.StrictMode>,
      );
    } else {
      rootElement.textContent = 'Database rebuild cancelled. Close the app and clear the incompatible database to continue.';
    }
  } catch (error) {
    console.error('Could not prepare the debug database.', error);
    rootElement.textContent = `Could not prepare the debug database: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function prepareDebugDatabase() {
  if (import.meta.env.MODE !== 'desktop-debug' || typeof indexedDB.databases !== 'function') return true;
  const database = (await indexedDB.databases()).find((entry) => entry.name === DATABASE_NAME);
  const expectedIndexedDbVersion = DATABASE_SCHEMA_VERSION * 10;
  if (!database?.version || database.version <= expectedIndexedDbVersion) return true;
  if (
    !window.confirm(
      `The saved debug database uses a newer schema version (${
        database.version / 10
      }) than this build (${DATABASE_SCHEMA_VERSION}). Delete it and continue? All saved maps will be lost.`,
    )
  ) {
    return false;
  }
  await db.delete();
  await db.open();
  return true;
}
