import asyncio
import os
import traceback
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from anthropic import AsyncAnthropic

load_dotenv()

from simulator import WalmartMockSimulator
from claude_engine import ClaudeEngine, REPORT_MODEL
from onboarding import run_onboarding_session


# ---------------------------------------------------------------------------
# Connection manager (one per client)
# ---------------------------------------------------------------------------

class ConnectionManager:
    def __init__(self):
        self._connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self._connections.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self._connections:
            self._connections.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self._connections:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._connections.remove(ws)


# ---------------------------------------------------------------------------
# Client registry
# ---------------------------------------------------------------------------

class ClientRegistry:
    def __init__(self):
        self._clients: dict[str, dict] = {}
        # Pre-seed the demo client
        demo_sim = WalmartMockSimulator(brand_name="SolarShield Immune+", is_demo=True)
        self._clients["demo"] = {
            "simulator": demo_sim,
            "engine": ClaudeEngine(demo_sim),
            "manager": ConnectionManager(),
            "name": "SolarShield Immune+ (Demo)",
            "is_demo": True,
        }

    def get(self, client_id: str) -> dict | None:
        return self._clients.get(client_id)

    def create(self, config: dict) -> tuple[str, str]:
        """Create a new client from onboarding config. Returns (client_id, display_name)."""
        client_id = str(uuid.uuid4())[:8]
        retailer = config.get("retailers", ["Walmart"])[0]
        display_name = f"{config['brand_name']} ({retailer})"

        mode_to_spectrum = {"acquisition": 1, "balanced": 3, "retention": 5}

        sim = WalmartMockSimulator(brand_name=config["brand_name"], is_demo=False)
        sim._state["monthly_budget"] = float(config.get("monthly_budget", 50000))
        sim.goal_spectrum = mode_to_spectrum.get(config.get("strategic_mode", "balanced"), 3)

        self._clients[client_id] = {
            "simulator": sim,
            "engine": ClaudeEngine(sim),
            "manager": ConnectionManager(),
            "name": display_name,
            "is_demo": False,
            "config": config,
        }
        return client_id, display_name

    def list_clients(self) -> list[dict]:
        return [
            {"id": cid, "name": c["name"], "is_demo": c["is_demo"]}
            for cid, c in self._clients.items()
        ]


registry = ClientRegistry()
scheduler = AsyncIOScheduler()


# ---------------------------------------------------------------------------
# Scheduled pacing cycle — demo only
# ---------------------------------------------------------------------------

async def _safe_run_cycle(client_id: str, **kwargs):
    entry = registry.get(client_id)
    if not entry:
        return
    try:
        await entry["engine"].run_pacing_cycle(**kwargs)
    except Exception as e:
        tb = traceback.format_exc()
        print(f"\n[ERROR] Pacing cycle failed for {client_id}:\n{tb}")
        await entry["manager"].broadcast({"type": "error", "message": str(e)})
        await entry["manager"].broadcast({"type": "state_update", "state": entry["simulator"].get_state()})


async def scheduled_pacing_cycle():
    entry = registry.get("demo")
    if entry:
        await _safe_run_cycle("demo", broadcast=entry["manager"].broadcast)


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(scheduled_pacing_cycle, "interval", hours=1, id="pacing_cycle")
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Quantum Retail Media API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Client management endpoints
# ---------------------------------------------------------------------------

@app.get("/api/clients")
async def list_clients():
    return registry.list_clients()


# ---------------------------------------------------------------------------
# Per-client REST endpoints
# ---------------------------------------------------------------------------

@app.get("/api/{client_id}/state")
async def get_state(client_id: str):
    entry = registry.get(client_id)
    if not entry:
        return {"error": "Client not found"}
    return entry["simulator"].get_state()


@app.post("/api/{client_id}/trigger")
async def trigger_cycle(client_id: str):
    entry = registry.get(client_id)
    if not entry:
        return {"error": "Client not found"}
    asyncio.create_task(_safe_run_cycle(client_id, broadcast=entry["manager"].broadcast))
    return {"status": "triggered"}


