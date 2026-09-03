export default function RadarChart({ axes, values, size = 260 }) {
  const cx = size / 2;
  const cy = size / 2 + 6;
  const radius = size / 2 - 46;
  const n = axes.length;
  const maxVal = Math.max(3, ...values);
  const angleFor = (i) => -Math.PI / 2 + i * ((2 * Math.PI) / n);
  const pointAt = (i, frac) => {
    const a = angleFor(i);
    return [cx + Math.cos(a) * radius * frac, cy + Math.sin(a) * radius * frac];
  };

  const rings = [0.25, 0.5, 0.75, 1].map((frac, ri) => {
    const pts = axes.map((_, i) => pointAt(i, frac).join(',')).join(' ');
    return <polygon key={ri} points={pts} fill="none" stroke="#E2E8F0" strokeWidth="1" />;
  });

  const spokes = axes.map((_, i) => {
    const [x, y] = pointAt(i, 1);
    return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#E2E8F0" strokeWidth="1" />;
  });

  const valuePts = values.map((v, i) => pointAt(i, Math.max(0.04, v / maxVal)).join(',')).join(' ');
  const valueDots = values.map((v, i) => {
    const [x, y] = pointAt(i, Math.max(0.04, v / maxVal));
    return <circle key={i} cx={x} cy={y} r="3" fill="#635BFF" />;
  });

  const labels = axes.map((label, i) => {
    const [lx, ly] = pointAt(i, 1.28);
    const anchor = Math.abs(Math.cos(angleFor(i))) < 0.2 ? 'middle' : Math.cos(angleFor(i)) > 0 ? 'start' : 'end';
    return (
      <g key={i}>
        <text x={lx} y={ly - 6} textAnchor={anchor} fontSize="10" fontWeight="600" fill="#0F172A" fontFamily="Inter, sans-serif">
          {label}
        </text>
        <text x={lx} y={ly + 8} textAnchor={anchor} fontSize="12" fontWeight="700" fill="#635BFF" fontFamily="'JetBrains Mono', monospace">
          {values[i]}
        </text>
      </g>
    );
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto" style={{ maxWidth: size }}>
      {rings}
      {spokes}
      <polygon points={valuePts} fill="#635BFF" fillOpacity="0.28" stroke="#635BFF" strokeWidth="2" strokeLinejoin="round" />
      {valueDots}
      {labels}
    </svg>
  );
}
