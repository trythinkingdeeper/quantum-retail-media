import json
from typing import Callable, Awaitable
from anthropic import AsyncAnthropic
import numpy as np

PACING_MODEL = "claude-sonnet-4-6"   # optimization cycles — fast, cost-efficient
REPORT_MODEL = "claude-opus-4-7"     # client reports — highest quality output
ONBOARD_MODEL = "claude-opus-4-7"    # onboarding — conversational, nuanced

SYSTEM_PROMPT = """You are the Quantum Retail Media Intelligence Engine for SolarShield Immune+ on Walmart Connect.

QUANTUM FRAMEWORK:
Customers exist in quantum superposition of purchase intent states:
  Unaware     → α|unaware⟩        — targeted by SBV / Display (high incrementality, 90%+ NTB)
  Low Intent  → β|aware⟩          — targeted by SBV, SB       (incrementality ~0.75)
  Consideration→ γ|consideration⟩ — targeted by SB, SP        (incrementality ~0.50)
  High Intent → δ|high_intent⟩    — targeted by SP / Auto     (incrementality ~0.20)
  Loyal       → ε|loyal⟩          — targeted by Branded SP    (incrementality ~0.05)

Each ad impression collapses a customer's quantum state. Your optimization decisions determine WHERE probability waves collapse.

GOAL SPECTRUM (current setting will be given in each prompt):
  1 = Max Incrementality — 70% upper funnel, NTB target 75%+, shift budget to SBV/SD/SB
  2 = Incremental-lean  — 55% upper funnel
  3 = Balanced          — mixed funnel allocation
  4 = Efficiency-lean   — 60% lower funnel
  5 = Max Efficiency    — 80% lower funnel, ROAS target 5.0x, focus SP exact

PACING THRESHOLDS:
  < 0.90  → Critical Underpacing  — aggressive bid/budget increases
  0.90–0.96 → Moderate Underpacing — moderate increases
  0.96–1.04 → On Track            — no pacing action needed
  1.04–1.10 → Moderate Overpacing — moderate cuts
  > 1.10  → Critical Overpacing   — significant cuts

DATA LAG AWARENESS:
  Real Walmart Connect data has a 2-day reporting delay.
  You will always see a DATA CONTEXT section showing what is confirmed vs. estimated.
  Rules for acting under data uncertainty:
  - HIGH confidence metrics (spend, impressions, CTR < 24hr): act normally
  - MEDIUM confidence (1-day spend estimate): act, but note the uncertainty
  - LOW confidence (ROAS, NTB%, revenue — 2-day lag): do not cut bids unless signal
    is below 60% of goal AND was already declining in confirmed data before the lag.
  - PENDING DECISIONS: if you made a bid/budget change in the last 2 cycles and it
    hasn't been confirmed yet, hold — do not compound unconfirmed decisions.
  Your cycle journal tracks your accuracy. If your spend estimates have been off by >10%,
  apply more conservative projections and flag the uncertainty explicitly.

PACING DECISION PROTOCOL (follow in order every cycle):
  1. Read the RECOVERY MULTIPLIER. This is the single most important number.
     If it is above 1.10 or below 0.90, pacing action is required before any goal-spectrum work.
  2. Check CAP-OUT FLAGS. A campaign near its daily budget cap has demand available but can't spend.
     These are your first target for budget increases — you get guaranteed spend, not speculation.
  3. Check CONSECUTIVE DRIFT CYCLES. If ≥ 3 cycles, individual campaign adjustments are too slow.
     Use set_pacing_target to move the entire portfolio at once, then fine-tune with individual tools.
  4. Check PROJECTED EOMonth SPEND. If it will miss or overshoot monthly budget by >$1,000, act now.
  5. Only after pacing is addressed: optimize for goal spectrum and HDCP scores.

HARD GUARDRAILS (NEVER violate these):
  - Keyword bids: $0.20 min, $8.00 max
  - Max bid change per cycle: ±25%
  - Max daily budget change: ±30%
  - Never pause a campaign driving >50% of last week's revenue
  - Never set daily budget below $50
  - Max 2 bid changes per keyword per day (enforced by simulator — it will reject extras)

REASONING PROTOCOL:
For every analysis cycle:
  1. State the current pacing index and what it means
  2. Identify which campaigns are over/under-performing relative to goal spectrum
  3. Check guardrails before any action
  4. Explain each action in quantum terms (which intent states you're targeting)
  5. State your confidence level (0.0–1.0) for the overall strategy
  6. Flag any tension between pacing goals and the goal spectrum

After executing all tool calls, write a concise wrap-up in plain English — no quantum jargon — as if you're briefing a CMO in 3 sentences:
  Sentence 1: What the portfolio situation was and why it needed attention.
  Sentence 2: What you changed and the strategic rationale.
  Sentence 3: What to watch for in the next cycle and the expected direction.

Be precise. Be decisive. Think like a trading desk that happens to understand quantum mechanics."""

