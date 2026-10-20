# 1-Bit Editor

A small pixel editor for 1-bit icons and sprites in Elektron Model:Cycles and Model:Samples mods. It is a
single HTML file that runs in the browser, with no build step and no dependencies.

## What it does

- **Canvas size:** the whole 128 × 64 screen of Model:Cycles and Model:Samples, or any custom size up to that.
- **Tools:** move (the selected layers), brush, line, rectangle, rounded rectangle (radius 1 to 8 pixels; radius 1
  leaves just the 4 corner pixels free, as the OS's boxes do), ellipse, triangle (pointing up, right, down or left),
  fill, select (move, copy, nudge), text and slice.
- **Text layers:** the Text tool makes layers that stay text: string, anchor, font (the editor's own Small 3 × 5,
  Regular 5 × 7 and Large 15 × 21), alignment and style (Dark on light, Light, Light on dark: the OS's inverted, plain
  and boxed text). The .bin leaves them out, because the
  device draws text in its own fonts; the PNGs show them; the .json lists them. To pixels turns one into pixels.
- **OS y** in the status line counts y from the bottom, like the OS.
- Over the canvas a yellow marker stands in for the pointer and shows what a tool will touch: the brush, a pixel,
  or for text the letter that comes first. Where a drag moves something, the move cursor shows instead.
- **Colors:** a pixel is dark or light. Twelve patterns (dots, grays, lines, diagonals, grid, cross-hatch) work as
  extra colors and line up across the whole sprite. **Transparent** erases, so what lies below shows through.
- **Layers:** layers, text layers and groups over the light canvas, upper ones covering the ones below. The tools draw on the
  selected layer. Shift-click adds a layer to the selection or takes it out. Drag layers to reorder them, drop
  one onto another to group the two, or onto a group to put it inside. Double-click renames, the eye hides a
  layer, and New Layer, Duplicate, Group and Delete sit under the list. The Move tool shifts the selected layers;
  what ends up outside the canvas is cut off once the move is done (while dragging or nudging nothing is lost).
- **Stamps:** ready-made pieces to drag onto the canvas (or click into its middle): under UI the OS-style title bar
  (128 × 13) and 1/2 Screen (64 × 64, dark, corners rounded 4 px), for now. They bring their own dark and light pixels
  and float on the selected layer until you place them. Under Custom, Save selection keeps a selection as your own
  stamp (in this browser).
- **Layout grid:** the grid button left of the size folds out columns and rows laid over the canvas to count by, each
  with a count, the gap between them and the margin outside them; what doesn't divide evenly goes to the first ones, a
  pixel each. Thin red lines show their edges, never in the pixels, and the status line names the column and row under
  the pointer. The grid is saved with the sprite and in its PNG, and the .json lists it.
- **Guides and rulers:** drag a guide out of the ruler above or left of the canvas; it lies on the edge between two
  pixels and shows in cyan, and while you drag it the ruler shows where it lands. The Move tool moves it, and dragging
  it off the canvas removes it. Guides are saved like the layout grid, and the .json lists them. Guides and Rulers at
  the bottom hide them.
- **Slices:** boxes over the screen that come out as sprites of their own, so a whole screen can be drawn in place
  and its icons cut out of it. The Slice tool drags one out; drag a slice to move it, its corners to resize it, Delete
  removes it, and its edges snap to the canvas, the guides, the layout grid and the other slices. The Slices panel
  lists them with their sizes, renames them (double-click) and makes one around the selection or around what the
  selected layer holds. They show in green, are never part of the pixels, and are saved with the sprite and in its
  PNG; Slices at the bottom hides them.
- **Frames:** an animation is a list of frames, each with layers of its own, shown in a strip in the Frames panel:
  Add, Duplicate (the copy's layers keep their names), Delete, drag to reorder, `,` and `.` to step through, Onion skin
  to see the frame before. The drive is what moves it: with Value, the default, a value from 0 to 127 picks the frame,
  the way a knob's picture changes on the Model:Cycles, spread evenly over From to To, and the slider's value chooses
  the frame to edit; with Time each frame has its milliseconds and Play runs them in the On screen panel. Time is meant
  only for things like the start animation, since the device's own pictures are driven by values.
- What you draw is what the device shows: light pixels are lit, dark ones stay off. The canvas under all layers is
  light, a lit screen; for a dark screen like the OS's own, fill a layer with Dark. The left mouse button starts out
  with Dark, the right one with Light. Any color or pattern can go on either button; <kbd>X</kbd> swaps them. Moved
  or deleted pixels and new canvas
  area are transparent. Clear starts over with one empty layer.
- Shift gives a straight line, a square, a circle or an equilateral triangle. Space moves a shape or a selection
  frame while you drag it.
- Undo and redo (layer changes too), zoom, a pixel grid, and a preview of the sprite on the 128 × 64 screen.
- **Panels:** drag a sidebar panel by its title to move it; drop it on the middle of another panel to share that
  place as tabs, and drag a tab out to undo that. The layout stays in this browser; Reset panels in the help puts
  everything back.
- A first visit opens an example screen made in the editor: a ghost on the 1/2 Screen stamp, its version in two
  text layers.
- The sprite, its layers and your settings stay in this browser between visits (local storage, nothing is
  uploaded).

## Files

The File panel on the right holds Open and Export (Clear sits in the top bar, next to the size). Export unfolds the file name and the three formats:

| Button | File | What it's for |
|---|---|---|
| Save PNG | `name_48x33.png` | The working file: 1-bit as on the device (white = lit), with the layers inside. Open it again to keep drawing. An animation's frames lie side by side in it. |
| PNG ×8 | `name_48x33@8x.png` | A bigger copy for sharing. It opens again at its real size, layers and all. |
| .bin | `name_48x33.zip` | One ZIP: `name_48x33.bin`, the visible layers' pixels without the texts in the OS's own sprite layout, ready for a mod (a set bit is a lit pixel, light in the editor); `name_48x33.json`, the screen described for whoever builds it into a mod, a person or an agent (see below); and for each slice its own `name_icon_25x22.bin` and `.png`. With frames: one `name_f01_48x33.bin` per frame (included one after the other they form one table), the strip PNG, each slice's bins and strip. |
| GIF | `name_48x33@4x.gif` | With frames: an animated GIF, 4× bigger, for sharing. Driven by time with each frame's milliseconds; driven by a value each frame for a tenth of a second. |

The PNGs show the picture of the visible layers. The layers themselves ride along in a text chunk
(`model-sprite-editor`), so other programs just see the picture and the editor gets every layer back.

### The .json

It comes with the .bin, in the same ZIP, and says what the pictures can't: the texts with their anchors (x at the left
edge, middle or right edge, y on the bottom row of the capitals), font, alignment and style, so the device can draw
them in its own fonts, and every layer and group with the box it covers. With a layout grid it also lists the columns
as `[x0, x1]` and the rows as `[y0, y1]`, rows from the top, and the guides as the pixel edges they lie on. With slices
it lists each one's name, box, size and files, and a text that lies inside a slice names it. With frames it holds an
`animation` block: the drive, per frame its file, its milliseconds with the UI ticks at 30 Hz and the 10 ms ticks of
the OS (time), or the range and a 128-entry map from value to frame (value), and the strip PNGs.
Coordinates are the OS's: x from the left, y from the bottom row, boxes as `[x0, y0, x1, y1]` with both corners
included. Show an agent the PNG for the look and this file for the numbers. The editor uses only its own stand-in
fonts, never the device's.

Open a file with **Open** or by dropping it on the page: a PNG, a .bin, a .json or the .bin button's ZIP, also several at
once. A .bin holds no texts, so the editor asks for its .json and brings them back as text layers; opening the ZIP, or
the .bin together with its .json, needs no question. A .json on its own adds its texts to the canvas if the size fits.
A PNG from elsewhere opens as it is: white is light, which is lit. PNGs and drawings kept from the versions that showed
the negative open as they looked there. A `.bin` file carries no size, so its name has to say it (`…_48x33.bin`),
unless the canvas already has the right size.

### The .bin layout

The OS stores the pixels of a sprite column by column:

- Each column takes ⌈height ÷ 32⌉ big-endian 32-bit words: 4 bytes for up to 32 rows, 8 bytes for up to 64.
- The OS counts y from the bottom. Bit 7 of byte 0 is the bottom-left pixel; pixel (x, y) is bit 7 − (y mod 8)
  of byte x · stride + ⌊y ÷ 8⌋.
- Bits above the top of the sprite are 0.
- A sprite takes width × ⌈height ÷ 32⌉ × 4 bytes: 384 for 48 × 33, 272 for 34 × 34, 1024 for 128 × 64.

That is how the sprites in the Model:Cycles OS 1.13 are stored (the Elektron logo and the folder icon, for
example, only read the right way up like this), and how Model-TG ships its sampler icons. The file holds the
pixel plane only. A sprite's mask is a separate plane, and mods so far point at a mask the OS already has.
A mod includes the file like this:

```asm
    .align 2
my_icon_pixels:
    .incbin "my_icon_48x33.bin"
```

## Running it

Open `index.html` in a browser. To put it online, serve the folder as it is, for example with GitHub Pages
(Settings → Pages → Deploy from a branch → `main`, `/ (root)`).

## Keys

| Keys | |
|---|---|
| <kbd>V</kbd> | Move the selected layers |
| <kbd>B</kbd> <kbd>L</kbd> <kbd>R</kbd> <kbd>U</kbd> <kbd>O</kbd> <kbd>A</kbd> | Brush, line, rectangle, rounded rectangle, ellipse, triangle |
| <kbd>G</kbd> <kbd>M</kbd> <kbd>T</kbd> <kbd>S</kbd> | Fill, select, text, slice |
| <kbd>X</kbd> | Swap the left and right color |
| <kbd>[</kbd> <kbd>]</kbd> | Brush size or line width |
| <kbd>F</kbd> | Outline or filled shapes |
| <kbd>Shift</kbd> while dragging | Straight line, square, circle, equilateral triangle |
| <kbd>Space</kbd> while dragging | Move the shape or the selection frame |
| <kbd>⌘/Ctrl</kbd> <kbd>Z</kbd>, <kbd>⌘/Ctrl</kbd> <kbd>Shift</kbd> <kbd>Z</kbd> | Undo, redo |
| <kbd>⌘/Ctrl</kbd> <kbd>A</kbd> <kbd>C</kbd> <kbd>X</kbd> <kbd>V</kbd> | Select all, copy, cut, paste |
| Arrow keys | Nudge the selection by 1 pixel, with <kbd>Shift</kbd> by 8; with Move, the selected layers; with Slice, the selected slice |
| <kbd>Enter</kbd>, <kbd>Esc</kbd> | Place moved pixels or text; deselect, drop the text or let go of the slice |
| <kbd>,</kbd> <kbd>.</kbd> | The frame before, the frame after |
| <kbd>+</kbd> <kbd>−</kbd> <kbd>0</kbd> | Zoom in, zoom out, fit |
| <kbd>⌘/Ctrl</kbd> <kbd>S</kbd>, <kbd>⌘/Ctrl</kbd> <kbd>O</kbd> | Save PNG, open a file |
| <kbd>Shift</kbd> <kbd>R</kbd>, <kbd>Shift</kbd> <kbd>G</kbd> | Show or hide the rulers, the layout grid |
| <kbd>⌘/Ctrl</kbd> <kbd>'</kbd>, <kbd>⌘/Ctrl</kbd> <kbd>;</kbd> | Show or hide the pixel grid, the guides (Ä and Ö on a German keyboard) |
| <kbd>↑</kbd> <kbd>↓</kbd>, <kbd>Enter</kbd>, <kbd>Delete</kbd> in the layer list or the slice list | The one above or below, rename, delete |

## Tests

`node tests/core.test.js` checks the drawing and file code (shapes, patterns, fonts, layers, slices, frames, .bin, PNG, GIF, ZIP). It
needs Node 18 or newer and nothing else.

## Not in this version

The sprite's mask plane (the OS draws a sprite through a mask, and mods so far reuse one the OS has), and importing
photos or other artwork.

## License

MIT, see [LICENSE](LICENSE). Not affiliated with Elektron. Model:Cycles and Model:Samples are Elektron products.
