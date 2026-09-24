import { useEffect, useRef, useState } from 'react';

export interface SoupOption {
  value: string;
  label: string;
  group?: string;
}

/** Searches this game's saved options; selecting a suggestion never submits a question. */
export default function SoupOptionInput({ id, options, value, onChange, disabled, placeholder }: {
  id: string;
  options: SoupOption[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  disabled: boolean;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const composing = useRef(false);
  const listRef = useRef<HTMLUListElement>(null);
  const needle = query.trim().toLocaleLowerCase();
  const matches = needle ? options.filter((option) => option.value !== '' &&
    [option.label, option.value].some((text) => text.toLocaleLowerCase().includes(needle))).slice(0, 10) : [];
  const visible = open && !disabled && matches.length > 0;
  const index = Math.min(active, Math.max(0, matches.length - 1));

  useEffect(() => {
    if (value !== undefined) setQuery(options.find((option) => option.value === value)?.label ?? value);
  }, [value, options]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => {
    if (visible) listRef.current?.children[index]?.scrollIntoView({ block: 'nearest' });
  }, [index, visible]);

  const update = (text: string) => {
    setQuery(text);
    setActive(0);
    setOpen(Boolean(text.trim()) && !composing.current);
    const normalized = text.trim().toLocaleLowerCase();
    onChange(normalized && !composing.current ? options.find((option) =>
      [option.label, option.value].some((label) => label.toLocaleLowerCase() === normalized))?.value : undefined);
  };
  const pick = (option: SoupOption) => {
    setQuery(option.label);
    onChange(option.value);
    setOpen(false);
  };

  return <div className="soup-option-input" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <input id={id} className="input" type="text" autoComplete="off" placeholder={placeholder}
      disabled={disabled} value={query} role="combobox" aria-autocomplete="list"
      aria-expanded={visible} aria-controls={visible ? `${id}-options` : undefined}
      aria-activedescendant={visible ? `${id}-option-${index}` : undefined}
      onChange={(event) => update(event.target.value)}
      onFocus={() => setOpen(Boolean(query.trim()))}
      onCompositionStart={() => { composing.current = true; setOpen(false); onChange(undefined); }}
      onCompositionEnd={(event) => { composing.current = false; update(event.currentTarget.value); }}
      onKeyDown={(event) => {
        if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) {
          if (event.key === 'Enter') event.preventDefault();
          return;
        }
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && matches.length) {
          event.preventDefault();
          setOpen(true);
          setActive(visible ? (index + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length : 0);
        }
        if (visible && (event.key === 'Enter' || event.key === 'Tab')) {
          // Enter completes the option first; another Enter or the Ask button submits.
          if (event.key === 'Enter') event.preventDefault();
          pick(matches[index]);
        }
      }} />
    {visible && <ul ref={listRef} className="autocomplete-list soup-option-list" id={`${id}-options`}
      role="listbox" aria-labelledby={id}>
      {matches.map((option, optionIndex) => <li key={option.value} id={`${id}-option-${optionIndex}`}
        role="option" aria-selected={optionIndex === index} className={optionIndex === index ? 'active' : undefined}
        tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => pick(option)}>
        <span>{option.label}</span>{option.group && <small>{option.group}</small>}
      </li>)}
    </ul>}
  </div>;
}
