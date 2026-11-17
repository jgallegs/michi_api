import { flattenItems } from 'utils/collections';
import { FORK_SETTINGS, getForkSetting } from 'components/fork/settings/store';
import { asResponseData, relativeRequestPath } from '../canvas/requests';
import { rememberShape, setApiDocuments } from './memory';
import { describeShape } from './paths';

const REQUEST_TYPES = ['http-request', 'graphql-request'];
const QUIET_TIME = 400;

// Looks at the app once it goes quiet. Every response that arrives, from the tab of a request or from
// a flow, leaves the names of its fields remembered; the API documents open in the app are kept at hand.
export const noteWhatIsKnown = (state, seen) => {
  setApiDocuments((state.apiSpec?.apiSpecs || []).map((spec) => spec?.resolvedJson || spec?.json));
  (state.collections?.collections || []).forEach((collection) => {
    flattenItems(collection.items || [])
      .filter((item) => REQUEST_TYPES.includes(item.type) && item.pathname && item.response && !seen.has(item.response))
      .forEach((item) => {
        seen.add(item.response);
        const data = asResponseData(item.response.data);
        if (data && typeof data === 'object') {
          rememberShape(collection.pathname, relativeRequestPath(collection, item), describeShape(data));
        }
      });
  });
};

export const installKnownFields = (store) => {
  const seen = new WeakSet();
  let last = {};
  let timer = null;

  const look = () => {
    timer = null;
    if (!getForkSetting(FORK_SETTINGS.FLOWS)) {
      return;
    }
    try {
      noteWhatIsKnown(store.getState(), seen);
    } catch (err) {
      // Remembering field names must never get in the way of the app.
    }
  };

  const onChange = () => {
    const state = store.getState();
    const next = { collections: state.collections?.collections, specs: state.apiSpec?.apiSpecs };
    if (next.collections === last.collections && next.specs === last.specs) {
      return;
    }
    last = next;
    if (!timer) {
      timer = setTimeout(look, QUIET_TIME);
    }
  };

  const stop = store.subscribe(onChange);
  onChange();
  return () => {
    stop();
    clearTimeout(timer);
  };
};
