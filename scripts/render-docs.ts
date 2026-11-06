// Renders the README images with the mod's own drawing code (hooks/art.ts), using sample numbers.
// Run from the repo root:  node scripts/render-docs.ts
import { writeFileSync, mkdirSync } from 'node:fs'
import { BG, COLD, GOLD, GOOD, LINE, MUTED, ORANGE, RED, TEXT, WARM, YELLOW, INK, cardSvg, chipSvg, mascotSvg, miniBarSvg, wordChipSvg } from '../hooks/art.ts'
import type { CardData, Mood } from '../hooks/art.ts'

mkdirSync('docs', { recursive: true })
const FONT = "ui-monospace,'Cascadia Mono','SF Mono',Menlo,Consolas,'Liberation Mono',monospace"
const inner = (svg: string) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
const nest = (svg: string, x: number, y: number, w: number, h: number) =>
  svg.replace(/^<svg ([^>]*?) width="[^"]*" height="[^"]*"/, `<svg x="${x}" y="${y}" width="${w}" height="${h}" $1`)
const txt = (x: number, y: number, s: string, fill: string, size = 12, weight = 700, extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" ${extra}>${s}</text>`

type Band = { mood: Mood; cold: boolean; w7: [number, string, string]; w5: [number, string, string]; cache: string; ctx: [string, string]; lv: number; combo: number }
const band = (b: Band): string => {
  const W = 1080, H = 40
  let x = 14, s = ''
  const y0 = 8
  s += txt(x, 26, 'COCKPIT', TEXT, 12, 800); x += 76
  const lv = chipSvg('zap', GOLD, `LV ${b.lv}`)
  s += nest(lv.source, x, y0, lv.w, lv.h); x += lv.w + 12
  if (b.combo >= 2) { const c = chipSvg('flame', ORANGE, `×${b.combo}`); s += nest(c.source, x, y0, c.w, c.h); x += c.w + 12 }
  for (const [name, w] of [['7D', b.w7], ['5H', b.w5]] as const) {
    s += txt(x, 26, name, MUTED, 12, 800); x += 24
    s += nest(miniBarSvg(w[1], w[0] / 100, 8, 64, 12), x, 14, 64, 12); x += 72
    const label = `${w[0]}% left · ${w[2]}`
    s += txt(x, 26, label, w[1], 12, 800); x += label.length * 7.4 + 16
  }
  const m = mascotSvg(b.cold, b.mood, 30)
  s += nest(m.source, x, 5, m.w, m.h); x += m.w + 6
  const wc = wordChipSvg(b.cold ? 'COLD' : 'WARM', b.cold ? COLD : WARM)
  s += nest(wc.source, x, y0, wc.w, wc.h); x += wc.w + 8
  s += txt(x, 26, b.cache, b.cold ? COLD : WARM, 12, 800); x += b.cache.length * 7.4 + 16
  const c = chipSvg('layers', MUTED, b.ctx[0]); s += nest(c.source, x, y0, c.w, c.h)
  s += `<rect x="${W - 62}" y="9" width="48" height="22" rx="3" fill="none" stroke="${LINE}"/>` + txt(W - 38, 24, 'Show', TEXT, 11, 700, 'text-anchor="middle"')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" rx="6" fill="${BG}" stroke="${LINE}"/><g font-family="${FONT}">${s}</g></svg>`
}

const models = (cold: boolean, you: string) =>
  [['FABLE', cold ? '$1.62' : '$0.04'], ['OPUS', cold ? '$0.65' : '$0.03'], ['SONNET', cold ? '$0.32' : '$0.03'], ['HAIKU', cold ? '$0.08' : '$0.01']].map(([name, price]) => ({ name, price, you: name === you }))

const card = (o: { mood: Mood; cold: boolean; w7: [number, string, string, number | null]; w5: [number, string, string, number | null]; boss?: string; turns?: number; streak?: number }): string => {
  const turns = o.turns ?? 47
  const win = (name: string, w: typeof o.w7, tl: number, reset: string) => ({ name, col: w[1], left: w[0], timeLeft: tl, verdict: w[2], tone: w[1], reset })
  const d: CardData = {
    player: { level: Math.floor(turns / 10) + 1, title: 'HACKER', xp: (turns % 10) / 10, xpText: `${10 - (turns % 10)} TO LEVEL UP`, streak: o.streak ?? 5, best: 9, turns, mood: o.mood, cold: o.cold },
    windows: [win('7D', o.w7, 0.52, 'resets Sat 09:00 · in 3d 4h'), win('5H', o.w5, 0.7, 'resets 17:40 · in 3h 30m')],
    forecast: o.boss ? { text: o.boss, tone: RED, icon: 'alert' } : { text: 'QUEST · SURVIVE TO THE 7D REFILL', tone: GOOD, icon: 'check' },
    cache: { cold: o.cold, hue: o.cold ? COLD : WARM, big: o.cold ? '1h 12m' : '41m', bigNote: '', tokens: '182k', ttlFrac: o.cold ? null : 0.68, models: models(o.cold, 'OPUS') },
    context: { tokens: '182k', note: '18% of 1M', pct: 18, tone: TEXT, bars: [0.3, 0.5, 0.2, 0.9, 0.4, 0.7], trend: '' },
    spend: { total: '$4.20', last: '$0.31', share: null, agents: 2 },
  }
  return cardSvg(d, 900).source
}

const moods = (): string => {
  const items: [boolean, Mood, string][] = [[false, 'happy', 'HAPPY'], [false, 'worry', 'WORRIED'], [false, 'alarm', 'ALARMED'], [true, 'happy', 'FROZEN']]
  let s = ''
  items.forEach(([cold, mood, label], i) => {
    const m = mascotSvg(cold, mood, 66)
    s += nest(m.source, 30 + i * 150, 14, m.w, m.h) + txt(63 + i * 150, 104, label, cold ? COLD : MUTED, 11, 800, 'text-anchor="middle"')
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="630" height="120" viewBox="0 0 630 120"><rect width="630" height="120" rx="6" fill="${BG}" stroke="${LINE}"/><g font-family="${FONT}">${s}</g></svg>`
}

const out: Record<string, string> = {
  'band-warm': band({ mood: 'happy', cold: false, w7: [62, GOOD, '2d 4h'], w5: [80, GOOD, '3h 10m'], cache: '41m left', ctx: ['18% ctx', MUTED], lv: 5, combo: 5 }),
  'band-cold': band({ mood: 'happy', cold: true, w7: [62, GOOD, '2d 4h'], w5: [80, GOOD, '3h 10m'], cache: '1h 12m · $0.65 next', ctx: ['18% ctx', MUTED], lv: 5, combo: 0 }),
  'band-alarm': band({ mood: 'alarm', cold: false, w7: [12, RED, '1d 2h'], w5: [34, YELLOW, '1h 05m'], cache: '22m left', ctx: ['64% ctx', YELLOW], lv: 5, combo: 0 }),
  'card-calm': card({ mood: 'happy', cold: false, w7: [62, GOOD, 'on track', null], w5: [80, GOOD, 'on track', null] }),
  'card-watch': card({ mood: 'worry', cold: false, w7: [48, YELLOW, '▲ 8 pts ahead', null], w5: [71, GOOD, 'on track', null], streak: 0 }),
  'card-boss': card({ mood: 'alarm', cold: false, w7: [12, RED, '▲ 21 pts ahead', null], w5: [34, YELLOW, '▲ 6 pts ahead', null], boss: 'BOSS INCOMING · 7D LIMIT IN 18h 40m', streak: 0 }),
  'card-cold': card({ mood: 'happy', cold: true, w7: [62, GOOD, 'on track', null], w5: [80, GOOD, 'on track', null] }),
  mascots: moods(),
}
for (const [name, svg] of Object.entries(out)) writeFileSync(`docs/${name}.svg`, svg)
console.log('wrote', Object.keys(out).length, 'images')
