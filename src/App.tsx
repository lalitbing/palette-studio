import { useEffect, useMemo, useState } from "react";
import SingleColor from "./SingleColor";
import { copyToClipboard, normalizeHex, randomHex } from "./utils";

function App() {
  const DEFAULT_COUNT = 5;
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [activeIndex, setActiveIndex] = useState(0);
  const [colorInput, setColorInput] = useState("");
  const [error, setError] = useState(false);
  const [toast, setToast] = useState<{ type: string, message: string } | null>(null);

  const [palette, setPalette] = useState(() =>
    Array.from({ length: DEFAULT_COUNT }, () => ({
      hex: randomHex(),
      locked: false,
    }))
  );

  const paletteString = useMemo(
    () => palette.map((c) => c.hex).join(", "),
    [palette]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next = normalizeHex(colorInput);
    if (!next) {
      setError(true);
      setToast({ type: "error", message: "Enter a valid hex like #FF6B6B" } as any);
      return;
    }
    setError(false);
    setPalette((prev) =>
      prev.map((c, idx) => (idx === activeIndex ? { ...c, hex: next } : c))
    );
    setColorInput("");
    setToast({ type: "success", message: `Set ${next}` });
  };

  const generate = () => {
    setPalette((prev) =>
      prev.map((c) => (c.locked ? c : { ...c, hex: randomHex() }))
    );
  };

  const toggleLock = (index: number) => {
    setPalette((prev) =>
      prev.map((c, idx) =>
        idx === index ? { ...c, locked: !c.locked } : c
      )
    );
  };

  const onCopy = async (text: string) => {
    const ok = await copyToClipboard(text);
    setToast(
      ok
        ? { type: "success", message: `Copied ${text}` }
        : { type: "error", message: "Clipboard blocked by browser" }
    );
  };

  const onCopyPalette = () => onCopy(paletteString);

  useEffect(() => {
    const onKeyDown = (e: any) => {
      const target = e.target;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isTyping) return;
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === "BUTTON" ||
          active.tagName === "A" ||
          active.tagName === "SELECT")
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        generate();
      }
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    // keep palette length in sync with count
    setPalette((prev) => {
      if (prev.length === count) return prev;
      if (prev.length > count) return prev.slice(0, count);
      const extra = Array.from({ length: count - prev.length }, () => ({
        hex: randomHex(),
        locked: false,
      }));
      return [...prev, ...extra];
    });
    setActiveIndex((idx) => Math.max(0, Math.min(count - 1, idx)));
  }, [count]);

  return (
    <>
      <header className="topbar">
        <div className="topbar__brand" role="banner">
          <div className="logo-mark" aria-hidden="true" />
          <div className="brand-text">
            <div className="brand-title">Palette</div>
            <div className="brand-subtitle">coolors-style generator</div>
          </div>
        </div>

        <form className="controls" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">Set active</span>
            <input
              type="text"
              value={colorInput}
              onChange={(e) => {
                setColorInput(e.target.value);
                if (error) setError(false);
              }}
              placeholder="#FF6B6B"
              className={`text-input ${error ? "error" : ""}`}
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <button className="btn btn--primary" type="submit">
            Apply
          </button>

          <button className="btn" type="button" onClick={generate}>
            Generate
          </button>

          <button className="btn" type="button" onClick={onCopyPalette}>
            Copy palette
          </button>

          <label className="field field--small">
            <span className="field__label">Columns</span>
            <select
              className="select"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              aria-label="Number of columns"
            >
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option value={n} key={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </form>

        <div className="topbar__hint">
          Press <span className="kbd">Space</span> to generate (locked columns stay).
        </div>
      </header>

      <main className="palette" role="main">
        {palette.map((c, index) => (
          <div
            key={index}
            className="palette__cell"
            onPointerDown={() => setActiveIndex(index)}
            role="presentation"
          >
            <SingleColor
              hex={c.hex}
              locked={c.locked}
              isActive={index === activeIndex}
              onToggleLock={() => toggleLock(index)}
              onCopy={onCopy}
            />
          </div>
        ))}
      </main>

      {toast && (
        <div
          className={`toast toast--${toast.type}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
    </>
  );
}

export default App;
