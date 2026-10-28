import { useCallback } from 'react';
import { useAppDispatch } from '../store/index.ts';
import { setIsLoading } from '../store/map.ts';
import { waitAnimationFrame } from '../utils/index.ts';

export function useLoading() {
  const dispatch = useAppDispatch();

  return useCallback(
    async (callback: () => Promise<void>) => {
      dispatch(setIsLoading(true));
      try {
        await waitAnimationFrame();
        await callback();
      } finally {
        dispatch(setIsLoading(false));
      }
    },
    [dispatch]
  );
}