TOOLS = [
    {
        "name": "update_bid",
        "description": (
            "Update a keyword bid for a campaign. "
            "Guardrails enforced: min $0.20, max $8.00, max ±25% change per cycle, "
            "max 2 changes per keyword per day."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "campaign_id": {"type": "string", "description": "Campaign ID e.g. SP-001"},
                "keyword": {"type": "string", "description": "Exact keyword string"},
                "new_bid": {"type": "number", "description": "New bid in dollars"},
                "reasoning": {"type": "string", "description": "Why this bid change collapses intent correctly"},
            },
            "required": ["campaign_id", "keyword", "new_bid", "reasoning"],
        },
    },
    {
        "name": "update_daily_budget",
        "description": (
            "Update the daily budget for a campaign. "
            "Guardrails: ±30% max change, minimum $50."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "campaign_id": {"type": "string"},
                "new_daily_budget": {"type": "number", "description": "New daily budget in dollars"},
                "reasoning": {"type": "string"},
            },
            "required": ["campaign_id", "new_daily_budget", "reasoning"],
        },
    },
    {
        "name": "pause_campaign",
        "description": (
            "Pause a campaign. Will be rejected if it drives >50% of last week's revenue."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "campaign_id": {"type": "string"},
                "reasoning": {"type": "string"},
            },
            "required": ["campaign_id", "reasoning"],
        },
    },
    {
        "name": "shift_funnel_budget",
        "description": (
            "Rebalance budget allocation across the funnel. "
            "Use when the goal spectrum changes or as a strategic lever."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "direction": {
                    "type": "string",
                    "enum": ["upper_funnel", "lower_funnel", "balanced"],
                    "description": "Which direction to shift budget weight",
                },
                "magnitude": {
                    "type": "number",
                    "description": "Intensity 0.0–1.0 (0.5 = moderate shift)",
                },
                "reasoning": {"type": "string"},
            },
            "required": ["direction", "magnitude", "reasoning"],
        },
    },
    {
        "name": "set_pacing_target",
        "description": (
            "Emergency portfolio-level pacing lever. Scales ALL active campaign daily budgets "
            "proportionally to hit a target total daily run rate. Bypasses per-campaign ±30% cap. "
            "Use when consecutive_underpacing >= 3 or recovery_multiplier is extreme (>1.40 or <0.70). "
            "Do NOT use for routine adjustments — use update_daily_budget for those. "
            "Guardrails: no campaign drops below $50/day, max 2× any campaign's current budget."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "target_daily_rate": {
                    "type": "number",
                    "description": (
                        "Target total daily spend across all active campaigns in dollars. "
                        "Set to required_daily_rate to close the pacing gap by EOMonth."
                    ),
                },
                "reasoning": {"type": "string", "description": "Why individual campaign tools are insufficient and why this rate is correct"},
            },
            "required": ["target_daily_rate", "reasoning"],
        },
    },
]


