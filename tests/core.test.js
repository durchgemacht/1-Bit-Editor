// Tests for the core block of index.html (bitmaps, shapes, patterns, fonts, layers, file formats). No dependencies:
//     node tests/core.test.js            VERBOSE=1 also prints the start screen
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const C = new Function(/<script id="core">([\s\S]*?)<\/script>/.exec(html)[1] + "\nreturn Core;")();

let checks = 0, failures = 0;
function check(label, ok, detail = "") {
  checks++;
  if (!ok) { failures++; console.log(`FAIL ${label}${detail ? `\n${detail}` : ""}`); }
}
const throws = fn => { try { fn(); return false; } catch (err) { return true; } };
const art = (w, h, on) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => (on(x, y) ? "#" : ".")).join("")).join("\n");
const ascii = b => art(b.w, b.h, (x, y) => b.px[y * b.w + x]);
const maskArt = s => art(s.w, s.h, (x, y) => s.m[y * s.w + x]);
function fromArt(rows) {
  const b = C.bitmap(rows[0].length, rows.length);
  rows.forEach((r, y) => [...r].forEach((c, x) => { b.px[y * b.w + x] = c === "#" ? 1 : 0; }));
  return b;
}
function random(w, h, seed) {
  const b = C.bitmap(w, h);
  let s = seed >>> 0;
  for (let i = 0; i < b.px.length; i++) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; b.px[i] = (s >>> 16) & 1; }
  return b;
}
function pngChunks(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), out = [];
  for (let o = 8; o < bytes.length;) {
    const len = dv.getUint32(o), type = Buffer.from(bytes.subarray(o + 4, o + 8)).toString("latin1");
    out.push({ type, data: bytes.subarray(o + 8, o + 8 + len), crc: dv.getUint32(o + 8 + len), typed: bytes.subarray(o + 4, o + 8 + len) });
    o += 12 + len;
  }
  return out;
}
function pngPixels(bytes) {                  // decodes our 1-bit gray PNG with node:zlib
  const chunks = pngChunks(bytes), ihdr = Buffer.from(chunks[0].data);
  const w = ihdr.readUInt32BE(0), h = ihdr.readUInt32BE(4), rb = Math.ceil(w / 8);
  const rows = zlib.inflateSync(Buffer.concat(chunks.filter(c => c.type === "IDAT").map(c => Buffer.from(c.data))));
  const px = [];
  for (let y = 0; y < h; y++) {
    if (rows[y * (rb + 1)] !== 0) throw new Error("unexpected filter");
    for (let x = 0; x < w; x++) px.push((rows[y * (rb + 1) + 1 + (x >> 3)] >> (7 - (x & 7))) & 1);
  }
  return { w, h, depth: ihdr[8], type: ihdr[9], px, chunks };
}

