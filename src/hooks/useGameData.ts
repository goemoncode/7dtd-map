import { useQuery } from '@tanstack/react-query';

export interface GameDataStatus {
  path: string | null;
  ready: boolean;
  error?: string;
}

export function useGameData() {
  return useQuery({
    queryKey: ['game-data'],
    queryFn: async () => await requestGameData<GameDataStatus>('/api/game-data'),
    retry: false,
    staleTime: Infinity,
  });
}

export async function saveGameDataPath(path: string) {
  return await requestGameData<GameDataStatus>('/api/game-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
}

export async function requestGameData<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const body: unknown = await response.json();
      if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') {
        message = body.error;
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
    throw new Error(message);
  }
  return await response.json() as T;
}
