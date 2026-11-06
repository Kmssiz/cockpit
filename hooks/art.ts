// Cockpit's drawings: pure functions that return SVG strings. Nothing here touches the engine.
// Icons are from Lucide (https://lucide.dev, ISC license), 24x24 grid, 2px round strokes.

// ---------- Palette ----------
export const BG = '#15121f'
export const PANEL = '#1e1b2b'
export const TILE = '#2a2640'
export const LINE = '#4a4166'
export const TEXT = '#f1ead8'
export const MUTED = '#9189a8'
export const EMPTY = '#383250'
export const INK = '#120f1c'
export const ORANGE = '#ff8a3d'
export const YELLOW = '#ffc857'
export const WARM = '#ff6b6b'
export const COLD = '#5cc8ff'
export const GOOD = '#5fd38d'
export const GOLD = '#ffd23f'
export const RED = '#ff5d5d'

const FONT = "ui-monospace,'Cascadia Mono','SF Mono',Menlo,Consolas,'Liberation Mono',monospace"

// ---------- Icons (Lucide) ----------
const ICONS: Record<string, string> = {
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
  timer: '<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  snow: '<line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
  coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
  bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  trend: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
}
export type IconName = keyof typeof ICONS

const g = (name: string, color: string, size: number, x: number, y: number): string =>
  `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</g>`

/** A standalone icon, for the folded row. */
export const iconSvg = (name: IconName, color: string, size = 16): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${g(name, color, size, 0, 0)}</svg>`

/** The band's width in CSS pixels for a column count (the engine keeps 5 cells; a cell is 12 px). */
export const bandPx = (columns: number): number => (columns + 5) * 12

// ---------- Primitives ----------
type Opt = { size?: number; weight?: number; fill?: string; anchor?: 'start' | 'end' | 'middle'; ls?: number }
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const T = (x: number, y: number, s: string, o: Opt = {}): string =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 12}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? TEXT}" text-anchor="${o.anchor ?? 'start'}"${o.ls ? ` letter-spacing="${o.ls}"` : ''}>${esc(s)}</text>`
const R = (x: number, y: number, w: number, h: number, r: number, fill: string, extra = ''): string =>
  `<rect x="${+x.toFixed(1)}" y="${+y.toFixed(1)}" width="${+Math.max(0, w).toFixed(1)}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`

/** Mix a #rrggbb colour toward white by pct (0..1). */
const lift = (hex: string, pct: number): string => {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.round(v + (255 - v) * pct)
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => ch(v).toString(16).padStart(2, '0')).join('')}`
}

/** A panel with notched (pixel) corners and a lit top edge. */
const NOTCH = 4
const panel = (x: number, y: number, w: number, h: number, fill: string, edge: string, glow = false): string => {
  const n = NOTCH
  const d = `M${x + n} ${y}H${x + w - n}V${y + n}H${x + w}V${y + h - n}H${x + w - n}V${y + h}H${x + n}V${y + h - n}H${x}V${y + n}H${x + n}Z`
  return (
    (glow ? `<path d="${d}" fill="none" stroke="${edge}" stroke-width="4" opacity="0.25" shape-rendering="crispEdges"/>` : '') +
    `<path d="${d}" fill="${fill}" stroke="${edge}" stroke-width="2" shape-rendering="crispEdges"/>` +
    `<rect x="${x + n}" y="${y + 2}" width="${Math.max(0, w - 2 * n)}" height="2" fill="#fff" opacity="0.07"/>`
  )
}

/** A chunky segmented bar: `n` blocks, the first `filled` lit, each with a light top edge. */
const segBar = (x: number, y: number, w: number, h: number, n: number, filled: number, color: string): string => {
  const gap = 2
  const bw = (w - gap * (n - 1)) / n
  let s = R(x - 2, y - 2, w + 4, h + 4, 0, INK, `stroke="${LINE}" stroke-width="1" shape-rendering="crispEdges"`)
  for (let i = 0; i < n; i++) {
    const bx = +(x + i * (bw + gap)).toFixed(2)
    const lit = i < filled
    s += `<rect x="${bx}" y="${y}" width="${+bw.toFixed(2)}" height="${h}" fill="${lit ? color : EMPTY}" shape-rendering="crispEdges"/>`
    if (lit) s += `<rect x="${bx}" y="${y}" width="${+bw.toFixed(2)}" height="${Math.max(2, Math.round(h * 0.3))}" fill="${lift(color, 0.55)}" opacity="0.7" shape-rendering="crispEdges"/>`
  }
  return s
}

const head = (x: number, y: number, icon: IconName, color: string, title: string): string =>
  g(icon, color, 13, x, y) + T(x + 19, y + 10, title.toUpperCase(), { size: 10, weight: 800, fill: MUTED, ls: 1.4 })

// ---------- Mascot ----------
export type Mood = 'happy' | 'worry' | 'alarm'

const pxr = (x: number, y: number, w: number, h: number, fill: string, extra = ''): string =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra ? ' ' + extra : ''}/>`

