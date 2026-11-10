import React from 'react';
import { IconArrowBackUp, IconArrowForwardUp, IconDeviceFloppy, IconLayoutDistributeHorizontal, IconMaximize, IconPlus } from '@tabler/icons';

const ToolButton = ({ icon: Icon, label, onClick, disabled, children, testId }) => (
  <button type="button" className="flow-tool" title={label} aria-label={label} disabled={disabled} onClick={onClick} data-testid={testId}>
    <Icon size={15} strokeWidth={1.75} />
    {children}
  </button>
);

const Toolbar = ({ dirty, canUndo, canRedo, message, onAdd, onUndo, onRedo, onTidy, onFit, onSave }) => (
  <div className="flow-toolbar" onMouseDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
    <ToolButton icon={IconPlus} label="Add a step" onClick={onAdd} testId="flow-add-step">
      <span>Add step</span>
    </ToolButton>
    <span className="flow-tool-separator" />
    <ToolButton icon={IconArrowBackUp} label="Undo" onClick={onUndo} disabled={!canUndo} testId="flow-undo" />
    <ToolButton icon={IconArrowForwardUp} label="Redo" onClick={onRedo} disabled={!canRedo} testId="flow-redo" />
    <ToolButton icon={IconLayoutDistributeHorizontal} label="Tidy up" onClick={onTidy} testId="flow-tidy">
      <span>Tidy up</span>
    </ToolButton>
    <ToolButton icon={IconMaximize} label="Show the whole flow" onClick={onFit} testId="flow-fit" />
    <span className="flow-tool-spacer" />
    {message ? <span className="flow-tool-message">{message}</span> : null}
    {dirty ? <span className="flow-tool-unsaved">Unsaved changes</span> : null}
    <ToolButton icon={IconDeviceFloppy} label="Save" onClick={onSave} disabled={!dirty} testId="flow-save">
      <span>Save</span>
    </ToolButton>
  </div>
);

export default Toolbar;