class GoalRequest(BaseModel):
    text: str = ""
    slider: int = 3


@app.post("/api/{client_id}/goal")
async def set_goal(client_id: str, body: GoalRequest):
    entry = registry.get(client_id)
    if not entry:
        return {"error": "Client not found"}
    entry["simulator"].goal_spectrum = max(1, min(5, body.slider))
    asyncio.create_task(
        _safe_run_cycle(client_id, goal_text=body.text, broadcast=entry["manager"].broadcast)
    )
    return {"status": "processing", "goal_spectrum": entry["simulator"].goal_spectrum}


class StrategyRequest(BaseModel):
    mode: str  # acquisition | balanced | retention


@app.post("/api/{client_id}/strategy")
async def set_strategy(client_id: str, body: StrategyRequest):
    entry = registry.get(client_id)
    if not entry:
        return {"error": "Client not found"}
    sim = entry["simulator"]
    if sim._is_strategy_locked():
        return {"error": "Strategy locked until end of month"}
    sim.set_strategy(body.mode)
    await entry["manager"].broadcast({"type": "state_update", "state": sim.get_state()})
    return {"status": "ok", "mode": body.mode}


@app.post("/api/{client_id}/advance")
async def advance_time(client_id: str):
    entry = registry.get(client_id)
    if not entry or not entry["is_demo"]:
        return {"error": "Time advance only available for demo clients"}
    entry["simulator"].advance_time()
    await entry["manager"].broadcast({"type": "state_update", "state": entry["simulator"].get_state()})
    return {"status": "advanced"}


@app.post("/api/{client_id}/advance-day")
async def advance_day(client_id: str):
    entry = registry.get(client_id)
    if not entry or not entry["is_demo"]:
        return {"error": "Time advance only available for demo clients"}
    for _ in range(24):
        entry["simulator"].advance_time()
    await entry["manager"].broadcast({"type": "state_update", "state": entry["simulator"].get_state()})
    return {"status": "advanced_day"}


@app.post("/api/{client_id}/reset")
async def reset(client_id: str):
    entry = registry.get(client_id)
    if not entry or not entry["is_demo"]:
        return {"error": "Reset only available for demo clients"}
    new_sim = WalmartMockSimulator(brand_name="SolarShield Immune+", is_demo=True)
    new_engine = ClaudeEngine(new_sim)
    entry["simulator"] = new_sim
    entry["engine"] = new_engine
    await entry["manager"].broadcast({"type": "reset"})
    await entry["manager"].broadcast({"type": "state_update", "state": new_sim.get_state()})
    return {"status": "reset"}


# ---------------------------------------------------------------------------
# Per-client WebSocket
# ---------------------------------------------------------------------------

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(ws: WebSocket, client_id: str):
    entry = registry.get(client_id)
    if not entry:
        await ws.close(code=4004)
        return

    manager = entry["manager"]
    await manager.connect(ws)
    await ws.send_json({"type": "state_update", "state": entry["simulator"].get_state()})

    try:
        while True:
            await ws.receive_text()  # keep-alive ping
    except WebSocketDisconnect:
        manager.disconnect(ws)


# ---------------------------------------------------------------------------
# Report streaming endpoint
# ---------------------------------------------------------------------------

_anthropic = AsyncAnthropic()

REPORT_SYSTEM = """You are a senior retail media strategist writing a client-facing campaign performance report.
Your tone is professional, confident, and clear — like a management consultant presenting to a CMO.
Write in clean markdown with these exact sections:

## Executive Summary
2–3 sentences on the overall health of the account this period. Call out the pacing index and what it means.

## What's Working
Bullet list of 2–4 genuine strengths — specific campaigns, ad types, or metrics with numbers.

## Needs Attention
Bullet list of 2–3 areas requiring action. Be honest but constructive.

## Strategic Opportunities
2–3 forward-looking recommendations tied to the current strategy mode and goal spectrum.

## Campaign Scorecard
A short table: Campaign | Type | ROAS | NTB% | CTR | Budget Utilization | Status

Keep the whole report under 500 words. Use numbers everywhere possible. Do not use buzzwords or filler."""


