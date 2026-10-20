# Changelog

## Unreleased

- **Layout grid:** a button left of the size folds out columns and rows laid over the canvas to count by. Each has a
  count, the gap between them and the margin outside them; what doesn't divide evenly goes to the first ones. Thin red
  lines show their edges, never in the pixels, and **Layout** at the bottom hides them. The status line names the
  column and row under the pointer. The grid is saved with the sprite and in its PNG, and the .json lists the columns
  and rows in the OS's coordinates.
- **Guides and rulers:** rulers run along the top and the left of the canvas. Guides are dragged out of them, lie on
  pixel edges and show in cyan; while one is dragged, the ruler shows its position; the Move tool moves them, and off
  the canvas they go. **Guides** and **Rulers** at the bottom hide them. They are saved like the layout grid, and the
  .json lists them, y counted from the bottom.
- **Shortcuts** to show or hide: Shift+R the rulers, Shift+G the layout grid and ⌘/Ctrl ' the pixel grid, as in Figma;
  ⌘/Ctrl ; the guides, as in Photoshop and Affinity. On a German keyboard the last two are Ä and Ö.
- **Slices:** boxes over the screen that come out as sprites of their own, so a whole screen can be drawn in place and
  its icons cut out of it. The Slice tool (S) drags one out; drag a slice to move it, its corners to resize it, Delete
  removes it, and its edges snap to the canvas, the guides, the layout grid and the other slices. The Slices panel
  lists them with their sizes, renames them and makes one from the selection or from what the selected layer holds.
  The .bin button's ZIP holds each slice's .bin and PNG beside the whole screen's, and the .json lists their boxes in
  the OS's coordinates; a text inside a slice names it. Slices are saved with the sprite and in its PNG, and
  **Slices** at the bottom hides them.
- **Frames:** an animation is a list of frames, each with layers of its own, in a strip in the Frames panel: Add,
  Duplicate, Delete, drag to reorder, `,` and `.` to step through, Onion skin. The drive is Time (each frame its
  milliseconds, Play runs them in the On screen panel) or Value (a value from 0 to 127 picks the frame, as a knob's
  picture changes on the Model:Cycles, spread over From to To; the slider chooses the frame to edit). The PNGs hold
  the frames side by side and open again as the animation; the .bin button's ZIP holds one .bin per frame, the strip
  PNG, each slice's bins and strip, and an `animation` block in the .json (ms with UI ticks, or the value map); **GIF**
  saves an animated GIF, 4× bigger.

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
