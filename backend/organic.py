import json
from pathlib import Path
from fastapi import APIRouter

router = APIRouter(prefix="/api/organic", tags=["organic"])
DATA_DIR = Path(__file__).parent / "data" / "organic"


def _load(name: str):
    return json.loads((DATA_DIR / name).read_text())


# CTR curve by position (standard industry estimates)
_CTR = {1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.06,
        6: 0.04, 7: 0.03, 8: 0.025, 9: 0.02, 10: 0.018}


def _position_strength(pos: int) -> int:
    if pos == 0:  return 0
    if pos == 1:  return 100
    if pos == 2:  return 95
    if pos == 3:  return 90
    if pos <= 5:  return 80
    if pos <= 10: return 65
    if pos <= 20: return 40
    if pos <= 50: return 15
    return 5


def _ai_readiness(kw: dict) -> int:
    serp = kw.get("serp_features", [])
    score = 0
    if "aio" in serp:       score += 40
    if kw["owns_aio"]:      score += 30
    if "fsn" in serp:       score += 15
    if kw["owns_fsn"]:      score += 15
    if kw["intent"] == 1:   score += 10
    return min(score, 100)


def _serp_ownership(kw: dict) -> int:
    serp = kw.get("serp_features", [])
    score = 0
    if "stl" in serp:   score += 30
    if "kng" in serp:   score += 25
    if kw["owns_fsn"]:  score += 25
    if kw["owns_aio"]:  score += 20
    return min(score, 100)


def _traffic_capture(kw: dict) -> float:
    pos = kw.get("position", 0)
    vol = kw.get("volume", 0)
    ctr = _CTR.get(pos, 0.01 if pos <= 20 else 0.005 if pos <= 50 else 0)
    monthly = ctr * vol
    return min(monthly / 100_000 * 100, 100)


def _calculate_ovs(kw: dict, ar: int, ps: int) -> float:
    so = _serp_ownership(kw)
    tc = _traffic_capture(kw)
    raw = ar * 0.40 + ps * 0.35 + so * 0.15 + tc * 0.10
    return round(raw * 2, 1)


def _ai_exposure(kw: dict) -> float:
    if kw["owns_aio"] and kw["owns_fsn"]: return 1.0
    if kw["owns_aio"]:                    return 0.7
    if "aio" in kw.get("serp_features", []): return 0.3
    return 0.0


def _enrich(kw: dict, max_vol: float) -> dict:
    intent_map = {0: 0.1, 1: 0.4, 2: 0.7, 3: 0.9}
    ps = _position_strength(kw["position"])
    ar = _ai_readiness(kw)
    kd = max(1, kw.get("keyword_difficulty", 50))
    return {
        **kw,
        "ovs":              _calculate_ovs(kw, ar, ps),
        "ai_readiness":     ar,
        "position_strength": ps,
        "ai_exposure":      _ai_exposure(kw),
        "wave_position":    intent_map.get(kw.get("intent", 1), 0.4),
        "wave_width":       round(1.0 / max(1.0, kd / 20.0), 4),
        "wave_amplitude":   round(kw["volume"] / max_vol, 4),
    }


@router.get("/overview")
def get_overview():
    return _load("domain_overview.json")


@router.get("/keywords")
def get_keywords():
    raw = _load("keywords.json")
    max_vol = max(k["volume"] for k in raw) or 1
    return [_enrich(kw, max_vol) for kw in raw]


@router.get("/competitors")
def get_competitors():
    return _load("competitors.json")


@router.get("/history")
def get_history():
    return _load("position_history.json")


@router.get("/audit")
def get_audit():
    return _load("site_audit.json")
