import '@testing-library/jest-dom';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { act, fireEvent, render, screen } from '@testing-library/react';
import lightTheme from 'themes/light/light';
import { appendRunLog, resetRunSessions } from '../session';
import OutputPanel from './index';

const show = () =>
  render(
    <ThemeProvider theme={lightTheme}>
      <OutputPanel />
    </ThemeProvider>
  );

describe('flow output', () => {
  beforeEach(() => resetRunSessions());

  it('invites to run a flow while there is nothing to show', () => {
    show();
    expect(screen.getByText('What the flows do when they run shows up here.')).toBeInTheDocument();
    expect(screen.getByTestId('flow-output-clear')).toBeDisabled();
  });

  it('keeps every run until it is cleared', () => {
    show();
    act(() => {
      appendRunLog({ kind: 'header', label: { text: 'Order walk' }, parts: ['Local'] });
      appendRunLog({ kind: 'step', tone: 'ok', label: { text: 'login' }, parts: ['200 OK', '·', '12 ms'], detail: '{\n  "token": "T1"\n}' });
      appendRunLog({ kind: 'end', tone: 'ok', parts: [{ text: 'Finished', translate: true }] });
      appendRunLog({ kind: 'header', label: { text: 'Second walk' }, parts: ['Local'] });
    });

    expect(screen.getAllByTestId('flow-output-run')).toHaveLength(2);
    expect(screen.getByText('200 OK')).toBeInTheDocument();
    expect(screen.getByText('Finished')).not.toHaveClass('fork-no-translate');
    expect(screen.getByText('login')).toHaveClass('fork-no-translate');

    fireEvent.click(screen.getByTestId('flow-output-clear'));
    expect(screen.queryByTestId('flow-output-run')).not.toBeInTheDocument();
  });

  it('unfolds the response of a step', () => {
    show();
    act(() => appendRunLog({ kind: 'step', label: { text: 'login' }, parts: ['200'], detail: '{"token": "T1"}' }));
    expect(screen.queryByText('{"token": "T1"}')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Show the details'));
    expect(screen.getByText('{"token": "T1"}')).toBeInTheDocument();
  });

  it('can be hidden and shown again, keeping what it had', () => {
    show();
    act(() => appendRunLog({ kind: 'header', label: { text: 'Order walk' }, parts: ['Local'] }));
    fireEvent.click(screen.getByLabelText('Hide the output'));
    expect(screen.queryByTestId('flow-output')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('flow-output-open'));
    expect(screen.getByTestId('flow-output-run')).toHaveTextContent('Order walk');
  });
});
