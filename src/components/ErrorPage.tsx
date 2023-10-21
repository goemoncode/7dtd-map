import { FallbackProps } from 'react-error-boundary';

export function ErrorPage({ error }: FallbackProps) {
  return (
    <div className="container-fluid">
      <h1>Error</h1>
      <p>Sorry, an unexpected error occurred.</p>
      <p className="text-danger">{error.toString()}</p>
    </div>
  );
}
