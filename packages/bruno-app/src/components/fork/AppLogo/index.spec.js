import React from 'react';
import { render, screen } from '@testing-library/react';
import Bruno from 'components/Bruno';
import AppLogo from './index';
import { LOGO_PATHS, LOGO_VIEW_BOX } from './logo-paths';

describe('AppLogo', () => {
  it('renders every generated path with the requested width', () => {
    render(<AppLogo width={48} />);
    const svg = screen.getByTestId('app-logo');
    expect(svg).toHaveAttribute('width', '48');
    expect(svg).toHaveAttribute('viewBox', LOGO_VIEW_BOX);
    expect(svg.querySelectorAll('path')).toHaveLength(LOGO_PATHS.length);
  });

  it('replaces the upstream logo component', () => {
    render(<Bruno width={18} />);
    expect(screen.getByTestId('app-logo')).toHaveAttribute('width', '18');
  });

  it('only uses polygon paths so the icon generator can rasterize them', () => {
    LOGO_PATHS.forEach(([fill, d]) => {
      expect(fill).toMatch(/^#[0-9a-f]{6}$/i);
      expect(d).toMatch(/^(M[-\d., ]+Z)+$/);
    });
  });
});