async function main() {
  // ---- .bin layout ----
  {
    const b = C.bitmap(1, 33);
    b.px[0] = 1;                             // top pixel: OS y 32 → byte 4, bit 7
    let bin = C.toBin(b);
    check("bin: 1 × 33 takes 8 bytes (two words)", bin.length === 8);
    check("bin: the top pixel is OS y 32 → byte 4, bit 7", bin[4] === 0x80 && bin.reduce((n, v) => n + v, 0) === 0x80, [...bin].join(","));
    b.px.fill(0);
    b.px[32] = 1;                            // bottom pixel: OS y 0 → byte 0, bit 7
    bin = C.toBin(b);
    check("bin: the bottom pixel is OS y 0 → byte 0, bit 7", bin[0] === 0x80 && bin.subarray(1).every(v => v === 0));
    b.px.fill(0);
    b.px[1] = 1;                             // second row from the top: OS y 31 → byte 3, bit 0
    check("bin: row 1 of 33 is OS y 31 → byte 3, bit 0", C.toBin(b)[3] === 0x01);
    const two = C.bitmap(2, 8);
    two.px[7 * 2 + 1] = 1;                   // bottom pixel of column 1
    check("bin: one word per column up to 32 rows", C.binSize(2, 8) === 8 && C.toBin(two)[4] === 0x80);
    check("bin: sizes of the machine icons and the screen",
      C.binSize(48, 33) === 384 && C.binSize(34, 34) === 272 && C.binSize(128, 64) === 1024 && C.binSize(47, 47) === 376 && C.binSize(48, 22) === 192);
    for (const [w, h] of [[1, 1], [3, 5], [9, 9], [31, 22], [34, 34], [47, 47], [48, 33], [128, 64], [128, 1], [1, 64]]) {
      const r = random(w, h, w * 131 + h), out = C.toBin(r), stride = Math.ceil(h / 32) * 4;
      check(`bin: round trip ${w} × ${h}`, C.equals(C.fromBin(out, w, h), r));
      let stray = 0;
      for (let x = 0; x < w; x++) for (let y = h; y < stride * 8; y++) if (out[x * stride + (y >> 3)] & (0x80 >> (y & 7))) stray++;
      check(`bin: padding bits stay 0 for ${w} × ${h}`, stray === 0);
    }
    check("bin: a wrong length is refused", throws(() => C.fromBin(new Uint8Array(10), 48, 33)));
  }

  // ---- File names ----
  for (const [n, want] of [["sampler_icon_A_48x33.bin", [48, 33]], ["icon 34 × 34.bin", [34, 34]], ["v2_icon_12x8.bin", [12, 8]],
    ["x.bin", null], ["big_200x10.bin", null], ["a_0x5.bin", null]]) {
    const got = C.sizeFromName(n);
    check(`sizeFromName ${n}`, JSON.stringify(got && [got.w, got.h]) === JSON.stringify(want), JSON.stringify(got));
  }
  for (const [n, want] of [["sampler_icon_A_48x33.bin", "sampler_icon_A"], ["kick_48x33@8x.png", "kick"], ["logo.png", "logo"],
    ["48x33.bin", "sprite"], ["my icon 34x34.png", "my icon"]]) check(`baseName ${n}`, C.baseName(n) === want, C.baseName(n));

  // ---- Ellipses ----
  const E = (w, h, filled = true) => maskArt(C.ellipseShape(0, 0, w - 1, h - 1, filled));
  check("ellipse 3 × 3 is a plus", E(3, 3) === ".#.\n###\n.#.", E(3, 3));
  check("ellipse 4 × 4", E(4, 4) === ".##.\n####\n####\n.##.", E(4, 4));
  check("ellipse 5 × 5", E(5, 5) === ".###.\n#####\n#####\n#####\n.###.", E(5, 5));
  check("ellipse 7 × 7", E(7, 7) === ["..###..", ".#####.", "#######", "#######", "#######", ".#####.", "..###.."].join("\n"), E(7, 7));
  check("ellipse 11 × 11 outline", E(11, 11, false) === ["...#####...", "..#.....#..", ".#.......#.", "#.........#", "#.........#",
    "#.........#", "#.........#", "#.........#", ".#.......#.", "..#.....#..", "...#####..."].join("\n"), E(11, 11, false));
  {
    const bad = [];
    for (let w = 1; w <= 24; w++)
      for (let h = 1; h <= 24; h++) {
        const f = C.ellipseShape(0, 0, w - 1, h - 1, true), o = C.ellipseShape(0, 0, w - 1, h - 1, false);
        const rows = new Set(), cols = new Set();
        let sym = true, subset = true;
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const v = f.m[y * w + x];
            if (v !== f.m[y * w + w - 1 - x] || v !== f.m[(h - 1 - y) * w + x] || o.m[y * w + x] !== o.m[(h - 1 - y) * w + w - 1 - x]) sym = false;
            if (o.m[y * w + x] && !v) subset = false;
            if (v) { rows.add(y); cols.add(x); }
          }
        if (!sym || !subset || !rows.has(0) || !rows.has(h - 1) || !cols.has(0) || !cols.has(w - 1)) bad.push(`${w}×${h}`);
      }
    check("ellipses 1–24 × 1–24: symmetric, touch all four sides, outline inside the fill", !bad.length, bad.join(" "));
  }

  // ---- Triangles ----
  check("triangle 11 × 10 pointing up, outline", maskArt(C.triangleShape(0, 0, 10, 9, "up")) === [".....#.....", "....#.#....", "....#.#....",
    "...#...#...", "...#...#...", "..#.....#..", "..#.....#..", ".#.......#.", ".#.......#.", "###########"].join("\n"),
  maskArt(C.triangleShape(0, 0, 10, 9, "up")));
  {
    const bad = [];
    for (const dir of ["up", "down", "left", "right"])
      for (let w = 1; w <= 16; w++)
        for (let h = 1; h <= 16; h++) {
          const f = C.triangleShape(0, 0, w - 1, h - 1, dir, true), o = C.triangleShape(0, 0, w - 1, h - 1, dir, false);
          const across = dir === "up" || dir === "down", base = across ? w : h, height = across ? h : w;
          const at = (k, r) => (across ? f.m[r * w + k] : f.m[k * w + r]);            // k along the base, r across
          const line = r => Array.from({ length: base }, (_, k) => at(k, r));
          const tipLine = dir === "up" || dir === "left" ? 0 : height - 1, baseLine = height - 1 - tipLine;
          let ok = line(baseLine).every(Boolean) && (height === 1 || line(tipLine).filter(Boolean).length === (base % 2 ? 1 : Math.min(2, base)));
          let last = 0;
          for (let i = 0; i < height; i++) {
            const r = tipLine === 0 ? i : height - 1 - i, l = line(r), n = l.filter(Boolean).length;
            if (n < last || l.some((v, k) => v !== l[base - 1 - k])) ok = false;
            last = n;
          }
          for (let i = 0; i < w * h; i++) if (o.m[i] && !f.m[i]) ok = false;
          if (!ok) bad.push(`${dir} ${w}×${h}`);
        }
    check("triangles 1–16 × 1–16 in all four directions: symmetric, tip 1 or 2 pixels, full base, growing rows", !bad.length, bad.join(" "));
  }

  // ---- Rectangles, lines, constraints ----
  check("rectangle outline", maskArt(C.rectShape(0, 0, 4, 3)) === "#####\n#...#\n#...#\n#####");
  check("rounded rectangle, radius 1: the 4 corner pixels stay free, as in the OS's boxes", maskArt(C.roundRectShape(0, 0, 4, 3, false, 1, 1)) ===
    ".###.\n#...#\n#...#\n.###." && maskArt(C.roundRectShape(0, 0, 3, 2, true, 1, 1)) === ".##.\n####\n.##." &&
    maskArt(C.roundRectShape(0, 0, 1, 1, true, 1, 1)) === "##\n##");
  check("rounded rectangle, radius 2 and 3: quarter circles in the corners", maskArt(C.roundRectShape(0, 0, 8, 5, false, 1, 2)) ===
    "..#####..\n.#.....#.\n#.......#\n#.......#\n.#.....#.\n..#####.." &&
    maskArt(C.roundRectShape(0, 0, 11, 8, false, 1, 3)).split("\n").slice(0, 4).join("\n") === "...######...\n.##......##.\n.#........#.\n#..........#");
  check("rounded rectangle: too small a box gets the largest radius that fits; 2 wide; from a reversed drag",
    maskArt(C.roundRectShape(0, 0, 4, 2, true, 1, 4)) === ".###.\n#####\n.###." &&
    maskArt(C.roundRectShape(0, 0, 11, 8, false, 2, 3)).split("\n").slice(0, 4).join("\n") === "...######...\n.##########.\n.##......##.\n##........##" &&
    maskArt(C.roundRectShape(8, 5, 0, 0, false, 1, 2)) === maskArt(C.roundRectShape(0, 0, 8, 5, false, 1, 2)) && C.roundRectShape(8, 5, 0, 0).x === 0);
  check("rectangle outline 2 pixels wide", maskArt(C.rectShape(0, 0, 5, 5, false, 2)) === "######\n######\n##..##\n##..##\n######\n######");
  check("rectangle from a reversed drag", maskArt(C.rectShape(4, 3, 0, 0)) === maskArt(C.rectShape(0, 0, 4, 3)) && C.rectShape(4, 3, 0, 0).x === 0);
  {
    const ring = C.ellipseShape(0, 0, 40, 40, false, 8), on = (x, y) => ring.m[y * ring.w + x] === 1;
    let across = 0, slant = 0, k = 0;
    for (let x = 0; on(x, 20); x++) across++;
    while (!on(k, k)) k++;
    for (; on(k, k); k++) slant++;
    check("a thick outline is as thick on a curve as along an edge: a ring 8 wide is 8 across and 6 steps (8.5 px) at 45°, not 5 (7.1 px)",
      across === 8 && slant === 6, `${across} ${slant}`);
    check("…while a thick rectangle stays a plain frame", maskArt(C.rectShape(0, 0, 9, 9, false, 4)) ===
      "##########\n##########\n##########\n##########\n####..####\n####..####\n##########\n##########\n##########\n##########");
  }
  for (const [a, b] of [[[0, 0], [7, 3]], [[7, 3], [0, 0]], [[2, 9], [2, 0]], [[-3, 4], [5, -1]]]) {
    const pts = C.linePoints(a[0], a[1], b[0], b[1]);
    const joined = pts.every((p, i) => i === 0 || (Math.abs(p[0] - pts[i - 1][0]) <= 1 && Math.abs(p[1] - pts[i - 1][1]) <= 1));
    check(`line ${a} → ${b}: both ends, connected, no extra pixels`, String(pts[0]) === String(a) && String(pts[pts.length - 1]) === String(b) &&
      joined && pts.length === Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) + 1);
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  check("Shift line: shallow drag → horizontal", same(C.constrainLine(0, 0, 10, 2), [0, 0, 10, 0]));
  check("Shift line: steep drag → vertical", same(C.constrainLine(0, 0, 2, 10), [0, 0, 0, 10]));
  check("Shift line: diagonal drag → 45°", same(C.constrainLine(0, 0, 10, 8), [0, 0, 10, 10]) && same(C.constrainLine(0, 0, -6, 4), [0, 0, -6, 6]));
  check("Shift square", same(C.constrainSquare(2, 3, 10, 5), [2, 3, 10, 11]) && same(C.constrainSquare(5, 5, 1, 9), [5, 5, 1, 9]));
  check("Shift triangle up: height = round(base · √3 / 2)", same(C.constrainTriangle(0, 0, 10, 2, "up"), [0, 0, 10, 9]));
  check("Shift triangle right: the base runs down", same(C.constrainTriangle(0, 0, 3, 12, "right"), [0, 0, 10, 12]));
  {
    const b = C.bitmap(6, 6);
    C.stamp(b, 2, 2, 3, "on");
    C.stamp(b, 5, 5, 2, "on");
    check("brush stamps: size 3 is centred, size 2 grows right and down, clipped at the edge",
      ascii(b) === "......\n.###..\n.###..\n.###..\n......\n.....#", ascii(b));
  }

  // ---- Fill ----
  {
    const b = fromArt(["#####", "#...#", "#...#", "#####", "....."]);
    check("fill: stays inside the closed box", C.floodFill(b, 2, 2, "on") && ascii(b) === "#####\n#####\n#####\n#####\n.....", ascii(b));
    check("fill: nothing changes → false", !C.floodFill(b, 2, 2, "on"));
    check("fill: with a pattern, anchored to the canvas", C.floodFill(b, 0, 4, "gray50") && ascii(b).split("\n")[4] === "#.#.#", ascii(b));
    check("fill: outside the canvas does nothing", !C.floodFill(b, -1, 0, "off") && !C.floodFill(b, 5, 0, "off"));
  }

  // ---- Patterns ----
  {
    const density = ink => { let n = 0; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) n += C.inkValue(ink, x, y); return n; };
    const want = { on: 64, off: 0, dots6: 4, dots12: 8, gray25: 16, gray50: 32, gray75: 48, gray88: 56, hlines: 32, vlines: 32, rising: 16, falling: 16, grid: 28, hatch: 32 };
    const drawn = C.INKS.filter(i => i !== "clear");
    check("patterns: every ink has a known density", drawn.length === Object.keys(want).length && drawn.every(i => density(i) === want[i]),
      drawn.map(i => `${i} ${density(i)}`).join(", "));
    check("inks: Transparent is the clear value everywhere", C.isInk("clear") && C.inkName("clear") === "Transparent" &&
      [[0, 0], [3, 7], [-5, 2]].every(([x, y]) => C.inkValue("clear", x, y) === C.CLEAR));
    check("patterns: tiles are rectangular", C.PATTERNS.every(p => p.rows.every(r => r.length === p.rows[0].length && /^[#.]+$/.test(r))));
    let inverse = true, periodic = true;
    for (let y = -8; y < 8; y++)
      for (let x = -8; x < 8; x++) {
        if (C.inkValue("gray75", x, y) === C.inkValue("gray25", x, y) || C.inkValue("gray88", x, y) === C.inkValue("dots12", x, y)) inverse = false;
        for (const ink of C.INKS) if (C.inkValue(ink, x, y) !== C.inkValue(ink, x + 8, y + 8)) periodic = false;
      }
    check("patterns: 75 % and 88 % are the inverse of 25 % and 12 %", inverse);
    check("patterns: repeat every 8 pixels, also at negative coordinates", periodic);
    check("inks: names and ids", C.inkName("on") === "Light" && C.inkName("off") === "Dark" && C.inkName("gray50") === "50% checker" &&
      C.isInk("hatch") && !C.isInk("toString") && !C.isInk("purple"));
    const neg = C.invert({ w: 3, h: 1, px: Uint8Array.from([0, 1, C.CLEAR]) });
    check("invert: dark and light swap, clear stays clear (the device's view)", Array.from(neg.px).join() === `1,0,${C.CLEAR}`);
  }

  // ---- Fonts ----
  {
    const bad = [];
    for (const f of Object.values(C.FONTS))
      for (const [ch, g] of Object.entries(f.glyphs))
        if (!g.rows.every(r => r.length === g.w && /^[#.]+$/.test(r)) || g.rows.length > f.height || !g.rows.some(r => r.includes("#"))) bad.push(`${f.id} ${ch}`);
    check("fonts: every glyph is rectangular, fits the line and has pixels", !bad.length, bad.join(", "));
    const printable = Array.from({ length: 94 }, (_, i) => String.fromCharCode(33 + i));
    check("fonts: Regular has all printable ASCII", printable.every(ch => C.FONTS.regular.glyphs[ch]), printable.filter(ch => !C.FONTS.regular.glyphs[ch]).join(""));
    check("fonts: Small has A–Z and 0–9", [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"].every(ch => C.FONTS.small.glyphs[ch]));
    const R = C.FONTS.regular, S = C.FONTS.small;
    check("text: width of AB is 5 + 1 + 5", C.textWidth(R, "AB") === 11);
    check("text: a space is 3 + 1 wide in Regular", C.textWidth(R, "A B") === 15);
    const paint = (f, s) => { const b = C.bitmap(40, 10); C.paintText(b, f, s, 1, 0, "on"); return ascii(b); };
    check("text: Small writes lowercase as capitals", paint(S, "ab") === paint(S, "AB"));
    check("text: accents fall back to the plain letter", paint(R, "é") === paint(R, "e") && paint(S, "Ü") === paint(S, "U"));
    check("text: unknown characters become a box", C.textWidth(R, "€") === 3 && C.textWidth(S, "€") === 3);
    check("text: descenders go below the capitals", C.FONTS.regular.glyphs.g.rows.length === 9 && R.height === 9 && S.height === 6);
  }

  // ---- PNG ----
  {
    const b = random(13, 7, 5), png = await C.encodePng(b, 1), p = pngPixels(png);
    check("png: 1-bit gray, right size", C.isPng(png) && p.w === 13 && p.h === 7 && p.depth === 1 && p.type === 0);
    check("png: pixels, white = lit", p.px.join("") === Array.from(b.px).join(""));
    check("png: chunk CRCs", p.chunks.every(c => c.crc === C.crc32(c.typed) && (!zlib.crc32 || c.crc === zlib.crc32(Buffer.from(c.typed)))));
    check("png: remembers the sprite size", JSON.stringify(C.readPngMeta(png)) === JSON.stringify({ w: 13, h: 7, scale: 1 }));
    const big = await C.encodePng(b, 8), q = pngPixels(big);
    let blocks = q.w === 104 && q.h === 56;
    for (let y = 0; y < q.h && blocks; y++) for (let x = 0; x < q.w; x++) if (q.px[y * q.w + x] !== b.px[(y >> 3) * 13 + (x >> 3)]) { blocks = false; break; }
    check("png ×8: 8 × 8 blocks of the sprite", blocks);
    check("png ×8: remembers scale 8", JSON.stringify(C.readPngMeta(big)) === JSON.stringify({ w: 13, h: 7, scale: 8 }));
    check("png: other files have no sprite metadata", C.readPngMeta(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0])) === null && !C.isPng(new Uint8Array(20)));
    for (const n of [0, 1, 65535, 65536, 140000]) {
      const d = Uint8Array.from({ length: n }, (_, i) => (i * 7) & 255);
      check(`png: stored zlib fallback inflates (${n} bytes)`, Buffer.compare(zlib.inflateSync(Buffer.from(C.zlibStored(d))), Buffer.from(d)) === 0);
    }
  }

  // ---- Opening images ----
  {
    const rgba = new Uint8Array([255, 255, 255, 255, 255, 255, 255, 0, 127, 127, 127, 255, 128, 128, 128, 255]);
    check("open: lit = opaque and bright", Array.from(C.fromRgba(rgba, 4, 1).px).join("") === "1001");
    const b = random(20, 10, 9), up = { w: 160, h: 80, px: new Uint8Array(160 * 80) };
    for (let y = 0; y < 80; y++) for (let x = 0; x < 160; x++) up.px[y * 160 + x] = b.px[(y >> 3) * 20 + (x >> 3)];
    check("open: scaled-up pixel art is found at its real pixel size", C.fitScale(up) === 8 && C.equals(C.toSprite(C.downscale(up, 8)), b));
    const noise = random(100, 50, 3);
    check("open: an image that isn't blocky can't be made sprite-sized", C.fitScale({ w: 200, h: 100, px: new Uint8Array(20000).map((_, i) => noise.px[i % 5000]) }) === 0);
    check("open: sprites above 128 × 64 are refused", throws(() => C.bitmap(129, 10)) && throws(() => C.bitmap(10, 65)) && throws(() => C.bitmap(0, 5)));
  }

  // ---- ZIP for the claude.ai preview ----
  {
    const data = new Uint8Array([1, 2, 3, 250]), name = "icon_2x2.bin", zip = C.zipOne(name, data, new Date(2026, 9, 15, 12, 30, 10));
    const dv = new DataView(zip.buffer), n = name.length, cd = 30 + n + data.length;
    check("zip: local header, name, data", dv.getUint32(0, true) === 0x04034b50 && Buffer.from(zip.subarray(30, 30 + n)).toString() === name &&
      Buffer.compare(Buffer.from(zip.subarray(30 + n, 30 + n + 4)), Buffer.from(data)) === 0);
    check("zip: CRC and sizes", dv.getUint32(14, true) === C.crc32(data) && dv.getUint32(18, true) === 4 && dv.getUint32(22, true) === 4);
    check("zip: central directory and end record", dv.getUint32(cd, true) === 0x02014b50 && dv.getUint32(zip.length - 22, true) === 0x06054b50 &&
      dv.getUint32(zip.length - 10, true) === 46 + n && dv.getUint32(zip.length - 6, true) === cd);
  }

  // ---- Layers ----
  {
    const P = rows => Uint8Array.from(rows.join(""), c => (c === "#" ? 1 : c === "." ? 0 : C.CLEAR));   // _ = clear
    const S = (px, w) => Array.from(px, v => (v === 1 ? "#" : v === 0 ? "." : "_")).join("").match(new RegExp(`.{${w}}`, "g")).join("\n");
    const top = C.layer("Top", 4, 2, P(["#___", "____"])), mid = C.layer("Mid", 4, 2, P(["..__", "..__"]));
    const low = C.layer("Low", 4, 2, P(["####", "...."]));
    check("layers: a new layer is clear, ids are unique", C.layer("x", 3, 2).px.every(v => v === C.CLEAR) && new Set([top.id, mid.id, low.id]).size === 3);
    check("composite: the highest pixel that isn't clear wins", ascii(C.composite([top, mid, low], 4, 2)) === "#.##\n....", ascii(C.composite([top, mid, low], 4, 2)));
    check("composite: where nothing is drawn, the canvas is lit", ascii(C.composite([C.layer("e", 3, 1)], 3, 1)) === "###" && ascii(C.composite([], 2, 1)) === "##");
    mid.visible = false;
    check("composite: hidden layers are left out", ascii(C.composite([top, mid, low], 4, 2)) === "####\n....");
    mid.visible = true;
    const g = C.group("G", [top, mid]);
    check("composite: a group stacks where it is in the list", ascii(C.composite([g, low], 4, 2)) === "#.##\n....");
    g.visible = false;
    check("composite: a hidden group hides what is in it", ascii(C.composite([g, low], 4, 2)) === "####\n....");
    g.visible = true;
    check("composite: swap shows other pixels for one layer", ascii(C.composite([g, low], 4, 2, { [top.id]: P(["____", "_###"]) })) === "..##\n.###");

    const sh = (rows, dx, dy) => S(C.shift(P(rows), rows[0].length, rows.length, dx, dy), rows[0].length);
    check("shift: pixels move, new area is clear, what leaves the canvas is cut off",
      sh(["#.", "__"], 1, 0) === "_#\n__" && sh(["#.", ".#"], -1, -1) === "#_\n__" && sh(["#.", ".#"], 0, 0) === "#.\n.#" && sh(["##"], 5, 0) === "__",
      [sh(["#.", "__"], 1, 0), sh(["#.", ".#"], -1, -1)].join(" | "));

    const base = C.bitmap(3, 1);
    base.px.fill(1);
    C.paste(base, { w: 3, h: 1, px: Uint8Array.from([0, C.CLEAR, 0]) }, 0, 0);
    check("paste: clear pixels leave what is below", Array.from(base.px).join("") === "010");
    check("resize: new area of a layer is clear", Array.from(C.resize({ w: 1, h: 1, px: Uint8Array.from([1]) }, 2, 1, C.CLEAR).px).join() === `1,${C.CLEAR}`);

    let packed = true;
    for (const [w, h] of [[1, 1], [3, 1], [2, 2], [5, 1], [48, 33], [128, 64]]) {
      const px = Uint8Array.from({ length: w * h }, (_, i) => (i * 7 + (i >> 3)) % 3), back = C.unpackLayer(C.packLayer(px), w, h);
      if (back.length !== px.length || back.some((v, i) => v !== px[i])) packed = false;
    }
    check("storage: layers pack at 2 bits a pixel and come back", packed && atob(C.packLayer(new Uint8Array(48 * 33))).length === 396);
    check("storage: a layer of the wrong length or with a bad pixel is refused",
      throws(() => C.unpackLayer(C.packLayer(new Uint8Array(6)), 2, 2)) && throws(() => C.unpackLayer(btoa("\xff"), 2, 2)));

    const tree = [C.group("Face", [C.layer("Eyes", 4, 2, P(["#.#.", "____"])), C.layer("Mouth", 4, 2, P(["____", ".##."]))]),
      C.layer("Back", 4, 2, P(["....", "...."]))];
    tree[0].open = false;
    tree[0].children[1].visible = false;
    const back = C.loadItems(JSON.parse(JSON.stringify(C.saveItems(tree))), 4, 2);
    check("storage: the layer tree comes back: groups, names, visibility, folding, pixels",
      back.length === 2 && back[0].type === "group" && back[0].name === "Face" && back[0].open === false &&
      back[0].children.map(c => `${c.name} ${c.visible}`).join() === "Eyes true,Mouth false" && S(back[0].children[1].px, 4) === "____\n.##." &&
      back[1].type === "layer" && C.equals(C.composite(back, 4, 2), C.composite(tree, 4, 2)) && back[0].id !== tree[0].id);
    const blank = C.packLayer(new Uint8Array(8));
    check("storage: odd layer data is refused", [null, {}, [{ t: "x" }], [{ t: "l", n: "a", d: "AAAA" }], [{ t: "g", n: "g", c: "no" }]]
      .every(bad => throws(() => C.loadItems(bad, 4, 2))));
    let deep = [{ t: "l", n: "x", d: blank }];
    for (let i = 0; i < 18; i++) deep = [{ t: "g", n: "g", c: deep }];
    check("storage: groups nest at most 16 deep", throws(() => C.loadItems(deep, 4, 2)));
    const named = C.loadItems([{ t: "l", n: "  ", d: blank }, { t: "l", n: "x".repeat(60), v: false, d: blank }], 4, 2);
    check("storage: an empty name becomes Layer, long ones are cut to 40, v: false hides",
      named[0].name === "Layer" && named[0].visible && named[1].name.length === 40 && !named[1].visible);

    const copy = C.cloneItems(tree);
    check("undo: cloneItems keeps the ids and copies the pixels", copy[0].id === tree[0].id && copy[0].children[0].px !== tree[0].children[0].px &&
      C.sameItems(copy, tree));
    copy[0].open = true;
    const fold = C.sameItems(copy, tree);
    copy[0].children[0].px[1] = 1;
    const pixel = !C.sameItems(copy, tree);
    copy[0].children[0].px[1] = 0;
    copy[1].name = "Other";
    const name = !C.sameItems(copy, tree);
    copy[1].name = "Back";
    copy[1].visible = false;
    const hide = !C.sameItems(copy, tree);
    copy[1].visible = true;
    check("undo: sameItems sees pixels, names, visibility and order, but not folding", fold && pixel && name && hide &&
      !C.sameItems([copy[1], copy[0]], tree) && C.sameItems(copy, tree));

    const png = await C.encodePng(C.composite(tree, 4, 2), 1, { layers: C.saveItems(tree) }), meta = C.readPngMeta(png);
    check("png: the layers ride along in the text chunk", meta.w === 4 && meta.h === 2 &&
      C.equals(C.composite(C.loadItems(meta.layers, 4, 2), 4, 2), C.composite(tree, 4, 2)) && pngPixels(png).px.join("") === "10100000");
    const odd = [C.layer("Grün ✓ 🎛", 4, 2)], oddPng = await C.encodePng(C.composite(odd, 4, 2), 1, { layers: C.saveItems(odd) });
    check("png: names outside ASCII survive, the chunk itself stays ASCII", C.loadItems(C.readPngMeta(oddPng).layers, 4, 2)[0].name === "Grün ✓ 🎛" &&
      pngChunks(oddPng).find(c => c.type === "tEXt").data.every(b => b > 0 && b < 128 || b === 0));
  }

  // ---- Text layers ----
  {
    const _ = C.CLEAR, R = C.FONTS.regular;
    const t = C.textItem("Hi", 2, 8, "Hi");                  // Regular: H is 5 wide, i 1, so 5 + 1 + 1 = 7
    const r = C.textBounds(t);
    check("text: the anchor is the left edge and the bottom row of the capitals", r.x === 2 && r.y === 2 && r.w === 7 && r.h === R.height,
      JSON.stringify(r));
    check("text: centred and right-aligned anchors", C.textBounds({ ...t, align: "center" }).x === 2 - 3 && C.textBounds({ ...t, align: "right" }).x === 2 - 6);
    const W = 12, H = 12, px = C.textPixels(t, W, H), at = (a, x, y) => a[y * W + x];
    check("text: plain letters are light (lit), as the OS draws them; around them clear", at(px, 2, 2) === 1 && at(px, 2, 8) === 1 && at(px, 3, 2) === _ &&
      at(px, 0, 0) === _ && px.filter(v => v === 0).length === 0);
    const box = C.textPixels({ ...t, style: "box" }, W, H);
    check("text: box puts light letters on a dark box with a 1-pixel margin", at(box, 1, 1) === 0 && at(box, 9, 1) === 0 &&
      at(box, 2, 2) === 1 && at(box, 3, 2) === 0 && at(box, 0, 0) === _);
    const inv = C.textPixels({ ...t, style: "inverted" }, W, H);
    check("text: inverted puts dark letters in a light (lit) box, like the OS's title bars", at(inv, 1, 1) === 1 && at(inv, 2, 2) === 0 &&
      at(inv, 3, 2) === 1);
    const l = C.layer("L", W, H);
    l.px.fill(0);
    const both = C.composite([t, l], W, H), bare = C.composite([t, l], W, H, null, false);
    check("text: the picture shows text layers, without them on request (for the .bin)", both.px[2 * W + 3] === 0 && both.px[2 * W + 2] === 1 &&
      bare.px.every(v => v === 0) && C.composite([t], W, H, null, false).px.every(v => v === 1));
    const tree = [C.group("G", [{ ...C.textItem("Value", 64, 40, "123", "large", "center", "inverted"), visible: false }]), C.layer("B", W, H)];
    const back = C.loadItems(JSON.parse(JSON.stringify(C.saveItems(tree))), W, H);
    const tx = back[0].children[0];
    check("text: saved and loaded with string, anchor, font, alignment, style and visibility", tx.type === "text" && tx.text === "123" && tx.x === 64 &&
      tx.y === 40 && tx.font === "large" && tx.align === "center" && tx.style === "inverted" && tx.visible === false && tx.name === "Value");
    check("text: odd stored text layers are refused or repaired", throws(() => C.loadItems([{ t: "t", n: "x", x: 1.5, y: 0, s: "a" }], W, H)) &&
      throws(() => C.loadItems([{ t: "t", n: "x", x: 1, y: 0 }], W, H)) &&
      JSON.stringify((({ font, align, style }) => [font, align, style])(C.loadItems([{ t: "t", n: "x", x: 1, y: 0, s: "a\nb", f: "toString", a: "up", st: "neon" }], W, H)[0])) === '["regular","left","plain"]' &&
      C.loadItems([{ t: "t", n: "x", x: 1, y: 0, s: "a\nb" }], W, H)[0].text === "ab");
    const copy = C.cloneItems([t]);
    const same = C.sameItems(copy, [t]);
    copy[0].text = "Ho";
    check("text: undo sees a changed text", same && !C.sameItems(copy, [t]));
    const olds = C.oldTexts([C.group("G", [{ ...t }]), { ...t, style: "box" }, { ...t, style: "inverted" }, C.layer("B", W, H)]);
    check("text: layers kept from the negative view look as they did: plain and box dark letters, inverted light ones on dark",
      olds[0].children[0].style === "inverted" && olds[1].style === "inverted" && olds[2].style === "box" && olds[3].type === "layer" &&
      C.composite([olds[0].children[0]], W, H).px.filter(v => v === 0).length === px.filter(v => v === 1).length && t.style === "plain");
    const L = C.FONTS.large;
    check("text: Large is Regular three times as big", L.glyphs.A.w === 15 && L.glyphs.A.rows.length === 21 && L.ascent === 21 && L.height === 27 &&
      C.textWidth(L, "AB") === 31);
  }

  // ---- The screen described (the .json beside the .bin) ----
  {
    const W = 128, H = 64, frame = C.layer("Frame", W, H);
    C.clearRect({ w: W, h: H, px: frame.px }, 0, 0, 128, 13, 0);               // rows 0–12 from the top
    const title = C.textItem("Root", 2, 10, "Root", "small", "left", "inverted");
    const d = C.describe([C.group("Header", [title, frame]), C.layer("Empty", W, H)], W, H, { name: "browser", device: "models", files: { bin: "b.bin" } });
    const t = d.texts[0], fr = d.layers.find(l => l.name === "Header / Frame");
    check("describe: names the screen, its device and size, and its files", d.name === "browser" && d.device === "models" && d.size.join() === "128,64" &&
      d.files.bin === "b.bin" && d.format === "1-bit-editor screen");
    check("describe: a text with its anchor in OS coordinates (y from the bottom), font, alignment and style",
      t.text === "Root" && t.x === 2 && t.y === 63 - 10 && t.font === "small" && t.align === "left" && t.style === "inverted" && t.layer === "Header / Root",
      JSON.stringify(t));
    check("describe: boxes as the OS's [x0, y0, x1, y1], y from the bottom", fr.box.join() === "0,51,127,63" && t.box[3] === 63 - (10 - 5 + 1) + 1,
      `${fr.box} / ${t.box}`);
    check("describe: groups, an empty layer without a box, and the stand-in fonts", d.layers.map(l => `${l.name}:${l.type}`).join() ===
      "Header:group,Header / Root:text,Header / Frame:layer,Empty:layer" && d.layers[3].box === null && d.fonts.large.capHeight === 21);
    const z = C.zipFiles([{ name: "a.bin", data: Uint8Array.from([1, 2]) }, { name: "a.json", data: new TextEncoder().encode("{}") }], new Date(2026, 9, 17));
    const dv = new DataView(z.buffer), names = [];
    let o = 0;
    while (dv.getUint32(o, true) === 0x04034b50) {
      const n = dv.getUint16(o + 26, true), size = dv.getUint32(o + 18, true);
      names.push(`${Buffer.from(z.subarray(o + 30, o + 30 + n))}=${[...z.subarray(o + 30 + n, o + 30 + n + size)].join(".")}`);
      o += 30 + n + size;
    }
    const cd = dv.getUint32(z.length - 6, true), second = cd + 46 + "a.bin".length;
    check("zip: two files, each with its own entry and offset", names.join() === "a.bin=1.2,a.json=123.125" && dv.getUint16(z.length - 12, true) === 2 &&
      cd === o && dv.getUint32(second + 42, true) === 30 + 5 + 2, names.join());
    const read = C.readZip(z);
    check("zip: read back through its directory", read.map(f => `${f.name}:${f.method}:${[...f.data].join(".")}`).join() === "a.bin:0:1.2,a.json:0:123.125");
    check("zip: anything else is refused", throws(() => C.readZip(new Uint8Array(40))));
    const back = C.textsFromDescription(JSON.parse(JSON.stringify(d)), W, H);
    check("description: its texts come back as text layers, in canvas coordinates", back.length === 1 && back[0].type === "text" && back[0].text === "Root" &&
      back[0].x === 2 && back[0].y === 10 && back[0].font === "small" && back[0].style === "inverted" && back[0].name === "Root" && back[0].visible);
    check("description: one for another size or another program is refused", throws(() => C.textsFromDescription(d, 48, 33)) &&
      throws(() => C.textsFromDescription({ format: "x", texts: [] }, W, H)) && throws(() => C.textsFromDescription({ ...d, texts: [{ x: 1.5, y: 0, text: "a" }] }, W, H)));
  }

  // ---- Stamps ----
  {
    const ids = C.STAMPS.map(s => s.id), cats = C.STAMP_CATS.map(([c]) => c), _ = C.CLEAR;
    check("stamps: three examples in each tab, plus the Cute ghost icon under Basics and the title bar and 1/2 Screen under UI; ids unique",
      cats.join() === "basics,synth,ui" && cats.map(c => C.STAMPS.filter(s => s.cat === c).length).join() === "4,3,5" &&
      new Set(ids).size === ids.length && !ids.includes("ghost") && !ids.includes("cat"));
    const icons = ["cuteghost"].map(id => C.STAMPS.find(s => s.id === id));
    check("stamps: the Basics icon is 34 × 34, the motif centred and 34 px along its long edge", icons.every(s => {
      const b = s && s.cat === "basics" && C.stampBitmap(s.rows), r = b && C.bounds(b);
      return r && b.w === 34 && b.h === 34 && Math.max(r.w, r.h) === 34 && Math.abs(2 * r.x + r.w - 34) <= 1 && Math.abs(2 * r.y + r.h - 34) <= 1;
    }), icons.map(s => s && JSON.stringify(C.bounds(C.stampBitmap(s.rows)))).join(" "));
    const half = C.STAMPS.find(s => s.id === "halfscreen"), hb = C.stampBitmap(half.rows), hp = (x, y) => hb.px[y * 64 + x];
    check("stamps: 1/2 Screen is 64 × 64, dark, its corners rounded 4 px (4, 2, 1, 1 pixels free in the rows from each corner)",
      half.name === "1/2 Screen" && half.cat === "ui" && hb.w === 64 && hb.h === 64 && hb.px.filter(v => v === 0).length === 64 * 64 - 32 &&
      hp(3, 0) === _ && hp(4, 0) === 0 && hp(1, 1) === _ && hp(2, 1) === 0 && hp(0, 3) === _ && hp(1, 3) === 0 && hp(0, 4) === 0 &&
      hp(60, 63) === _ && hp(59, 63) === 0 && hp(63, 60) === _ && hp(63, 59) === 0);
    const bar = C.stampBitmap(C.STAMPS.find(s => s.id === "titlebar").rows);
    check("stamps: the title bar is 128 × 13, dark, with its 4 corners free", bar.w === 128 && bar.h === 13 &&
      [0, 127, 12 * 128, 13 * 128 - 1].every(i => bar.px[i] === _) && bar.px.filter(v => v === 0).length === 128 * 13 - 4);
    check("stamps: rectangular rows of # + . only, sprite-sized, with dark pixels", C.STAMPS.every(s =>
      s.rows.every(r => r.length === s.rows[0].length && /^[#+.]+$/.test(r)) && C.fits(s.rows[0].length, s.rows.length) && s.rows.some(r => r.includes("#"))),
    C.STAMPS.filter(s => !s.rows.every(r => r.length === s.rows[0].length)).map(s => s.id).join());
    const b = C.stampBitmap(["#+.", "..#"]);
    check("stamps: # is dark, + lit, . transparent", b.w === 3 && b.h === 2 && Array.from(b.px).join() === `0,1,${_},${_},${_},0`);
    const t = C.trim({ w: 4, h: 3, px: Uint8Array.from([_, _, _, _, _, 1, 0, _, _, _, _, _]) });
    check("trim: the clear border goes", t.w === 2 && t.h === 1 && Array.from(t.px).join() === "1,0");
    check("trim: nothing but clear gives nothing", C.trim({ w: 2, h: 2, px: new Uint8Array(4).fill(_) }) === null);
  }

  // ---- Storage, editing helpers, the example ----
  {
    const b = random(48, 33, 77);
    check("storage: pack and unpack", C.equals(C.unpack(C.pack(b), 48, 33), b));
    check("storage: a wrong length is refused", throws(() => C.unpack(C.pack(b), 48, 34)));
    const r = C.resize(fromArt(["##", "#."]), 3, 1);
    check("resize keeps the top-left corner", ascii(r) === "##.");
    check("resize fills new canvas area with the background", ascii(C.resize(fromArt([".#"]), 3, 2, 1)) === ".##\n###");
    const lit = fromArt(["...", "...", "..."]);
    C.clearRect(lit, 1, 0, 5, 2, 1);
    check("clearRect sets the given value and clips", ascii(lit) === ".##\n.##\n...", ascii(lit));
    const s = fromArt(["#..", ".#.", "..#"]), part = C.crop(s, 1, 1, 3, 3);
    check("crop reads off-canvas pixels as off", ascii(part) === "#..\n.#.\n...", ascii(part));
    const t = C.bitmap(3, 3);
    C.paste(t, fromArt(["##", "#."]), 2, 2);
    check("paste is opaque and clipped", ascii(t) === "...\n...\n..#");
    const start = C.startItems(), names = [];
    (function walk(list, depth) { for (const it of list) { names.push(`${"·".repeat(depth)}${it.name}`); if (it.children) walk(it.children, depth + 1); } })(start, 0);
    check("start screen: the ghost, the version in two text layers, the 1/2 Screen, top first", names.join() === "Geist,Version,·0.1,·V,1/2 Screen" &&
      start[1].children.every(t => t.type === "text" && t.style === "inverted"), names.join());
    const startBin = C.toBin(C.composite(start, 128, 64, null, false)), sd = C.describe(start, 128, 64);
    check("start screen: the .bin of geist-V01 as drawn, the texts left out", startBin.length === 1024 && C.crc32(startBin) === 0xd427a63b,
      (C.crc32(startBin) >>> 0).toString(16));
    check("start screen: V (Large) at x 85, y 21 and 0.1 (Regular) at x 102, y 27 in the OS's coordinates; the ghost in (17, 16)–(47, 49)",
      JSON.stringify(sd.texts.map(t => [t.text, t.x, t.y, t.font])) === '[["0.1",102,27,"regular"],["V",85,21,"large"]]' &&
      sd.layers[0].box.join() === "17,16,47,49" && sd.layers[4].box.join() === "0,0,63,63", JSON.stringify(sd.texts));
    const ex = C.oldExample();
    check("old example (only to recognize it untouched): a 48 × 33 machine icon, dark on a lit canvas", ex.w === 48 && ex.h === 33 &&
      C.get(ex, 0, 0) === 0 && C.get(ex, 2, 2) === 1 && ex.px.reduce((n, v) => n + v, 0) > ex.px.length / 2);
    const big = C.oldExample(128, 64);
    let around = true;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 128; x++) if ((x < 40 || x >= 88 || y < 15 || y >= 48) && !big.px[y * 128 + x]) around = false;
    check("old example: on 128 × 64 the icon sat in the middle, lit all around", C.equals(C.toSprite(C.crop(big, 40, 15, 48, 33)), ex) && around);
    const parts = C.oldExampleLayers();
    check("old example: four layers, top first, the same picture as before layers", parts.map(([n]) => n).join() === "Text,Play,Circle,Frame" &&
      C.equals(C.composite(parts.map(([n, px]) => C.layer(n, 48, 33, px)), 48, 33), ex) && C.crc32(ex.px) === 0x4d3d247f, C.crc32(ex.px).toString(16));
    if (process.env.VERBOSE) console.log(ascii(C.composite(start, 128, 64)).replace(/\./g, "·"));
  }

  console.log(`${checks - failures} of ${checks} checks passed`);
  process.exitCode = failures ? 1 : 0;
}

main().catch(err => { console.error(err); process.exitCode = 1; });
