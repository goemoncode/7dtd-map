import { Fragment, useCallback } from 'react';
import { useMapMetadata } from '../hooks/useMaps';
import { biomeColors } from '../utils/parseMapInfoXml';
import { round10 } from '../utils/mathx';
import RectSvg from '../assets/rect.svg?react';

export function MapMetadata() {
  const { name = '', width = 0, height = 0, biomes = [] } = useMapMetadata() ?? {};
  const calcRatio = useCallback(
    (color: number) => {
      const total = width * height;
      const biomesMap = new Map(biomes);
      return round10(((biomesMap.get(color) ?? 0) / total) * 100, -2);
    },
    [biomes, width, height]
  );
  return (
    <div className="metadata">
      <h3>{name}</h3>
      {!!width && !!height && (
        <>
          <div className="fs-5">
            {width} x {height}
          </div>
          <div className="stats mt-4">
            {!!biomes.length && (
              <dl className="fs-sm fst-italic">
                {Array.from(biomeColors).map(([color, name]) => (
                  <Fragment key={color}>
                    <dt>
                      <RectSvg fill={`#${color.toString(16).padStart(6, '0')}`} className="me-2" />
                      {name}
                    </dt>
                    <dd className="text-end mb-0">{calcRatio(color)}%</dd>
                  </Fragment>
                ))}
              </dl>
            )}
          </div>
        </>
      )}
    </div>
  );
}
