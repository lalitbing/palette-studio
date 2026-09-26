# 🎨 Palette Studio

A fast, keyboard-first color palette generator built with React and TypeScript. Generate harmonious color schemes with a single keypress.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4.1-06B6D4?logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)

## ✨ Features

- **Harmony modes** — Auto, Analogous, Monochrome, Complementary, Split complementary, Triadic, Tetradic, or pure Random
- **Perceptual color generation** — Colors are built in OKLCH, so lightness steps look even and hues stay true
- **Smart positioning** — Generated colors are ordered light → dark into a smooth ramp; locked colors keep their place and anchor the harmony's base hue
- **Lock colors** — Keep your favorites while regenerating the rest
- **Insert blended colors** — Hover the border between two columns and click **+** to add their perceptual midpoint
- **Reorder** — Drag columns by their handle, or use `Shift` + arrow keys
- **Edit & pick** — Click a hex code to type a new value, or use the native color picker
- **Undo / redo** — Full history for every change
- **Export** — Copy as a HEX list, CSS variables, JSON array, or a share link
- **Shareable URLs** — The palette lives in the URL hash (e.g. `#FFCADB-9EB659-4CB3F3`)
- **Contrast badges** — Each color shows its WCAG text-contrast grade (AA / AAA)
- **Light & dark mode** — Follows your system preference
- **Responsive** — Columns become rows on mobile, with a thumb-friendly Generate bar

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## ⌨️ Keyboard Shortcuts

Press `?` in the app to see this list at any time. Shortcuts act on the selected color — click a column or use the arrow keys to select one.

| Key | Action |
|-----|--------|
| `Space` | Generate a new palette |
| `←` / `→` | Select previous / next color |
| `1`–`9` | Jump to a color |
| `Shift` + `←` / `→` | Move the selected color |
| `L` | Lock / unlock the selected color |
| `C` | Copy the selected hex |
| `Shift` + `C` | Copy all hex codes |
| `E` | Edit the selected hex |
| `A` | Add a color after the selected one |
| `⌫` / `Delete` | Remove the selected color |
| `H` / `Shift` + `H` | Cycle harmony forward / back |
| `⌘/Ctrl` + `Z` | Undo |
| `⌘/Ctrl` + `Shift` + `Z` | Redo |
| `S` | Copy share link |
| `?` | Show shortcuts |
| `Esc` | Close dialogs and menus |

## 🎯 Mouse & Touch

| Action | How |
|--------|-----|
| Generate | Click **Generate** |
| Change harmony | Use the harmony dropdown in the top bar |
| Lock a color | Click the lock icon on a column |
| Copy a color | Click the copy icon |
| Edit a color | Click the hex code, or the pencil icon for the color picker |
| Insert a color | Hover between two columns and click **+** |
| Reorder | Drag the ⋮⋮ handle onto another column |
| Export | Click **Export** and choose a format |

## 🛠 Tech Stack

- **React 19** — UI framework
- **TypeScript** — Type safety
- **Tailwind CSS 4** — Styling
- **Vite 7** — Build tool & dev server

## 📁 Project Structure

```
src/
├── App.tsx         # App state, history, keyboard shortcuts, toolbar
├── SingleColor.tsx # Individual color column component
├── utils.ts        # Color math (OKLCH, harmonies, contrast), export & URL helpers
├── index.css       # Global styles
└── main.tsx        # Entry point
```
