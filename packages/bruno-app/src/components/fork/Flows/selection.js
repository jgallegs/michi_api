import { addTab, closeTabs } from 'providers/ReduxStore/slices/tabs';

// The tab type carries the flow id because the tab strip only hands the type to the tab title. The
// pathname is not a real file: it lets the tab snapshot restore the tab after an app restart.
const FLOW_TAB_PREFIX = 'fork-flow:';

export const isFlowTabType = (type) => typeof type === 'string' && type.startsWith(FLOW_TAB_PREFIX);

export const flowIdFromTabType = (type) => type.slice(FLOW_TAB_PREFIX.length);

const flowTabUid = (collection, flowId) => `${collection.pathname}#flow:${flowId}`;

export const openFlowTab = (dispatch, collection, flow) => {
  const uid = flowTabUid(collection, flow.id);
  dispatch(addTab({ uid, pathname: uid, collectionUid: collection.uid, type: `${FLOW_TAB_PREFIX}${flow.id}`, preview: false }));
};

export const closeFlowTab = (dispatch, collection, flowId) => {
  dispatch(closeTabs({ tabUids: [flowTabUid(collection, flowId)], reopenable: false }));
};
