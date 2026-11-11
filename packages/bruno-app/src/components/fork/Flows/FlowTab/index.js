import React from 'react';
import { FORK_SETTINGS, useForkSetting } from 'components/fork/settings/store';
import { useCollectionFlows, useFlow } from '../store';
import { flowIdFromTabType } from '../selection';
import FlowCanvas from '../FlowCanvas';

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
    <div className="flex flex-col flex-1 w-full h-full" style={{ minHeight: 0 }} data-testid="flow-tab">
      <FlowCanvas key={flow.id} collection={collection} flow={flow} />
    </div>
  );
};

export default FlowTab;
