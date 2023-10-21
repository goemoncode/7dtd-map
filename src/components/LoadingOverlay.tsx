import { Spinner } from 'react-bootstrap';
import { useAppSelector } from '../store';
import { selectIsLoading } from '../store/map';

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
