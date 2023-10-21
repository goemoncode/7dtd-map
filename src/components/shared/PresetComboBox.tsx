import { Button, Dropdown, DropdownButton, Form, FormControlProps, InputGroup, Stack } from 'react-bootstrap';
import { BsFillGearFill } from 'react-icons/bs';
import { ClearButton } from './ClearButton';

interface Props extends Omit<FormControlProps, 'onSelect'>, PresetDropdownProps {
  onClear: () => void;
}

export function PresetComboBox({ presets, onSelect, onConfigure, onClear, disabled, ...props }: Props) {
  return (
    <InputGroup>
      <Form.Control {...props} disabled={disabled} />
      <PresetDropdown presets={presets} onSelect={onSelect} onConfigure={onConfigure} disabled={disabled} />
      <ClearButton onClick={onClear} disabled={disabled} />
    </InputGroup>
  );
}

interface PresetDropdownProps {
  presets: [string, string][];
  disabled?: boolean;
  onSelect: (value: string) => void;
  onConfigure?: () => void;
}

function PresetDropdown({ presets, disabled, onSelect, onConfigure }: PresetDropdownProps) {
  return (
    <DropdownButton variant="outline-secondary" title="" disabled={disabled}>
      <Dropdown.Header>
        <Stack direction="horizontal">
          Presets
          <Button variant="" className="ms-auto py-0 px-2 lh-sm" onClick={onConfigure}>
            <BsFillGearFill />
          </Button>
        </Stack>
      </Dropdown.Header>
      {presets.map(([text, filter]) => (
        <Dropdown.Item key={text} onClick={() => onSelect(filter)}>
          {text}
        </Dropdown.Item>
      ))}
    </DropdownButton>
  );
}
