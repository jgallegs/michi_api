import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

// The collection a sidebar section works on: the one of the active tab, or the one picked by hand.
export const useChosenCollection = () => {
  const collections = useSelector((state) => state.collections.collections);
  const activeCollectionUid = useSelector((state) => state.tabs.tabs.find((tab) => tab.uid === state.tabs.activeTabUid)?.collectionUid);
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  // Each workspace has an internal scratch collection for unsaved requests; it is not a real collection.
  const openCollections = useMemo(() => {
    const scratchUids = new Set(workspaces.map((workspace) => workspace.scratchCollectionUid).filter(Boolean));
    return collections.filter((collection) => collection.pathname && !scratchUids.has(collection.uid));
  }, [collections, workspaces]);
  const [chosenUid, setChosenUid] = useState(null);

  useEffect(() => {
    if (activeCollectionUid) setChosenUid(activeCollectionUid);
  }, [activeCollectionUid]);

  return {
    openCollections,
    collection: openCollections.find((item) => item.uid === chosenUid) || openCollections[0],
    setChosenUid
  };
};

// Only shown when there is more than one collection to choose from.
const CollectionPicker = ({ openCollections, collection, onChange }) => {
  if (openCollections.length <= 1) {
    return null;
  }

  return (
    <div style={{ padding: '0.25rem 0.625rem 0' }}>
      <select
        className="textbox collection-select"
        style={{ width: '100%' }}
        value={collection?.uid}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Collection"
      >
        {openCollections.map((item) => (
          <option key={item.uid} value={item.uid}>{item.name}</option>
        ))}
      </select>
    </div>
  );
};

export default CollectionPicker;
