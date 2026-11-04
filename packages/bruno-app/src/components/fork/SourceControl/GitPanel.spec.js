import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import GitPanel from './GitPanel';

const baseStatus = {
  root: '/repo',
  branch: 'main',
  detached: false,
  head: 'abc1234',
  upstream: 'origin/main',
  ahead: 1,
  behind: 2,
  operation: null,
  conflicts: [],
  files: [{ path: 'orders.bru', state: 'modified' }],
  savedChanges: [],
  defaultBranch: 'main',
  fetchedAt: 1,
  fetchError: null
};

const renderPanel = (props) =>
  render(
    <ThemeProvider theme={themes.light}>
      <GitPanel folder="/repo/collection" loading={false} refresh={jest.fn()} error={null} status={baseStatus} {...props} />
    </ThemeProvider>
  );

describe('GitPanel', () => {
  it('shows branch, counts and local changes', () => {
    renderPanel();
    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('Changes (1)')).toBeInTheDocument();
    expect(screen.getByText('orders.bru')).toBeInTheDocument();
    expect(screen.getByTestId('git-sync')).not.toBeDisabled();
  });

  it('warns about a detached HEAD and blocks sync', () => {
    renderPanel({ status: { ...baseStatus, detached: true, branch: null } });
    expect(screen.getByTestId('git-detached')).toHaveTextContent('Return to main');
    expect(screen.getByTestId('git-sync')).toBeDisabled();
  });

  it('lists conflicts with their actions and keeps Finish disabled until they are resolved', () => {
    renderPanel({ status: { ...baseStatus, operation: 'merge', conflicts: ['orders.bru'], files: [{ path: 'orders.bru', state: 'conflicted' }] } });
    const conflicts = screen.getByTestId('git-conflicts');
    expect(conflicts).toHaveTextContent('1 file(s) in conflict');
    expect(conflicts).toHaveTextContent('Keep mine');
    expect(conflicts).toHaveTextContent('Take remote');
    expect(screen.getByText('Finish').closest('button')).toBeDisabled();
    expect(screen.getByText('Changes (0)')).toBeInTheDocument();
  });

  it('explains when the collection is not in a git repository', () => {
    renderPanel({ status: null, error: Object.assign(new Error('x'), { code: 'NOT_A_REPO' }) });
    expect(screen.getByText('This collection is not inside a git repository.')).toBeInTheDocument();
  });
});
