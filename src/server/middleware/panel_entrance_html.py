"""Minimal HTML fallbacks when the panel SPA cannot load (entrance / server errors)."""

from __future__ import annotations

import html

from starlette.requests import Request
from starlette.responses import HTMLResponse, JSONResponse, Response

_LOTTIE_PLAYER = "https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js"


def wants_panel_html(request: Request) -> bool:
    accept = (request.headers.get("accept") or "").lower()
    if "text/html" in accept:
        return True
    # Browsers navigating to a URL typically send */* without preferring JSON.
    return "*/*" in accept and "application/json" not in accept


def is_panel_ui_path(path: str) -> bool:
    """True for /ui/* and security-entrance paths like /{entry}/ui/*."""
    return path == "/ui" or path.startswith("/ui/") or "/ui/" in path or path.endswith("/ui")


def _lottie_src(_entry_prefix: str) -> str:
    """Lottie is served like /ui/assets/ — no entrance prefix on the URL."""
    return html.escape("/ui/lottie/server-error.json", quote=True)


def panel_entrance_html(
    *,
    title: str,
    message: str,
    entry_prefix: str = "",
) -> str:
    safe_title = html.escape(title)
    safe_message = html.escape(message)
    lottie_src = _lottie_src(entry_prefix)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{safe_title} — Cross-Border</title>
  <style>
    :root {{ color-scheme: dark; }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0; min-height: 100dvh; display: flex; align-items: center; justify-content: center;
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
      background: #0a0a0b; color: #e8e8ea; padding: 24px;
    }}
    .card {{
      max-width: 420px; width: 100%; text-align: center;
      border: 1px solid #2a2a2e; border-radius: 12px; padding: 28px 24px 32px; background: #141416;
    }}
    #panel-error-lottie {{
      width: min(280px, 72vw); height: min(280px, 72vw); margin: 0 auto 8px;
    }}
    h1 {{ margin: 0 0 12px; font-size: 1.35rem; font-weight: 600; }}
    p {{ margin: 0; font-size: 0.9rem; line-height: 1.55; color: #a1a1aa; }}
  </style>
</head>
<body>
  <div class="card">
    <div id="panel-error-lottie" role="img" aria-label=""></div>
    <h1>{safe_title}</h1>
    <p>{safe_message}</p>
  </div>
  <script src="{_LOTTIE_PLAYER}" crossorigin="anonymous"></script>
  <script>
    (function () {{
      var el = document.getElementById("panel-error-lottie");
      if (!el || typeof lottie === "undefined") return;
      lottie.loadAnimation({{
        container: el,
        renderer: "svg",
        loop: true,
        autoplay: true,
        path: "{lottie_src}",
      }});
    }})();
  </script>
</body>
</html>"""


_PANEL_NOT_FOUND_MESSAGE = "This page could not be found."


def panel_not_found_response(request: Request, *, entry_prefix: str) -> Response:
    if wants_panel_html(request):
        html = panel_entrance_html(
            title="Page not found",
            message=_PANEL_NOT_FOUND_MESSAGE,
            entry_prefix=entry_prefix,
        )
        return HTMLResponse(html, status_code=404)
    return JSONResponse({"detail": "Not Found"}, status_code=404)


def panel_server_error_response(request: Request, *, entry_prefix: str) -> Response:
    if wants_panel_html(request):
        html = panel_entrance_html(
            title="Server error",
            message="The panel could not handle this request. Check the API log and try again.",
            entry_prefix=entry_prefix,
        )
        return HTMLResponse(html, status_code=500)
    return JSONResponse({"detail": "Internal Server Error"}, status_code=500)
