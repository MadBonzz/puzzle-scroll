import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { domains } from '../data/domains';
import type { CognitiveDomain, DomainScore } from '../types';

interface Props {
  scores: Record<CognitiveDomain, DomainScore>;
  size?: number;
}

export function RadarChart({ scores, size = 260 }: Props) {
  const center = size / 2;
  const radius = size * 0.34;
  const points = domains.map((domain, index) => {
    const angle = (Math.PI * 2 * index) / domains.length - Math.PI / 2;
    const scoreRadius = radius * (scores[domain.id].latestScore / 100);
    return {
      x: center + Math.cos(angle) * scoreRadius,
      y: center + Math.sin(angle) * scoreRadius,
      axisX: center + Math.cos(angle) * radius,
      axisY: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * (radius + 30),
      labelY: center + Math.sin(angle) * (radius + 30),
      label: domain.shortLabel
    };
  });

  return (
    <Svg width={size} height={size}>
      {[0.33, 0.66, 1].map((scale) => (
        <Circle key={scale} cx={center} cy={center} r={radius * scale} stroke="#D9DED8" strokeWidth="1" fill="none" />
      ))}
      {points.map((point) => (
        <Line key={`${point.label}-line`} x1={center} y1={center} x2={point.axisX} y2={point.axisY} stroke="#CFD5D2" strokeWidth="1" />
      ))}
      <Polygon points={points.map((point) => `${point.x},${point.y}`).join(' ')} fill="#2E6F9533" stroke="#2E6F95" strokeWidth="3" />
      {points.map((point) => (
        <SvgText key={point.label} x={point.labelX} y={point.labelY} fontSize="11" fontWeight="700" fill="#39414A" textAnchor="middle">
          {point.label}
        </SvgText>
      ))}
    </Svg>
  );
}
