import { Col, Form, FormGroupProps, Row } from 'react-bootstrap';
import clsx from 'clsx';

interface Props extends Pick<FormGroupProps, 'className' | 'controlId'> {
  label: React.ReactNode;
}

export function FormGroupRow({ label, className, controlId, children }: React.PropsWithChildren<Props>) {
  return (
    <Form.Group as={Row} className={clsx('g-0', 'mb-3', 'align-items-center', className)} controlId={controlId}>
      <Form.Label column xs="4">
        {label}
      </Form.Label>
      <Col xs="8">{children}</Col>
    </Form.Group>
  );
}
