/** One usage window: which one, how much is used (0 to 100), when it resets. */
export type Window = { kind: string; percentUsed: number; resetsAt?: string }

/** The prompt cache as last seen: last main-thread request (clock ms), context re-sent next time, window, model. */
export type CacheFacts = { lastAt: number; tokens: number; window: number; model: string | null }

/** Whether the detail card is open, remembered only for the state it was set in. */
export type Fold = { mode: string; open: boolean }

/** Spend: session total, last prompt's cost, last prompt's share of the 5h window (points). */
export type Money = { total: number; last: number | null; last5h: number | null }

declare module 'claude-code' {
  interface PluginState {
    'cockpit': {
      windows: Window[]
      cache: CacheFacts | null
      fold: Fold | null
      /** Context size after each recent main-thread turn, oldest first. */
      ctx: number[]
      money: Money
      /** Subagents seen this session. */
      agents: number
      /** Main-thread prompts played this session: level = turns / 10. */
      turns: number
      /** Consecutive prompts with every gauge green, and the best run. */
      streak: number
      best: number
    }
  }
}
