import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { IconChevronDown, IconChevronRight, IconPencil, IconPlus, IconRoute, IconTrash } from '@tabler/icons';
import ActionIcon from 'ui/ActionIcon';
import Modal from 'components/Modal';
import SidebarSection from 'components/Sidebar/SidebarSection';
import { useSidebarAccordion } from 'components/Sidebar/SidebarAccordionContext';
import CollectionPicker, { useChosenCollection } from 'components/fork/CollectionPicker';
import { FORK_SETTINGS, useForkSetting } from 'components/fork/settings/store';
import FlowFormModal from './FlowFormModal';
import { groupFlowsByFolder, listFolders } from './model';
import { closeFlowTab, openFlowTab } from './selection';
import { createFlow, deleteFlow, renameFlow, useCollectionFlows } from './store';
import StyledWrapper from './StyledWrapper';

const FLOWS_SECTION_ID = 'flows';

const FlowRow = ({ flow, nested, onOpen, onRename, onDelete }) => (
  <div className={`flow-row fork-no-translate ${nested ? 'nested' : ''}`} onClick={() => onOpen(flow)} data-testid="flow-row">
    <IconRoute size={14} strokeWidth={1.5} />
    <span className="flow-name" title={flow.name}>{flow.name}</span>
    <span className="flow-actions" onClick={(e) => e.stopPropagation()}>
      <ActionIcon size="sm" label="Rename flow" onClick={() => onRename(flow)}>
        <IconPencil size={13} stroke={1.5} aria-hidden="true" />
      </ActionIcon>
      <ActionIcon size="sm" label="Delete flow" onClick={() => onDelete(flow)}>
        <IconTrash size={13} stroke={1.5} aria-hidden="true" />
      </ActionIcon>
    </span>
  </div>
);

const FlowsPanel = () => {
  const dispatch = useDispatch();
  const { openCollections, collection, setChosenUid } = useChosenCollection();
  const collectionPath = collection?.pathname;
  const { saved, drafts, loaded, error } = useCollectionFlows(collectionPath);
  const [collapsedFolders, setCollapsedFolders] = useState([]);
  const [dialog, setDialog] = useState(null);

  const flows = useMemo(() => Object.values({ ...saved, ...drafts }), [saved, drafts]);
  const groups = useMemo(() => groupFlowsByFolder(flows), [flows]);
  const folders = useMemo(() => listFolders(flows), [flows]);

  const closeDialog = () => setDialog(null);

  const run = async (action) => {
    try {
      await action();
      closeDialog();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCreate = (values) =>
    run(async () => openFlowTab(dispatch, collection, await createFlow(collectionPath, values)));

  const handleRename = (values) => run(() => renameFlow(collectionPath, dialog.flow.id, values));

  const handleDelete = () =>
    run(async () => {
      await deleteFlow(collectionPath, dialog.flow.id);
      closeFlowTab(dispatch, collection, dialog.flow.id);
    });

  const toggleFolder = (folder) =>
    setCollapsedFolders((list) => (list.includes(folder) ? list.filter((item) => item !== folder) : [...list, folder]));

  const open = (flow) => openFlowTab(dispatch, collection, flow);
  const askRename = (flow) => setDialog({ kind: 'rename', flow });
  const askDelete = (flow) => setDialog({ kind: 'delete', flow });

  const actions = (
    <ActionIcon label="New flow" disabled={!collection || Boolean(error)} onClick={() => setDialog({ kind: 'create' })} data-testid="flow-new">
      <IconPlus size={14} stroke={1.5} aria-hidden="true" />
    </ActionIcon>
  );

  const renderBody = () => {
    if (!collection) return <p className="muted">Open a collection to see its flows.</p>;
    if (error) return <p className="error" data-testid="flows-error">{error}</p>;
    if (!loaded) return <p className="muted">Loading flows...</p>;
    if (!flows.length) return <p className="muted">No flows in this collection yet.</p>;

    return groups.map(({ folder, flows: items }) => {
      const collapsed = collapsedFolders.includes(folder);
      return (
        <div key={folder}>
          {folder ? (
            <button type="button" className="flow-folder fork-no-translate" onClick={() => toggleFolder(folder)}>
              {collapsed ? <IconChevronRight size={12} stroke={1.5} /> : <IconChevronDown size={12} stroke={1.5} />}
              {folder}
            </button>
          ) : null}
          {collapsed
            ? null
            : items.map((flow) => (
                <FlowRow key={flow.id} flow={flow} nested={Boolean(folder)} onOpen={open} onRename={askRename} onDelete={askDelete} />
              ))}
        </div>
      );
    });
  };

  return (
    <SidebarSection id={FLOWS_SECTION_ID} title="Flows" icon={IconRoute} actions={actions}>
      <CollectionPicker openCollections={openCollections} collection={collection} onChange={setChosenUid} />
      <StyledWrapper data-testid="flows-panel">{renderBody()}</StyledWrapper>
      {dialog?.kind === 'create' ? (
        <FlowFormModal title="New flow" confirmText="Create" folders={folders} onCancel={closeDialog} onSubmit={handleCreate} />
      ) : null}
      {dialog?.kind === 'rename' ? (
        <FlowFormModal
          title="Rename flow"
          confirmText="Save"
          initialName={dialog.flow.name}
          initialFolder={dialog.flow.folder}
          folders={folders}
          onCancel={closeDialog}
          onSubmit={handleRename}
        />
      ) : null}
      {dialog?.kind === 'delete' ? (
        <Modal size="sm" title="Delete flow" confirmText="Delete" confirmButtonColor="danger" handleConfirm={handleDelete} handleCancel={closeDialog}>
          <p>Delete this flow? It is removed from the collection file.</p>
          <p className="mt-2 font-medium fork-no-translate">{dialog.flow.name}</p>
        </Modal>
      ) : null}
    </SidebarSection>
  );
};

const FlowsSection = () => {
  const enabled = useForkSetting(FORK_SETTINGS.FLOWS);
  const { setSectionExpanded } = useSidebarAccordion();

  // A hidden section must not keep its share of the sidebar height.
  useEffect(() => {
    if (!enabled) setSectionExpanded(FLOWS_SECTION_ID, false);
  }, [enabled, setSectionExpanded]);

  return enabled ? <FlowsPanel /> : null;
};

export default FlowsSection;