def _build_data_context(state: dict, projection: dict, lag_days: int) -> str:
    lines = [
        f"DATA CONTEXT  (reporting lag: {lag_days} days)",
        f"  Confirmed data through:   Day {max(1, state['simulated_day'] - lag_days)}",
        f"  Today (simulated):        Day {state['simulated_day']}",
        f"  Blind spot:               {lag_days} days of unconfirmed activity",
        "",
        "  METRIC CONFIDENCE TIERS",
        "    HIGH   — Impressions, Clicks, CTR                (< 24hr lag)",
        "    MEDIUM — Daily spend (estimated from utilization) (1-day lag)",
        f"    LOW    — ROAS, NTB%, Orders, Revenue             ({lag_days}-day lag — use confirmed values, not estimates)",
        "",
        "  SPEND BRIDGE (confirmed → estimated current)",
        f"    Confirmed MTD spend:   ${projection['confirmed_mtd_spend']:,.2f}",
        f"    + Projected lag spend: ${projection['projected_lag_spend']:,.2f}  ({lag_days} days × avg utilization)",
        f"    = Estimated MTD spend: ${projection['estimated_mtd_spend']:,.2f}",
        f"    Projection confidence: {projection['confidence']:.0%}",
    ]
    if projection["calibration_factor"] < 0.97:
        lines.append(f"    ⚠ Calibration factor {projection['calibration_factor']:.2f} — your recent estimates ran HIGH, apply downward bias")
    elif projection["calibration_factor"] > 1.03:
        lines.append(f"    ⚠ Calibration factor {projection['calibration_factor']:.2f} — your recent estimates ran LOW, apply upward bias")
    else:
        lines.append(f"    Calibration: {projection['calibration_factor']:.2f} (well-calibrated — estimates tracking closely)")

    lines += ["", "  CAMPAIGN UTILIZATION RATES (basis for projection)"]
    for cid, proj in projection["campaign_projections"].items():
        lines.append(
            f"    {cid}: avg util {proj['avg_utilization']:.0%} → "
            f"est. ${proj['projected_daily']:,.0f}/day → "
            f"+${proj['projected_lag_contribution']:,.0f} over lag"
        )
    return "\n".join(lines)


def _build_cycle_journal_section(journal: list[dict], current_day: int) -> str:
    if not journal:
        return "DECISION HISTORY\n  No prior cycles recorded — this is your first cycle."

    lines = ["DECISION HISTORY  (wave packet — your accumulated context)"]
    for entry in reversed(journal[-5:]):  # show last 5, most recent first
        days_ago = current_day - entry["day"]
        age_str = f"Day {entry['day']}, {entry['hour']:02d}:00  ({days_ago}d ago)"

        if entry["confirmation_status"] == "confirmed":
            accuracy = entry.get("spend_estimate_accuracy")
            accuracy_str = f"{accuracy:.0%} accurate" if accuracy is not None else "confirmed"
            status_str = f"CONFIRMED ✓  spend estimate {accuracy_str}"
        elif days_ago == 0:
            status_str = "CURRENT CYCLE"
        else:
            days_until = max(0, 2 - days_ago)
            status_str = f"PENDING  ({days_until}d until confirmed data arrives)"

        lines.append(f"\n  Cycle {entry['cycle_number']} — {age_str}")
        lines.append(f"  Status: {status_str}")
        lines.append(f"  Confirmed pacing index at cycle time: {entry['confirmed_pacing_index']:.3f}")

        if entry["actions"]:
            lines.append(f"  Decisions made ({len(entry['actions'])} actions):")
            for a in entry["actions"][:6]:  # cap to avoid bloat
                lines.append(f"    • {a['tool']} on {a['campaign'] or 'portfolio'}")
        else:
            lines.append("  Decisions: No tool actions taken (held position)")

        if entry["narrative"]:
            # Truncate narrative to 120 chars for context efficiency
            snip = entry["narrative"][:120].replace("\n", " ")
            lines.append(f"  Wrap-up: \"{snip}{'…' if len(entry['narrative']) > 120 else ''}\"")

    lines += [
        "",
        "  Use this history to avoid compounding unconfirmed decisions.",
        "  If a cycle is PENDING and you made significant changes, hold on further",
        "  changes to the same campaigns until confirmation arrives.",
    ]
    return "\n".join(lines)


