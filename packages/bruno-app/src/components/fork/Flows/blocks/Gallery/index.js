import React, { useState } from 'react';
import { IconPuzzle, IconTrash, IconX } from '@tabler/icons';
import { STEP_ICONS } from '../../canvas/Piece';
import { stepTypesOf } from '../building';
import { BLOCK_GROUPS } from '../catalog';

const MAX_ICONS = 7;

const stop = (event) => event.stopPropagation();

// A block drawn small: the kinds of step it brings, in order.
const Summary = ({ block }) => (
  <span className="flow-block-summary" aria-hidden="true">
    {stepTypesOf(block)
      .slice(0, MAX_ICONS)
      .map((type, index) => {
        const Icon = STEP_ICONS[type] || IconPuzzle;
        return <Icon key={index} size={13} strokeWidth={1.75} />;
      })}
  </span>
);

const OwnBlock = ({ block, confirming, onPick, onAskDelete, onCancelDelete, onDelete }) => (
  <div className="flow-block-card own" data-testid="flow-own-block">
    <button type="button" className="flow-block-pick" onClick={() => onPick({ kind: 'own', block })}>
      <Summary block={block} />
      <span className="flow-block-title fork-no-translate">{block.name}</span>
    </button>
    {confirming ? (
      <button type="button" className="flow-block-delete" autoFocus onClick={() => onDelete(block.id)} onBlur={onCancelDelete} data-testid="flow-own-block-delete">
        Delete
      </button>
    ) : (
      <button type="button" className="flow-icon-button" aria-label="Delete this block" title="Delete this block" onClick={() => onAskDelete(block.id)}>
        <IconTrash size={13} strokeWidth={1.75} />
      </button>
    )}
  </div>
);

// What a new flow opens with, and what "Blocks" brings back later: everything that can be dropped on the
// canvas already built, named after what it is for.
const Gallery = ({ ownBlocks, startsFlow, onPick, onDeleteOwn, onClose }) => {
  const [confirming, setConfirming] = useState(null);

  return (
    <div className="flow-gallery flow-overlay" onMouseDown={stop} onDoubleClick={stop} data-testid="flow-gallery">
      <div className="flow-gallery-header">
        <div>
          <div className="flow-gallery-title">What do you want to do?</div>
          <div className="flow-gallery-subtitle">Pick one and it lands on the canvas already connected. You only fill in the blanks.</div>
        </div>
        <button type="button" className="flow-icon-button" aria-label="Close" title="Close" onClick={onClose} data-testid="flow-gallery-close">
          <IconX size={14} strokeWidth={2} />
        </button>
      </div>
      <div className="flow-gallery-body">
        {BLOCK_GROUPS.map((group) => (
          <section key={group.title}>
            <div className="flow-gallery-group">{group.title}</div>
            <div className="flow-gallery-cards">
              {group.blocks.map((block) => (
                <button key={block.id} type="button" className="flow-block-card" onClick={() => onPick({ kind: 'ready', block })} data-testid={`flow-block-${block.id}`}>
                  <Summary block={block} />
                  <span className="flow-block-title">{block.title}</span>
                  <span className="flow-block-description">{block.description}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
        <section>
          <div className="flow-gallery-group">My blocks</div>
          {ownBlocks.length ? (
            <div className="flow-gallery-cards">
              {ownBlocks.map((block) => (
                <OwnBlock
                  key={block.id}
                  block={block}
                  confirming={confirming === block.id}
                  onPick={onPick}
                  onAskDelete={setConfirming}
                  onCancelDelete={() => setConfirming(null)}
                  onDelete={onDeleteOwn}
                />
              ))}
            </div>
          ) : (
            <div className="flow-gallery-note">
              Select some steps on the canvas and press Save as block to keep them here, with their requests already chosen. Everyone who has the collection gets them.
            </div>
          )}
        </section>
      </div>
      {startsFlow ? (
        <div className="flow-gallery-footer">
          <button type="button" className="flow-tool" onClick={onClose} data-testid="flow-gallery-blank">
            <span>Start from scratch</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default Gallery;
