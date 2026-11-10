import React from 'react';
import { IconRoute } from '@tabler/icons';
import { useFlowName } from '../store';
import { flowIdFromTabType } from '../selection';

// Tab header for a flow, in the same shape as the other special tabs.
const FlowTabTitle = ({ type }) => {
  const name = useFlowName(flowIdFromTabType(type));
  return (
    <>
      <IconRoute size={14} strokeWidth={1.5} className="special-tab-icon flex-shrink-0" />
      <span className="ml-1 tab-name">{name || 'Flow'}</span>
    </>
  );
};

export default FlowTabTitle;
