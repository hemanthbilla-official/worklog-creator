import { useState, useRef, useEffect, type KeyboardEvent } from "react";

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

export default function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className = "field",
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered =
    value.trim().length >= 2
      ? suggestions.filter(
          (s) =>
            s.toLowerCase().startsWith(value.trim().toLowerCase()) &&
            s.toLowerCase() !== value.trim().toLowerCase(),
        )
      : [];

  const showMenu = open && filtered.length > 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setActiveIdx(-1);
  }, [filtered.length]);

  const accept = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showMenu) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((prev) => (prev <= 0 ? filtered.length - 1 : prev - 1));
    } else if (e.key === "Tab" || e.key === "Enter") {
      if (activeIdx >= 0 && activeIdx < filtered.length) {
        e.preventDefault();
        accept(filtered[activeIdx]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="autocomplete-shell">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        className={className}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showMenu}
      />
      {showMenu && (
        <ul className="autocomplete-menu" role="listbox">
          {filtered.slice(0, 8).map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={() => accept(s)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`autocomplete-option ${
                i === activeIdx ? "autocomplete-option-active" : ""
              }`}
            >
              <span className="autocomplete-match">
                {s.slice(0, value.trim().length)}
              </span>
              <span className="autocomplete-rest">
                {s.slice(value.trim().length)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
