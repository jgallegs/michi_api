import React, { useEffect } from 'react';
import { useStore } from 'react-redux';
import { SensitiveEnvironmentConfirmHost } from 'components/fork/SensitiveEnvironment';
import { installLocalTimeAddon } from 'components/fork/LocalTime';
import { installSpanishUi } from 'components/fork/SpanishUi';
import { installVisualizationsListener } from 'components/fork/Visualizations/store';
import { installFlowsReload } from 'components/fork/Flows/store';
import { installKnownFields } from 'components/fork/Flows/fields/watch';

// Single mount point for the fork inside the app providers: installs the editor add-ons once and
// renders the fork's global UI.
installLocalTimeAddon();

const ForkRoot = () => {
  const store = useStore();
  useEffect(() => installSpanishUi(), []);
  useEffect(() => installVisualizationsListener(), []);
  useEffect(() => installFlowsReload(), []);
  useEffect(() => installKnownFields(store), [store]);
  return <SensitiveEnvironmentConfirmHost />;
};

export default ForkRoot;
