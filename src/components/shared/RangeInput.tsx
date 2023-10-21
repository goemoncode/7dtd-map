import { Col, Form, Row } from 'react-bootstrap';
import { FormRangeProps } from 'react-bootstrap/esm/FormRange';

interface Props extends FormRangeProps {
  value?: number | undefined;
  format?: (value: number) => React.ReactNode;
}

export function RangeInput({ format, ...props }: Props) {
  return (
    <Row className="g-0">
      <Col xs={9}>
        <Form.Range {...props} />
      </Col>
      <Col xs={3}>
        <output className="d-block text-center">{format && props.value ? format(props.value) : props.value}</output>
      </Col>
    </Row>
  );
}
