import { useEffect } from 'react';
import { shallowEqual } from 'react-redux';
import { Form, Stack } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../store';
import {
  selectBlocksUsedFilter,
  selectCursorCoords,
  selectDifficultyFilter,
  selectPrefabTagsFilter,
  selectMarkerCoords,
  selectPrefabNameFilter,
  setBlocksUsedFilter,
  setDifficultyFilter,
  setPrefabTagsFilter,
  setMarkerCoords,
  setPrefabNameFilter,
} from '../store/prefabs';
import {
  resetBlocksUsedFilterPresetsToDefault,
  resetPrefabNameFilterPresetsToDefault,
  resetPrefabTagsFilterPresetsToDefault,
  selectBlocksUsedFilterPresets,
  selectPrefabNameFilterPresets,
  selectPrefabTagsFilterPresets,
  setBlocksUsedFilterPresets,
  setPrefabNameFilterPresets,
  setPrefabTagsFilterPresets,
} from '../store/presets';
import { useModal } from '../hooks/useModal';
import { FormGroupRow } from './shared/FormGroupRow';
import { CoordsAndElevation } from './shared/CoordsAndElevation';
import { PresetComboBox } from './shared/PresetComboBox';
import { ClearButton } from './shared/ClearButton';
import { PresetEditOffcanvas } from './PresetEditOfffcanvas';

interface Props {
  disabled?: boolean;
}

export function PrefabsFilterControl({ disabled }: Props) {
  const dispatch = useAppDispatch();
  const cursorCoords = useAppSelector(selectCursorCoords, shallowEqual);
  const markerCoords = useAppSelector(selectMarkerCoords, shallowEqual);
  const difficultyFilter = useAppSelector(selectDifficultyFilter, shallowEqual);
  const prefabNameFilter = useAppSelector(selectPrefabNameFilter);
  const prefabTagsFilter = useAppSelector(selectPrefabTagsFilter);
  const blocksUsedFilter = useAppSelector(selectBlocksUsedFilter);
  const prefabNameFilterPresets = useAppSelector(selectPrefabNameFilterPresets);
  const prefabTagsFilterPresets = useAppSelector(selectPrefabTagsFilterPresets);
  const blocksUsedFilterPresets = useAppSelector(selectBlocksUsedFilterPresets);
  const [offcanvasProps, showOffcanvas, updateOffcanvas] = useModal(PresetEditOffcanvas, {});

  useEffect(() => updateOffcanvas({ values: prefabNameFilterPresets }), [prefabNameFilterPresets, updateOffcanvas]);
  useEffect(() => updateOffcanvas({ values: blocksUsedFilterPresets }), [blocksUsedFilterPresets, updateOffcanvas]);
  useEffect(() => updateOffcanvas({ values: prefabTagsFilterPresets }), [prefabTagsFilterPresets, updateOffcanvas]);

  return (
    <>
      <FormGroupRow label="Cursor">
        <CoordsAndElevation coords={cursorCoords} />
      </FormGroupRow>
      <FormGroupRow label="Flag" className="position-relative">
        <CoordsAndElevation coords={markerCoords} />
        {markerCoords && (
          <ClearButton
            className="position-absolute top-50 end-0 translate-middle-y"
            title="Remove the flag"
            onClick={() => dispatch(setMarkerCoords(null))}
            disabled={disabled}
          />
        )}
      </FormGroupRow>
      <FormGroupRow label="Difficulty">
        <Stack direction="horizontal">
          <div style={{ width: '90%' }}>
            {[5, 4, 3, 2, 1, 0].map((difficulty) => (
              <Form.Check
                key={difficulty}
                type="checkbox"
                inline
                id={`difficulty-checkbox-${difficulty}`}
                label={difficulty > 0 ? '💀' + difficulty : 'None'}
                checked={difficultyFilter.includes(difficulty)}
                onChange={(event) => {
                  if (event.currentTarget.checked) {
                    dispatch(setDifficultyFilter([...difficultyFilter, difficulty]));
                  } else {
                    dispatch(setDifficultyFilter(difficultyFilter.filter((v) => difficulty !== v)));
                  }
                }}
                disabled={disabled}
              />
            ))}
          </div>
          <ClearButton onClick={() => dispatch(setDifficultyFilter([]))} disabled={disabled} />
        </Stack>
      </FormGroupRow>
      <FormGroupRow label="Name">
        <PresetComboBox
          placeholder="e.g. ^trader"
          value={prefabNameFilter}
          onInput={(event) => dispatch(setPrefabNameFilter(event.currentTarget.value))}
          disabled={disabled}
          presets={prefabNameFilterPresets}
          onSelect={(filter) => dispatch(setPrefabNameFilter(filter))}
          onClear={() => dispatch(setPrefabNameFilter(''))}
          onConfigure={() =>
            showOffcanvas({
              title: 'Name filter presets',
              values: prefabNameFilterPresets,
              onSave: (values) => dispatch(setPrefabNameFilterPresets(values)),
              onResetToDefault: () => dispatch(resetPrefabNameFilterPresetsToDefault()),
            })
          }
        />
      </FormGroupRow>
      <FormGroupRow label="Tags">
        <PresetComboBox
          placeholder="e.g. rural"
          value={prefabTagsFilter}
          onInput={(event) => dispatch(setPrefabTagsFilter(event.currentTarget.value))}
          disabled={disabled}
          presets={prefabTagsFilterPresets}
          onSelect={(filter) => dispatch(setPrefabTagsFilter(filter))}
          onClear={() => dispatch(setPrefabTagsFilter(''))}
          onConfigure={() =>
            showOffcanvas({
              title: 'Tags filter presets',
              values: prefabTagsFilterPresets,
              onSave: (values) => dispatch(setPrefabTagsFilterPresets(values)),
              onResetToDefault: () => dispatch(resetPrefabTagsFilterPresetsToDefault()),
            })
          }
        />
      </FormGroupRow>
      <FormGroupRow label="Blocks Used">
        <PresetComboBox
          placeholder="e.g. (Grace|Super)Corn"
          value={blocksUsedFilter}
          onInput={(event) => dispatch(setBlocksUsedFilter(event.currentTarget.value))}
          disabled={disabled}
          presets={blocksUsedFilterPresets}
          onSelect={(filter) => dispatch(setBlocksUsedFilter(filter))}
          onClear={() => dispatch(setBlocksUsedFilter(''))}
          onConfigure={() =>
            showOffcanvas({
              title: 'Blocks Used filter presets',
              values: blocksUsedFilterPresets,
              onSave: (values) => dispatch(setBlocksUsedFilterPresets(values)),
              onResetToDefault: () => dispatch(resetBlocksUsedFilterPresetsToDefault()),
            })
          }
        />
      </FormGroupRow>
      <PresetEditOffcanvas {...offcanvasProps} />
    </>
  );
}
