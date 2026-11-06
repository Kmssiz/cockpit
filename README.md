# cockpit

A Claude Code mod that puts a one-row band above the prompt with the essentials. A **Show** button opens a flat, arcade-style HUD card with the details.

<!-- TODO: add a screenshot of the band and of the card here -->
*(Screenshot placeholder.)*

## What it shows

- **Usage**: 7-day and 5-hour limits, with green / yellow / red pacing and a run-out forecast.
- **Prompt cache**: WARM or COLD, with a countdown until it goes cold.
- **Mascot**: a pixel mascot whose mood follows your pace.
- **Context**: percentage of the context window used.
- **Cost**: a session cost estimate, and what the cache would cost on other models.
- **Subagents**: how many are running.
- **Game layer**: level, XP and combo, counting your prompts in the current session.

## Install

At the prompt of a terminal Claude Code session:

```
/plugin install cockpit --marketplace kmssiz/cockpit
```

Answer `y` to add the marketplace, then pick a scope. From a shell:

```
claude plugin install cockpit --marketplace kmssiz/cockpit
```

## Notes

- Costs are list-price **estimates**, from the model table in `hooks/register.tsx`. Check it against current prices; your real bill may differ.
- It makes **no model calls**. It only reads figures the engine already has and draws them.
- The terminal surface gets a text fallback of the band.
- The card is drawn as SVG, so it renders only on the desktop app, VS Code and mobile surfaces.

## Develop

```
claude --plugin-dir <path-to-your-clone>
```

## License and credits

MIT, see [LICENSE](LICENSE). cockpit is an independent implementation inspired by [Ribbon](https://github.com/robonuggets/ribbon) and [claude-mods](https://github.com/augiefra/claude-mods); icons are from [Lucide](https://lucide.dev). Details in [NOTICE.md](NOTICE.md).
