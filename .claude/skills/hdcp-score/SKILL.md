---
name: hdcp-score
description: Use this skill to calculate and interpret HDCP (Holistic Digital Campaign Performance) scores for Walmart Connect campaigns. Triggers on "campaign health", "HDCP", "is this campaign performing", "should I scale spend", "NTB rate", "new-to-brand", "pacing check", "campaign review", or any request to evaluate whether a media campaign is healthy and what to do about it. Also triggers on the Monday weekly review workflow.
---

# HDCP Score — Campaign Health Analysis

HDCP is a composite campaign health metric purpose-built for Walmart Connect. It weights new-to-brand acquisition (NTB%) most heavily because efficient retargeting of existing customers looks great on ROAS but doesn't grow the business. A campaign that converts at 8× ROAS but reaches only existing buyers scores lower than one at 5× ROAS that drives genuine new customer acquisition.

## The formula

```
HDCP Score = (NTB% × 0.60) + ((ROAS ÷ 4.50) × 100 × 0.30) + (Spend Score × 0.10)

Where:
  NTB%        = new-to-brand purchase rate as a percentage (e.g., 32% → use 32)
  ROAS        = return on ad spend (revenue ÷ ad spend)
  ROAS Goal   = 4.50 (Walmart baseline target)
  Spend Score = MIN((mtd_spend ÷ avg_mtd_spend_across_campaigns) × 100, 100)
```

**Score interpretation:**

| Score range | Health | Meaning |
|-------------|--------|---------|
| 70-100 | Strong | Driving real acquisition at efficiency |
| 50-69 | Healthy | Performing, minor optimization opportunity |
| 30-49 | Needs work | Either NTB% is low or ROAS is dragging |
| 0-29 | Critical | Likely retargeting existing buyers with poor efficiency |

## Signals

**Green light** (ROAS > 6.75 AND NTB% ≥ 25%): Campaign is both highly efficient AND acquiring new customers. Scale spend — this is the best signal in the system.

**Caution** (ROAS > 6.75 BUT NTB% < 25%): Efficient but not incremental. The spend is likely converting shoppers who would have bought anyway (high-intent retargeting). Consider shifting budget toward broader match types or awareness formats to reach new buyers.

**Below threshold** (ROAS ≤ 4.50): Campaign is not covering its cost of capital. Investigate targeting, bids, and keyword relevance before scaling.

## Pacing thresholds

Pacing Index = actual_spend ÷ expected_spend (where expected = daily budget × days elapsed)

| Pacing Index | Status | Action |
|-------------|--------|--------|
| < 0.90 | Critical Underpacing | Increase bids or broaden match types; check for disapproved ads |
| 0.90-0.96 | Moderate Underpacing | Monitor; minor bid increase if persistent |
| 0.96-1.04 | On Track | No action needed |
| 1.04-1.10 | Moderate Overpacing | Monitor budget burn; consider daily cap reduction if near budget limit |
| > 1.10 | Critical Overpacing | Reduce daily budget or bids to protect weekly spend target |

## Campaign type context

Different campaign types sit at different points on the intent spectrum. Factor this into your interpretation:

| Campaign type | Intent level | Expected NTB% | ROAS expectation |
|--------------|-------------|---------------|-----------------|
| SP Exact Match | High (0.78) | Lower (high-intent = existing consideration) | Higher (4.5-8×) |
| SP Auto | Mid-high (0.65) | Moderate | Moderate |
| Sponsored Brands | Consideration (0.45) | Higher | Lower |
| Sponsored Display | Low-mid (0.28) | Higher | Lower |
| Sponsored Brand Video | Upper funnel (0.18) | Highest | Lowest |

A low NTB% on Exact Match SP is expected and less concerning than low NTB% on Display, where the whole point is reaching new shoppers.

## For Torres/PBC campaigns at launch

At launch (0-3 months), expect:
- **Low NTB%** initially — the campaign will be reaching Walmart shoppers who are already in the snack category (existing buyers of other brands). This is normal.
- **HDCP scores in the 30-50 range** — acceptable for launch phase, goal is velocity not efficiency
- **TaCoS target 12-15%** — accept lower HDCP to buy reviews and rank

As campaigns mature (3-6 months):
- NTB% should climb as the Torres brand builds awareness on Walmart
- HDCP target: 50+ by month 3, 65+ by month 6
- TaCoS should compress to 8-10% as organic rank reduces paid dependence

## Weekly review output format

```
## Campaign Health Report — [date]

| Campaign | NTB% | ROAS | Pacing | HDCP | Signal | Action |
|----------|------|------|--------|------|--------|--------|
| [name]   | X%   | X.X  | X.XX   | XX   | [status] | [recommendation] |

Portfolio HDCP (weighted avg): XX
Week-over-week trend: [up/flat/down]

Priority actions this week:
1. [Highest impact action]
2. [Second action]
```

## Data needed to run this skill

Ask the user for (or pull via Walmart Connect API if credentials available):
- Campaign name, type (SP/SB/SBV/SD)
- NTB rate (%)
- ROAS
- MTD spend
- Daily budget
- Days elapsed in billing period (for pacing calculation)
