import React from 'react';

export interface SparklinePoint {
  label: string;
  value: number;
}

export interface EngagementSparklineProps {
  title: string;
  points: SparklinePoint[];
  color?: string;
  highlightIndex?: number;
}

export const EngagementSparkline: React.FC<EngagementSparklineProps> = ({
  title,
  points,
  color = '#4f46e5',
  highlightIndex,
}) => {
  if (!points || points.length === 0) {
    return <p className="squadsync__placeholder">Nessun dato disponibile</p>;
  }

  const width = 220;
  const height = 60;
  const padding = 8;
  const max = Math.max(...points.map((point) => point.value));
  const min = Math.min(...points.map((point) => point.value));
  const span = max - min || 1;

  const coordinates = points.map((point, index) => {
    const x = padding + (index / Math.max(1, points.length - 1)) * (width - padding * 2);
    const normalised = (point.value - min) / span;
    const y = height - padding - normalised * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <figure className="squadsync__sparkline" aria-label={title} role="img">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth={2}
          points={coordinates.join(' ')}
          vectorEffect="non-scaling-stroke"
        />
        {points.map((point, index) => {
          const [x, y] = coordinates[index].split(',').map(Number);
          const radius = highlightIndex === index ? 4 : 2.5;
          return <circle key={point.label} cx={x} cy={y} r={radius} fill={color} opacity={0.9} />;
        })}
      </svg>
      <figcaption>
        <strong>{title}</strong>
        <span className="squadsync__sparkline-range">
          {points[0]?.label} → {points[points.length - 1]?.label}
        </span>
      </figcaption>
    </figure>
  );
};

export default EngagementSparkline;
