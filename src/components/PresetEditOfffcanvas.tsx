import { useEffect } from 'react';
import { Button, Dropdown, DropdownButton, Form, InputGroup, Offcanvas, Stack } from 'react-bootstrap';
import { BsArrowCounterclockwise, BsFillGearFill, BsPlusLg, BsTrash3 } from 'react-icons/bs';
import { useFieldArray, useForm } from 'react-hook-form';
import { UseModalProps } from '../hooks/useModal';

interface Props extends UseModalProps {
  title?: string;
  values?: [string, string][];
  onSave?: (values: [string, string][]) => void;
  onResetToDefault?: () => void;
}

interface FormValues {
  presets: {
    name: string;
    pattern: string;
  }[];
}

function isValidRegex(pattern: string | null = '') {
  try {
    if (!pattern) return true;
    new RegExp(pattern);
  } catch {
    return 'Invalid regex pattern';
  }
}

export function PresetEditOffcanvas({ title, values, onSave, onResetToDefault, show, ...props }: Props) {
  const {
    register,
    control,
    reset,
    handleSubmit,
    formState: { isDirty, isSubmitting, errors },
  } = useForm({ mode: 'onChange', defaultValues: { presets: (values ?? []).map(([name, pattern]) => ({ name, pattern })) } });
  const { fields, append, remove } = useFieldArray({ name: 'presets', control });

  useEffect(() => {
    reset({ presets: (values ?? []).map(([name, pattern]) => ({ name, pattern })) });
  }, [show, values, reset]);

  return (
    <Offcanvas placement="end" show={show} {...props}>
      <Offcanvas.Header closeButton className="mx-3">
        <Offcanvas.Title>
          <BsFillGearFill className="me-3" />
          {title}
        </Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Stack as={Form} noValidate onSubmit={handleSubmit(onSubmit)} className="h-100">
          <Stack className="h-100 overflow-y-auto thin-scrollbar">
            {fields.map((field, index) => (
              <div key={field.id} className="d-grid mb-2" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
                <div className="position-relative">
                  <Form.Control
                    placeholder="Label"
                    autoComplete="off"
                    {...register(`presets.${index}.name`, { required: 'Required' })}
                    isInvalid={!!errors.presets?.[index]?.name}
                  />
                  <Form.Control.Feedback type="invalid" tooltip>
                    {errors.presets?.[index]?.name?.message}
                  </Form.Control.Feedback>
                </div>
                <div className="position-relative">
                  <Form.Control
                    placeholder="Pattern"
                    autoComplete="off"
                    {...register(`presets.${index}.pattern`, { required: 'Required', validate: { isValidRegex } })}
                    isInvalid={!!errors.presets?.[index]?.pattern}
                  />
                  <Form.Control.Feedback type="invalid" tooltip>
                    {errors.presets?.[index]?.pattern?.message}
                  </Form.Control.Feedback>
                </div>
                <Button variant="outline-secondary" onClick={() => remove(index)}>
                  <BsTrash3 />
                </Button>
              </div>
            ))}
            <Button variant="outline-secondary" onClick={() => append({ name: '', pattern: '' })}>
              <BsPlusLg />
            </Button>
          </Stack>
          <InputGroup>
            <Button type="submit" className="flex-fill" disabled={!isDirty || isSubmitting}>
              Save
            </Button>
            <DropdownButton title="">
              <Dropdown.Item onClick={onResetToDefault}>
                <BsArrowCounterclockwise className="me-3" />
                Reset to default
              </Dropdown.Item>
            </DropdownButton>
          </InputGroup>
        </Stack>
      </Offcanvas.Body>
    </Offcanvas>
  );

  function onSubmit(values: FormValues) {
    onSave && onSave(values.presets.map(({ name, pattern }) => [name, pattern]));
    reset(values);
  }
}
