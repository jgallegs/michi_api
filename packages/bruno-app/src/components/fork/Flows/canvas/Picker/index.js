import React, { useEffect, useMemo, useRef, useState } from 'react';
import { translatePhrase } from 'components/fork/SpanishUi';

// Interface words are searched in both languages, whichever one is on screen.
const inSpanish = (text, isInterface) => (isInterface && translatePhrase(text)) || '';

const matches = (option, words) => {
  const text = [
    option.label,
    inSpanish(option.label, option.translate),
    option.hint,
    inSpanish(option.hint, option.translateHint),
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
// turns what was typed into more options, for choices that are not in the list. "tabs" splits what
// can be picked into kinds, each with its own list.
const Picker = ({ title, options, position, placeholder = 'Search', emptyText = 'Nothing to choose from', custom, tabs, tab, onTab, onPick, onClose }) => {
  const ref = useRef(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const visible = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const found = options.filter((option) => matches(option, words));
    const typed = custom && query.trim() ? [].concat(custom(query.trim()) || []) : [];
    const all = [...found, ...typed.filter((option) => !found.some((known) => known.id === option.id))];
    // What is called exactly like what was typed goes first, so Enter takes it.
    const wanted = query.trim().toLowerCase();
    const isExact = (option) => option.label.toLowerCase() === wanted || inSpanish(option.label, option.translate).toLowerCase() === wanted;
    return [...all.filter(isExact), ...all.filter((option) => !isExact(option))];
  }, [options, query, custom]);

  // Another tab is another list: it starts from its first option.
  useEffect(() => setActive(0), [tab]);

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
    } else if (event.key === 'Tab' && tabs) {
      // Tab goes to the next kind of thing to pick, and back to the first after the last.
      event.preventDefault();
      const at = tabs.findIndex((item) => item.id === tab);
      onTab(tabs[(at + (event.shiftKey ? tabs.length - 1 : 1)) % tabs.length].id);
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
      {tabs ? (
        <div className="flow-picker-tabs">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`flow-picker-tab ${item.id === tab ? 'active' : ''}`}
              // The search box keeps the keyboard, so what is typed next still filters the list.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onTab(item.id)}
              data-testid={`flow-picker-tab-${item.id}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
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
              {option.hint ? <span className={`flow-picker-hint ${option.translateHint ? '' : 'fork-no-translate'}`}>{option.hint}</span> : null}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Picker;
