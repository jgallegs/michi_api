import React from 'react';
import { LOGO_PATHS, LOGO_VIEW_BOX } from './logo-paths';

// Set to false to render the upstream logo again.
export const USE_APP_LOGO = true;

const AppLogo = ({ width }) => {
  return (
    <svg width={width} viewBox={LOGO_VIEW_BOX} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="App logo" data-testid="app-logo">
      {LOGO_PATHS.map(([fill, d], index) => (
        <path key={index} fill={fill} fillRule="evenodd" d={d} />
      ))}
    </svg>
  );
};

export default AppLogo;
