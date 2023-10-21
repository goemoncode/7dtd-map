import { useEffect } from 'react';
import { Badge, Button, Col, ListGroup, Row, Stack } from 'react-bootstrap';
import { BsFunnel, BsGeoAltFill } from 'react-icons/bs';
import { useAppDispatch, useAppSelector } from '../store';
import {
  selectFilterStatus,
  selectHasMorePrefabs,
  selectActivePrefab,
  selectPrefabs,
  setBlocksUsedFilter,
  setFilterResult,
  setPrefabNameFilter,
  showMorePrefabs,
} from '../store/prefabs';
import { useMapView } from '../hooks/useMapView';
import { mapRenderer, prefabsFilter } from '../worker/proxies';
import { PrefabsFilterResult } from '../worker/lib/PrefabsFilter';
import { HighlightedText } from './shared/HighlightedText';
import { Distance } from './shared/Distance';
import clsx from 'clsx';

export function PrefabsList() {
  const dispatch = useAppDispatch();
  const filterStatus = useAppSelector(selectFilterStatus);
  const prefabs = useAppSelector(selectPrefabs);
  const hasMorePrefabs = useAppSelector(selectHasMorePrefabs);
  const activePrefab = useAppSelector(selectActivePrefab);
  const mapView = useMapView();

  useEffect(() => {
    return prefabsFilter.addUpdateListener(({ status, markerCoords, prefabs }: PrefabsFilterResult) => {
      dispatch(setFilterResult({ status, markerCoords, prefabs }));
      mapRenderer.updateTexture({ prefabs });
    });
  }, [dispatch]);

  return (
    <>
      <p className="text-info-emphasis mb-3 fst-italic">{filterStatus}</p>
      <ListGroup className="prefab-list">
        {prefabs.map((prefab, index) => (
          <ListGroup.Item
            key={index}
            as="div"
            action
            className={clsx('cursor-pointer', { active: activePrefab && prefab.x === activePrefab.x && prefab.z === activePrefab.z })}
            onClick={(event) => {
              event.preventDefault();
              mapView?.focusOn(prefab);
            }}
          >
            <Stack>
              <Row className="g-0">
                <Col xs={9}>
                  <small className="fw-light text-body-secondary text-truncate">
                    <HighlightedText text={prefab.name} match={prefab.nameMatch} />
                  </small>
                  <a
                    href="#"
                    title={`Filter with "${prefab.name}"`}
                    className="ms-2 fs-sm"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      dispatch(setPrefabNameFilter(prefab.name));
                    }}
                  >
                    <BsFunnel />
                  </a>
                </Col>
                <Col xs={3} className="text-end">
                  <Badge pill bg="secondary" className="fs-xs">
                    <BsGeoAltFill className="me-2" />
                    {Math.floor(prefab.x)}, {Math.floor(prefab.z)}
                  </Badge>
                </Col>
              </Row>
              <Row className="g-0">
                <Col xs={9} className="text-truncate">
                  {prefab.difficulty ? <small className="me-3 fs-xs">💀{prefab.difficulty}</small> : null}
                  <span className="fw-bold">{prefab.label ? <HighlightedText text={prefab.label} match={prefab.labelMatch} /> : '-'}</span>
                </Col>
                <Col xs={3} className="text-end">
                  {prefab.dist && <Distance value={prefab.dist} />}
                </Col>
              </Row>
              {prefab.matchedBlocks && prefab.matchedBlocks.length > 0 && (
                <ListGroup variant="flush" className="lh-sm fs-sm">
                  {prefab.matchedBlocks.slice(0, 10).map((block, index) => (
                    <ListGroup.Item key={index}>
                      <Row className="g-1">
                        <Col xs={6}>
                          <small className="me-3 fst-italic text-body-secondary">{block.count}x</small>
                          {block.label ? <HighlightedText text={block.label} match={block.labelMatch} /> : '-'}
                        </Col>
                        <Col xs={6}>
                          <small className="text-break">{<HighlightedText text={block.name} match={block.nameMatch} />}</small>
                          <a
                            href="#"
                            title={`Filter with "${block.name}"`}
                            className="ms-2 fs-xs"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              dispatch(setBlocksUsedFilter(block.name));
                            }}
                          >
                            <BsFunnel />
                          </a>
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Stack>
          </ListGroup.Item>
        ))}
      </ListGroup>
      {hasMorePrefabs && (
        <Stack className="mt-3">
          <Button variant="outline-secondary" className="mx-auto" onClick={() => dispatch(showMorePrefabs())}>
            Show more
          </Button>
        </Stack>
      )}
    </>
  );
}
