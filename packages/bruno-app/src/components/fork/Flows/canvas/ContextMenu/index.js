import React, { useEffect, useRef } from 'react';

// The menu of the right button on the canvas: what can be added where the pointer is.
const ContextMenu = ({ position, items, onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    const onMouseDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="flow-menu flow-overlay"
      style={{ left: position.x, top: position.y }}
      onMouseDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
      data-testid="flow-menu"
    >
      {items.map(({ id, label, icon: Icon, onPick }) => (
        <button
          key={id}
          type="button"
          className="flow-menu-item"
          data-testid={`flow-menu-${id}`}
          onClick={() => {
            onClose();
            onPick();
          }}
        >
          <Icon size={15} strokeWidth={1.75} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;
