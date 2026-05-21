# Quantum Retail Media

> *A media team manages strategy. Claude manages everything else.*

---

## The Problem

Retail media has a scale paradox.

The most effective campaign architecture is granular — one SKU, one keyword, one campaign. That precision gives you full control at the item level. The problem is human bandwidth. A capable media manager can realistically maintain 20–30 campaigns with genuine attention. A serious brand account might justify 400 or more.

So teams aggregate. They group SKUs, bundle keywords, run one campaign where five should exist. ROAS numbers look fine in a deck. Underneath, the decisions are blunt. A campaign serving a growing item and a declining item with the same bid and budget is not a strategy — it's a compromise forced by time.

There's a second problem underneath the first: **evaluation**. The standard success metric — ROAS — is incomplete. A 12× ROAS looks like a standout program. It tells you nothing about whether those sales were incremental, whether the customer base is growing, or whether the total business is healthy. A campaign can produce excellent reported ROAS while quietly serving the same loyal buyers over and over, capturing credit for sales that would have happened anyway.

And beneath both of these sits a structural shift that most of the industry hasn't fully reckoned with: **the triangle is deforming**.

Retail media has always operated inside a three-way relationship — brand, retailer, agency. Each node provides something the others need. That triangle is being pulled apart by AI. Retailers are building optimization tools that make it easier for brands to hand execution decisions to retailer infrastructure. The pitch is efficiency. What brands are trading for that simplicity is independence — their data, their analytical layer, their ability to disagree with the retailer's read on performance. When the AI managing your bids belongs to the retailer, the retailer knows your performance data before you do.

Quantum Retail Media was built as a direct response to all of this.

---

## The Thesis

**Give a brand the ability to run an entire media program at the precision that previously required a team — with Claude as the operator, the brand retaining strategic control, and an independent scoring system that actually answers the questions ROAS cannot.**

Claude doesn't have bandwidth constraints. It can hold 400 campaigns in context, reason across all of them simultaneously, make decisions at the keyword level, and explain every move — in the time it takes a human to open a dashboard. The compromise between precision and manageability disappears. The user sees a clean wave. Claude sees 400 rows. Both are right.

The strategy layer stays human. Budget, mode, intent, priorities — those decisions require business judgment that Claude doesn't have. Everything downstream is Claude's job.

---

## Screenshots

![Pacing Header](screenshots/Pacing%20Bar.png)
*Portfolio pacing bar — MTD spend vs. expected, pacing index, and cycle controls*

![Campaign Table](screenshots/Campaign%20Table.png)
*HDCP campaign scorecard — each campaign scored on ROAS, NTB%, and overall health*

![Wave Function](screenshots/2D%20Wave%20Guide%20Dark.png)
*Customer probability wave function — spend distribution mapped across the intent spectrum*

<table>
<tr>
<td><img src="screenshots/Wave%20Guide%20Choices.png" width="420"/><br><em>Monthly strategy selection — Acquisition, Balanced, or Retention, each with wave previews and NTB/ROAS targets</em></td>
<td><img src="screenshots/NLP%20Interface.png" width="260"/><br><em>Goal slider and natural language input — set intent and run Claude in one step</em></td>
</tr>
</table>

![3D Waveform](screenshots/3D%20Wave%20Guide.png)
*3D portfolio waveform — spend envelope across the intent spectrum over simulated time*

---

## Running It

### Prerequisites
- Python 3.11+
- Node 18+
- Anthropic API key

### One command

```bash
export ANTHROPIC_API_KEY=sk-...
./start.sh
```

Or put the key in `backend/.env` and just run `./start.sh`. The script creates the Python virtualenv, installs all dependencies, and boots both servers. Open `http://localhost:3000` when it's ready.

The demo account (SolarShield Immune+) loads automatically on Day 14 of a simulated month with a live Walmart Connect campaign portfolio.

---

## The Demo

**What to do in order:**

1. **Run Cycle** — hit the button in the top right. Watch Claude reason through the portfolio in real time — the full chain of thought streams to the interface as it happens. See bids and budgets update live. Read the CMO brief it writes at the end.

2. **Goal Slider** — drag toward Acquisition (1) or Efficiency (5), type a prompt if you want ("push the Bundle Pack harder this week"), and run again. Claude reads the intent and rebalances the funnel.

3. **Strategy Modal** — set a monthly strategic mode (Acquisition / Balanced / Retention). This locks for the month and shapes every subsequent cycle.

4. **HDCP Table** — see the campaign scorecard. Each row shows a gradient bar scoring the campaign 0–200 against par. The ★ and ⚠ signals tell Claude what to do next.

5. **Report** — click Report in the header. A full client-facing performance brief streams live, written by Claude from the current portfolio state and optimization history.

6. **3D Waveform** — click the probability wave panel. The portfolio unfolds in 3D across simulated time.

7. **Add Client** — the + button in the client switcher launches a Claude-powered onboarding interview. Six questions. A new account spins up at the end.

---

## What Makes This Different

### The Physics Model

Every campaign operates on a 0–1 intent spectrum — pure awareness at the left, pure conversion at the right. A campaign doesn't have a single point on that spectrum. It has a **distribution**. That distribution is modeled as a Gaussian wave: position (where the campaign is working), width (how focused it is), and opacity (how incremental it is).

```
0 ──────────────────────────────────────────── 1
Unaware   Low Intent   Consideration   High Intent   Loyal
Upper Funnel                                    Lower Funnel
High NTB%                                    High conversion
```

