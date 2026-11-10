import React, { useEffect, useMemo, useRef, useState } from 'react';
import { translatePhrase } from 'components/fork/SpanishUi';

// Interface words are searched in both languages, whichever one is on screen.
const inSpanish = (text, isInterface) => (isInterface && translatePhrase(text)) || '';

const matches = (option, words) => {
  const text = [
    option.label,
    inSpanish(option.label, option.translate),
    option.hint,
    option.group,
    inSpanish(option.group, option.translateGroup),
    option.badge
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return words.every((word) => text.includes(word));
};

// Small floating list with a search box, used to pick a step, a request, a value or a field. "custom"
// turns what was typed into one more option, for choices that are not in the list.
const Picker = ({ title, options, position, placeholder = 'Search', emptyText = 'Nothing to choose from', custom, onPick, onClose }) => {
  const ref = useRef(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const visible = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const found = options.filter((option) => matches(option, words));
    const typed = custom && query.trim() ? custom(query.trim()) : null;
    return typed && !found.some((option) => option.id === typed.id) ? [...found, typed] : found;
  }, [options, query, custom]);

  useEffect(() => {
    const onMouseDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', onMouseDown, true);
    return () => document.removeEventListener('mousedown', onMouseDown, true);
  }, [onClose]);

  const onKeyDown = (event) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      onClose();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => (visible.length ? (current + step + visible.length) % visible.length : 0));
    } else if (event.key === 'Enter' && visible[active]) {
      onPick(visible[active]);
    }
  };

  return (
    <div
      ref={ref}
      className="flow-picker flow-overlay"
      style={{ left: position.x, top: position.y }}
      onKeyDown={onKeyDown}
      onMouseDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      data-testid="flow-picker"
    >
      {title ? <div className="flow-picker-title">{title}</div> : null}
      <input
        autoFocus
        className="flow-picker-search"
        value={query}
        placeholder={placeholder}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
      />
      <div className="flow-picker-list">
        {visible.length === 0 ? <div className="flow-picker-empty">{emptyText}</div> : null}
        {visible.map((option, index) => (
          <React.Fragment key={option.id}>
            {option.group && option.group !== visible[index - 1]?.group ? <div className={`flow-picker-group ${option.translateGroup ? '' : 'fork-no-translate'}`}>{option.group}</div> : null}
            <button
              type="button"
              className={`flow-picker-option ${index === active ? 'active' : ''}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => onPick(option)}
            >
              {option.badge ? <span className="flow-picker-badge fork-no-translate">{option.badge}</span> : null}
              <span className={`flow-picker-label ${option.translate ? '' : 'fork-no-translate'}`}>{option.label}</span>
              {option.hint ? <span className="flow-picker-hint fork-no-translate">{option.hint}</span> : null}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Picker;
