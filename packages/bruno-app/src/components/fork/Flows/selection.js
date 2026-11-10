import { addTab } from 'providers/ReduxStore/slices/tabs';

export const FLOW_TAB_TYPE = 'fork-flow';

// The tab pathname carries the flow id so the tab survives an app restart: the snapshot restores it by
// pathname and the id is read back from it. It is not a real file path.
const FLOW_ID_SUFFIX = /#flow:([A-Za-z0-9_-]+)$/;

export const flowTabPathname = (collection, flowId) => `${collection.pathname}#flow:${flowId}`;

export const flowIdFromTab = (tab) => {
  const match = FLOW_ID_SUFFIX.exec(tab?.pathname || '');
  return match ? match[1] : null;
};

export const openFlowTab = (dispatch, collection, flow) => {
  const pathname = flowTabPathname(collection, flow.id);
  dispatch(addTab({ uid: pathname, pathname, collectionUid: collection.uid, type: FLOW_TAB_TYPE, tabName: flow.name, preview: false }));
};
