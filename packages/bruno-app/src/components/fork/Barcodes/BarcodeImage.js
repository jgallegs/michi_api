import React, { useMemo } from 'react';
import { QUIET_ZONE, barsOf, encodeCode128 } from './code128';

const BAR_HEIGHT = 34;
const TEXT_HEIGHT = 9;

// Drawn in modules and scaled by the width it is given, always black on white: a reader pointed at the
// screen needs that contrast whatever the theme of the app.
const BarcodeImage = ({ value, module = 2 }) => {
  const modules = useMemo(() => encodeCode128(value), [value]);
  if (!modules) {
    return (
      <div className="barcode-undrawable" data-testid="barcode-undrawable">
        This value cannot be drawn as Code 128: only letters, digits and common signs, up to 80 characters.
      </div>
    );
  }
  const width = modules.length + QUIET_ZONE * 2;
  const height = BAR_HEIGHT + TEXT_HEIGHT + 4;
  return (
    <svg
      className="barcode-image"
      role="img"
      aria-label={`Barcode ${value}`}
      viewBox={`0 0 ${width} ${height}`}
      width={width * module}
      shapeRendering="crispEdges"
      data-testid="barcode-image"
      data-modules={modules}
    >
      <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
      {barsOf(modules).map((bar) => (
        <rect key={bar.x} x={bar.x + QUIET_ZONE} y="2" width={bar.width} height={BAR_HEIGHT} fill="#000000" />
      ))}
      <text x={width / 2} y={BAR_HEIGHT + TEXT_HEIGHT + 1} textAnchor="middle" fontFamily="monospace" fontSize="7" fill="#000000" shapeRendering="auto">
        {value}
      </text>
    </svg>
  );
};

export default BarcodeImage;
