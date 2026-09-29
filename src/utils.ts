function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function normalizeHex(input: string) {
  if (!input) return null;
  const raw = String(input).trim();
  const value = raw.startsWith("#") ? raw.slice(1) : raw;
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(value)) return null;
  const expanded =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  return `#${expanded.toUpperCase()}`;
}

export function randomHex() {
  const n = Math.floor(Math.random() * 0x1000000);
  return `#${n.toString(16).padStart(6, "0").toUpperCase()}`;
}

export function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const value = normalized.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number) {
  const to = (v: number) =>
    Math.round(clamp01(v) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

// Relative luminance (sRGB) per WCAG
export function getRelativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const [lr, lg, lb] = [r, g, b].map((c) => srgbToLinear(c / 255));
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export function contrastRatio(a: string, b: string) {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return 1;
  const la = getRelativeLuminance(ra);
  const lb = getRelativeLuminance(rb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function getReadableTextColor(hex: string) {
  // Pick whichever of near-black / white has the higher WCAG contrast.
  const dark = "#18181B";
  const light = "#FAFAFA";
  return contrastRatio(hex, dark) >= contrastRatio(hex, light) ? dark : light;
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* ============
  OKLCH — perceptually uniform space used for generation
=========== */
function srgbToLinear(c: number) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

type Oklch = { l: number; c: number; h: number };

function oklchToLinearRgb({ l, c, h }: Oklch) {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

function inGamut(rgb: number[]) {
  return rgb.every((v) => v >= -0.0005 && v <= 1.0005);
}

export function oklchToHex(color: Oklch) {
  // Gamut-map by reducing chroma (keeps hue & lightness intact).
  let lo = 0;
  let hi = color.c;
  let rgb = oklchToLinearRgb(color);
  if (!inGamut(rgb)) {
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinearRgb({ ...color, c: mid }))) lo = mid;
      else hi = mid;
    }
    rgb = oklchToLinearRgb({ ...color, c: lo });
  }
  const [r, g, b] = rgb.map(linearToSrgb);
  return rgbToHex(r, g, b);
}

export function hexToOklch(hex: string): Oklch {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => srgbToLinear(v / 255));
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363432613 * g + 0.0514633616 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: H };
}

/* ============
  Harmony-based generation
=========== */
export const HARMONIES = [
  { id: "auto", label: "Auto" },
  { id: "analogous", label: "Analogous" },
  { id: "monochrome", label: "Mono" },
  { id: "complementary", label: "Complementary" },
  { id: "split", label: "Split" },
  { id: "triadic", label: "Triadic" },
  { id: "tetradic", label: "Tetradic" },
  { id: "random", label: "Random" },
] as const;

export type Harmony = (typeof HARMONIES)[number]["id"];

const HUE_OFFSETS: Record<Exclude<Harmony, "auto" | "random">, number[]> = {
  analogous: [-40, -20, 0, 20, 40],
  monochrome: [0],
  complementary: [0, 180],
  split: [0, 150, 210],
  triadic: [0, 120, 240],
  tetradic: [0, 90, 180, 270],
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export type Swatch = { id: string; hex: string; locked: boolean };

let idCounter = 0;
/** Stable identity per swatch so reorders and inserts can animate. */
export const newSwatchId = () => `s${++idCounter}`;

export function formatOklch(hex: string) {
  const { l, c, h } = hexToOklch(hex);
  return `${Math.round(l * 100)}% ${c.toFixed(2)} ${c < 0.005 ? 0 : Math.round(h)}`;
}

/**
 * Fill the unlocked slots with a harmonious set of colors.
 * - Hues follow the chosen harmony, anchored on the first locked color (if any).
 * - Lightness is spread evenly across the range, then colors are placed in
 *   unlocked slots ordered by lightness (light → dark), so the palette reads
 *   as a smooth ramp instead of a random jumble.
 */
export function generatePalette(prev: Swatch[], harmony: Harmony): Swatch[] {
  const free = prev.filter((s) => !s.locked).length;
  if (free === 0) return prev;

  if (harmony === "random") {
    return prev.map((s) => (s.locked ? s : { ...s, hex: randomHex() }));
  }

  const mode: Exclude<Harmony, "auto" | "random"> =
    harmony === "auto"
      ? (["analogous", "monochrome", "complementary", "split", "triadic", "tetradic"] as const)[
          Math.floor(Math.random() * 6)
        ]
      : harmony;

  const anchor = prev.find((s) => s.locked);
  const anchorLch = anchor ? hexToOklch(anchor.hex) : null;
  const baseHue = anchorLch && anchorLch.c > 0.02 ? anchorLch.h : rand(0, 360);
  const offsets = HUE_OFFSETS[mode];

  // Lightness ramp with jitter; ends pulled in so we avoid pure black/white.
  const lMin = rand(0.22, 0.32);
  const lMax = rand(0.9, 0.97);
  const baseChroma = mode === "monochrome" ? rand(0.06, 0.14) : rand(0.09, 0.17);

  const colors = Array.from({ length: free }, (_, i) => {
    const t = free === 1 ? rand(0.3, 0.7) : i / (free - 1);
    const l = lMin + t * (lMax - lMin) + rand(-0.03, 0.03);
    // Distribute hues so the harmony's key hues land on mid-tones.
    const offset =
      mode === "analogous"
        ? offsets[0] + ((offsets[offsets.length - 1] - offsets[0]) * t)
        : offsets[(i + Math.floor(free / 2)) % offsets.length];
    const h = (baseHue + offset + rand(-8, 8) + 360) % 360;
    // Chroma tapers towards very light / very dark, like real-world paint.
    const taper = 1 - Math.pow(Math.abs(t - 0.5) * 2, 2) * 0.55;
    const c = baseChroma * taper * rand(0.8, 1.2);
    return { l: Math.min(0.98, Math.max(0.15, l)), c, h };
  })
    .sort((a, b) => b.l - a.l)
    .map(oklchToHex);

  let k = 0;
  return prev.map((s) => (s.locked ? s : { ...s, hex: colors[k++] }));
}

/* ============
  Sharing / export
=========== */
export function paletteToHash(p: Swatch[]) {
  return p.map((s) => s.hex.slice(1)).join("-");
}

export function paletteFromHash(hash: string): Swatch[] | null {
  const parts = hash.replace(/^#\/?/, "").split("-").filter(Boolean);
  if (parts.length < 2 || parts.length > 10) return null;
  const hexes = parts.map(normalizeHex);
  if (hexes.some((h) => !h)) return null;
  return hexes.map((hex) => ({ id: newSwatchId(), hex: hex!, locked: false }));
}

export function toCssVars(p: Swatch[]) {
  return `:root {\n${p.map((s, i) => `  --color-${i + 1}: ${s.hex};`).join("\n")}\n}`;
}

export function formatRgb(hex: string) {
  const rgb = hexToRgb(hex);
  return rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : "";
}

/** Perceptual midpoint of two colors (used when inserting between columns). */
export function mixHex(a: string, b: string) {
  const x = hexToOklch(a);
  const y = hexToOklch(b);
  let dh = y.h - x.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  // If either color is near-grey its hue is meaningless — borrow the other's.
  const h = x.c < 0.02 ? y.h : y.c < 0.02 ? x.h : (x.h + dh / 2 + 360) % 360;
  return oklchToHex({ l: (x.l + y.l) / 2, c: (x.c + y.c) / 2, h });
}