/** The critter's pixels on an 11 x 9 grid. Warm: awake, bobbing. Cold: frozen blue. The face follows the pace. */
const mascotInner = (cold: boolean, mood: Mood): string => {
  const body = cold ? '#6aaabd' : '#e06c6c'
  const light = cold ? '#cfeaf2' : '#f2a09a'
  const dark = cold ? '#3f7f93' : '#b84a4a'
  const ink = '#1c1a16'
  let s = ''
  s += pxr(2, 0, 7, 1, body) + pxr(1, 1, 9, 5, body)
  s += pxr(0, 2, 1, 2, body) + pxr(10, 2, 1, 2, body)
  s += pxr(2, 6, 2, 2, body) + pxr(7, 6, 2, 2, body)
  s += pxr(1, 5, 9, 1, dark)
  s += pxr(2, 1, 3, 1, light, 'opacity="0.7"')
  if (cold) {
    s += pxr(3, 3, 2, 1, ink) + pxr(6, 3, 2, 1, ink) + pxr(4, 4, 3, 1, ink, 'opacity="0.45"')
  } else if (mood === 'alarm') {
    s += pxr(3, 2, 2, 2, ink) + pxr(6, 2, 2, 2, ink) + pxr(3, 1, 1, 1, ink) + pxr(7, 1, 1, 1, ink) + pxr(5, 4, 1, 1, ink)
  } else if (mood === 'worry') {
    s += pxr(3, 2, 1, 2, ink) + pxr(7, 2, 1, 2, ink) + pxr(4, 4, 3, 1, ink, 'opacity="0.55"')
  } else {
    s += pxr(3, 2, 1, 2, ink) + pxr(7, 2, 1, 2, ink)
    s += pxr(4, 4, 3, 1, ink, 'opacity="0.7"')
  }
  let extra = ''
  if (cold) {
    extra += pxr(0, 0, 1, 1, '#cfeaf2', 'opacity="0.9"') + pxr(10, 0, 1, 1, '#cfeaf2', 'opacity="0.9"')
    extra += pxr(2, 8, 1, 1, '#cfeaf2') + pxr(8, 8, 1, 1, '#cfeaf2') + pxr(3, 8, 1, 1, '#9fd0df') + pxr(7, 8, 1, 1, '#9fd0df')
    extra += `<g fill="#ffffff"><rect x="9" y="-1" width="1" height="1"><animate attributeName="opacity" values="0.15;1;0.15" dur="2.4s" repeatCount="indefinite"/></rect><rect x="1" y="8" width="1" height="1"><animate attributeName="opacity" values="1;0.15;1" dur="2.4s" repeatCount="indefinite"/></rect></g>`
  } else if (mood === 'worry') {
    extra += pxr(10, 0, 1, 1, '#8fd3f4') + pxr(10, 1, 1, 1, '#8fd3f4', 'opacity="0.7"')
  } else if (mood === 'alarm') {
    extra += pxr(10, -1, 1, 2, '#ffd166') + pxr(10, 2, 1, 1, '#ffd166')
  }
  const bob = cold ? '' : '<animateTransform attributeName="transform" type="translate" values="0 0;0 -0.8;0 0" dur="1.1s" repeatCount="indefinite"/>'
  return `<g>${bob}${s}${extra}</g>`
}

