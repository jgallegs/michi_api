import cloneDeep from 'lodash/cloneDeep';
import { resolveEnvironmentInheritance } from '@usebruno/common/utils';
import { initRunRequestEvent, responseReceived } from 'providers/ReduxStore/slices/collections';
import { cancelRequest } from 'providers/ReduxStore/slices/collections/actions';
import { uuid } from 'utils/common';
import { findCollectionByUid, findEnvironmentInCollection, findItemInCollection, getGlobalEnvironmentVariables } from 'utils/collections';
import { sendNetworkRequest } from 'utils/network';
import { findRequestItem } from '../canvas/requests';

const withNumericTimestamps = (response) => ({
  ...response,
  timeline: response.timeline?.map((entry) => ({ ...entry, timestamp: entry.timestamp instanceof Date ? entry.timestamp.getTime() : entry.timestamp }))
});

// Sends the requests of a flow the way Bruno sends one from its own tab, with the same environment,
// scripts and variables, so the response also shows up in the tab of the request. The values the flow
// hands over travel as runtime variables of that one request.
export const createRunHost = ({ store, collectionUid, signal }) => {
  let sending = null;

  const readCollection = () => findCollectionByUid(store.getState().collections.collections, collectionUid);

  const sendRequest = async (node, variables) => {
    const collection = readCollection();
    const item = collection ? findRequestItem(collection, node.config.pathname) : null;
    if (!item) {
      return { error: 'The request of this step is no longer in the collection' };
    }

    const { globalEnvironments, activeGlobalEnvironmentUid } = store.getState().globalEnvironments;
    const collectionCopy = cloneDeep(collection);
    const itemCopy = cloneDeep(item);
    collectionCopy.globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
    collectionCopy.promptVariables = {};
    itemCopy.requestUid = uuid();

    const environment = resolveEnvironmentInheritance({
      environments: collectionCopy.environments,
      targetEnvironment: findEnvironmentInCollection(collectionCopy, collectionCopy.activeEnvironmentUid)
    });

    await store.dispatch(initRunRequestEvent({ requestUid: itemCopy.requestUid, itemUid: item.uid, collectionUid }));
    sending = { itemUid: item.uid };
    try {
      const { requestSent, ...response } = await sendNetworkRequest(itemCopy, collectionCopy, environment, { ...collectionCopy.runtimeVariables, ...variables });
      if (response.isCancel || signal?.aborted) {
        return { cancelled: true };
      }
      store.dispatch(responseReceived({ itemUid: item.uid, collectionUid, response: withNumericTimestamps(response), requestSent }));
      if (response.error) {
        return { error: typeof response.error === 'string' ? response.error : response.error?.message || 'The request could not be sent' };
      }
      return { status: response.status, statusText: response.statusText, data: response.data, duration: response.duration, size: response.size };
    } catch (err) {
      return { error: err?.message || 'The request could not be sent' };
    } finally {
      sending = null;
    }
  };

  // Stopping a run also cuts the request that is on its way.
  const cancelSending = () => {
    const collection = readCollection();
    const item = sending && collection ? findItemInCollection(collection, sending.itemUid) : null;
    if (item?.cancelTokenUid) {
      store.dispatch(cancelRequest(item.cancelTokenUid, item, collection));
    }
  };

  return { sendRequest, cancelSending };
};