def _compute_trends(history: list[dict]) -> str:
    if len(history) < 2:
        return "  (Insufficient history — trends available after 2+ cycles)"

    n = len(history)
    lines = [f"  {n} hourly snapshots available. Derivatives computed per hour.\n"]

    # ── Portfolio-level trends ──────────────────────────────────────────
    pacing_vals = [h["pacing_index"] for h in history]
    daily_rate_vals = [h["current_daily_rate"] for h in history]

    def velocity(vals: list[float]) -> float:
        return vals[-1] - vals[-2]

    def acceleration(vals: list[float]) -> float | None:
        if len(vals) < 3:
            return None
        return (vals[-1] - vals[-2]) - (vals[-2] - vals[-3])

    def project_crossover(vals: list[float], target: float) -> str:
        v = velocity(vals)
        if v == 0:
            return "stable"
        hours = (target - vals[-1]) / v
        if hours < 0:
            return "already crossed"
        if hours > 72:
            return ">72h away"
        return f"~{hours:.1f}h"

    pi_v = velocity(pacing_vals)
    pi_a = acceleration(pacing_vals)
    lines.append("  PACING INDEX")
    lines.append(f"    Values (oldest→now): {' → '.join(f'{v:.3f}' for v in pacing_vals[-6:])}")
    lines.append(f"    Velocity:     {pi_v:+.4f}/hr  ({'IMPROVING' if pi_v > 0 else 'WORSENING'})")
    if pi_a is not None:
        lines.append(f"    Acceleration: {pi_a:+.4f}/hr²  ({'speeding up' if pi_a * pi_v > 0 else 'slowing down'})")
    lines.append(f"    → Projected to reach 0.96 (healthy floor): {project_crossover(pacing_vals, 0.96)}")
    lines.append(f"    → Projected to reach 1.04 (overpace ceiling): {project_crossover(pacing_vals, 1.04)}")

    dr_v = velocity(daily_rate_vals)
    lines.append(f"\n  DAILY SPEND RATE  (now ${daily_rate_vals[-1]:,.2f}/day)")
    lines.append(f"    Velocity: {dr_v:+.2f}/hr  ({'accelerating' if dr_v > 0 else 'decelerating'})")
    lines.append(f"    Required: ${history[-1]['required_daily_rate']:,.2f}/day  — gap: ${daily_rate_vals[-1] - history[-1]['required_daily_rate']:+,.2f}")

    # ── Per-campaign metric trends ──────────────────────────────────────
    campaign_ids = list(history[0]["campaigns"].keys())
    lines.append("\n  CAMPAIGN METRIC TRENDS")

    for cid in campaign_ids:
        roas_vals = [h["campaigns"][cid]["roas"] for h in history if cid in h["campaigns"]]
        ntb_vals  = [h["campaigns"][cid]["ntb_rate"] for h in history if cid in h["campaigns"]]
        ctr_vals  = [h["campaigns"][cid]["ctr"] for h in history if cid in h["campaigns"]]
        spend_vals = [h["campaigns"][cid]["today_spend"] for h in history if cid in h["campaigns"]]

        if len(roas_vals) < 2:
            continue

        roas_v = velocity(roas_vals)
        ntb_v  = velocity(ntb_vals)
        ctr_v  = velocity(ctr_vals)
        spend_v = velocity(spend_vals)

        # Linear projection: hours until ROAS hits 1.0 or 0.5
        roas_proj = project_crossover(roas_vals, 1.0) if roas_v < 0 else "—"

        lines.append(f"\n    [{cid}]")
        lines.append(f"      ROAS:  {roas_vals[-1]:.3f}  velocity {roas_v:+.4f}/hr" +
                     (f"  → hits 1.0x in {roas_proj}" if roas_v < 0 and roas_vals[-1] > 1.0 else ""))
        lines.append(f"      NTB:   {ntb_vals[-1]:.2%}  velocity {ntb_v:+.4f}/hr")
        lines.append(f"      CTR:   {ctr_vals[-1]:.4%}  velocity {ctr_v:+.5f}/hr")
        lines.append(f"      Spend: ${spend_vals[-1]:,.2f}  velocity {spend_v:+.2f}/hr")

        # Flag deteriorating metrics
        flags = []
        if roas_v < -0.05 and roas_vals[-1] < 1.5:
            flags.append("⚠ ROAS declining fast")
        if ntb_v < -0.02 and ntb_vals[-1] < 0.3:
            flags.append("⚠ NTB collapsing toward loyal-only")
        if spend_v < -50 and spend_vals[-1] < history[-1]["campaigns"][cid]["daily_budget"] * 0.5:
            flags.append("⚠ Spend decelerating — may not hit daily budget")
        if flags:
            lines.append(f"      FLAGS: {' | '.join(flags)}")

    lines.append(
        "\n  Use these derivatives to make FORWARD-LOOKING decisions. "
        "If a metric is on a bad trajectory, act NOW before it crosses a threshold. "
        "A metric with high negative velocity and low absolute value is more urgent than one that is simply low but stable."
    )
    return "\n".join(lines)