The portfolio envelope — the sum of all individual campaign waves — shows where the brand's total spend sits across the intent journey. A second wave layer maps where GMV growth is actually happening on the same axis. The key question: **do the two waves align?** If spend peaks at high intent but growth is happening upper funnel, or vice versa, there's a misallocation. Claude sees this and acts.

This is not decoration. A campaign genuinely exists as a probability distribution across customer intent before you measure it. The act of scoring collapses the wave into a verdict.

### The HDCP Score

**Hammond Digital Commerce Performance** — a composite campaign health index built to answer the questions ROAS cannot.

```
HDCP = (NTB% × 0.60) + ((ROAS ÷ ROAS Goal) × 100 × 0.30) + (Spend Factor × 0.10)
```

**100 is par.** Like a golf handicap, except you want the number higher.

| Score | Reading |
|---|---|
| > 120 | Significantly outperforming — scale |
| 100–120 | At or above par — maintain |
| 80–99 | One component lagging — monitor |
| 60–79 | Two components weak — restructure |
| < 60 | Underperforming — review or pause |

**Why NTB% carries 60% of the weight:** ROAS is fundamentally incomplete as a success metric. It cannot tell you whether sales were incremental, whether the customer base is growing, or whether you're underinvested. NTB% — New-to-Brand Sales as a share of total ad-attributed sales — is the pin that pops the ROAS balloon. A 12× ROAS with 10% NTB is a campaign recapturing loyal buyers. A 4× ROAS with 55% NTB is a campaign building the business.

**Two-condition signals on top of the score:**

- **★ Green Light** — ROAS > 1.5× goal AND NTB% meets mode threshold. Both required. Scale with confidence.
- **⚠ Caution** — ROAS > 1.5× goal but NTB% too low. Efficient but not incremental. Investigate before scaling.

The HDCP score drives the gradient bar in the campaign table — red through orange through yellow through teal through green, with a vertical par notch at 100. At a glance, you know which campaigns Claude should be scaling and which need attention.

### Claude as the Operator

Claude is not a recommendation engine. It doesn't surface insights and wait. It reads the full portfolio state, reasons out loud about what needs to happen, executes bid and budget adjustments via tool calls, and writes a plain-English brief for the manager at the end of every cycle.

**Four tools:**
- `update_bid` — keyword bid adjustment, ±25% per cycle, $0.20–$8.00 bounds, max 2/keyword/day
- `update_daily_budget` — campaign daily budget adjustment, ±30% per cycle, $50 floor
- `shift_funnel_budget` — redistributes budget across the portfolio toward upper or lower funnel
- `pause_campaign` — pauses a campaign (guardrail: cannot pause if it's driving >50% of revenue)

Hard guardrails are enforced server-side. Claude cannot override them. The system is designed to move deliberately — not to make irreversible changes in a single cycle.

Every decision is logged with its full reasoning chain. Reading the reasoning feed is how a manager builds trust in the system over time. It is the primary interface, not an audit trail.

**Extended thinking** gives Claude space to reason about second-order effects — cutting a high-ROAS campaign might fix pacing but collapse NTB%. That reasoning is visible in the UI as it streams. Nothing happens in a black box.

### One Operator, Independent Platform

The managed client model in retail media is under structural pressure. Retailers are building optimization tools designed to make it easier for brands to hand execution decisions to retailer infrastructure. When the tool managing your bids belongs to the platform you're buying on, independence erodes.

Quantum Retail Media is independent by design. It runs against Walmart Connect today and any retailer's API tomorrow. The HDCP score is calculated from your data against your goals — not the retailer's attribution model. The strategic inputs are yours. The reasoning is legible. The operator is not the retailer.

---

## Architecture

```
backend/
  main.py          — FastAPI app, ClientRegistry, REST + WebSocket endpoints
  claude_engine.py — Optimization loop: extended thinking, tool use, streaming
  simulator.py     — Walmart campaign simulator (pacing, spend, strategy lock)
  onboarding.py    — Claude-powered client intake interview
  pacing.py        — HDCP scoring, waveform generation, pacing math
  data/            — Mock Walmart Connect campaign JSON

frontend/
  app/
    config.ts              — API base URL (reads NEXT_PUBLIC_API_URL)
    types.ts               — All TypeScript interfaces (AppState, CycleSummary, WsMessage)
    hooks/
      useQuantumStore.ts   — WebSocket state manager per client
      useClientStore.ts    — Multi-client registry
    components/
      PacingHeader         — Portfolio health bar + controls
      WaveformViz          — 2D Gaussian wave canvas
      WaveformViz3D        — Three.js time-series visualization
      CampaignTable        — HDCP gradient scorecard
      ReasoningFeed        — Live Claude reasoning stream + cycle report
      GoalSlider           — Strategy input (1–5 spectrum + prompt)
      StrategyModal        — Monthly mode selection with wave previews
      OnboardingModal      — Conversational client setup
      ClientSwitcher       — Multi-account switcher
      ReportModal          — Streaming client-facing report
```

### WebSocket message flow
```
cycle_start       → clears UI, sets isRunning
reasoning_chunk   → streams Claude's thinking token by token
action            → each tool call result as it lands
cycle_complete    → cycle report (narrative, metric deltas, budget shifts)
state_update      → full portfolio state after each cycle
```

---

## Docs

- [`quantum-retail-media.md`](quantum-retail-media.md) — full product spec, HDCP framework, worked examples, diagnostic matrix
- [`the-triangle.md`](the-triangle.md) — the agency / brand / retailer power shift and why this was built
- [`walmart-connect-api.md`](walmart-connect-api.md) — Walmart Connect API reference (auth, endpoints, schemas, integration checklist)