async def _stream_report(client_id: str, entry: dict):
    sim = entry["simulator"]
    state = sim.get_state()
    history = sim.get_history()
    action_log = sim.action_log[-30:]

    # Build compact campaign context
    campaigns_text = []
    for c in state["campaigns"]:
        budget_util = (c["today_spend"] / c["daily_budget"] * 100) if c["daily_budget"] > 0 else 0
        campaigns_text.append(
            f"- {c['id']} ({c['type']}, {c['targeting']}): ROAS={c['roas']:.2f}x  NTB={c['ntb_rate']*100:.0f}%  "
            f"CTR={c['ctr']*100:.2f}%  Daily budget ${c['daily_budget']:,.0f}  "
            f"Today spend ${c['today_spend']:,.0f} ({budget_util:.0f}%)  HDCP={c.get('hdcp_score',0):.2f}  Status={c['status']}"
        )

    # Recent pacing trend
    pacing_trend = ""
    if len(history) >= 2:
        indices = [h["pacing_index"] for h in history[-8:]]
        trend = "improving" if indices[-1] > indices[0] else "declining" if indices[-1] < indices[0] else "stable"
        pacing_trend = f"Pacing trend over last {len(indices)} snapshots: {trend} ({indices[0]:.3f} → {indices[-1]:.3f})"

    # Recent actions summary
    actions_summary = ""
    if action_log:
        actions_summary = f"Recent optimizations ({len(action_log)} actions):\n" + "\n".join(
            f"  - {a['tool']} on {a.get('campaign_id','?')}: {a.get('result','')}"
            for a in action_log[-10:]
        )

    prompt = f"""Brand: {state['brand_name']}
Report Date: Day {state['simulated_day']} of 30

PACING
- Pacing index: {state['pacing']['pacing_index']:.3f}  ({state['pacing']['status']})
- MTD spend: ${state['pacing']['actual_spend']:,.0f} vs expected ${state['pacing']['expected_spend']:,.0f}
- Remaining budget: ${state['pacing']['remaining_budget']:,.0f}  |  Days left: {state['pacing']['days_remaining']}
- Required daily rate: ${state['pacing']['required_daily_rate']:,.0f}
{pacing_trend}

STRATEGY
- Mode: {state['strategy_mode'].upper()}  |  Goal spectrum: {state['goal_spectrum']}/5
- Strategy locked: {state['strategy_locked']}

CAMPAIGNS
{chr(10).join(campaigns_text)}

{actions_summary}

Write the client report now."""

    async with _anthropic.messages.stream(
        model=REPORT_MODEL,
        max_tokens=1024,
        system=REPORT_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        async for text in stream.text_stream:
            yield text


@app.post("/api/{client_id}/report")
async def generate_report(client_id: str):
    entry = registry.get(client_id)
    if not entry:
        return {"error": "Client not found"}
    return StreamingResponse(
        _stream_report(client_id, entry),
        media_type="text/plain",
        headers={"X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# Onboarding WebSocket
# ---------------------------------------------------------------------------

@app.websocket("/ws/onboard")
async def onboard_endpoint(ws: WebSocket):
    await ws.accept()

    async def send_fn(data: dict):
        try:
            await ws.send_json(data)
        except Exception:
            pass

    try:
        config = await run_onboarding_session(ws, send_fn)
        if config:
            client_id, display_name = registry.create(config)
            await send_fn({
                "type": "onboard_complete",
                "client_id": client_id,
                "name": display_name,
                "config": config,
            })
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await send_fn({"type": "onboard_error", "message": str(e)})
