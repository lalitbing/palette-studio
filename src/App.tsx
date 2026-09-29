import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  CaretDown,
  CheckCircle,
  Export,
  Keyboard,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import SingleColor from "./SingleColor";
import {
  HARMONIES,
  copyToClipboard,
  generatePalette,
  mixHex,
  newSwatchId,
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

const SHORTCUT_GROUPS: { title: string; items: { keys: string[]; label: string }[] }[] = [
  {
    title: "Generate",
    items: [
      { keys: ["Space"], label: "New palette" },
      { keys: ["H"], label: "Next harmony" },
      { keys: ["Shift", "H"], label: "Previous harmony" },
      { keys: ["⌘", "Z"], label: "Undo" },
      { keys: ["⌘", "Shift", "Z"], label: "Redo" },
    ],
  },
  {
    title: "Arrange",
    items: [
      { keys: ["←", "→"], label: "Select color" },
      { keys: ["1-9"], label: "Jump to color" },
      { keys: ["Shift", "←", "→"], label: "Move color" },
      { keys: ["A"], label: "Add color" },
      { keys: ["⌫"], label: "Remove color" },
    ],
  },
  {
    title: "Color",
    items: [
      { keys: ["L"], label: "Lock or unlock" },
      { keys: ["C"], label: "Copy hex" },
      { keys: ["Shift", "C"], label: "Copy all hex" },
      { keys: ["E"], label: "Edit hex" },
      { keys: ["S"], label: "Copy share link" },
    ],
  },
];

const EASE = [0.16, 1, 0.3, 1] as const;

function initialPalette(): Swatch[] {
  const fromUrl =
    typeof window !== "undefined" ? paletteFromHash(window.location.hash) : null;
  if (fromUrl) return fromUrl;
  return generatePalette(
    Array.from({ length: DEFAULT_COUNT }, () => ({ id: newSwatchId(), hex: "#000000", locked: false })),
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
  // Undo/redo can shrink the palette under the selection, so clamp on read.
  const activeIndex = Math.min(selected, palette.length - 1);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string; id: number } | null>(null);
  const reduceMotion = useReducedMotion();

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
        next.splice(afterIndex + 1, 0, { id: newSwatchId(), hex, locked: false });
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
    { label: "CSS variables", hint: ":root {…}", run: () => onCopy(toCssVars(palette), "CSS variables") },
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
    // Radio inputs (harmony picker) keep native arrow keys, but Space still generates.
    const isRadio = target instanceof HTMLInputElement && target.type === "radio";
    if ((isTyping && !(isRadio && e.key === " ")) || helpOpen) return;

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
    requestAnimationFrame(() =>
      exportRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus()
    );
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
  const popIn = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: -4, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -4, scale: 0.98 }, transition: { duration: 0.18, ease: EASE } };

  const harmonySelect = (
    <label className="harmony-select">
      <span className="sr-only">Harmony</span>
      <select value={harmony} onChange={(e) => setHarmony(e.target.value as Harmony)} title="Color harmony (H)">
        {HARMONIES.map((h) => (
          <option key={h.id} value={h.id}>{h.label}</option>
        ))}
      </select>
      <CaretDown size={14} weight="bold" aria-hidden="true" />
    </label>
  );

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <img className="brand__logo" src="/favicon.svg" alt="" draggable={false} />
          <span className="brand__title">Palette Studio</span>
        </div>

        <div className="topbar__center">
          <fieldset className="segmented" title="Color harmony (H)">
            <legend className="sr-only">Harmony</legend>
            <LayoutGroup id="harmony">
              {HARMONIES.map((h) => (
                <label key={h.id} className="segmented__item" data-checked={harmony === h.id}>
                  <input
                    type="radio"
                    name="harmony"
                    value={h.id}
                    checked={harmony === h.id}
                    onChange={() => setHarmony(h.id)}
                    className="sr-only"
                  />
                  {harmony === h.id && (
                    <motion.span
                      layoutId="harmony-pill"
                      className="segmented__pill"
                      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <span className="segmented__label">{h.label}</span>
                </label>
              ))}
            </LayoutGroup>
          </fieldset>
          <div className="harmony-select-wrap">{harmonySelect}</div>
        </div>

        <div className="toolbar">
          <button className="icon-btn" type="button" onClick={undo} disabled={!history.past.length} aria-label="Undo" title="Undo (⌘Z)">
            <ArrowCounterClockwise size={18} weight="regular" />
          </button>
          <button className="icon-btn" type="button" onClick={redo} disabled={!history.future.length} aria-label="Redo" title="Redo (⇧⌘Z)">
            <ArrowClockwise size={18} weight="regular" />
          </button>

          <div className="menu" ref={exportRef}>
            <button
              className="icon-btn icon-btn--label"
              type="button"
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              onClick={() => setExportOpen((v) => !v)}
            >
              <Export size={18} weight="regular" />
              <span>Export</span>
            </button>
            <AnimatePresence>
              {exportOpen && (
                <motion.div
                  className="menu__list"
                  role="menu"
                  aria-label="Copy palette as"
                  onKeyDown={onMenuKeyDown}
                  {...popIn}
                >
                  <div className="menu__swatches" aria-hidden="true">
                    {palette.map((c) => <span key={c.id} style={{ background: c.hex }} />)}
                  </div>
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button className="icon-btn icon-btn--help" type="button" onClick={() => setHelpOpen(true)} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">
            <Keyboard size={18} weight="regular" />
          </button>

          <button className="generate-btn" type="button" onClick={generate} disabled={allLocked} title="Generate (Space)">
            <span>Generate</span>
            <kbd className="generate-btn__kbd">Space</kbd>
          </button>
        </div>
      </header>

      <main className="palette" aria-label="Palette">
        {palette.map((c, index) => (
          <SingleColor
            key={c.id}
            index={index}
            hex={c.hex}
            locked={c.locked}
            reduceMotion={!!reduceMotion}
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
        {harmonySelect}
        <button className="generate-btn generate-btn--block" type="button" onClick={generate} disabled={allLocked}>
          Generate
        </button>
      </div>

      <AnimatePresence>
        {helpOpen && (
          <motion.div
            className="overlay"
            onPointerDown={(e) => e.target === e.currentTarget && setHelpOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
          >
            <motion.div
              className="dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="help-title"
              {...(reduceMotion ? {} : { initial: { opacity: 0, y: 12, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 8, scale: 0.98 }, transition: { duration: 0.22, ease: EASE } })}
            >
              <div className="dialog__header">
                <h2 id="help-title">Keyboard shortcuts</h2>
                <button ref={helpCloseRef} className="icon-btn" type="button" onClick={() => setHelpOpen(false)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <div className="shortcut-groups">
                {SHORTCUT_GROUPS.map((g) => (
                  <section key={g.title} className="shortcut-group">
                    <h3>{g.title}</h3>
                    <dl>
                      {g.items.map((s) => (
                        <div key={s.label} className="shortcut">
                          <dt>{s.label}</dt>
                          <dd>{s.keys.map((k) => <kbd key={k} className="kbd">{k}</kbd>)}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
              <p className="dialog__foot">
                Shortcuts act on the selected color. Click a column or use the arrow keys to select one.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="toast-region" role="status" aria-live="polite">
        <AnimatePresence mode="popLayout">
          {toast && (
            <motion.div
              key={toast.id}
              className={`toast toast--${toast.type}`}
              {...(reduceMotion ? {} : { initial: { opacity: 0, y: 10, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 6, scale: 0.98 }, transition: { duration: 0.2, ease: EASE } })}
            >
              {toast.type === "success" ? (
                <CheckCircle size={18} weight="fill" aria-hidden="true" />
              ) : (
                <WarningCircle size={18} weight="fill" aria-hidden="true" />
              )}
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function replaceHash(hash: string) {
  window.history.replaceState(null, "", hash);
}

export default App;
