import React from 'react';
import { FORK_SETTINGS, useForkSetting } from 'components/fork/settings/store';
import { useCollectionFlows, useFlow } from '../store';
import { flowIdFromTabType } from '../selection';

const Message = ({ children }) => <p style={{ padding: '1rem' }}>{children}</p>;

const FlowTab = ({ tab, collection }) => {
  const collectionPath = collection?.pathname;
  const enabled = useForkSetting(FORK_SETTINGS.FLOWS);
  const { loaded, error } = useCollectionFlows(collectionPath);
  const flow = useFlow(collectionPath, flowIdFromTabType(tab.type));

  if (!collection) {
    return <Message>Collection not found.</Message>;
  }
  if (!enabled) {
    return <Message>Flows are turned off in Preferences.</Message>;
  }
  if (error) {
    return <Message>{error}</Message>;
  }
  if (!flow) {
    return <Message>{loaded ? 'This flow no longer exists.' : 'Loading flow...'}</Message>;
  }

  return (
    <div style={{ padding: '1rem' }} data-testid="flow-tab">
      <h2 className="font-medium fork-no-translate">{flow.name}</h2>
      <p className="text-xs opacity-70 mt-1">The canvas to build this flow is not available yet.</p>
    </div>
  );
};

export default FlowTab;
