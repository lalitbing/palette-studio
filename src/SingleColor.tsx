import { useEffect, useRef, useState } from "react";
import { contrastRatio, formatRgb, getReadableTextColor } from "./utils";

type Props = {
  index: number;
  hex: string;
  locked: boolean;
  isActive: boolean;
  isEditing: boolean;
  isDragging: boolean;
  canRemove: boolean;
  canAdd: boolean;
  isLast: boolean;
  onSelect: () => void;
  onToggleLock: () => void;
  onCopy: () => void;
  onRemove: () => void;
  onAddAfter: () => void;
  onStartEdit: () => void;
  onEndEdit: (value: string | null) => void;
  onPick: (hex: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropOn: () => void;
};

const Icon = ({ d, filled }: { d: string; filled?: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={filled ? "is-filled" : undefined}>
    <path d={d} />
  </svg>
);

const ICONS = {
  lockClosed: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z",
  lockOpen: "M7 11V8a5 5 0 0 1 9.6-2M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z",
  copy: "M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1ZM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1",
  remove: "M6 6l12 12M18 6 6 18",
  drag: "M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01",
  pick: "m14.5 5.5 4 4M4 20l1-4L15.5 5.5a2.1 2.1 0 0 1 3 3L8 19l-4 1Z",
  plus: "M12 5v14M5 12h14",
};

/** Mounted only while editing, so the draft starts fresh from the current hex. */
const HexInput = ({ initial, onEnd }: { initial: string; onEnd: (value: string | null) => void }) => {
  const [draft, setDraft] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  const endedRef = useRef(false);
  const end = (value: string | null) => {
    if (endedRef.current) return;
    endedRef.current = true;
    onEnd(value);
  };

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      className="swatch__input"
      value={draft}
      maxLength={7}
      spellCheck={false}
      autoComplete="off"
      aria-label="Hex value"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => end(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") end(draft);
        if (e.key === "Escape") end(null);
      }}
    />
  );
};

const SingleColor = (p: Props) => {
  const fg = getReadableTextColor(p.hex);
  const ratio = contrastRatio(p.hex, fg);
  const grade = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : "AA Large";
  const [dropTarget, setDropTarget] = useState(false);

  return (
    <section
      className={[
        "swatch",
        p.isActive && "is-active",
        p.locked && "is-locked",
        p.isDragging && "is-dragging",
        dropTarget && "is-drop-target",
      ].filter(Boolean).join(" ")}
      style={{ backgroundColor: p.hex, color: fg, ["--fg" as string]: fg }}
      aria-label={`Color ${p.index + 1}: ${p.hex}${p.locked ? ", locked" : ""}`}
      aria-current={p.isActive ? "true" : undefined}
      onPointerDown={p.onSelect}
      onDragOver={(e) => { e.preventDefault(); setDropTarget(true); }}
      onDragLeave={() => setDropTarget(false)}
      onDrop={(e) => { e.preventDefault(); setDropTarget(false); p.onDropOn(); }}
    >
      <div className="swatch__actions">
        <button
          type="button"
          className="swatch-btn"
          onClick={p.onRemove}
          disabled={!p.canRemove}
          aria-label={`Remove ${p.hex}`}
          title="Remove (⌫)"
        >
          <Icon d={ICONS.remove} />
        </button>
        <span
          className="swatch-btn swatch-btn--drag"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", p.hex);
            p.onDragStart();
          }}
          onDragEnd={p.onDragEnd}
          title="Drag to reorder (Shift + ←/→)"
          aria-hidden="true"
        >
          <Icon d={ICONS.drag} />
        </span>
        <button type="button" className="swatch-btn" onClick={p.onCopy} aria-label={`Copy ${p.hex}`} title="Copy hex (C)">
          <Icon d={ICONS.copy} />
        </button>
        <label className="swatch-btn" title="Pick a color">
          <Icon d={ICONS.pick} />
          <input
            type="color"
            className="swatch__picker"
            value={p.hex.toLowerCase()}
            onChange={(e) => p.onPick(e.target.value)}
            aria-label={`Pick color for swatch ${p.index + 1}`}
          />
        </label>
        <button
          type="button"
          className="swatch-btn swatch-btn--lock"
          onClick={p.onToggleLock}
          aria-pressed={p.locked}
          aria-label={p.locked ? `Unlock ${p.hex}` : `Lock ${p.hex}`}
          title={p.locked ? "Unlock (L)" : "Lock (L)"}
        >
          <Icon d={p.locked ? ICONS.lockClosed : ICONS.lockOpen} />
        </button>
      </div>

      <div className="swatch__info">
        {p.isEditing ? (
          <HexInput initial={p.hex} onEnd={p.onEndEdit} />
        ) : (
          <button type="button" className="swatch__hex" onClick={p.onStartEdit} title="Edit hex (E)">
            {p.hex.slice(1)}
          </button>
        )}
        <div className="swatch__meta">
          <span>RGB {formatRgb(p.hex)}</span>
          <span className="swatch__badge" title={`Text contrast ${ratio.toFixed(2)}:1`}>
            {grade} {ratio.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="swatch__index" aria-hidden="true">{p.index + 1}</div>

      {!p.isLast && p.canAdd && (
        <button
          type="button"
          className="swatch__insert"
          onClick={(e) => { e.stopPropagation(); p.onAddAfter(); }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`Insert color after ${p.hex}`}
          title="Insert blended color (A)"
        >
          <span className="swatch__insert-dot">
            <Icon d={ICONS.plus} />
          </span>
        </button>
      )}
    </section>
  );
};

export default SingleColor;
