import { shallowEqual } from 'react-redux';
import { Button, Form } from 'react-bootstrap';
import { BsArrowCounterclockwise } from 'react-icons/bs';
import { useAppDispatch, useAppSelector } from '../store';
import { selectMapPreference, setMapPreference, setMapPreferenceToDefault } from '../store/map';
import { rangeInputSettings } from '../utils/MapPreference';
import { FormGroupRow } from './shared/FormGroupRow';
import { RangeInput } from './shared/RangeInput';

interface Props {
  disabled?: boolean;
}

export function MapPreferenceControl({ disabled }: Props) {
  const dispatch = useAppDispatch();
  const mapPreference = useAppSelector(selectMapPreference, shallowEqual);

  return (
    <>
      <FormGroupRow label="Scale" controlId="mapScale">
        <RangeInput
          {...rangeInputSettings.scale}
          value={mapPreference.scale}
          onInput={(event) => dispatch(setMapPreference({ ...mapPreference, scale: event.currentTarget.valueAsNumber }))}
          disabled={disabled}
        />
      </FormGroupRow>
      <FormGroupRow label="Brightness" controlId="brightness">
        <RangeInput
          {...rangeInputSettings.brightness}
          value={mapPreference.brightness}
          format={(value) => value + '%'}
          onInput={(event) => dispatch(setMapPreference({ ...mapPreference, brightness: event.currentTarget.valueAsNumber }))}
          disabled={disabled}
        />
      </FormGroupRow>
      <FormGroupRow label="Biomes Alpha" controlId="biomesAlpha">
        <RangeInput
          {...rangeInputSettings.biomesAlpha}
          value={mapPreference.biomesAlpha}
          onInput={(event) => dispatch(setMapPreference({ ...mapPreference, biomesAlpha: event.currentTarget.valueAsNumber }))}
          disabled={disabled}
        />
      </FormGroupRow>
      <FormGroupRow label="Splat3 Alpha" controlId="splat3Alpha">
        <RangeInput
          {...rangeInputSettings.splat3Alpha}
          value={mapPreference.splat3Alpha}
          onInput={(event) => dispatch(setMapPreference({ ...mapPreference, splat3Alpha: event.currentTarget.valueAsNumber }))}
          disabled={disabled}
        />
      </FormGroupRow>
      <FormGroupRow label="Splat4 Alpha" controlId="splat4Alpha">
        <RangeInput
          {...rangeInputSettings.splat4Alpha}
          value={mapPreference.splat4Alpha}
          onInput={(event) => dispatch(setMapPreference({ ...mapPreference, splat4Alpha: event.currentTarget.valueAsNumber }))}
          disabled={disabled}
        />
      </FormGroupRow>
      <FormGroupRow label="Radiation Alpha" controlId="radAlpha">
        <RangeInput
          {...rangeInputSettings.radAlpha}
          value={mapPreference.radAlpha}
          onInput={(event) => dispatch(setMapPreference({ ...mapPreference, radAlpha: event.currentTarget.valueAsNumber }))}
          disabled={disabled}
        />
      </FormGroupRow>
      <FormGroupRow label="Marker Alpha" controlId="markerAlpha">
        <RangeInput
          {...rangeInputSettings.markerAlpha}
          value={mapPreference.markerAlpha}
          onInput={(event) => dispatch(setMapPreference({ ...mapPreference, markerAlpha: event.currentTarget.valueAsNumber }))}
          disabled={disabled}
        />
      </FormGroupRow>
      <FormGroupRow label="Marker Scale" controlId="markerScale">
        <RangeInput
          {...rangeInputSettings.markerScale}
          value={mapPreference.markerScale}
          onInput={(event) => dispatch(setMapPreference({ ...mapPreference, markerScale: event.currentTarget.valueAsNumber }))}
          disabled={disabled}
        />
      </FormGroupRow>
      <FormGroupRow label="Visibility">
        <Form.Switch
          id="showSpawnpoints"
          label="Spawn points"
          checked={mapPreference.showSpawnpoints}
          onChange={(event) => dispatch(setMapPreference({ ...mapPreference, showSpawnpoints: event.currentTarget.checked }))}
          disabled={disabled}
        />
        <Form.Switch
          id="showPrefabMarker"
          label="Prefab marker"
          checked={mapPreference.showPrefabMarker}
          onChange={(event) => dispatch(setMapPreference({ ...mapPreference, showPrefabMarker: event.currentTarget.checked }))}
          disabled={disabled}
        />
        <Form.Switch
          id="showPrefabArea"
          label="Prefab area"
          checked={mapPreference.showPrefabArea}
          onChange={(event) => dispatch(setMapPreference({ ...mapPreference, showPrefabArea: event.currentTarget.checked }))}
          disabled={disabled}
        />
      </FormGroupRow>
      <Button className="w-100" onClick={() => dispatch(setMapPreferenceToDefault())}>
        <BsArrowCounterclockwise className="me-3" />
        Reset to default
      </Button>
    </>
  );
}
