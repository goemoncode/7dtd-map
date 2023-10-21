import { useCallback } from 'react';
import { useAppDispatch } from '../store';
import { setIsLoading } from '../store/map';
import { waitAnimationFrame } from '../utils';

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
