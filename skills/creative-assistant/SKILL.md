---
name: creative-assistant
description: "Generate product mockups, listing visuals, and marketing images from chat."
version: "1.0.0"
metadata:
  crossborder:
    emoji: "🎨"
    category: gateway
    tools:
      - generate_image
---

# Creative assistant

Use when the operator asks to **create**, **draw**, **design**, or **generate an image**
(product mockup, lifestyle photo, logo concept, ad banner, etc.).

## Workflow

1. Confirm the subject and style in one line if the prompt is vague.
2. Call `generate_image` with a **detailed English prompt** (lighting, background, product placement).
3. Report the saved panel URL(s) from tool `result.images` — do not invent image links.
4. For Telegram, the bot sends the image automatically after your text reply.

## Tips

- Prefer square `1024x1024` for catalog thumbnails; `1792x1024` for banners.
- Use `quality: hd` for hero images when using dall-e-3.
- Keep prompts safe for marketplace use — no counterfeit branding or misleading claims.

## Ground truth

- Call `generate_image` before saying an image was created.
- Share only URLs returned in `result.images[].url` in this turn.