export const mascotSvg = (cold: boolean, mood: Mood, size = 30): { source: string; w: number; h: number } => {
  const w = Math.round(size)
  const h = Math.round((size * 10) / 11)
  return {
    source: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="-0.5 -1.5 12 11" shape-rendering="crispEdges">${mascotInner(cold, mood)}</svg>`,
    w,
    h,
  }
}

// ---------- Folded row pieces ----------
/** A small segmented HP bar for the folded row. */
export const miniBarSvg = (color: string, frac: number, n = 8, w = 64, h = 12): string => {
  const gap = 2
  const bw = (w - gap * (n - 1)) / n
  const filled = Math.max(frac > 0 ? 1 : 0, Math.ceil(Math.max(0, Math.min(1, frac)) * n))
  let s = ''
  for (let i = 0; i < n; i++) {
    const bx = +(i * (bw + gap)).toFixed(2)
    const lit = i < filled
    s += `<rect x="${bx}" y="1" width="${+bw.toFixed(2)}" height="${h - 2}" fill="${lit ? color : EMPTY}"/>`
    if (lit) s += `<rect x="${bx}" y="1" width="${+bw.toFixed(2)}" height="3" fill="${lift(color, 0.55)}" opacity="0.7"/>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${s}</svg>`
}

/** A tinted chip with an icon and a short text, e.g. "LV 7". */
export const chipSvg = (icon: IconName, color: string, text: string, strong = true): { source: string; w: number; h: number } => {
  const h = 24
  const w = Math.round(34 + text.length * 7.4)
  const source =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g font-family="${FONT}">` +
    R(0.5, 0.5, w - 1, h - 1, 3, color, `fill-opacity="0.16" stroke="${color}" stroke-opacity="0.55"`) +
    g(icon, color, 13, 9, 5.5) +
    T(28, 16, text, { size: 12, weight: strong ? 800 : 600, fill: color, ls: 0.6 }) +
    '</g></svg>'
  return { source, w, h }
}

/** A solid word chip, such as WARM or COLD. */
export const wordChipSvg = (text: string, color: string): { source: string; w: number; h: number } => {
  const h = 24
  const w = Math.round(text.length * 10 + 22)
  const source =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><g font-family="${FONT}">` +
    R(0, 0, w, h, 4, color) +
    T(w / 2, 16.5, text, { size: 12.5, weight: 900, fill: INK, anchor: 'middle', ls: 1.4 }) +
    '</g></svg>'
  return { source, w, h }
}

// ---------- Data the card draws ----------
export type CardData = {
  player: { level: number; title: string; xp: number; xpText: string; streak: number; best: number; turns: number; mood: Mood; cold: boolean }
  windows: { name: string; col: string; left: number; timeLeft: number | null; verdict: string; tone: string; reset: string }[]
  forecast: { text: string; tone: string; icon: IconName } | null
  cache: null | {
    cold: boolean
    hue: string
    big: string
    bigNote: string
    tokens: string
    /** 0..1 of the hour still left; null when cold. */
    ttlFrac: number | null
    models: { name: string; price: string; you: boolean }[]
  }
  context: null | { tokens: string; note: string; pct: number | null; tone: string; bars: number[]; trend: string }
  spend: null | { total: string; last: string | null; share: string | null; agents: number }
}

const WINDOW_LABEL: Record<string, string> = { '7D': 'WEEK HP', '5H': '5H ENERGY' }

// ---------- Tiles (flat HUD strip: one row, short enough that the band never scrolls) ----------
const TILE_H = 148
type Tile = { weight: number; draw: (x: number, y: number, w: number, h: number) => string }

const shortReset = (r: string): string => {
  const i = r.indexOf(' · ')
  return i >= 0 ? r.slice(i + 3) : r
}

const playerTile = (p: CardData['player']): Tile => ({
  weight: 1.3,
  draw: (x, y, w, h) => {
    const pad = 12
    let s = panel(x, y, w, h, 'url(#tile)', LINE)
    s += panel(x + pad, y + pad, 58, 58, INK, p.cold ? COLD : GOOD, true)
    s += `<svg x="${x + pad + 5}" y="${y + pad + 7}" width="48" height="44" viewBox="-0.5 -1.5 12 11" shape-rendering="crispEdges">${mascotInner(p.cold, p.mood)}</svg>`
    const tx = x + pad + 70
    s += T(tx, y + 30, `LV ${String(p.level).padStart(2, '0')}`, { size: 24, weight: 900, fill: GOLD })
    s += T(tx, y + 46, p.title, { size: 9.5, weight: 800, fill: TEXT, ls: 1.2 })
    s += T(x + pad, y + 94, 'XP', { size: 9, weight: 800, fill: MUTED, ls: 1 })
    s += segBar(x + pad + 20, y + 86, w - 2 * pad - 20, 8, 10, Math.round(p.xp * 10), GOLD)
    s += g('flame', p.streak >= 2 ? ORANGE : MUTED, 12, x + pad, y + 108)
    s += T(x + pad + 17, y + 118, `COMBO ×${p.streak}`, { size: 10.5, weight: 800, fill: p.streak >= 2 ? ORANGE : MUTED, ls: 0.5 })
    s += T(x + w - pad, y + 118, `BEST ×${p.best}`, { size: 9.5, weight: 700, fill: MUTED, anchor: 'end' })
    s += T(x + pad, y + 138, `${p.turns} PROMPTS · ${p.xpText}`, { size: 8.5, weight: 700, fill: MUTED, ls: 0.4 })
    return s
  },
})

const barTile = (win: CardData['windows'][number], icon: IconName): Tile => ({
  weight: 1,
  draw: (x, y, w, h) => {
    const pad = 12
    const iw = w - 2 * pad
    let s = panel(x, y, w, h, 'url(#tile)', LINE)
    s += head(x + pad, y + 12, icon, win.tone, WINDOW_LABEL[win.name] ?? win.name)
    s += T(x + pad, y + 56, `${Math.round(win.left)}%`, { size: 30, weight: 900, fill: win.tone })
    s += T(x + w - pad, y + 52, 'LEFT', { size: 9, weight: 800, fill: MUTED, anchor: 'end', ls: 1.2 })
    s += segBar(x + pad + 2, y + 68, iw - 4, 12, 14, Math.ceil((win.left / 100) * 14), win.tone)
    if (win.timeLeft !== null) {
      s += T(x + pad, y + 98, 'CLOCK', { size: 8, weight: 800, fill: MUTED, ls: 1 })
      s += segBar(x + pad + 36, y + 92, iw - 38, 5, 14, Math.ceil(win.timeLeft * 14), '#cfc8e0')
    }
    if (win.verdict) {
      const label = win.verdict.toUpperCase()
      const pw = Math.min(iw, Math.round(label.length * 6.2 + 16))
      s += R(x + pad, y + 106, pw, 18, 3, win.tone, `fill-opacity="0.16" stroke="${win.tone}" stroke-opacity="0.6"`)
      s += T(x + pad + pw / 2, y + 118.5, label, { size: 9, weight: 800, fill: win.tone, anchor: 'middle', ls: 0.5 })
    }
    s += T(x + pad, y + 139, `REFILLS ${shortReset(win.reset)}`, { size: 8.5, weight: 700, fill: MUTED })
    return s
  },
})

const buffTile = (c: NonNullable<CardData['cache']>): Tile => ({
  weight: 1.7,
  draw: (x, y, w, h) => {
    const pad = 12
    const iw = w - 2 * pad
    let s = panel(x, y, w, h, 'url(#tile)', LINE)
    s += head(x + pad, y + 12, c.cold ? 'snow' : 'flame', c.hue, c.cold ? 'Frozen cache' : 'Warm cache buff')
    s += R(x + w - pad - 46, y + 8, 46, 18, 3, c.hue)
    s += T(x + w - pad - 23, y + 21, c.cold ? 'COLD' : 'WARM', { size: 9.5, weight: 900, fill: INK, anchor: 'middle', ls: 1.1 })
    s += T(x + pad, y + 60, c.big, { size: 32, weight: 900, fill: c.hue })
    s += T(x + w - pad, y + 50, c.tokens, { size: 15, weight: 900, anchor: 'end' })
    s += T(x + w - pad, y + 62, 'TOKENS CACHED', { size: 7.5, weight: 800, fill: MUTED, anchor: 'end', ls: 0.9 })
    s += segBar(x + pad + 2, y + 72, iw - 4, 8, 20, c.ttlFrac === null ? 0 : Math.ceil(c.ttlFrac * 20), c.hue)
    const gap = 6
    const cw = (iw - gap * (c.models.length - 1)) / c.models.length
    c.models.forEach((m, i) => {
      const cx = x + pad + i * (cw + gap)
      const mid = cx + cw / 2
      s += panel(cx, y + 94, cw, 44, m.you ? '#3a3420' : INK, m.you ? GOLD : LINE, m.you)
      if (m.you) {
        s += R(mid - 13, y + 89, 26, 10, 2, GOLD)
        s += T(mid, y + 97, 'YOU', { size: 7, weight: 900, fill: INK, anchor: 'middle', ls: 0.6 })
      }
      s += T(mid, y + 117, m.price, { size: 13, weight: 900, fill: m.you ? GOLD : MUTED, anchor: 'middle' })
      s += T(mid, y + 130, m.name, { size: 7.5, weight: 800, fill: m.you ? TEXT : MUTED, anchor: 'middle', ls: 0.6 })
    })
    return s
  },
})

const bagGoldTile = (bag: CardData['context'], gold: CardData['spend']): Tile => ({
  weight: 1.15,
  draw: (x, y, w, h) => {
    const pad = 12
    const iw = w - 2 * pad
    let s = panel(x, y, w, h, 'url(#tile)', LINE)
    if (bag) {
      s += head(x + pad, y + 12, 'layers', TEXT, 'Bag')
      s += T(x + w - pad, y + 22, bag.note.toUpperCase(), { size: 8.5, weight: 800, fill: MUTED, anchor: 'end', ls: 0.3 })
      s += T(x + pad, y + 50, bag.tokens, { size: 20, weight: 900, fill: bag.tone })
      s += segBar(x + pad + 2, y + 58, iw - 4, 8, 14, bag.pct === null ? 0 : Math.ceil((Math.min(100, bag.pct) / 100) * 14), bag.tone)
    }
    if (gold) {
      const gy = y + 84
      s += `<rect x="${x + pad}" y="${gy - 6}" width="${iw}" height="1" fill="${LINE}"/>`
      s += head(x + pad, gy + 4, 'coins', GOLD, 'Gold')
      s += T(x + pad, gy + 38, gold.total, { size: 17, weight: 900, fill: GOLD })
      if (gold.agents > 0) {
        s += R(x + w - pad - 17, gy + 22, 17, 17, 3, INK, `stroke="${LINE}"`) + g('bot', TEXT, 11, x + w - pad - 14, gy + 25)
        s += T(x + w - pad - 21, gy + 35, `×${gold.agents}`, { size: 9.5, weight: 800, fill: MUTED, anchor: 'end' })
      } else if (gold.last) {
        s += T(x + w - pad, gy + 36, `LAST ${gold.last}`, { size: 9, weight: 800, fill: MUTED, anchor: 'end' })
      }
    }
    return s
  },
})

const bossBanner = (f: NonNullable<CardData['forecast']>, x: number, y: number, w: number, h: number): string =>
  panel(x, y, w, h, f.tone + '22', f.tone) +
  g(f.icon, f.tone, 16, x + 12, y + h / 2 - 8) +
  T(x + 36, y + h / 2 + 4, f.text, { size: 11.5, weight: 800, fill: f.tone, ls: 0.5 })

// ---------- The card ----------
let defs = ''

/**
 * A flat strip: tiles in one row, at most ~190 px tall, so the band shows it whole instead of scrolling.
 * Wide (>= 740): player, HP, energy, buff, bag and gold. Narrow: HP, energy and the buff.
 */
export const cardSvg = (d: CardData, width: number): { source: string; w: number; h: number; alt: string } => {
  defs =
    `<linearGradient id="tile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${TILE}"/><stop offset="1" stop-color="${PANEL}"/></linearGradient>` +
    `<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#fff" opacity="0.018"/></pattern>`
  const P = 10
  const GAP = 8

  const full = width >= 740
  const tiles: Tile[] = []
  if (full) tiles.push(playerTile(d.player))
  d.windows.slice(0, 2).forEach((w, i) => tiles.push(barTile(w, i === 0 ? 'calendar' : 'timer')))
  if (d.cache) tiles.push(buffTile(d.cache))
  if (full && (d.context || d.spend)) tiles.push(bagGoldTile(d.context, d.spend))

  const totalW = tiles.reduce((a, t) => a + t.weight, 0)
  const room = width - 2 * P - GAP * (tiles.length - 1)
  let body = ''
  let x = P
  for (const t of tiles) {
    const w = (room * t.weight) / totalW
    body += t.draw(x, P, w, TILE_H)
    x += w + GAP
  }

  // Only a real warning gets a banner; a calm run keeps the card short.
  const boss = d.forecast && d.forecast.tone === RED ? d.forecast : null
  const BANNER_H = 30
  let height = P * 2 + TILE_H
  if (boss) {
    body += bossBanner(boss, P, P + TILE_H + GAP, width - 2 * P, BANNER_H)
    height += GAP + BANNER_H
  }

  const source =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs>${defs}</defs>` +
    `<g font-family="${FONT}">` +
    panel(1, 1, width - 2, height - 2, BG, LINE) +
    `<rect x="3" y="3" width="${width - 6}" height="${height - 6}" fill="url(#scan)"/>` +
    body +
    '</g></svg>'
  return { source, w: width, h: height, alt: 'Cockpit HUD: level, HP and energy bars, cache buff, bag space and gold' }
}
