---
name: video-creative
description: "Generate short product and marketing video clips from chat (OpenAI Sora)."
version: "1.0.0"
metadata:
  crossborder:
    emoji: "🎬"
    category: gateway
    tools:
      - generate_video
---

# Video creative

Use when the operator asks to **create**, **generate**, or **render a video clip**
(product demo, lifestyle reel, ad bumper, unboxing motion, etc.).

## Workflow

1. Confirm subject, camera motion, and duration if the prompt is vague.
2. Call `generate_video` with a **detailed English prompt** (scene, lighting, motion, mood).
3. Video jobs can take 1–3 minutes — wait for tool `ok: true` before replying.
4. Report saved panel URL(s) from `result.videos` — do not invent links.
5. For Telegram, the bot sends the MP4 automatically after your text reply.

## Parameters

| Field | Guidance |
|-------|----------|
| `size` | `1280x720` landscape · `720x1280` vertical (Reels/TikTok) |
| `seconds` | `4`, `8`, or `12` — prefer `8` for product demos |

## Tips

- Describe **camera** (tracking shot, close-up, slow pan) and **motion** explicitly.
- Keep marketplace-safe — no counterfeit branding or misleading claims.
- Requires OpenAI Sora access on the Agent LLM API key (`sora-2` or `sora-2-pro`).

## Ground truth

- Call `generate_video` before saying a video was created.
- Share only URLs from `result.videos[].url` in this turn.
- Quote tool errors verbatim if the job fails or times out.
