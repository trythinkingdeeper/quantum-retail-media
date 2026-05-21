from dataclasses import dataclass
import numpy as np


MAX_ROAS = 5.0
MAX_CTR = 0.015
ROAS_GOAL = 4.50  # Walmart base ROAS target

# Intent anchor per campaign — where each campaign type sits on the 0–1 intent spectrum
CAMPAIGN_INTENT_ANCHORS: dict[str, float] = {
    "SP-001": 0.78,   # exact match SP → high intent
    "SP-002": 0.65,   # auto SP → mid-high intent
    "SB-001": 0.45,   # broad SB → consideration
    "SD-001": 0.28,   # display in-market → low intent
    "SBV-001": 0.18,  # video awareness → upper funnel
}


@dataclass
class PacingStatus:
    index: float
    label: str
    severity: str   # critical | moderate | healthy
    direction: str  # under | over | on_track


def calculate_pacing_index(actual_spend: float, expected_spend: float) -> float:
    if expected_spend == 0:
        return 1.0
    return actual_spend / expected_spend


def get_pacing_status(index: float) -> PacingStatus:
    if index < 0.90:
        return PacingStatus(index, "Critical Underpacing", "critical", "under")
    elif index < 0.96:
        return PacingStatus(index, "Moderate Underpacing", "moderate", "under")
    elif index <= 1.04:
        return PacingStatus(index, "On Track", "healthy", "on_track")
    elif index <= 1.10:
        return PacingStatus(index, "Moderate Overpacing", "moderate", "over")
    else:
        return PacingStatus(index, "Critical Overpacing", "critical", "over")


def calculate_intent_center(ntb_rate: float, roas: float, ctr: float = 0) -> float:
    """HDCP-aligned: NTB% drives acquisition (left), ROAS drives efficiency (right)."""
    center = 0.60 * (1 - ntb_rate) + 0.40 * min(roas / ROAS_GOAL, 1.0)
    return max(0.0, min(1.0, center))


def gaussian_wave(
    x: np.ndarray, center: float, sigma: float, scale: float
) -> np.ndarray:
    return scale * np.exp(-0.5 * ((x - center) / sigma) ** 2)


# Base sigma by type — efficiency will narrow this further
SIGMA_BASE = {
    "SBV": 0.14,
    "SD":  0.13,
    "SB":  0.11,
    "SP":  0.10,
}

SIGMA_BASE_BY_ID = {
    "SP-001": 0.09,  # exact match starts narrower
}


def get_sigma(campaign_id: str, campaign_type: str, roas: float = 1.0) -> float:
    """Sigma narrows with efficiency — high ROAS = tight, precise wave."""
    base = SIGMA_BASE_BY_ID.get(campaign_id, SIGMA_BASE.get(campaign_type, 0.11))
    # ROAS above 1.0 tightens the wave; below 1.0 widens it
    # Clamp ROAS effect between 0.6x and 1.4x of base sigma
    efficiency_factor = max(0.6, min(1.4, 1.0 / max(roas, 0.1)))
    return round(base * efficiency_factor, 4)


def get_incrementality_opacity(ntb_rate: float) -> float:
    """Opacity 0.25–1.0 driven by NTB rate — high NTB = vivid/incremental."""
    return round(max(0.25, min(1.0, 0.25 + ntb_rate * 0.75)), 3)


def calculate_hdcp_score(campaigns: list[dict], roas_goal: float = ROAS_GOAL) -> list[dict]:
    """
    V1 HDCP Score per campaign:
      Score = (NTB% × 0.60) + ((ROAS ÷ Goal) × 100 × 0.30) + (Spend Score × 0.10)
      Spend Score = MIN((mtd_spend ÷ avg_mtd_spend) × 100, 100)
    """
    spends = [c.get("mtd_spend", 0) for c in campaigns]
    avg_spend = sum(spends) / len(spends) if spends else 1.0
    if avg_spend == 0:
        avg_spend = 1.0

    green_light_roas = roas_goal * 1.5
    ntb_threshold = 0.25  # balanced mode

    scored = []
    for c in campaigns:
        ntb_pct   = c.get("ntb_rate", 0) * 100
        roas      = c.get("roas", 0)
        mtd_spend = c.get("mtd_spend", 0)

        roas_index   = (roas / roas_goal) * 100
        spend_score  = min((mtd_spend / avg_spend) * 100, 100)
        hdcp_score   = round((ntb_pct * 0.60) + (roas_index * 0.30) + (spend_score * 0.10), 1)

        if roas > green_light_roas and c.get("ntb_rate", 0) >= ntb_threshold:
            signal = "green_light"
        elif roas > green_light_roas:
            signal = "caution"
        else:
            signal = ""

        scored.append({**c, "hdcp_score": hdcp_score, "hdcp_signal": signal})

    return scored


def build_gmv_wave_data(items: list[dict]) -> dict:
    """
    GMV wave: each item's Gaussian height = YoY growth rate (current/prior), capped at 1.5.
    Intent center derived from weighted campaign spend distribution.
    This shows WHERE on the intent spectrum GMV growth is happening — not where spend is going.
    """
    N = 200
    xs = np.linspace(0, 1, N)
    combined = np.zeros(N)
    item_waves = []

    for item in items:
        spend = item.get("campaign_spend", {})
        total_spend = sum(spend.values())
        if total_spend == 0:
            continue

        intent_center = sum(
            CAMPAIGN_INTENT_ANCHORS.get(cid, 0.5) * s for cid, s in spend.items()
        ) / total_spend

        prior = max(item.get("gmv_prior", 1), 1)
        growth = min(item.get("gmv_current", 0) / prior, 1.5)

        ys = gaussian_wave(xs, intent_center, 0.09, growth)
        combined += ys
        item_waves.append({
            "id": item["id"],
            "name": item["name"],
            "intent_center": round(intent_center, 3),
            "growth_rate": round(growth, 3),
            "gmv_current": item["gmv_current"],
            "gmv_prior": item["gmv_prior"],
            "points": ys.tolist(),
        })

    peak = combined.max()
    norm = peak if peak > 0 else 1.0
    for w in item_waves:
        w["points"] = [v / norm for v in w["points"]]
    combined_norm = (combined / norm).tolist() if peak > 0 else combined.tolist()

    return {
        "xs": xs.tolist(),
        "items": item_waves,
        "combined": combined_norm,
    }


def build_waveform_data(campaigns: list[dict]) -> dict:
    N = 200
    xs = np.linspace(0, 1, N)

    max_spend = max((c["today_spend"] for c in campaigns), default=1.0)
    if max_spend == 0:
        max_spend = 1.0

    individual = []
    combined = np.zeros(N)

    for c in campaigns:
        roas = c.get("roas", 1.0)
        ntb_rate = c.get("ntb_rate", 0.5)
        sigma = get_sigma(c["id"], c["type"], roas)
        opacity = get_incrementality_opacity(ntb_rate)
        scale = c["today_spend"] / max_spend
        ys = gaussian_wave(xs, c["intent_center"], sigma, scale)
        # Combined wave uses opacity-weighted contribution
        combined += ys * opacity
        individual.append({
            "id": c["id"],
            "type": c["type"],
            "name": c["name"],
            "intent_center": c["intent_center"],
            "sigma": sigma,
            "scale": scale,
            "opacity": opacity,
            "roas": round(roas, 3),
            "ntb_rate": round(ntb_rate, 3),
            "points": ys.tolist(),
        })

    peak = combined.max()
    combined_norm = (combined / peak).tolist() if peak > 0 else combined.tolist()

    return {
        "xs": xs.tolist(),
        "individual": individual,
        "combined": combined_norm,
    }
