import { Spinner } from 'react-bootstrap';
import { useAppSelector } from '../store/index.ts';
import { selectIsLoading } from '../store/map.ts';

export function LoadingOverlay() {
  const isLoading = useAppSelector(selectIsLoading);

  return (
    isLoading && (
      <div id="loading-overlay" data-bs-theme="dark">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    )
  );
}
