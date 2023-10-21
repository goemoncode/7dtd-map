import { Spinner, SpinnerProps } from 'react-bootstrap';
import clsx from 'clsx';

interface Props extends SpinnerProps {
  fullscreen?: boolean;
  children?: string;
}

export function LoadingSpinner({ fullscreen, animation = 'grow', className, children = 'Loading...', ...props }: Props) {
  return (
    <div className={clsx(className, 'overlay d-grid place-items-center', { 'position-fixed': fullscreen })} {...props}>
      <Spinner animation={animation} role="status">
        <span className="visually-hidden">{children}</span>
      </Spinner>
    </div>
  );
}
