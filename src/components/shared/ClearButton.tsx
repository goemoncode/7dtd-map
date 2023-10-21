import { Button, ButtonProps } from 'react-bootstrap';
import { BsX } from 'react-icons/bs';
import clsx from 'clsx';

interface Props extends ButtonProps {}

export function ClearButton({ className, ...props }: Props) {
  return (
    <Button variant="outline-secondary" title="Clear" className={clsx(className, 'py-0 px-2')} {...props}>
      <BsX />
    </Button>
  );
}
