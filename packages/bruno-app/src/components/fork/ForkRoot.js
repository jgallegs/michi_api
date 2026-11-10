import React, { useEffect } from 'react';
import { SensitiveEnvironmentConfirmHost } from 'components/fork/SensitiveEnvironment';
import { installLocalTimeAddon } from 'components/fork/LocalTime';
import { installSpanishUi } from 'components/fork/SpanishUi';
import { installVisualizationsListener } from 'components/fork/Visualizations/store';
import { installFlowsReload } from 'components/fork/Flows/store';

// Single mount point for the fork inside the app providers: installs the editor add-ons once and
// renders the fork's global UI.
installLocalTimeAddon();

const ForkRoot = () => {
  useEffect(() => installSpanishUi(), []);
  useEffect(() => installVisualizationsListener(), []);
  useEffect(() => installFlowsReload(), []);
  return <SensitiveEnvironmentConfirmHost />;
};

export default ForkRoot;
