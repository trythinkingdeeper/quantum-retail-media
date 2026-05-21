# Quantum Retail Media Intelligence Engine

**Full Project Brief — Claude Code Handoff Document**  
**Author:** Andrew Hammond  
**Event:** Built with Claude Hackathon  
**Model:** claude-opus-4-7 (or latest available)

## 1. Project Overview

Retail media is a $150B+ industry still run by humans staring at spreadsheets and manually tweaking bids. We are building the **Quantum Retail Media Intelligence Engine** — an autonomous pacing and optimization system powered by Claude.

The engine reads (simulated) campaign data from Walmart Connect every hour, keeps spend on track within ±4% of monthly budget, and automatically adjusts bids, daily budgets, and dayparting. A natural-language interface lets marketers say “We’re launching a new flavor — drive new customers” and Claude instantly reconfigures the campaign mix across the funnel.

Everything is built on the **Quantum Retail Media Framework**: customers exist on a probability spectrum of purchase intent. Every ad collapses their quantum state. The hero visualization shows exactly where on that spectrum your media dollars are collapsing probability waves in real time.

**One-liner:**  
“Every other retail media tool asks ‘How do I sell more of my product?’ We ask ‘Where is my customer on their probability wave right now — and what does it take to collapse it?’”

## 2. The Quantum Retail Media Framework

### Principle 1 — Superposition
Customer State = α|unaware⟩ + β|low-intent⟩ + γ|consideration⟩ + δ|high-intent⟩ + ε|loyal⟩  
where α² + β² + γ² + δ² + ε² = 1.0

### Principle 2 — Wave Function Collapse (The Observer Effect)
Ad type determines where the wave collapses:
- SBV → awareness / low intent (high incrementality)
- SB → consideration / entanglement
- SP / Auto → high intent / efficiency

### Principle 3 — Probability Tunneling
Low-intent customers can convert directly (true incremental buyers).

### Principle 4 — Entanglement
Touchpoints are correlated; last-click attribution is broken.

### Principle 5 — Heisenberg Uncertainty
Intent and incrementality cannot be known perfectly at the same time. The Goal Spectrum Slider embodies this.

### Customer Probability States

| State              | Ad Types          | Incrementality Score | Expected NTB Rate | Quantum State     |
|--------------------|-------------------|----------------------|-------------------|-------------------|
| Unaware            | Display, SBV      | 0.95                 | 90%+              | Superposition     |
| Aware / Low Intent | SBV, SB           | 0.75                 | 65%               | Partial Collapse  |
| Consideration      | SB, SP            | 0.50                 | 40%               | Collapsing        |
| High Intent        | SP / Auto         | 0.20                 | 15%               | Near Collapsed    |
| Loyal Buyer        | SP Branded        | 0.05                 | 0%                | Fully Collapsed   |

## 3. Core Features (MVP for Hackathon)

**Feature 1 — Automated Pacing Engine**  
Reads mock data hourly → calculates Pacing Index → Claude decides actions.

**Pacing Math**  
Pacing Index = actual_spend / expected_spend (1.0 = perfect)  
Expected Spend = monthly_budget × (days_elapsed / days_in_month)  
Velocity Delta = required_daily_rate / current_daily_rate

**Decision Thresholds**  
- Below 0.90: Critical underpacing → aggressive increases  
- 0.90–0.96: Moderate underpacing → moderate increases  
- 0.96–1.04: Healthy → no action  
- 1.04–1.10: Moderate overpacing → moderate cuts  
- Above 1.10: Critical overpacing → significant cuts

**Hard Guardrails (never violate)**  
- Keyword bids: $0.20 min, $8.00 max  
- Max bid change per cycle: ±25%  
- Max daily budget change: ±30%  
- Never pause a campaign driving >50% of last week’s revenue  
- Never set daily budget below $50  
- Max 2 bid changes per keyword per day

**Feature 2 — Natural Language Goal Interface**  
Plain-English input. Claude translates using the quantum framework.

