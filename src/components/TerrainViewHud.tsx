import { Form } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../store';
import { selectHudTipsVisible, setHudTipsVisible } from '../store/map';
import { BsArrowsMove, BsBoxArrowRight, BsZoomIn } from 'react-icons/bs';
import AngleSvg from '../assets/angle.svg?react';

export function TerrainViewHud() {
  const dispatch = useAppDispatch();
  const tipsVisible = useAppSelector(selectHudTipsVisible);

  return (
    <div id="terrain-view-hud">
      <Form.Check
        type="switch"
        id="terrain-view-hud-check"
        label="Camera Control Tips"
        checked={tipsVisible}
        onChange={(event) => dispatch(setHudTipsVisible(event.currentTarget.checked))}
      />
      {tipsVisible && (
        <dl className="mt-3">
          <dt>
            <BsArrowsMove className="me-3" />
            Move
          </dt>
          <dd className="fst-italic">
            Press <code>W/A/S/D</code> Key or Grab with Mouse Left Button
          </dd>
          <dt>
            <AngleSvg className="me-3" />
            Tilt
          </dt>
          <dd className="fst-italic">
            Press <code>R/F</code> Key or Grab with Mouse Wheel Button
          </dd>
          <dt>
            <BsZoomIn className="me-3" />
            Zoom
          </dt>
          <dd className="fst-italic">Rotate Mouse Wheel</dd>
          <dt>
            <BsBoxArrowRight className="me-3" />
            Exit
          </dt>
          <dd className="fst-italic">
            Press <code>Esc</code> Key
          </dd>
        </dl>
      )}
    </div>
  );
}
