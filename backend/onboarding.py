import json
from anthropic import AsyncAnthropic
from claude_engine import ONBOARD_MODEL

SYSTEM_PROMPT = """You are the Quantum Retail Media onboarding assistant. Your job is to set up a new client account through a short, friendly conversation.

You need to collect exactly 6 pieces of information, one question at a time:
1. Brand name and product category
2. Which retailer(s) they're advertising on
3. Monthly media budget
4. Product list with approximate selling prices (name + ASP per SKU)
5. Strategic goal: finding new customers (acquisition), maximizing existing customer sales (retention), or a mix of both (balanced)
6. How often a typical customer buys: weekly, monthly, or a few times a year

Rules:
- Ask ONE question at a time. Keep questions brief and conversational.
- After collecting all 6, give a 2-sentence confirmation of what you heard.
- Then immediately output this exact block with no text after it:

<config>
{
  "brand_name": "string",
  "category": "string",
  "category_type": "staple|impulse|seasonal",
  "retailers": ["string"],
  "monthly_budget": 0,
  "skus": [{"name": "string", "asp": 0.0}],
  "strategic_mode": "acquisition|balanced|retention",
  "repurchase_cycle": "weekly|monthly|occasional",
  "ntb_threshold": 0.0,
  "roas_goal": 0.0
}
</config>

Derivation rules (apply silently):
- category_type: weekly household staples = "staple", candy/holiday/seasonal = "seasonal", everything else = "impulse"
- ntb_threshold: weekly = 0.22, monthly = 0.28, occasional = 0.40
- roas_goal base: Walmart = 4.50, Amazon = 3.25, Instacart = 3.75, other = 4.00. Use the first retailer listed.
  Then adjust by avg ASP: if avg ASP < $6 multiply base by 1.30; if avg ASP > $15 multiply by 0.85.
- strategic_mode: "new customers" / "acquisition" → acquisition; "existing" / "retention" → retention; anything else → balanced

Start by introducing yourself in one sentence and asking the first question."""


async def run_onboarding_session(ws, send_fn):
    """
    Runs a full onboarding interview over an open WebSocket.
    Streams Claude responses via send_fn.
    When complete, sends {type: onboard_complete, client_id, name, config}.
    Returns the parsed config dict, or None on error.
    """
    client = AsyncAnthropic()
    messages = []

    # Kick off with a silent trigger so Claude sends the greeting unprompted
    messages.append({"role": "user", "content": "begin"})

    async def stream_turn():
        nonlocal messages
        full_text = ""
        async with client.messages.stream(
            model=ONBOARD_MODEL,
            max_tokens=800,
            system=SYSTEM_PROMPT,
            messages=messages,
        ) as stream:
            async for chunk in stream.text_stream:
                full_text += chunk
                await send_fn({"type": "onboard_chunk", "text": chunk})
        messages.append({"role": "assistant", "content": full_text})
        await send_fn({"type": "onboard_ready"})
        return full_text

    # Initial greeting
    response = await stream_turn()

    # Conversation loop
    while True:
        # Check if config is already present (unlikely on first turn but safe)
        if "<config>" in response and "</config>" in response:
            return _extract_and_finalize(response)

        # Wait for user input
        try:
            raw = await ws.receive_text()
        except Exception:
            return None

        msg = json.loads(raw)
        if msg.get("type") != "onboard_message":
            continue

        messages.append({"role": "user", "content": msg["text"]})
        response = await stream_turn()

        if "<config>" in response and "</config>" in response:
            return _extract_and_finalize(response)


def _extract_and_finalize(text: str) -> dict | None:
    try:
        config_str = text.split("<config>")[1].split("</config>")[0].strip()
        return json.loads(config_str)
    except (json.JSONDecodeError, IndexError):
        return None
