import { useState, useRef, useEffect } from "react";

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

  // Filter suggestions: case-insensitive prefix match, exclude exact match
  const filtered =
    value.trim().length >= 2
      ? suggestions.filter(
          (s) =>
            s.toLowerCase().startsWith(value.trim().toLowerCase()) &&
            s.toLowerCase() !== value.trim().toLowerCase(),
        )
      : [];

  const showMenu = open && filtered.length > 0;

  // Close on outside click
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

  // Reset active index when filtered list changes
  useEffect(() => {
    setActiveIdx(-1);
  }, [filtered.length]);

  const accept = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
    <div ref={wrapperRef} className="relative">
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
      />
      {showMenu && (
        <ul
          className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg border bg-white shadow-lg"
          style={{
            borderColor: "var(--border)",
          }}
        >
          {filtered.slice(0, 8).map((s, i) => (
            <li
              key={s}
              onMouseDown={() => accept(s)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                i === activeIdx
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="font-medium">
                {s.slice(0, value.trim().length)}
              </span>
              <span className="text-gray-400">
                {s.slice(value.trim().length)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
