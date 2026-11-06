import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { CacheFacts, Fold, Money, Window } from '../types'
import { BG, COLD, GOLD, EMPTY, GOOD, INK, MUTED, ORANGE, RED, TEXT, WARM, YELLOW, bandPx, cardSvg, chipSvg, iconSvg, mascotSvg, miniBarSvg, wordChipSvg } from './art'
import type { CardData, IconName, Mood } from './art'

// COCKPIT: a band above the prompt that shows only what matters, with the rest one click away.
//
//   Folded (default when the cache is warm):  7D ●●●●●●○○○○ 62% left · 2d 4h   5H ●●●●●●●●○○ 80% left · 3h 10m   WARM 41m left   [Show]
//   Open   (default when the cache is cold):   the same row plus a detail card:
//     PACE      used vs. time elapsed per window, reset clock times
//     FORECAST  when the 7-day limit runs out at this week's pace
//     CACHE     idle time, tokens in cache, next-message cost per model (YOU marks yours)
//     CONTEXT   size, % of window, the last prompts as bars, trend
//     SPEND     session total, last prompt, its share of the 5h window, agents seen
//
// Zero token cost: it reads the engine's own figures and draws. Costs are list-price estimates.

// ---------- Look ----------

const CELLS = 10
const TIGHT_CELLS = 6
const LOW_AT = 15
const TICK_MS = 30_000
const WIDE_AT = 78
const HISTORY = 6
const BARS = '▁▂▃▄▅▆▇█'

const MIN = 60_000
const SPANS: Record<string, number> = { five_hour: 5 * 60 * MIN, seven_day: 7 * 24 * 60 * MIN }
const TTL_MS = 60 * MIN
const OUT_MIN_ELAPSED = 6 * 60 * MIN
const OUT_MIN_USED = 5

const NAMES: Record<string, string> = { seven_day: '7D', five_hour: '5H', spend_limit: 'SPEND' }
const LONG: Record<string, string> = { seven_day: '7-day', five_hour: '5-hour', spend_limit: 'Spend' }
const ORDER: Record<string, number> = { seven_day: 0, five_hour: 1 }
const COLORS: Record<string, string> = { seven_day: ORANGE, five_hour: YELLOW }

// $ per million tokens: input, cache read. A 1-hour cache write costs 2x input.
const MODELS = [
  { id: 'fable', name: 'FABLE', input: 10, read: 0.25 },
  { id: 'opus', name: 'OPUS', input: 4, read: 0.2 },
  { id: 'sonnet', name: 'SONNET', input: 2, read: 0.2 },
  { id: 'haiku', name: 'HAIKU', input: 0.5, read: 0.05 },
]
type Mode = 'warm' | 'cold'
const familyOf = (m: string | null | undefined): string | null => {
  const s = (m ?? '').toLowerCase()
  return MODELS.find(x => s.includes(x.id))?.id ?? null
}
const costOf = (m: (typeof MODELS)[number], mode: Mode, tokens: number): number =>
  (tokens / 1e6) * (mode === 'cold' ? m.input * 2 : m.read)

// ---------- State ----------
const windows = atom({ plugin: 'cockpit', key: 'windows' } as const, [] as Window[])
const cache = atom({ plugin: 'cockpit', key: 'cache' } as const, null as CacheFacts | null)
const fold = atom({ plugin: 'cockpit', key: 'fold' } as const, null as Fold | null)
const ctx = atom({ plugin: 'cockpit', key: 'ctx' } as const, [] as number[])
const money = atom({ plugin: 'cockpit', key: 'money' } as const, { total: 0, last: null, last5h: null } as Money)
const agents = atom({ plugin: 'cockpit', key: 'agents' } as const, 0)
const turns = atom({ plugin: 'cockpit', key: 'turns' } as const, 0)
const streak = atom({ plugin: 'cockpit', key: 'streak' } as const, 0)
const best = atom({ plugin: 'cockpit', key: 'best' } as const, 0)

const TITLES = ['ROOKIE', 'APPRENTICE', 'CODER', 'HACKER', 'WIZARD', 'ARCHMAGE']

