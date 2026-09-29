import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Copy,
  DotsSixVertical,
  Eyedropper,
  LockSimple,
  LockSimpleOpen,
  Plus,
  X,
} from "@phosphor-icons/react";
import { contrastRatio, formatOklch, getReadableTextColor } from "./utils";

type Props = {
  index: number;
  hex: string;
  locked: boolean;
  reduceMotion: boolean;
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

const ICON = { size: 20, weight: "regular" } as const;

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
    <motion.section
      layout={!p.reduceMotion}
      initial={p.reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: p.isDragging ? 0.4 : 1 }}
      transition={{ layout: { type: "spring", stiffness: 420, damping: 42 }, opacity: { duration: 0.2 } }}
      className={[
        "swatch",
        p.isActive && "is-active",
        p.locked && "is-locked",
        dropTarget && "is-drop-target",
      ].filter(Boolean).join(" ")}
      style={{ backgroundColor: p.hex, color: fg, ["--fg" as string]: fg, ["--swatch-bg" as string]: p.hex }}
      aria-label={`Color ${p.index + 1}: ${p.hex}${p.locked ? ", locked" : ""}`}
      aria-current={p.isActive ? "true" : undefined}
      onPointerDown={p.onSelect}
      onDragOver={(e) => { e.preventDefault(); setDropTarget(true); }}
      onDragLeave={() => setDropTarget(false)}
      onDrop={(e) => { e.preventDefault(); setDropTarget(false); p.onDropOn(); }}
    >
      <div className="swatch__top">
        <span className="swatch__index" aria-hidden="true">{p.index + 1}</span>
        {p.locked && <LockSimple className="swatch__lock-mark" size={16} weight="fill" aria-hidden="true" />}
      </div>

      <div className="swatch__actions">
        <button
          type="button"
          className="swatch-btn"
          onClick={p.onRemove}
          disabled={!p.canRemove}
          aria-label={`Remove ${p.hex}`}
          title="Remove (⌫)"
        >
          <X {...ICON} />
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
          <DotsSixVertical {...ICON} weight="bold" />
        </span>
        <button type="button" className="swatch-btn" onClick={p.onCopy} aria-label={`Copy ${p.hex}`} title="Copy hex (C)">
          <Copy {...ICON} />
        </button>
        <label className="swatch-btn" title="Pick a color">
          <Eyedropper {...ICON} />
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
          {p.locked ? <LockSimple {...ICON} weight="fill" /> : <LockSimpleOpen {...ICON} />}
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
        <dl className="swatch__meta">
          <div>
            <dt>OKLCH</dt>
            <dd>{formatOklch(p.hex)}</dd>
          </div>
          <div title={`Text contrast ${ratio.toFixed(2)}:1`}>
            <dt>Contrast</dt>
            <dd>{ratio.toFixed(1)} {grade}</dd>
          </div>
        </dl>
      </div>

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
            <Plus size={16} weight="bold" />
          </span>
        </button>
      )}
    </motion.section>
  );
};

export default SingleColor;
