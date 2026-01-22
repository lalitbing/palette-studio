# 🎨 Palette Studio

A beautiful, fast color palette generator built with React and TypeScript. Generate stunning color combinations with a single keypress.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4.1-06B6D4?logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)

## ✨ Features

- **Instant Generation** — Press `Space` to generate a fresh palette
- **Lock Colors** — Keep your favorites while regenerating the rest
- **Copy Anywhere** — One-click copy for individual colors or the entire palette
- **Flexible Layouts** — Choose 2–8 color columns
- **Smart Contrast** — Text automatically adapts for readability (WCAG-compliant)
- **Responsive Design** — Works beautifully on desktop and mobile
- **Zero Dependencies** — Just React, TypeScript, and Tailwind CSS

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

## 🎯 Usage

| Action | How |
|--------|-----|
| Generate new palette | Press `Space` or click **Generate** |
| Lock a color | Click the 🔒 icon on any color |
| Copy a color | Click the hex code or 📋 icon |
| Copy entire palette | Click **Copy palette** |
| Set specific color | Enter hex (e.g. `#FF6B6B`) and click **Apply** |
| Change column count | Use the **Columns** dropdown |

## 🛠 Tech Stack

- **React 19** — UI framework
- **TypeScript** — Type safety
- **Tailwind CSS 4** — Styling
- **Vite 7** — Build tool & dev server

## 📁 Project Structure

```
src/
├── App.tsx         # Main app component & state
├── SingleColor.tsx # Individual color column component
├── utils.ts        # Color utilities (hex conversion, luminance, clipboard)
├── index.css       # Global styles
└── main.tsx        # Entry point
```