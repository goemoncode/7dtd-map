import { Col, Row } from 'react-bootstrap';
import { GameCoords } from '../../utils';
import { useMapElevation } from '../../hooks/useMaps';

interface Props {
  coords?: GameCoords | null;
}

export function CoordsAndElevation({ coords }: Props) {
  const dtm = useMapElevation();

  return (
    <Row className="g-0" style={{ width: '90%' }}>
      <Col xs={4}>
        <small className="fs-xxs me-3">E/W</small>
        <span>{coords?.x ?? ''}</span>
      </Col>
      <Col xs={4} className="num">
        <small className="fs-xxs me-3">N/S</small>
        <span>{coords?.z ?? ''}</span>
      </Col>
      <Col xs={4} className="num">
        <small className="fs-xxs me-3">Elev</small>
        <span>{dtm && coords ? dtm.getElevation(coords) : ''}</span>
      </Col>
    </Row>
  );
}
