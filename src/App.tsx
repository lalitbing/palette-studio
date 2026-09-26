import { useCallback, useEffect, useRef, useState } from "react";
import SingleColor from "./SingleColor";
import {
  HARMONIES,
  copyToClipboard,
  generatePalette,
  mixHex,
  normalizeHex,
  paletteFromHash,
  paletteToHash,
  randomHex,
  toCssVars,
  type Harmony,
  type Swatch,
} from "./utils";

const MIN_COLORS = 2;
const MAX_COLORS = 10;
const DEFAULT_COUNT = 5;
const HISTORY_LIMIT = 100;

type History = { past: Swatch[][]; present: Swatch[]; future: Swatch[][] };

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["Space"], label: "Generate a new palette" },
  { keys: ["←", "→"], label: "Select previous / next color" },
  { keys: ["1–9"], label: "Jump to color" },
  { keys: ["Shift", "←/→"], label: "Move selected color" },
  { keys: ["L"], label: "Lock / unlock selected color" },
  { keys: ["C"], label: "Copy selected hex" },
  { keys: ["E"], label: "Edit selected hex" },
  { keys: ["A"], label: "Add color after selected" },
  { keys: ["⌫"], label: "Remove selected color" },
  { keys: ["H"], label: "Cycle harmony" },
  { keys: ["⌘/Ctrl", "Z"], label: "Undo" },
  { keys: ["⌘/Ctrl", "Shift", "Z"], label: "Redo" },
  { keys: ["Shift", "C"], label: "Copy all hex codes" },
  { keys: ["S"], label: "Copy share link" },
  { keys: ["?"], label: "Show shortcuts" },
];

function initialPalette(): Swatch[] {
  const fromUrl =
    typeof window !== "undefined" ? paletteFromHash(window.location.hash) : null;
  if (fromUrl) return fromUrl;
  return generatePalette(
    Array.from({ length: DEFAULT_COUNT }, () => ({ hex: "#000000", locked: false })),
    "auto"
  );
}

