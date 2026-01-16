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
    const n = Math.floor(Math.random() * 0xffffff);
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
  
  // Relative luminance (sRGB) per WCAG
  export function getRelativeLuminance({ r, g, b }: { r: number, g: number, b: number }) {
    const srgb = [r, g, b].map((c) => c / 255);
    const linear = srgb.map((c) => {
      const v = clamp01(c);
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  }
  
  export function getReadableTextColor(hex: string) {
    const rgb = hexToRgb(hex);
    if (!rgb) return "#111827";
    const L = getRelativeLuminance(rgb);
    // Quick heuristic: pick white for darker colors
    return L < 0.45 ? "#FFFFFF" : "#111827";
  }
  
  export async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  