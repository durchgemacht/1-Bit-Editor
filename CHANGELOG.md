# Changelog

## Unreleased

- **Layout grid:** a new panel lays columns and rows over the canvas to count by. Each has a count, the gap between
  them and the margin outside them; what doesn't divide evenly goes to the first ones. Thin lines show their edges,
  red for the columns and blue for the rows, never in the pixels, and **Layout** at the bottom hides them. The status
  line names the column and row under the pointer. The grid is saved with the sprite and in its PNG, and the .json
  lists the columns and rows in the OS's coordinates.

## 0.1 (2026-10-17)

The first release: a pixel editor for 1-bit icons, sprites and whole screens of Model:Cycles and Model:Samples mods,
in one HTML file.

- The canvas is the whole 128 × 64 screen, or any custom size up to that. What you draw is what the device shows:
  light pixels are lit, dark ones stay off.
- Tools: move, brush, line, rectangle, rounded rectangle (radius 1 to 8; radius 1 leaves the 4 corner pixels free,
  as the OS's boxes do), ellipse, triangle, fill, select and text. Brush size and line width go from 1 to 8.
- Colors: dark, light, transparent, and twelve patterns that line up across the whole sprite.
- Layers and groups, with drag and drop, the eye, renaming, duplicating and the Move tool. Text layers stay text:
  anchor, font (the editor's own stand-in fonts), alignment and the OS's three text styles.
- Stamps under Basics, Synth and UI, among them the OS-style title bar and 1/2 Screen; under Custom, a selection
  kept as your own stamp.
- Files: Save PNG (the layers ride along inside), PNG ×8, and .bin, which gives a ZIP with the OS's sprite layout and
  a .json that describes the screen for a person or an agent: texts and boxes in the OS's coordinates.
- Open takes a PNG, a .bin with or without its .json, a .json on its own, or the ZIP.
- Sidebar panels that move and share a place as tabs, a preview on the 128 × 64 screen, undo and redo.
- A first visit opens an example screen drawn in the editor, geist-V01.