def _build_pacing_prompt(
    state: dict,
    goal_text: str = "",
    history: list[dict] | None = None,
    projection: dict | None = None,
    cycle_journal: list[dict] | None = None,
    lag_days: int = 2,
) -> str:
    p = state["pacing"]
    campaigns = state["campaigns"]

    recovery_mult = p.get("recovery_multiplier", 1.0)
    projected_eom = p.get("projected_eom_spend", p["actual_spend"])
    eom_delta = projected_eom - state["monthly_budget"]
    consec_under = p.get("consecutive_underpacing", 0)
    consec_over = p.get("consecutive_overpacing", 0)

    drift_warning = ""
    if consec_under >= 3:
        drift_warning = f"  ⚠ PERSISTENT UNDERPACING — {consec_under} consecutive cycles. Individual adjustments may be insufficient. Consider set_pacing_target."
    elif consec_over >= 3:
        drift_warning = f"  ⚠ PERSISTENT OVERPACING — {consec_over} consecutive cycles. Consider set_pacing_target to pull rate down portfolio-wide."

    lines = [
        f"=== PACING CYCLE — Day {state['simulated_day']}, Hour {state['simulated_hour']}:00 ===",
        f"Goal Spectrum: {state['goal_spectrum']}/5  |  Strategy: {state.get('strategy_mode','balanced').upper()}",
        "",
        "PORTFOLIO PACING",
        f"  Monthly Budget:          ${state['monthly_budget']:,.0f}",
        f"  Actual MTD Spend:        ${p['actual_spend']:,.2f}",
        f"  Expected MTD Spend:      ${p['expected_spend']:,.2f}",
        f"  Pacing Index:            {p['pacing_index']:.3f} — {p['status']}",
        f"  Days Remaining:          {p['days_remaining']}",
        f"  Required Daily Rate:     ${p['required_daily_rate']:,.2f}",
        f"  Current Daily Rate:      ${p['current_daily_rate']:,.2f}",
        f"  Recovery Multiplier:     {recovery_mult:.3f}×  ← multiply current run rate by this to close gap",
        f"  Projected EOMonth Spend: ${projected_eom:,.0f}  ({'+' if eom_delta >= 0 else ''}{eom_delta:,.0f} vs target)",
        f"  Consecutive Underpacing: {consec_under} cycles",
        f"  Consecutive Overpacing:  {consec_over} cycles",
    ]
    if drift_warning:
        lines.append(drift_warning)

    lines += ["", "CAMPAIGN METRICS"]

    for c in campaigns:
        daily_util = (c["today_spend"] / c["daily_budget"] * 100) if c["daily_budget"] > 0 else 0
        capout_flag = " ← CAP-OUT RISK: demand available, increase budget" if daily_util >= 85 else ""
        lines.append(
            f"\n  [{c['id']}] {c['name']}"
            f"\n    Status:       {c['status']}"
            f"\n    Daily Budget: ${c['daily_budget']:,.0f}  |  Today Spend: ${c['today_spend']:,.2f} ({daily_util:.0f}% used){capout_flag}"
            f"\n    ROAS:         {c['roas']:.2f}  |  NTB Rate: {c['ntb_rate']:.1%}  |  HDCP: {c.get('hdcp_score', 0):.1f}"
            f"\n    CTR:          {c['ctr']:.3%}  |  Intent Center: {c['intent_center']:.3f}"
            f"\n    Revenue Share (last week): {c['revenue_share']:.0%}"
        )
        if c.get("keywords"):
            lines.append("    Keywords:")
            for kw in c["keywords"]:
                changes = kw.get("daily_changes", 0)
                lines.append(
                    f"      • {kw['kw']} [{kw['match']}] bid=${kw['bid']:.2f}  changes_today={changes}"
                )

    if projection:
        lines += ["", _build_data_context(state, projection, lag_days)]

    if cycle_journal is not None:
        lines += ["", _build_cycle_journal_section(cycle_journal, state["simulated_day"])]

    if history and len(history) >= 2:
        lines += ["", "HISTORICAL TRENDS & DERIVATIVES", _compute_trends(history)]

    if goal_text:
        lines += ["", f"MARKETER GOAL INPUT: \"{goal_text}\""]
        lines.append("Translate this goal into the quantum framework and adjust campaigns accordingly.")

    lines += [
        "",
        "Analyze the above. Apply the minimum number of precise actions to keep pacing within ±4% "
        "while respecting the goal spectrum. Use the historical derivatives and decision history to "
        "catch deteriorating trends BEFORE they become critical, and avoid compounding unconfirmed "
        "decisions. Explain your reasoning in quantum terms.",
    ]
    return "\n".join(lines)


