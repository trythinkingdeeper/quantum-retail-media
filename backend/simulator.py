import json
import copy
import random
from pathlib import Path
from pacing import (
    calculate_pacing_index,
    get_pacing_status,
    calculate_intent_center,
    calculate_hdcp_score,
    build_waveform_data,
    build_gmv_wave_data,
)

DATA_DIR = Path(__file__).parent / "data"

BID_MIN = 0.20
BID_MAX = 8.00
BID_MAX_CHANGE = 0.25
BUDGET_MAX_CHANGE = 0.30
BUDGET_MIN = 50.0
MAX_BID_CHANGES_PER_DAY = 2


class WalmartMockSimulator:
    def __init__(self, brand_name: str = "SolarShield Immune+", is_demo: bool = True):
        self._campaigns_raw = json.loads((DATA_DIR / "campaigns.json").read_text())
        self._spend_raw = json.loads((DATA_DIR / "spend_report.json").read_text())
        self._items_raw = json.loads((DATA_DIR / "items.json").read_text())["items"]
        self._state = self._build_initial_state()
        self.goal_spectrum = 3
        self.action_log: list[dict] = []
        self.history: list[dict] = []
        self.brand_name = brand_name
        self.is_demo = is_demo
        self.simulated_month = 0        # increments on month rollover
        self.strategy_mode = "balanced"
        self.strategy_lock_month = -1   # -1 = never locked this session
        self.consecutive_underpacing = 0  # cycles spent below 0.96 without recovery
        self.consecutive_overpacing = 0   # cycles spent above 1.04 without recovery
        self.data_lag_days = 2            # reporting delay — confirmed data is always this many days old
        self.cycle_counter = 0
        self.cycle_journal: list[dict] = []  # accumulated decision history with confirmation tracking

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def get_state(self) -> dict:
        s = self._state
        campaigns = self._enrich_campaigns(s["campaigns"])
        pacing = s["pacing"]
        return {
            "simulated_day": s["simulated_day"],
            "simulated_hour": s["simulated_hour"],
            "monthly_budget": s["monthly_budget"],
            "goal_spectrum": self.goal_spectrum,
            "pacing": {
                "actual_spend": pacing["actual_spend"],
                "expected_spend": pacing["expected_spend"],
                "pacing_index": pacing["pacing_index"],
                "status": pacing["status"],
                "severity": pacing["severity"],
                "direction": pacing["direction"],
                "remaining_budget": pacing["remaining_budget"],
                "days_remaining": pacing["days_remaining"],
                "required_daily_rate": pacing["required_daily_rate"],
                "current_daily_rate": pacing["current_daily_rate"],
                "recovery_multiplier": pacing.get("recovery_multiplier", 1.0),
                "projected_eom_spend": pacing.get("projected_eom_spend", 0.0),
                "consecutive_underpacing": pacing.get("consecutive_underpacing", 0),
                "consecutive_overpacing": pacing.get("consecutive_overpacing", 0),
            },
            "campaigns": campaigns,
            "waveform": build_waveform_data(campaigns),
            "gmv_wave": build_gmv_wave_data(self._items_raw),
            "action_log": self.action_log[-20:],
            "brand_name": self.brand_name,
            "is_demo": self.is_demo,
            "strategy_mode": self.strategy_mode,
            "strategy_locked": self._is_strategy_locked(),
            "strategy_days_remaining": self._strategy_days_remaining(),
        }

    def apply_action(self, tool_name: str, params: dict) -> dict:
        if tool_name == "update_bid":
            return self._update_bid(params)
        if tool_name == "update_daily_budget":
            return self._update_daily_budget(params)
        if tool_name == "pause_campaign":
            return self._pause_campaign(params)
        if tool_name == "shift_funnel_budget":
            return self._shift_funnel_budget(params)
        if tool_name == "set_pacing_target":
            return self._set_pacing_target(params)
        return {"error": f"Unknown tool: {tool_name}"}

    def set_strategy(self, mode: str):
        """Lock a strategy mode for the current month."""
        mode_to_spectrum = {"acquisition": 1, "balanced": 3, "retention": 5}
        self.strategy_mode = mode
        self.strategy_lock_month = self.simulated_month
        self.goal_spectrum = mode_to_spectrum.get(mode, 3)

    def _is_strategy_locked(self) -> bool:
        return self.strategy_lock_month == self.simulated_month

    def _strategy_days_remaining(self) -> int:
        if not self._is_strategy_locked():
            return 0
        return max(0, self._state["days_in_month"] - self._state["simulated_day"] + 1)

    def advance_time(self):
        s = self._state
        s["simulated_hour"] += 1
        if s["simulated_hour"] >= 24:
            s["simulated_hour"] = 0
            s["simulated_day"] += 1
            for c in s["campaigns"].values():
                for kw in c.get("keywords", []):
                    kw["daily_changes"] = 0

            # Month rollover
            if s["simulated_day"] > s["days_in_month"]:
                s["simulated_day"] = 1
                s["simulated_hour"] = 0
                self.simulated_month += 1
                # Reset today + MTD spend for new month
                for c in s["campaigns"].values():
                    c["today_spend"] = 0.0
                    c["mtd_spend"] = 0.0
                # Recalculate pacing from clean slate
                self._recalculate_pacing()

        for cid, c in s["campaigns"].items():
            if c["status"] != "active":
                continue
            noise = random.gauss(1.0, 0.04)
            hourly = c["daily_budget"] / 16
            c["today_spend"] = min(c["today_spend"] + hourly * noise, c["daily_budget"])
            c["mtd_spend"] += hourly * noise
            c["roas"] = max(0.1, c["roas"] * random.gauss(1.0, 0.02))
            c["ntb_rate"] = max(0.0, min(1.0, c["ntb_rate"] * random.gauss(1.0, 0.01)))
            c["ctr"] = max(0.001, c["ctr"] * random.gauss(1.0, 0.015))

        self._recalculate_pacing()
        self._record_snapshot()

    def _record_snapshot(self):
        s = self._state
        snap = {
            "day": s["simulated_day"],
            "hour": s["simulated_hour"],
            "pacing_index": round(s["pacing"]["pacing_index"], 4),
            "actual_spend": round(s["pacing"]["actual_spend"], 2),
            "current_daily_rate": round(s["pacing"]["current_daily_rate"], 2),
            "required_daily_rate": round(s["pacing"]["required_daily_rate"], 2),
            "campaigns": {
                cid: {
                    "roas": round(c["roas"], 3),
                    "ntb_rate": round(c["ntb_rate"], 4),
                    "ctr": round(c["ctr"], 5),
                    "today_spend": round(c["today_spend"], 2),
                    "daily_budget": round(c["daily_budget"], 2),
                }
                for cid, c in s["campaigns"].items()
            },
        }
        self.history.append(snap)
        if len(self.history) > 24:  # keep 24 hours max
            self.history.pop(0)

    def get_history(self) -> list[dict]:
        return self.history

    def record_cycle(self, actions: list[dict], narrative: str, estimated_mtd_spend: float):
        """Called by ClaudeEngine after each cycle completes."""
        s = self._state
        self.cycle_counter += 1
        entry = {
            "cycle_number": self.cycle_counter,
            "day": s["simulated_day"],
            "hour": s["simulated_hour"],
            # Data that was confirmed at cycle time (lag days old)
            "confirmed_through_day": max(1, s["simulated_day"] - self.data_lag_days),
            "confirmed_mtd_spend": round(s["pacing"]["actual_spend"], 2),
            "confirmed_pacing_index": round(s["pacing"]["pacing_index"], 4),
            # Claude's forward estimate for the lag period
            "estimated_mtd_spend": round(estimated_mtd_spend, 2),
            "estimated_daily_rate": round(s["pacing"]["current_daily_rate"], 2),
            # Decisions made this cycle
            "actions": [{"tool": a["tool"], "campaign": a.get("campaign", ""), "reasoning": a.get("reasoning", "")} for a in actions],
            "narrative": narrative,
            # Confirmation filled in by a later cycle when real data arrives
            "confirmation_status": "pending",  # pending | confirmed | expired
            "confirmed_actual_spend": None,
            "spend_estimate_accuracy": None,
        }
        self.cycle_journal.append(entry)
        # Keep last 10 cycles
        if len(self.cycle_journal) > 10:
            self.cycle_journal.pop(0)
        # Attempt to confirm older entries now that more data has arrived
        self._update_confirmations()

    def _update_confirmations(self):
        """
        For any pending cycle entry where confirmed data has now arrived
        (i.e., cycle.day + data_lag_days <= current_day), compute accuracy.
        """
        current_day = self._state["simulated_day"]
        current_confirmed_spend = self._state["pacing"]["actual_spend"]
        for entry in self.cycle_journal:
            if entry["confirmation_status"] != "pending":
                continue
            days_since_cycle = current_day - entry["day"]
            if days_since_cycle >= self.data_lag_days:
                entry["confirmation_status"] = "confirmed"
                entry["confirmed_actual_spend"] = round(current_confirmed_spend, 2)
                if entry["estimated_mtd_spend"] > 0:
                    accuracy = 1 - abs(current_confirmed_spend - entry["estimated_mtd_spend"]) / max(current_confirmed_spend, 1)
                    entry["spend_estimate_accuracy"] = round(max(0.0, accuracy), 4)

    def project_spend_through_lag(self) -> dict:
        """
        Estimate current MTD spend by projecting through the data lag.
        Uses each campaign's confirmed daily budget × historical utilization rate × lag_days.
        Returns estimated spend and a confidence score.
        """
        s = self._state
        confirmed_mtd = s["pacing"]["actual_spend"]

        # Compute utilization rate per campaign from recent history
        utilization_rates = {}
        for snap in self.history[-8:]:  # last 8 hourly snapshots
            for cid, ch in snap["campaigns"].items():
                if ch["daily_budget"] > 0:
                    rate = ch["today_spend"] / ch["daily_budget"]
                    if cid not in utilization_rates:
                        utilization_rates[cid] = []
                    utilization_rates[cid].append(rate)

        # Project each active campaign through the lag
        projected_lag_spend = 0.0
        campaign_projections = {}
        for cid, c in s["campaigns"].items():
            if c["status"] != "active":
                continue
            rates = utilization_rates.get(cid, [0.85])  # default 85% if no history
            avg_util = sum(rates) / len(rates)
            projected_daily = c["daily_budget"] * avg_util
            lag_spend = projected_daily * self.data_lag_days
            projected_lag_spend += lag_spend
            campaign_projections[cid] = {
                "avg_utilization": round(avg_util, 3),
                "projected_daily": round(projected_daily, 2),
                "projected_lag_contribution": round(lag_spend, 2),
            }

        estimated_mtd = confirmed_mtd + projected_lag_spend

        # Confidence based on utilization rate variance across history
        all_rates = [r for rates in utilization_rates.values() for r in rates]
        if len(all_rates) >= 4:
            mean = sum(all_rates) / len(all_rates)
            variance = sum((r - mean) ** 2 for r in all_rates) / len(all_rates)
            confidence = max(0.5, 1.0 - (variance ** 0.5) * 3)
        else:
            confidence = 0.65  # low history = medium-low confidence

        # Accuracy calibration from past confirmed cycles
        confirmed_entries = [e for e in self.cycle_journal if e["spend_estimate_accuracy"] is not None]
        if confirmed_entries:
            avg_accuracy = sum(e["spend_estimate_accuracy"] for e in confirmed_entries[-3:]) / len(confirmed_entries[-3:])
            calibration_factor = avg_accuracy
        else:
            calibration_factor = 1.0

        return {
            "confirmed_mtd_spend": round(confirmed_mtd, 2),
            "projected_lag_spend": round(projected_lag_spend, 2),
            "estimated_mtd_spend": round(estimated_mtd, 2),
            "confidence": round(confidence, 3),
            "calibration_factor": round(calibration_factor, 3),
            "campaign_projections": campaign_projections,
        }

    def get_cycle_journal(self) -> list[dict]:
        return self.cycle_journal

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_initial_state(self) -> dict:
        meta = self._spend_raw["report_meta"]
        mtd = self._spend_raw["month_to_date"]

        campaigns = {}
        spend_by_id = {c["id"]: c for c in self._spend_raw["campaigns"]}
        kw_by_id = {c["id"]: c.get("keywords", []) for c in self._campaigns_raw["campaigns"]}

        for raw_c in self._campaigns_raw["campaigns"]:
            cid = raw_c["id"]
            sp = spend_by_id.get(cid, {})
            campaigns[cid] = {
                "id": cid,
                "name": raw_c["name"],
                "type": raw_c["type"],
                "targeting": raw_c["targeting"],
                "quantum_state": raw_c["quantum_state"],
                "status": raw_c["status"],
                "funnel_weight": raw_c["funnel_weight"],
                "daily_budget": raw_c["daily_budget"],
                "keywords": copy.deepcopy(kw_by_id.get(cid, [])),
                "today_spend": sp.get("today_spend", 0),
                "mtd_spend": sp.get("mtd_spend", 0),
                "impressions_mtd": sp.get("impressions_mtd", 0),
                "clicks_mtd": sp.get("clicks_mtd", 0),
                "orders_mtd": sp.get("orders_mtd", 0),
                "revenue_mtd": sp.get("revenue_mtd", 0),
                "ctr": sp.get("ctr", 0.005),
                "cpc": sp.get("cpc", 1.0),
                "roas": sp.get("roas", 0.5),
                "ntb_rate": sp.get("ntb_rate", 0.5),
                "ntb_orders": sp.get("ntb_orders", 0),
                "acos": sp.get("acos", 1.0),
                "last_week_revenue": sp.get("last_week_revenue", 0),
                "revenue_share": sp.get("revenue_share", 0),
            }

        pacing_index = calculate_pacing_index(mtd["total_spend"], mtd["expected_spend"])
        status = get_pacing_status(pacing_index)

        return {
            "simulated_day": meta["simulated_current_day"],
            "simulated_hour": meta["simulated_current_hour"],
            "monthly_budget": meta["monthly_budget"],
            "days_in_month": meta["days_in_month"],
            "campaigns": campaigns,
            "pacing": {
                "actual_spend": mtd["total_spend"],
                "expected_spend": mtd["expected_spend"],
                "pacing_index": pacing_index,
                "status": status.label,
                "severity": status.severity,
                "direction": status.direction,
                "remaining_budget": mtd["remaining_budget"],
                "days_remaining": mtd["days_remaining"],
                "required_daily_rate": mtd["required_daily_rate"],
                "current_daily_rate": mtd["current_daily_rate"],
            },
        }

    def _enrich_campaigns(self, campaigns: dict) -> list[dict]:
        result = []
        for c in campaigns.values():
            intent_center = calculate_intent_center(c["ntb_rate"], c["roas"], c["ctr"])
            result.append({**c, "intent_center": intent_center})
        return calculate_hdcp_score(result)

    def _recalculate_pacing(self):
        s = self._state
        actual = sum(c["mtd_spend"] for c in s["campaigns"].values())
        days_elapsed = s["simulated_day"]
        expected = s["monthly_budget"] * (days_elapsed / s["days_in_month"])
        days_remaining = s["days_in_month"] - s["simulated_day"]
        remaining = s["monthly_budget"] - actual
        required_daily = remaining / days_remaining if days_remaining > 0 else 0
        current_daily = sum(c["today_spend"] for c in s["campaigns"].values())

        pacing_index = calculate_pacing_index(actual, expected)
        status = get_pacing_status(pacing_index)

        # Update consecutive drift counters
        if status.direction == "under":
            self.consecutive_underpacing += 1
            self.consecutive_overpacing = 0
        elif status.direction == "over":
            self.consecutive_overpacing += 1
            self.consecutive_underpacing = 0
        else:
            self.consecutive_underpacing = 0
            self.consecutive_overpacing = 0

        # Projected EOMonth spend at current daily run rate
        projected_eom = actual + (current_daily * days_remaining)

        s["pacing"].update({
            "actual_spend": actual,
            "expected_spend": expected,
            "pacing_index": pacing_index,
            "status": status.label,
            "severity": status.severity,
            "direction": status.direction,
            "remaining_budget": remaining,
            "days_remaining": days_remaining,
            "required_daily_rate": required_daily,
            "current_daily_rate": current_daily,
            "recovery_multiplier": round(required_daily / current_daily, 3) if current_daily > 0 else 1.0,
            "projected_eom_spend": round(projected_eom, 2),
            "consecutive_underpacing": self.consecutive_underpacing,
            "consecutive_overpacing": self.consecutive_overpacing,
        })

    # ------------------------------------------------------------------
    # Tool implementations
    # ------------------------------------------------------------------

    def _update_bid(self, params: dict) -> dict:
        cid = params["campaign_id"]
        kw_target = params["keyword"]
        new_bid = round(params["new_bid"], 2)

        if cid not in self._state["campaigns"]:
            return {"success": False, "error": f"Campaign {cid} not found"}

        campaign = self._state["campaigns"][cid]
        for kw in campaign.get("keywords", []):
            if kw["kw"] == kw_target:
                if kw["daily_changes"] >= MAX_BID_CHANGES_PER_DAY:
                    return {"success": False, "error": "Max 2 bid changes per keyword per day"}

                old_bid = kw["bid"]
                max_new = round(old_bid * (1 + BID_MAX_CHANGE), 2)
                min_new = round(old_bid * (1 - BID_MAX_CHANGE), 2)
                new_bid = max(BID_MIN, min(BID_MAX, max(min_new, min(max_new, new_bid))))

                kw["bid"] = new_bid
                kw["daily_changes"] += 1

                log = {
                    "tool": "update_bid",
                    "campaign": cid,
                    "keyword": kw_target,
                    "old_bid": old_bid,
                    "new_bid": new_bid,
                    "reasoning": params.get("reasoning", ""),
                }
                self.action_log.append(log)
                return {"success": True, "old_bid": old_bid, "new_bid": new_bid}

        return {"success": False, "error": f"Keyword '{kw_target}' not found in {cid}"}

    def _update_daily_budget(self, params: dict) -> dict:
        cid = params["campaign_id"]
        new_budget = round(params["new_daily_budget"], 2)

        if cid not in self._state["campaigns"]:
            return {"success": False, "error": f"Campaign {cid} not found"}

        campaign = self._state["campaigns"][cid]
        old_budget = campaign["daily_budget"]
        max_new = round(old_budget * (1 + BUDGET_MAX_CHANGE), 2)
        min_new = max(BUDGET_MIN, round(old_budget * (1 - BUDGET_MAX_CHANGE), 2))
        new_budget = max(min_new, min(max_new, new_budget))

        campaign["daily_budget"] = new_budget
        log = {
            "tool": "update_daily_budget",
            "campaign": cid,
            "old_budget": old_budget,
            "new_budget": new_budget,
            "reasoning": params.get("reasoning", ""),
        }
        self.action_log.append(log)
        return {"success": True, "old_budget": old_budget, "new_budget": new_budget}

    def _pause_campaign(self, params: dict) -> dict:
        cid = params["campaign_id"]
        if cid not in self._state["campaigns"]:
            return {"success": False, "error": f"Campaign {cid} not found"}

        campaign = self._state["campaigns"][cid]
        if campaign["revenue_share"] > 0.50:
            return {
                "success": False,
                "error": f"Guardrail violated: {cid} drives {campaign['revenue_share']*100:.0f}% of revenue (>50%)",
            }

        campaign["status"] = "paused"
        log = {"tool": "pause_campaign", "campaign": cid, "reasoning": params.get("reasoning", "")}
        self.action_log.append(log)
        return {"success": True, "message": f"{cid} paused"}

    def _shift_funnel_budget(self, params: dict) -> dict:
        direction = params["direction"]
        magnitude = max(0.0, min(1.0, params.get("magnitude", 0.5)))

        adjustments = []
        for cid, c in self._state["campaigns"].items():
            if c["status"] != "active":
                continue
            ctype = c["type"]
            old = c["daily_budget"]

            if direction == "upper_funnel":
                if ctype in ("SBV", "SD"):
                    factor = 1 + 0.20 * magnitude
                elif ctype == "SB":
                    factor = 1.0
                else:
                    factor = 1 - 0.15 * magnitude
            elif direction == "lower_funnel":
                if ctype == "SP":
                    factor = 1 + 0.20 * magnitude
                elif ctype == "SB":
                    factor = 1.0
                else:
                    factor = 1 - 0.15 * magnitude
            else:
                factor = 1.0

            new_budget = max(BUDGET_MIN, round(old * factor, 2))
            c["daily_budget"] = new_budget
            adjustments.append({"campaign": cid, "old": old, "new": new_budget})

        log = {
            "tool": "shift_funnel_budget",
            "direction": direction,
            "magnitude": magnitude,
            "adjustments": adjustments,
            "reasoning": params.get("reasoning", ""),
        }
        self.action_log.append(log)
        return {"success": True, "adjustments": adjustments}

    def _set_pacing_target(self, params: dict) -> dict:
        """
        Portfolio-level pacing lever. Scales all active campaign daily budgets
        proportionally to hit the target daily run rate. Bypasses per-campaign
        ±30% cap — this is the emergency recovery tool for persistent drift.
        Guardrails: no campaign below $50, max 2× any campaign's current budget.
        """
        target_rate = params.get("target_daily_rate", 0)
        if target_rate <= 0:
            return {"success": False, "error": "target_daily_rate must be positive"}

        active = [(cid, c) for cid, c in self._state["campaigns"].items() if c["status"] == "active"]
        if not active:
            return {"success": False, "error": "No active campaigns to adjust"}

        current_total = sum(c["daily_budget"] for _, c in active)
        if current_total == 0:
            return {"success": False, "error": "Total active budget is zero"}

        # Scale factor to hit the target, capped at 2× portfolio budget
        scale = min(target_rate / current_total, 2.0)

        adjustments = []
        for cid, c in active:
            old = c["daily_budget"]
            new_budget = max(BUDGET_MIN, round(old * scale, 2))
            c["daily_budget"] = new_budget
            adjustments.append({"campaign": cid, "old": old, "new": new_budget})

        actual_new_rate = sum(a["new"] for a in adjustments)
        log = {
            "tool": "set_pacing_target",
            "target_daily_rate": target_rate,
            "scale_applied": round(scale, 4),
            "old_portfolio_budget": round(current_total, 2),
            "new_portfolio_budget": round(actual_new_rate, 2),
            "adjustments": adjustments,
            "reasoning": params.get("reasoning", ""),
        }
        self.action_log.append(log)
        return {
            "success": True,
            "scale_applied": round(scale, 4),
            "old_daily_rate": round(current_total, 2),
            "new_daily_rate": round(actual_new_rate, 2),
            "adjustments": adjustments,
        }