**Examples**  
- “We’re launching a new flavor, push hard for new customers” → Slider 1, shift budget to SBV/Display, raise non-branded bids  
- “CFO wants ROAS above 5.0” → Slider 5, pause upper funnel, focus on exact-match SP

**Feature 3 — Goal Spectrum Slider**  
1 = Max Incrementality (70% upper funnel, NTB target 75%) … 5 = Max Efficiency (80% lower funnel, ROAS 5.0x)

**Feature 4 — Live Data-Driven Waveform Visualization (Hero Visual)**  
Discrete colored waves (one per ad type) + combined portfolio wave.  
Waves are driven by simulator metrics (NTB rate, ROAS, CTR, spend).  
Use this logic for intent center (0 = low-intent, 1 = high-intent):  
intent_center = 0.45 * (1 - ntb_rate) + 0.35 * (roas / max_roas) + 0.20 * (ctr / max_ctr)  
Waves use SciPy Gaussian (or equivalent) shifted to the data-derived center and scaled by spend.  
When Claude acts or time advances, the combined wave visibly shifts and breathes.

**Feature 5 — Claude Reasoning Feed**  
Live streaming panel (WebSockets) showing thoughts, trade-offs, guardrail checks, and confidence.

## 4. Mock Data & Reactive Simulator (Simplified for 1-Week Build)

**WalmartMockSimulator** class that:
- Loads realistic mock JSON (campaigns, spend reports with NTB/ROAS/CTR columns)  
- Applies Claude’s structured actions (update_bid, update_budget, etc.)  
- Advances simulated time (1-hour steps) with light randomness so outcomes feel like real retail-media auctions  
- Feeds updated metrics straight into the waveform calculator  

This gives a closed-loop demo: type a goal → Claude reasons → actions applied → time advances → waveform updates live. No real API calls needed.

## 5. Technical Stack (Realistic Scope)

- **Backend**: FastAPI + WebSockets, Pandas/NumPy/SciPy, APScheduler  
- **Frontend**: Next.js + React + TypeScript, Tailwind CSS  
- **Animations & Waveform**: Framer Motion (physics), D3.js or Visx (wave rendering), optional React Spring  
- **Stretch only**: @react-three/fiber + Three.js (3D quantum field) — only if core is already done  

## 6. One-Week Build Plan

- **Day 1**: Scaffold + mock data + pacing calculator + basic simulator  
- **Day 2**: Core loop (read → calculate → Claude tool-use → apply actions)  
- **Day 3**: Goal slider + NL parser + quantum-aware system prompt  
- **Day 4**: Data-driven waveform visualization  
- **Day 5**: Reasoning feed + live updates between all components  
- **Day 6**: Guardrails, polish, demo flow  
- **Day 7**: Testing + video + submission  

## 7. Claude Code Kickoff Prompt
(You can paste the entire brief above into Claude and then add: “Start by scaffolding the full project structure using the one-week plan. Build the pacing engine and mock simulator first so the demo is runnable immediately. Prioritize the live waveform as the hero visual.”)

---

**Hackathon Submission Pitch**  
Retail media is a $150B industry still managed by humans staring at spreadsheets. We built an autonomous pacing and optimization engine — powered by Claude — that keeps every Walmart Connect campaign perfectly on budget. Marketers control everything with natural language or a single slider, and the hero waveform visualization shows exactly where on the customer probability spectrum their media dollars are collapsing intent waves in real time. It is the first tool that gives a brand manager the control of a full trading desk in a single sentence.

---

This markdown now contains **everything** we discussed. Nothing critical is missing, the scope is realistic for one week, and the quantum aspect + live waveform remain the stars.

You can hand this off to Claude right now and start building with confidence.  

If you want me to add the exact `WalmartMockSimulator` class code or the full Claude system prompt as an appendix to this file before you paste it, just say the word and I’ll update it instantly.  

Ready when you are — let’s go build this thing. What’s next?