function App() {
  const [history, setHistory] = useState<History>(() => ({
    past: [],
    present: initialPalette(),
    future: [],
  }));
  const palette = history.present;
  const [harmony, setHarmony] = useState<Harmony>("auto");
  const [selected, setActiveIndex] = useState(0);
  // Undo/redo can shrink the palette under the selection — clamp on read.
  const activeIndex = Math.min(selected, palette.length - 1);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string; id: number } | null>(null);

  const exportRef = useRef<HTMLDivElement>(null);
  const helpCloseRef = useRef<HTMLButtonElement>(null);

  /* ---------- state helpers ---------- */
  const commit = useCallback((updater: (p: Swatch[]) => Swatch[]) => {
    setHistory((h) => {
      const next = updater(h.present);
      if (next === h.present) return h;
      return {
        past: [...h.past, h.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((h) =>
      h.past.length
        ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
        : h
    );
  }, []);

  const redo = useCallback(() => {
    setHistory((h) =>
      h.future.length
        ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
        : h
    );
  }, []);

  const notify = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message, id: Date.now() });
  }, []);

  const generate = useCallback(() => {
    setEditingIndex(null);
    commit((p) => {
      if (p.every((s) => s.locked)) return p;
      return generatePalette(p, harmony);
    });
  }, [commit, harmony]);

  const toggleLock = useCallback(
    (index: number) =>
      commit((p) => p.map((c, i) => (i === index ? { ...c, locked: !c.locked } : c))),
    [commit]
  );

  const setHex = useCallback(
    (index: number, hex: string) =>
      commit((p) => (p[index]?.hex === hex ? p : p.map((c, i) => (i === index ? { ...c, hex } : c)))),
    [commit]
  );

  const moveColor = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= palette.length || from === to) return;
      commit((p) => {
        const next = [...p];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        return next;
      });
      setActiveIndex(to);
    },
    [commit, palette.length]
  );

  const addColor = useCallback(
    (afterIndex: number) => {
      if (palette.length >= MAX_COLORS) {
        notify("error", `Palettes max out at ${MAX_COLORS} colors`);
        return;
      }
      commit((p) => {
        const left = p[afterIndex];
        const right = p[afterIndex + 1];
        const hex = left && right ? mixHex(left.hex, right.hex) : randomHex();
        const next = [...p];
        next.splice(afterIndex + 1, 0, { hex, locked: false });
        return next;
      });
      setActiveIndex(afterIndex + 1);
    },
    [commit, notify, palette.length]
  );

  const removeColor = useCallback(
    (index: number) => {
      if (palette.length <= MIN_COLORS) {
        notify("error", `Keep at least ${MIN_COLORS} colors`);
        return;
      }
      commit((p) => p.filter((_, i) => i !== index));
      setActiveIndex((a) => Math.max(0, Math.min(palette.length - 2, a > index ? a - 1 : a)));
    },
    [commit, notify, palette.length]
  );

  const onCopy = useCallback(
    async (text: string, label?: string) => {
      const ok = await copyToClipboard(text);
      notify(ok ? "success" : "error", ok ? `Copied ${label ?? text}` : "Clipboard blocked by browser");
    },
    [notify]
  );

  const shareUrl = () =>
    `${window.location.origin}${window.location.pathname}#${paletteToHash(palette)}`;

  const exportOptions = [
    { label: "HEX list", hint: "#FF6B6B, …", run: () => onCopy(palette.map((c) => c.hex).join(", "), "hex codes") },
    { label: "CSS variables", hint: ":root { … }", run: () => onCopy(toCssVars(palette), "CSS variables") },
    { label: "JSON array", hint: '["#…"]', run: () => onCopy(JSON.stringify(palette.map((c) => c.hex)), "JSON") },
    { label: "Share link", hint: "URL", run: () => onCopy(shareUrl(), "share link") },
  ];

  const cycleHarmony = (dir: 1 | -1) => {
    const i = HARMONIES.findIndex((x) => x.id === harmony);
    const next = HARMONIES[(i + dir + HARMONIES.length) % HARMONIES.length];
    setHarmony(next.id);
    notify("success", `Harmony: ${next.label}`);
  };

  /* ---------- keyboard ---------- */
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  const handleKey = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const isTyping =
      !!target &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);

    if (e.key === "Escape") {
      if (helpOpen) setHelpOpen(false);
      if (exportOpen) setExportOpen(false);
      return;
    }
    if (isTyping || helpOpen) return;

    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();

    if (mod) {
      if (key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((key === "z" && e.shiftKey) || key === "y") { e.preventDefault(); redo(); }
      return;
    }
    if (e.altKey) return;

    const last = palette.length - 1;
    const handled = () => e.preventDefault();

    switch (e.key) {
      case " ":
        handled(); generate(); return;
      case "ArrowRight":
      case "ArrowDown":
        handled();
        if (e.shiftKey) moveColor(activeIndex, activeIndex + 1);
        else setActiveIndex(Math.min(last, activeIndex + 1));
        return;
      case "ArrowLeft":
      case "ArrowUp":
        handled();
        if (e.shiftKey) moveColor(activeIndex, activeIndex - 1);
        else setActiveIndex(Math.max(0, activeIndex - 1));
        return;
      case "Home": handled(); setActiveIndex(0); return;
      case "End": handled(); setActiveIndex(last); return;
      case "Backspace":
      case "Delete":
        handled(); removeColor(activeIndex); return;
      case "?":
        handled(); setHelpOpen(true); return;
    }

    if (/^[1-9]$/.test(e.key)) {
      const i = Number(e.key) - 1;
      if (i <= last) { handled(); setActiveIndex(i); }
      return;
    }

    switch (key) {
      case "l": handled(); toggleLock(activeIndex); return;
      case "c":
        handled();
        if (e.shiftKey) exportOptions[0].run();
        else onCopy(palette[activeIndex].hex);
        return;
      case "e": handled(); setEditingIndex(activeIndex); return;
      case "a":
      case "+":
      case "=":
        handled(); addColor(activeIndex); return;
      case "-":
        handled(); removeColor(activeIndex); return;
      case "h": handled(); cycleHarmony(e.shiftKey ? -1 : 1); return;
      case "s": handled(); exportOptions[3].run(); return;
    }
  };

  useEffect(() => {
    keyHandlerRef.current = handleKey;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* ---------- effects ---------- */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const hash = `#${paletteToHash(palette)}`;
    if (window.location.hash !== hash) replaceHash(hash);
  }, [palette]);

  useEffect(() => {
    const onHash = () => {
      const p = paletteFromHash(window.location.hash);
      if (p && paletteToHash(p) !== paletteToHash(palette)) commit(() => p);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [commit, palette]);

  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    exportRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
    return () => window.removeEventListener("pointerdown", onDown);
  }, [exportOpen]);

  useEffect(() => {
    if (helpOpen) helpCloseRef.current?.focus();
  }, [helpOpen]);

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=menuitem]"));
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    e.stopPropagation();
  };

  const allLocked = palette.every((c) => c.locked);

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <img className="brand__logo" src="/favicon.svg" alt="" draggable={false} />
          <span className="brand__title">Palette Studio</span>
        </div>

        <p className="topbar__hint" aria-hidden="true">
          Press <kbd className="kbd">Space</kbd> to generate
          <span className="topbar__hint-sep">·</span>
          <button type="button" className="link-btn" onClick={() => setHelpOpen(true)}>
            <kbd className="kbd">?</kbd> shortcuts
          </button>
        </p>

        <div className="toolbar">
          <label className="harmony">
            <span className="sr-only">Harmony</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="harmony__icon">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="5.5" r="2" /><circle cx="17.6" cy="15.2" r="2" /><circle cx="6.4" cy="15.2" r="2" />
            </svg>
            <select
              className="harmony__select"
              value={harmony}
              onChange={(e) => setHarmony(e.target.value as Harmony)}
              title="Color harmony (H)"
            >
              {HARMONIES.map((h) => (
                <option key={h.id} value={h.id}>{h.label}</option>
              ))}
            </select>
          </label>

          <span className="toolbar__divider" aria-hidden="true" />

          <button className="tool-btn" type="button" onClick={undo} disabled={!history.past.length} aria-label="Undo" title="Undo (⌘Z)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>
          </button>
          <button className="tool-btn" type="button" onClick={redo} disabled={!history.future.length} aria-label="Redo" title="Redo (⇧⌘Z)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 14 5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></svg>
          </button>

          <span className="toolbar__divider" aria-hidden="true" />

          <div className="menu" ref={exportRef}>
            <button
              className="tool-btn tool-btn--label"
              type="button"
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              onClick={() => setExportOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg>
              <span>Export</span>
            </button>
            {exportOpen && (
              <div className="menu__list" role="menu" aria-label="Copy palette as" onKeyDown={onMenuKeyDown}>
                <div className="menu__heading">Copy as</div>
                {exportOptions.map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    role="menuitem"
                    className="menu__item"
                    onClick={() => { o.run(); setExportOpen(false); }}
                  >
                    <span>{o.label}</span>
                    <span className="menu__hint">{o.hint}</span>
                  </button>
                ))}
                <div className="menu__swatches" aria-hidden="true">
                  {palette.map((c, i) => <span key={i} style={{ background: c.hex }} />)}
                </div>
              </div>
            )}
          </div>

          <button className="tool-btn tool-btn--help" type="button" onClick={() => setHelpOpen(true)} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M6.5 10h1M10.5 10h1M14.5 10h1M8 14h8" /></svg>
          </button>

          <button className="primary-btn" type="button" onClick={generate} disabled={allLocked} title="Generate (Space)">
            Generate
          </button>
        </div>
      </header>

      <main className="palette" aria-label="Palette">
        {palette.map((c, index) => (
          <SingleColor
            key={index}
            index={index}
            hex={c.hex}
            locked={c.locked}
            isActive={index === activeIndex}
            isEditing={index === editingIndex}
            isDragging={index === dragIndex}
            canRemove={palette.length > MIN_COLORS}
            canAdd={palette.length < MAX_COLORS}
            isLast={index === palette.length - 1}
            onSelect={() => setActiveIndex(index)}
            onToggleLock={() => toggleLock(index)}
            onCopy={() => onCopy(c.hex)}
            onRemove={() => removeColor(index)}
            onAddAfter={() => addColor(index)}
            onStartEdit={() => { setActiveIndex(index); setEditingIndex(index); }}
            onEndEdit={(value) => {
              setEditingIndex(null);
              if (value === null) return;
              const next = normalizeHex(value);
              if (next) setHex(index, next);
              else notify("error", "Enter a valid hex like #FF6B6B");
            }}
            onPick={(hex) => setHex(index, hex.toUpperCase())}
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => setDragIndex(null)}
            onDropOn={() => {
              if (dragIndex !== null) moveColor(dragIndex, index);
              setDragIndex(null);
            }}
          />
        ))}
      </main>

      <div className="mobile-bar">
        <button className="primary-btn primary-btn--block" type="button" onClick={generate} disabled={allLocked}>
          Generate
        </button>
      </div>

      {helpOpen && (
        <div className="overlay" onPointerDown={(e) => e.target === e.currentTarget && setHelpOpen(false)}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="help-title">
            <div className="dialog__header">
              <h2 id="help-title">Keyboard shortcuts</h2>
              <button ref={helpCloseRef} className="tool-btn" type="button" onClick={() => setHelpOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <ul className="shortcut-list">
              {SHORTCUTS.map((s) => (
                <li key={s.label}>
                  <span>{s.label}</span>
                  <span className="shortcut-keys">
                    {s.keys.map((k) => <kbd key={k} className="kbd">{k}</kbd>)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="dialog__foot">Shortcuts act on the selected color — click a column or use the arrow keys.</p>
          </div>
        </div>
      )}

      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className={`toast toast--${toast.type}`}>
            {toast.type === "success" ? (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5M12 16.5v.5" /></svg>
            )}
            {toast.message}
          </div>
        )}
      </div>
    </>
  );
}

function replaceHash(hash: string) {
  window.history.replaceState(null, "", hash);
}

export default App;