// ---------- Formatting ----------
const usd = (n: number): string => '$' + n.toFixed(2)
const tok = (n: number): string => (n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))
const dur = (ms: number): string => {
  const mins = Math.max(0, Math.round(ms / MIN))
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  if (h < 24) return `${h}h ${mins % 60}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}
const clock = (ms: number): string => {
  const d = new Date(ms)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${days[d.getDay()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const dots = (left: number, cells: number) => {
  const n = Math.max(0, Math.min(cells, Math.round((left / 100) * cells)))
  return { on: '●'.repeat(n), off: '·'.repeat(cells - n) }
}

const clean = (list: readonly Window[]): Window[] =>
  list
    .map(w => ({ kind: w.kind, percentUsed: w.percentUsed, resetsAt: w.resetsAt }))
    .sort((a, b) => (ORDER[a.kind] ?? 9) - (ORDER[b.kind] ?? 9))

// ---------- Reading a window ----------
type Gauge = {
  w: Window
  name: string
  long: string
  col: string
  left: number
  used: number
  resetMs: number | null
  elapsed: number | null
  pace: number | null
  low: boolean
  /** Green on or behind the clock, yellow ahead of it, red far ahead or past 90% used. */
  tone: string
}

const gaugeOf = (w: Window, now: number): Gauge => {
  const used = Math.max(0, w.percentUsed)
  const left = Math.max(0, Math.round((100 - used) * 10) / 10)
  const resetMs = w.resetsAt ? Date.parse(w.resetsAt) : NaN
  const span = SPANS[w.kind]
  const remaining = Number.isFinite(resetMs) ? Math.max(0, resetMs - now) : null
  const elapsed = span && remaining !== null ? Math.min(100, Math.max(0, ((span - remaining) / span) * 100)) : null
  return {
    w,
    name: NAMES[w.kind] ?? w.kind.toUpperCase(),
    long: LONG[w.kind] ?? w.kind,
    col: COLORS[w.kind] ?? TEXT,
    left,
    used,
    resetMs: Number.isFinite(resetMs) ? resetMs : null,
    elapsed,
    pace: elapsed === null ? null : used - elapsed,
    low: left < LOW_AT,
    tone: used >= 90 || (elapsed !== null && used - elapsed > 15) ? RED : elapsed !== null && used - elapsed > 0 ? YELLOW : GOOD,
  }
}

/** When the 7-day limit runs out at this week's pace, if that is before the reset. */
const runOut = (g: Gauge, now: number): { left: number; at: number; untilReset: number } | null => {
  if (g.w.kind !== 'seven_day' || g.resetMs === null) return null
  const start = g.resetMs - SPANS.seven_day
  const over = now - start
  if (over < OUT_MIN_ELAPSED || g.used < OUT_MIN_USED || g.used >= 100) return null
  const rate = g.used / over
  if (!(rate > 0)) return null
  const at = now + (100 - g.used) / rate
  return at >= g.resetMs ? null : { left: at - now, at, untilReset: g.resetMs - now }
}

// ---------- Cache ----------
type View = { mode: Mode; idleMs: number; tokens: number; window: number; mine: string | null }
const viewOf = (c: CacheFacts | null, now: number): View | null => {
  if (!c || c.lastAt <= 0 || c.tokens <= 0) return null
  const idleMs = Math.max(0, now - c.lastAt)
  return { mode: idleMs >= TTL_MS ? 'cold' : 'warm', idleMs, tokens: c.tokens, window: c.window, mine: familyOf(c.model) }
}

// ---------- Engine feeds ----------
const pull = async ($: EngineInterface): Promise<void> => {
  const u = await $.session.usage()
  await update($, windows, () => clean(u.rateLimits))
  if (u.cost) await update($, money, m => ({ ...m, total: u.cost!.usd }))
}

const pushCtx = async ($: EngineInterface, tokens: number | null | undefined): Promise<void> => {
  if (!tokens || tokens <= 0) return
  await update($, ctx, list => {
    if (list[list.length - 1] === tokens) return list
    return [...list, tokens].slice(-HISTORY)
  })
}

export const register: Register = on => {
  const seenAgents = new Set<string>()
  let base: number | null = null
  let base5h: number | null = null

  on('session.start', async ($, e, next) => {
    await pull($)
    $.clock.every(TICK_MS, () => $.ui.invalidate('ui.render'))
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits')) await update($, windows, () => clean(e.rateLimits))
    if (e.changed.includes('context') && e.context.tokens && e.context.tokens > 0) {
      const tokens = e.context.tokens
      await update($, cache, c => (c ? { ...c, tokens, window: e.context.window || c.window } : c))
    }
    if (e.cost) {
      const total = e.cost.usd
      await update($, money, m => ({ ...m, total }))
    }
    return next(e)
  })

  on('classic.SessionStart', async ($, e, next) => {
    const r = await next(e)
    if (e.source === 'clear' || e.source === 'compact') {
      await update($, cache, () => null)
      await update($, fold, () => null)
      await update($, ctx, () => [])
    } else if ((e.source === 'resume' || e.source === 'fork') && typeof e.seconds_since_last_response === 'number') {
      const now = await $.clock.now()
      const window = (await $.session.usage()).context.window
      const model = typeof e.model === 'string' ? e.model : await $.session.model()
      const tokens = typeof e.context_tokens === 'number' ? e.context_tokens : 0
      const away = e.seconds_since_last_response
      await update($, cache, () => ({ lastAt: now - away * 1000, tokens, window, model }))
      await pushCtx($, tokens)
    }
    return r
  }).catch(($, e, next) => next(e))

  // Each main-thread request reads or writes the cache, so its start resets the hour.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId) {
      if (!seenAgents.has(e.agentId)) {
        seenAgents.add(e.agentId)
        await update($, agents, n => n + 1)
      }
    } else {
      const now = await $.clock.now()
      await update($, cache, c => ({ lastAt: now, tokens: c?.tokens ?? 0, window: c?.window ?? 0, model: c?.model ?? null }))
    }
    yield* next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId) return r
    try {
      const now = await $.clock.now()
      const u = await $.session.usage()
      const model = e.usage?.model ?? (await $.session.model())
      await update($, cache, c => ({
        lastAt: !c || now - c.lastAt > e.durationMs ? now : c.lastAt,
        tokens: u.context.tokens && u.context.tokens > 0 ? u.context.tokens : (c?.tokens ?? 0),
        window: u.context.window || c?.window || 0,
        model: model || c?.model || null,
      }))
      await pushCtx($, u.context.tokens)
      await update($, windows, () => clean(u.rateLimits))
      const calm = clean(u.rateLimits).every(w => gaugeOf(w, now).tone === GOOD)
      await update($, turns, n => n + 1)
      await update($, streak, s => (calm ? s + 1 : 0))
      const run = await read($, streak)
      await update($, best, b => Math.max(b, run))
      const total = u.cost?.usd ?? null
      const five = u.rateLimits.find(w => w.kind === 'five_hour')?.percentUsed ?? null
      await update($, money, m => ({
        total: total ?? m.total,
        last: total !== null && base !== null && total >= base ? total - base : m.last,
        last5h: five !== null && base5h !== null && five >= base5h ? Math.round((five - base5h) * 10) / 10 : m.last5h,
      }))
      if (total !== null) base = total
      if (five !== null) base5h = five
    } catch {
      // the band keeps its previous figures
    }
    return r
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const ui = $.ui.resolve(e)
    const { Box, Button, Text } = ui
    // Svg draws on desktop, mobile and VS Code; the terminal gets the text form.
    const Svg = e.surface !== 'terminal' && 'Svg' in ui ? ui.Svg : null
    const ico = (k: string, name: IconName, color: string, size = 16) =>
      Svg ? <Svg key={k} source={iconSvg(name, color, size)} alt={name} width={size} height={size} /> : null
    const list = await read($, windows)
    const now = await $.clock.now()
    const view = viewOf(await read($, cache), now)

    if (list.length === 0 && !view) {
      return (
        <Box paddingX={1}>
          <Text color={MUTED}>COCKPIT · waiting for the first reply</Text>
        </Box>
      )
    }

    const columns = e.props.bodyColumns ?? e.viewport?.columns ?? 100
    // The folded row stays on one line. Measured: a cell is ~7.7 px, so the fixed drawings cost real cells
    // (64 px bar ~ 8, mascot + WARM pill ~ 13). What is left buys optional pieces, most valuable first.
    let budget = columns - 2 - (Svg ? 74 : 46)
    const need = (n: number): boolean => {
      if (budget < n) return false
      budget -= n
      return true
    }
    const showLv = Svg ? need(13) : false
    const showMark = need(9)
    const showLeft = Svg ? need(10) : true
    const showCtx = Svg ? need(14) : false
    const wide = need(16)
    const cells = columns < 42 ? TIGHT_CELLS : CELLS
    const gauges = list.map(w => gaugeOf(w, now))
    const week = gauges.find(g => g.w.kind === 'seven_day')
    const out = week ? runOut(week, now) : null

    // ----- Folded row: only what matters -----
    const windowRow = (g: Gauge, i: number) => {
      const d = dots(g.left, cells)
      const reset = g.resetMs !== null ? dur(g.resetMs - now) : ''
      return (
        <Box key={`w${i}`} flexDirection="row" flexShrink={0} marginRight={3} alignItems="center">
          <Text color={MUTED} bold>{g.name} </Text>
          {Svg ? (
            <Box key={`wr${i}`} flexShrink={0}>
              <Svg source={miniBarSvg(g.tone, g.left / 100, 8, 64, 12)} alt={`${g.name} ${g.left}% left`} width={64} height={12} />
            </Box>
          ) : null}
          {Svg ? null : <Text color={g.tone}>{d.on}</Text>}
          {Svg ? null : <Text color={EMPTY}>{d.off}</Text>}
          <Text color={g.tone} bold> {g.left}%{showLeft ? ' left' : ''}</Text>
          {g.low ? <Text color={RED} bold> LOW</Text> : null}
          {wide && reset ? <Text color={MUTED}> · {reset}</Text> : null}
        </Box>
      )
    }

    const mode = view?.mode
    const hue = mode === 'cold' ? COLD : WARM
    const mine = view ? MODELS.find(m => m.id === view.mine) : undefined
    const chipText = view
      ? mode === 'warm'
        ? `${Math.max(0, 60 - Math.floor(view.idleMs / MIN))}m left`
        : `${dur(view.idleMs)}${mine ? ` · ${usd(costOf(mine, 'cold', view.tokens))} next` : ''}`
      : ''
    const svgChip = (k: string, icon: IconName, color: string, text: string) => {
      if (!Svg) return null
      const c = chipSvg(icon, color, text)
      return (
        <Box key={k} flexShrink={0} marginRight={2}>
          <Svg source={c.source} alt={text} width={c.w} height={c.h} />
        </Box>
      )
    }
    const hist0 = await read($, ctx)
    const ctxPct = view && view.window > 0 && hist0.length > 0 ? Math.round((hist0[hist0.length - 1] / view.window) * 100) : null
    const turnsN = await read($, turns)
    const streakN = await read($, streak)
    const bestN = await read($, best)
    const level = Math.floor(turnsN / 10) + 1
    const extras = Svg
      ? [
          ctxPct !== null && showCtx ? svgChip('c-ctx', 'layers', ctxPct >= 80 ? RED : ctxPct >= 60 ? YELLOW : MUTED, `${ctxPct}% ctx`) : null,
        ]
      : null
    const lvChips = Svg && showLv
      ? [svgChip('c-lv', 'zap', GOLD, `LV ${level}`), streakN >= 2 && need(10) ? svgChip('c-combo', 'flame', ORANGE, `×${streakN}`) : null]
      : null
    const worst = gauges.some(g => g.tone === RED) ? RED : gauges.some(g => g.tone === YELLOW) ? YELLOW : GOOD
    const mood: Mood = worst === RED ? 'alarm' : worst === YELLOW ? 'worry' : 'happy'
    const chip = view ? (
      <Box key="cache" flexDirection="row" flexShrink={0} marginRight={3} alignItems="center">
        {Svg ? (() => {
          const m = mascotSvg(mode === 'cold', mood, 30)
          const wc = wordChipSvg(mode === 'cold' ? 'COLD' : 'WARM', hue)
          return [
            <Box key="mascot" flexShrink={0} marginRight={1}>
              <Svg source={m.source} alt={mode === 'cold' ? 'Cache is cold: the mascot is frozen' : `Cache is warm: the mascot looks ${mood === 'happy' ? 'happy' : mood === 'worry' ? 'worried' : 'alarmed'}`} width={m.w} height={m.h} isInteractive />
            </Box>,
            <Box key="word" flexShrink={0}>
              <Svg source={wc.source} alt={mode === 'cold' ? 'COLD' : 'WARM'} width={wc.w} height={wc.h} />
            </Box>,
          ]
        })() : <Text backgroundColor={hue} color={INK} bold>{` ${mode === 'cold' ? 'COLD' : 'WARM'} `}</Text>}
        {mode === 'warm' ? (
          <Text color={hue} bold>{` ${Math.max(0, 60 - Math.floor(view.idleMs / MIN))}m left`}</Text>
        ) : (
          <Text color={hue} bold>{` ${dur(view.idleMs)}`}{mine ? <Text color={TEXT}>{` · ${usd(costOf(mine, 'cold', view.tokens))} next`}</Text> : null}</Text>
        )}
      </Box>
    ) : null

    const warn = out ? (
      <Box key="out" flexShrink={0} marginRight={3} alignItems="center">
        {ico('wi', 'alert', out.left < 24 * 60 * MIN ? RED : YELLOW, 15)}
        {Svg ? <Text> </Text> : null}
        <Text color={out.left < 24 * 60 * MIN ? RED : YELLOW} bold>{`7D out in ${dur(out.left)}`}</Text>
      </Box>
    ) : null

    // Card state: warm and quiet starts folded; cold or any warning starts open.
    const key = `${mode ?? 'none'}${out ? '!' : ''}`
    const stored = await read($, fold)
    const open = stored && stored.mode === key ? stored.open : mode === 'cold' || !!out
    const toggle = () => update($, fold, f => ({ mode: key, open: !(f && f.mode === key ? f.open : mode === 'cold' || !!out) }))

    const row = (
      <Box key="row" flexDirection="row" paddingX={1} paddingY={0} alignItems="flex-start">
        <Box flexGrow={1} flexShrink={1} flexDirection="row" flexWrap="wrap" alignItems="center" rowGap={1}>
          {showMark ? <Box flexShrink={0} marginRight={2}><Text color={TEXT} bold>COCKPIT</Text></Box> : null}
          {lvChips}
          {gauges.map(windowRow)}
          {chip}
          {extras}
          {warn}
        </Box>
        <Box flexShrink={0} marginLeft={1} alignSelf="flex-start">
          <Button key="fold" label={open ? 'Hide' : 'Show'} onPress={toggle} />
        </Box>
      </Box>
    )

    if (!open) {
      return <Box flexDirection="column">{row}</Box>
    }

    // ----- Detail card, drawn (desktop, mobile, VS Code) -----
    if (Svg) {
      const hist = await read($, ctx)
      const mny = await read($, money)
      const nAgents = await read($, agents)
      const data: CardData = {
        player: {
          level,
          title: TITLES[Math.min(TITLES.length - 1, level - 1)],
          xp: (turnsN % 10) / 10,
          xpText: `${10 - (turnsN % 10)} TO LEVEL UP`,
          streak: streakN,
          best: bestN,
          turns: turnsN,
          mood,
          cold: mode === 'cold',
        },
        windows: gauges.map(g => {
          const ahead = g.pace !== null && g.pace > 0
          const tone = g.tone
          return {
            name: g.name,
            col: g.tone,
            left: g.left,
            timeLeft: g.elapsed !== null ? Math.max(0, 1 - g.elapsed / 100) : null,
            verdict: g.pace === null ? '' : ahead ? `▲ ${Math.round(g.pace)} pts ahead` : 'on track',
            tone,
            reset: g.resetMs !== null ? `resets ${clock(g.resetMs)} · in ${dur(g.resetMs - now)}` : '',
          }
        }),
        forecast: week
          ? out
            ? { text: `BOSS INCOMING · 7D LIMIT IN ${dur(out.left)}`, tone: RED, icon: 'alert' }
            : { text: 'QUEST · SURVIVE TO THE 7D REFILL', tone: GOOD, icon: 'check' }
          : null,
        cache: view
          ? {
              cold: view.mode === 'cold',
              hue,
              big: view.mode === 'cold' ? dur(view.idleMs) : `${Math.max(0, 60 - Math.floor(view.idleMs / MIN))}m`,
              bigNote: view.mode === 'cold' ? 'idle, cache expired' : 'left until the cache goes cold',
              tokens: tok(view.tokens),
              ttlFrac: view.mode === 'cold' ? null : Math.max(0, 1 - view.idleMs / TTL_MS),
              models: MODELS.map(m => ({ name: m.name, price: usd(costOf(m, view.mode, view.tokens)), you: m.id === view.mine })),
            }
          : null,
        context: (() => {
          if (hist.length === 0 && !view) return null
          const cur = hist[hist.length - 1] ?? view?.tokens ?? 0
          const win = view?.window ?? 0
          const pct = win > 0 ? Math.round((cur / win) * 100) : null
          const deltas = hist.slice(1).map((t, i) => Math.max(0, t - hist[i]))
          const top = Math.max(...deltas, 1)
          const prev = hist.length > 1 ? cur - hist[hist.length - 2] : 0
          return {
            tokens: tok(cur),
            note: pct !== null ? `${pct}% of ${tok(win)}${pct >= 80 ? ' · compact soon' : ''}` : '',
            pct,
            tone: pct !== null && pct >= 80 ? RED : pct !== null && pct >= 60 ? YELLOW : TEXT,
            bars: deltas.map(d => d / top),
            trend: hist.length > 1 && prev !== 0 ? (prev > 0 ? `▲ +${tok(prev)} last prompt` : `▼ −${tok(-prev)} last prompt`) : '',
          }
        })(),
        spend:
          mny.total > 0 || nAgents > 0
            ? {
                total: `≈${usd(mny.total)}`,
                last: mny.last !== null ? `≈${usd(mny.last)}` : null,
                share: mny.last5h !== null && mny.last5h > 0 ? `${mny.last5h}%` : null,
                agents: nAgents,
              }
            : null,
      }
      // Designed at a fixed width (the engine scales it down to the slot), not from a guess at pixels per cell.
      const card = cardSvg(data, columns >= 64 ? 900 : 560)
      return (
        <Box flexDirection="column">
          {row}
          <Box key="card" flexDirection="column" width="100%" paddingX={1} paddingBottom={1}>
            <Svg source={card.source} alt={card.alt} isInteractive />
          </Box>
        </Box>
      )
    }

    // ----- Detail card, text form (terminal) -----
    // Each line is ONE Text run (nested Text for colour), so it wraps as prose and never splits into stray boxes.
    const line = (k: string, label: string, kids: any) => (
      <Box key={k} flexDirection="row">
        <Box width={11} flexShrink={0}><Text color={MUTED} bold>{label}</Text></Box>
        <Box flexGrow={1} flexShrink={1} flexDirection="column">{kids}</Box>
      </Box>
    )
    const S = <Text color={EMPTY}>{'  │  '}</Text>
    const rows: any[] = []

    // PACE
    rows.push(
      line('pace', 'PACE', gauges.map((g, i) => {
        const ahead = g.pace !== null && g.pace > 0
        const tone = g.tone
        return (
          <Text key={`p${i}`} color={TEXT}>
            <Text color={g.col} bold>{g.long}</Text>
            {` used ${Math.round(g.used)}%`}
            {g.elapsed !== null ? <Text color={MUTED}>{` of ${Math.round(g.elapsed)}% of time`}</Text> : null}
            {g.pace !== null ? <Text color={tone} bold>{ahead ? `  ▲ ${Math.round(g.pace)} pts ahead` : '  on track'}</Text> : null}
            {g.resetMs !== null ? <Text color={MUTED}>{`  ·  resets ${clock(g.resetMs)} (in ${dur(g.resetMs - now)})`}</Text> : null}
          </Text>
        )
      })),
    )

    // FORECAST
    if (week) {
      rows.push(
        line('fc', 'FORECAST', out ? (
          <Text color={RED} bold>
            {`At this week's pace the 7-day limit runs out ${clock(out.at)} (in ${dur(out.left)}), ${dur(out.untilReset - out.left)} before it resets.`}
          </Text>
        ) : (
          <Text color={GOOD}>{week.resetMs !== null ? 'On pace to last until the 7-day reset.' : 'No reset time yet.'}</Text>
        )),
      )
    }

    // CACHE
    if (view) {
      const cold = view.mode === 'cold'
      rows.push(
        line('cache', 'CACHE', [
          <Text key="a" color={TEXT}>
            <Text color={hue} bold>{cold ? 'COLD' : 'WARM'}</Text>
            {S}{`idle ${dur(view.idleMs)}`}
            {S}{`${tok(view.tokens)} tokens cached`}
            {!cold ? S : null}{!cold ? `${Math.max(0, 60 - Math.floor(view.idleMs / MIN))}m until cold` : null}
          </Text>,
          <Text key="b" color={MUTED}>
            {cold ? 'next message re-sends everything:  ' : 'next message costs:  '}
            {MODELS.map(m => {
              const you = m.id === view.mine
              return (
                <Text key={m.id} color={you ? TEXT : MUTED} bold={you}>
                  {`${m.name} ${usd(costOf(m, view.mode, view.tokens))}`}
                  {you ? <Text backgroundColor={TEXT} color={INK} bold>{' YOU '}</Text> : null}
                  {'   '}
                </Text>
              )
            })}
          </Text>,
          cold ? <Text key="c" color={MUTED}>Tip: /compact or a fresh thread makes the rewrite cheaper.</Text> : null,
        ]),
      )
    }

    // CONTEXT
    const history = await read($, ctx)
    if (history.length > 0 || view) {
      const now1 = history[history.length - 1] ?? view?.tokens ?? 0
      const win = view?.window ?? 0
      const pct = win > 0 ? Math.round((now1 / win) * 100) : null
      const deltas = history.slice(1).map((t, i) => Math.max(0, t - history[i]))
      const top = Math.max(...deltas, 1)
      const glyphs = deltas.map(d => BARS[Math.round((d / top) * (BARS.length - 1))])
      const last = glyphs.pop()
      const prev = history.length > 1 ? now1 - history[history.length - 2] : 0
      const hot = pct !== null && pct >= 80 ? RED : pct !== null && pct >= 60 ? YELLOW : TEXT
      rows.push(
        line('ctx', 'CONTEXT', (
          <Text color={TEXT}>
            <Text color={hot} bold>{`${tok(now1)}${pct !== null ? ` · ${pct}% of ${tok(win)}` : ''}`}</Text>
            {pct !== null && pct >= 80 ? <Text color={RED} bold>{'  compact soon'}</Text> : null}
            {last ? S : null}{last ? <Text color={MUTED}>{glyphs.join('')}</Text> : null}{last ? <Text color={ORANGE} bold>{last}</Text> : null}{last ? <Text color={MUTED}>{' last prompts'}</Text> : null}
            {history.length > 1 && prev !== 0 ? <Text color={MUTED}>{`  ${prev > 0 ? '▲ +' + tok(prev) : '▼ −' + tok(-prev)}`}</Text> : null}
          </Text>
        )),
      )
    }

    // SPEND
    const m = await read($, money)
    const n = await read($, agents)
    if (m.total > 0 || n > 0) {
      rows.push(
        line('spend', 'SPEND', (
          <Text color={TEXT}>
            <Text bold>{`≈${usd(m.total)} session`}</Text>
            {m.last !== null ? S : null}{m.last !== null ? `last prompt ≈${usd(m.last)}` : null}
            {m.last5h !== null && m.last5h > 0 ? <Text color={MUTED}>{` (${m.last5h}% of 5H)`}</Text> : null}
            {n > 0 ? S : null}{n > 0 ? `${n} agent${n > 1 ? 's' : ''} used` : null}
          </Text>
        )),
      )
    }

    return (
      <Box flexDirection="column">
        {row}
        <Box key="card" flexDirection="column" paddingX={1} paddingBottom={1}>
          {rows}
        </Box>
      </Box>
    )
  })
}
