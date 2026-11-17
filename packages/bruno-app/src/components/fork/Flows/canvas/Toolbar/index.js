import React from 'react';
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
  IconHelp,
  IconLayoutDistributeHorizontal,
  IconMaximize,
  IconPlayerPlay,
  IconPlayerSkipForward,
  IconPlayerStop,
  IconPlayerTrackNext,
  IconPlus,
  IconPuzzle,
  IconSend,
  IconStack
} from '@tabler/icons';

const ToolButton = ({ icon: Icon, label, onClick, disabled, children, testId, className = '' }) => (
  <button type="button" className={`flow-tool ${className}`} title={label} aria-label={label} disabled={disabled} onClick={onClick} data-testid={testId}>
    <Icon size={15} strokeWidth={1.75} />
    {children}
  </button>
);

// Where the flow is about to run is always in sight, next to the button that runs it.
const EnvironmentTag = ({ environment }) => (
  <span
    className={`flow-environment ${environment.sensitive ? 'sensitive' : ''}`}
    title={environment.sensitive ? 'Sensitive environment: running asks for confirmation first' : 'Environment the flow runs against'}
    data-testid="flow-environment"
  >
    {environment.sensitive ? <IconAlertTriangle size={12} strokeWidth={2.25} /> : null}
    {environment.name ? <span className="fork-no-translate">{environment.name}</span> : <span>No environment</span>}
  </span>
);

const RunTools = ({ run }) => (
  <>
    {run.isRunning ? (
      <ToolButton icon={IconPlayerStop} label="Stop the run" onClick={run.onStop} className="stop" testId="flow-stop">
        <span>Stop</span>
      </ToolButton>
    ) : (
      <ToolButton icon={IconPlayerPlay} label="Run the flow from Start" onClick={run.onRun} className="run" testId="flow-run">
        <span>Run</span>
      </ToolButton>
    )}
    {run.canContinue && !run.isRunning ? (
      <ToolButton icon={IconPlayerTrackNext} label="Continue from where it stopped" onClick={run.onContinue} testId="flow-continue">
        <span>Continue</span>
      </ToolButton>
    ) : null}
    <ToolButton icon={IconPlayerSkipForward} label="Run one step and pause" onClick={run.onStep} disabled={run.isRunning} testId="flow-step">
      <span>Step</span>
    </ToolButton>
    <EnvironmentTag environment={run.environment} />
    <span className="flow-tool-separator" />
  </>
);

// Someone else saved this flow (a git pull brought it) while it has unsaved edits here.
const StaleWarning = ({ onDiscard }) => (
  <>
    <span className="flow-tool-message" title="Saving replaces the version that arrived. Discard your changes to see it." data-testid="flow-stale">
      This flow changed in the collection while you were editing it
    </span>
    <button type="button" className="flow-tool wordy" onClick={onDiscard} data-testid="flow-discard">
      <span>Discard my changes</span>
    </button>
  </>
);

const Toolbar = ({ run, dirty, stale, canUndo, canRedo, message, valueCablesShown, onValueCables, onAdd, onAddRequest, onBlocks, onSaveBlock, onHelp, onUndo, onRedo, onTidy, onFit, onSave, onDiscard }) => (
  <div className="flow-toolbar" onMouseDown={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}>
    <RunTools run={run} />
    <ToolButton icon={IconPlus} label="Add a step" onClick={onAdd} testId="flow-add-step" className="secondary">
      <span>Add step</span>
    </ToolButton>
    <ToolButton icon={IconSend} label="Add a request of the collection" onClick={onAddRequest} testId="flow-add-request" className="secondary">
      <span>Add request</span>
    </ToolButton>
    <ToolButton icon={IconStack} label="Add steps that are already built" onClick={onBlocks} testId="flow-blocks" className="secondary">
      <span>Blocks</span>
    </ToolButton>
    <span className="flow-tool-separator" />
    <ToolButton icon={IconArrowBackUp} label="Undo" onClick={onUndo} disabled={!canUndo} testId="flow-undo" />
    <ToolButton icon={IconArrowForwardUp} label="Redo" onClick={onRedo} disabled={!canRedo} testId="flow-redo" />
    <ToolButton icon={IconLayoutDistributeHorizontal} label="Tidy up" onClick={onTidy} testId="flow-tidy" className="secondary">
      <span>Tidy up</span>
    </ToolButton>
    <ToolButton icon={IconMaximize} label="Show the whole flow" onClick={onFit} testId="flow-fit" />
    <ToolButton
      icon={valueCablesShown ? IconEye : IconEyeOff}
      label={valueCablesShown ? 'Value cables: all in sight. Click to see only the ones of the step you point at' : 'Value cables: only the ones of the step you point at. Click to see them all'}
      onClick={onValueCables}
      testId="flow-value-cables"
    />
    {onSaveBlock ? (
      <ToolButton icon={IconPuzzle} label="Keep the selected steps as a block to use again" onClick={onSaveBlock} testId="flow-save-block" className="secondary">
        <span>Save as block</span>
      </ToolButton>
    ) : null}
    <span className="flow-tool-spacer" />
    {message ? <span className="flow-tool-message">{message}</span> : null}
    {stale ? <StaleWarning onDiscard={onDiscard} /> : null}
    {dirty && !stale ? <span className="flow-tool-unsaved">Unsaved changes</span> : null}
    <ToolButton icon={IconHelp} label="How flows work" onClick={onHelp} testId="flow-help-button" />
    <ToolButton icon={IconDeviceFloppy} label="Save" onClick={onSave} disabled={!dirty} testId="flow-save">
      <span>Save</span>
    </ToolButton>
  </div>
);

export default Toolbar;
