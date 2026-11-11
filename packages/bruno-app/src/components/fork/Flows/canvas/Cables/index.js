import React from 'react';
import { pathThrough } from '../routing';

// Cables are drawn under the steps. Each one has a wide invisible stroke on top so it is easy to grab,
// and a rim of the colour of the canvas underneath, so where two cross one is seen to go over the other
// instead of both looking joined. "hop" is the cable the run has just gone through: a dash travels
// along it once. A cable takes the colour of the step its value comes from, or of the answer it follows.
const Cables = ({ cables, draft, hop, onMouseDown, onDoubleClick }) => (
  <svg className="flow-cables" width="1" height="1">
    {cables.map(({ edge, points, kind, selected, color, tone, lit, dim }) => {
      const path = pathThrough(points);
      return (
        <g
          key={edge.id}
          className={`flow-cable ${kind} ${selected ? 'selected' : ''} ${tone ? `tone-${tone}` : ''} ${lit ? 'lit' : ''} ${dim ? 'dim' : ''}`}
          style={color ? { '--flow-value': color } : undefined}
          data-testid={`flow-cable-${edge.id}`}
        >
          <path className="flow-cable-rim" d={path} />
          <path className="flow-cable-line" d={path} />
          {hop?.edgeId === edge.id ? <path key={hop.key} className="flow-cable-pulse" d={path} pathLength="100" /> : null}
          <path
            className="flow-cable-grab"
            d={path}
            onMouseDown={(event) => onMouseDown(event, edge, points)}
            onDoubleClick={(event) => onDoubleClick(event, edge)}
          />
        </g>
      );
    })}
    {draft ? (
      <g className={`flow-cable draft ${draft.kind}`}>
        <path className="flow-cable-line" d={pathThrough(draft.points)} />
      </g>
    ) : null}
  </svg>
);

export default Cables;