class ClaudeEngine:
    def __init__(self, simulator):
        self.client = AsyncAnthropic()
        self.simulator = simulator

    async def run_pacing_cycle(
        self,
        goal_text: str = "",
        broadcast: Callable[[dict], Awaitable[None]] | None = None,
    ) -> list[dict]:
        state = self.simulator.get_state()
        history = self.simulator.get_history()
        projection = self.simulator.project_spend_through_lag()
        cycle_journal = self.simulator.get_cycle_journal()

        # Capture before-state for summary
        before_budgets = {c["id"]: {"type": c["type"], "budget": c["daily_budget"]} for c in state["campaigns"]}
        before_pacing = state["pacing"]["pacing_index"]
        before_metrics = {
            "roas": sum(c["roas"] for c in state["campaigns"]) / len(state["campaigns"]),
            "ntb_rate": sum(c["ntb_rate"] for c in state["campaigns"]) / len(state["campaigns"]),
            "ctr": sum(c["ctr"] for c in state["campaigns"]) / len(state["campaigns"]),
        }

        prompt = _build_pacing_prompt(
            state, goal_text, history,
            projection=projection,
            cycle_journal=cycle_journal,
            lag_days=self.simulator.data_lag_days,
        )
        messages = [{"role": "user", "content": prompt}]
        actions: list[dict] = []
        last_reasoning_text = ""

        if broadcast:
            await broadcast({"type": "cycle_start", "day": state["simulated_day"], "hour": state["simulated_hour"]})

        while True:
            async with self.client.messages.stream(
                model=PACING_MODEL,
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=messages,
            ) as stream:
                content_blocks: list[dict] = []
                current_block: dict | None = None

                async for event in stream:
                    etype = getattr(event, "type", None)

                    if etype == "content_block_start":
                        cb = event.content_block
                        if cb.type == "text":
                            current_block = {"type": "text", "text": ""}
                        elif cb.type == "tool_use":
                            current_block = {
                                "type": "tool_use",
                                "id": cb.id,
                                "name": cb.name,
                                "_input_str": "",
                            }

                    elif etype == "content_block_delta":
                        delta = event.delta
                        if hasattr(delta, "text") and current_block and current_block["type"] == "text":
                            current_block["text"] += delta.text
                            if broadcast:
                                await broadcast({"type": "reasoning_chunk", "text": delta.text})
                        elif hasattr(delta, "partial_json") and current_block and current_block["type"] == "tool_use":
                            current_block["_input_str"] += delta.partial_json

                    elif etype == "content_block_stop":
                        if current_block:
                            if current_block["type"] == "tool_use":
                                raw = current_block.pop("_input_str", "{}")
                                current_block["input"] = json.loads(raw) if raw else {}
                            elif current_block["type"] == "text" and current_block.get("text"):
                                last_reasoning_text = current_block["text"]
                            content_blocks.append(current_block)
                            current_block = None

                final_msg = await stream.get_final_message()

            messages.append({"role": "assistant", "content": final_msg.content})

            if final_msg.stop_reason == "end_turn":
                break

            # Process tool calls
            tool_results = []
            for block in content_blocks:
                if block["type"] != "tool_use":
                    continue
                result = self.simulator.apply_action(block["name"], block["input"])
                action_entry = {
                    "tool": block["name"],
                    "input": block["input"],
                    "result": result,
                }
                actions.append(action_entry)

                if broadcast:
                    await broadcast({"type": "action", **action_entry})

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block["id"],
                    "content": json.dumps(result),
                })

            messages.append({"role": "user", "content": tool_results})

        # Record this cycle in the journal before advancing time
        self.simulator.record_cycle(
            actions=[a for a in actions if a["tool"] != "error"],
            narrative=last_reasoning_text.strip(),
            estimated_mtd_spend=projection["estimated_mtd_spend"],
        )

        self.simulator.advance_time()
        after_state = self.simulator.get_state()

        # Build cycle summary
        after_campaigns = after_state["campaigns"]
        budget_changes: dict = {}
        for camp in after_campaigns:
            cid = camp["id"]
            ctype = camp["type"]
            before_b = before_budgets.get(cid, {}).get("budget", 0)
            after_b = camp["daily_budget"]
            if ctype not in budget_changes:
                budget_changes[ctype] = {"before": 0, "after": 0}
            budget_changes[ctype]["before"] += before_b
            budget_changes[ctype]["after"] += after_b

        for ctype, vals in budget_changes.items():
            b = vals["before"]
            vals["pct_change"] = round(((vals["after"] - b) / b * 100) if b else 0, 1)

        after_metrics = {
            "roas": round(sum(c["roas"] for c in after_campaigns) / len(after_campaigns), 2),
            "ntb_rate": round(sum(c["ntb_rate"] for c in after_campaigns) / len(after_campaigns), 3),
            "ctr": round(sum(c["ctr"] for c in after_campaigns) / len(after_campaigns), 4),
        }

        goal_labels = {1: "Max Incrementality", 2: "Incremental-Lean", 3: "Balanced", 4: "Efficiency-Lean", 5: "Max Efficiency"}

        if broadcast:
            await broadcast({
                "type": "cycle_complete",
                "cycle_narrative": last_reasoning_text.strip(),
                "actions_count": len(actions),
                "goal_spectrum": after_state["goal_spectrum"],
                "goal_label": goal_labels.get(after_state["goal_spectrum"], "Balanced"),
                "goal_text": goal_text,
                "budget_changes": budget_changes,
                "before_metrics": before_metrics,
                "after_metrics": after_metrics,
                "pacing_index_before": round(before_pacing, 3),
                "pacing_index_after": round(after_state["pacing"]["pacing_index"], 3),
                "pacing_status": after_state["pacing"]["status"],
            })
            await broadcast({"type": "state_update", "state": after_state})

        return actions
