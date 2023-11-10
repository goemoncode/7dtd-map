import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Form, InputGroup, Modal, Overlay, Spinner, Tab, Tabs, Tooltip } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '../store';
import { selectHowToUseVisible, setHowToUseVisible } from '../store/session';
import { fetchTest, getAdditionalPrefabsUrl, setAdditionalPrefabsUrl } from '../hooks/usePrefabs';
import { selectHasVisitedBefore, setHasVisitedBefore } from '../store/local';

interface FormValues {
  url?: string;
}

function isValidUrl(urlString: string | null = '') {
  try {
    if (!urlString) return true;
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:' ? true : 'This URL is invalid';
  } catch {
    return false;
  }
}

export function HowToUseModal() {
  const dispatch = useAppDispatch();
  const show = useAppSelector(selectHowToUseVisible);
  const hasVisitedBefore = useAppSelector(selectHasVisitedBefore);
  const ref = useRef(null);
  const [tooltipShow, setTooltipShow] = useState(false);
  const [target, setTarget] = useState<HTMLButtonElement | null>(null);
  const {
    register,
    reset,
    handleSubmit,
    setError,
    formState: { isDirty, isSubmitting, isSubmitSuccessful, errors },
  } = useForm<FormValues>({ mode: 'onChange', defaultValues: { url: getAdditionalPrefabsUrl() ?? undefined } });

  useEffect(() => {
    if (!hasVisitedBefore) {
      dispatch(setHowToUseVisible(true));
      dispatch(setHasVisitedBefore(true));
    }
  }, [dispatch, hasVisitedBefore]);

  useEffect(() => {
    reset();
  }, [reset, show]);

  return (
    <Modal dialogClassName="custom-dialog" show={show} onHide={() => dispatch(setHowToUseVisible(false))}>
      <Modal.Header closeButton>
        <Modal.Title>💡 How to Use</Modal.Title>
      </Modal.Header>
      <Modal.Body ref={ref}>
        <Alert variant="info" className="mb-4">
          Only supported in latest Google Chrome.
        </Alert>
        <Tabs defaultActiveKey="basic" className="mb-4">
          <Tab eventKey="basic" title="Basic Usage">
            <p>Drag and drop 7dtd world files into this window, or select those on Load Map in the sidebar after closing this tips.</p>
            <h5>Generated Worlds (Windows)</h5>
            <ol>
              <li>
                Select folders:
                <code className="px-3">
                  <span id="generated_world_path_windows">%APPDATA%\7DaysToDie\GeneratedWorlds</span>\&lt;<strong>World Name</strong>&gt;
                </code>
                <Button
                  title="Copy this path"
                  data-copy-for="generated_world_path_windows"
                  onClick={handleCopy}
                  onBlur={() => setTooltipShow(false)}
                >
                  📋️
                </Button>
              </li>
              <li>Drag and drop all files in the world folder</li>
            </ol>
            <h5>Bundled Worlds</h5>
            <ol>
              <li>
                Browse 7DtD local files (
                <a href="https://www.google.com/search?q=steam+browse+local+files" target="_blank">
                  google
                </a>
                )
              </li>
              <li>
                Select folders:
                <code className="px-3">
                  Data\Worlds\&lt;<strong>World Name</strong>&gt;
                </code>
                <ul>
                  <li>
                    e.g.
                    <code className="px-3" id="bundled_world_path_windows">
                      C:\Program Files (x86)\Steam\steamapps\common\7 Days To Die\Data\Worlds
                    </code>
                    <Button
                      title="Copy this path"
                      data-copy-for="bundled_world_path_windows"
                      onClick={handleCopy}
                      onBlur={() => setTooltipShow(false)}
                    >
                      📋️
                    </Button>
                  </li>
                </ul>
              </li>
              <li>Drag and drop all files in the world folder</li>
            </ol>
            <p>You can also load Navezgane from the pull-down menu on Load Map.</p>
            <Overlay target={target} container={ref} show={tooltipShow} placement="right">
              {(props) => (
                <Tooltip id="test" {...props}>
                  ✅ Press Win+R then paste this
                </Tooltip>
              )}
            </Overlay>
          </Tab>
          <Tab eventKey="advanced" title="Advanced Usage">
            <Form noValidate validated={isSubmitSuccessful} onSubmit={handleSubmit(handleApply)}>
              <p>Specify the URL of a site that provides the following files for additional prefabs.</p>
              <ul>
                <li>index.json</li>
                <li>
                  localization files (e.g. <code>l10n/english.json</code>)
                </li>
                <li>xml files for each prefab</li>
                <li>jpg files for each prefab</li>
              </ul>
              <p>
                These files can be generated by the script provided in the github project{' '}
                <a href="https://github.com/goemoncode/7dtd-tools" target="_blank">
                  here
                </a>
                .
              </p>
              <InputGroup className="position-relative mb-3" hasValidation>
                <Form.Control
                  type="url"
                  placeholder="https://..."
                  autoComplete="off"
                  {...register('url', { validate: { isValidUrl } })}
                  readOnly={isSubmitting}
                  isInvalid={!!errors.url}
                />
                <Button type="submit" style={{ width: '4rem' }} disabled={!isDirty || isSubmitting}>
                  {isSubmitting ? <Spinner size="sm" /> : 'Check'}
                </Button>
                <Form.Control.Feedback type="invalid" tooltip>
                  {errors.url?.message}
                </Form.Control.Feedback>
              </InputGroup>
            </Form>
          </Tab>
        </Tabs>
      </Modal.Body>
    </Modal>
  );

  function handleCopy(event: React.FormEvent<HTMLButtonElement>) {
    const { dataset } = event.currentTarget;
    const copyFor = document.getElementById(dataset.copyFor as string);
    if (copyFor) {
      navigator.clipboard.writeText(copyFor.innerText);
      setTooltipShow(true);
      setTarget(event.currentTarget);
    }
  }

  async function handleApply({ url }: FormValues) {
    try {
      if (url) {
        await fetchTest(url);
      }
      setAdditionalPrefabsUrl(url ?? null);
      reset({ url });
      alert('Restart the app to reset all prefabs data.');
      location.hash = '#reset';
    } catch (err) {
      setError('url', { message: err instanceof Error ? err.message : String(err) });
    }
  }
}
