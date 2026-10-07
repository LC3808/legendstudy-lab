"""Local visual QA for /pricing/ and /payments/checkout/.

Serves the static export and captures the evidence the Owner asked for: the
product cards at each breakpoint, the initial button state, the first-click
transition, horizontal overflow, and 200% text reflow.
"""

import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
SHOTS = ROOT / "qa-shots"
BASE = "http://127.0.0.1:8099"

WIDTHS = [1440, 1024, 768, 390, 360]
report = {"overflow": {}, "initial": {}, "firstClick": {}, "zoom200": {}}


def overflow(page):
    return page.evaluate(
        "() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)"
        " - document.documentElement.clientWidth"
    )


def card_state(page):
    return page.evaluate(
        """() => [...document.querySelectorAll('.plan-card')].map((c) => ({
            name: c.querySelector('.plan-card__name')?.textContent,
            selected: c.getAttribute('data-selected'),
            badge: !!c.querySelector('.plan-card__badge'),
            control: c.querySelector('.plan-card__button')?.textContent,
            disabled: c.querySelector('.plan-card__button')?.disabled ?? null,
            tag: c.querySelector('.plan-card__button')?.tagName,
            borderColor: getComputedStyle(c).borderColor,
            borderWidth: getComputedStyle(c).borderTopWidth,
            shadow: getComputedStyle(c).boxShadow,
        }))"""
    )


with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in WIDTHS:
        ctx = browser.new_context(viewport={"width": width, "height": 1000}, device_scale_factor=2)
        page = ctx.new_page()
        page.goto(f"{BASE}/pricing/", wait_until="networkidle")
        page.wait_for_timeout(400)
        report["overflow"][f"pricing-{width}"] = overflow(page)
        if width == 1440:
            report["initial"]["pricing-1440"] = card_state(page)
            # hero line count: the Owner wants the sentence unbroken on desktop
            report["initial"]["heroLines"] = page.evaluate(
                """() => {
                    const el = document.querySelector('.policy-page__lead');
                    const cs = getComputedStyle(el);
                    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.8;
                    return { lines: Math.round(el.getBoundingClientRect().height / lh),
                             width: el.getBoundingClientRect().width,
                             serviceColor: getComputedStyle(el.querySelector('strong')).color,
                             serviceWeight: getComputedStyle(el.querySelector('strong')).fontWeight };
                }"""
            )
            # first click on the 1 Credit pack must select it immediately
            page.click(".plan-card:nth-child(1) .plan-card__button")
            page.wait_for_timeout(200)
            report["firstClick"]["after-one-click"] = card_state(page)
            page.reload(wait_until="networkidle")
            page.wait_for_timeout(300)
        page.screenshot(path=str(SHOTS / f"pricing-{width}.png"), full_page=True)
        page.locator(".pricing-page .pricing-plans").screenshot(path=str(SHOTS / f"cards-{width}.png"))
        # 200% text reflow
        page2 = ctx.new_page()
        page2.goto(f"{BASE}/pricing/", wait_until="networkidle")
        page2.add_style_tag(content="html { font-size: 32px; }")
        page2.wait_for_timeout(300)
        report["zoom200"][f"pricing-{width}"] = overflow(page2)
        if width in (1440, 390):
            page2.screenshot(path=str(SHOTS / f"pricing-{width}-200pct.png"), full_page=True)
        ctx.close()

    for width in (1440, 390):
        ctx = browser.new_context(viewport={"width": width, "height": 1000}, device_scale_factor=2)
        page = ctx.new_page()
        page.goto(f"{BASE}/payments/checkout/?sku=5c", wait_until="networkidle")
        page.wait_for_timeout(500)
        report["overflow"][f"checkout-{width}"] = overflow(page)
        if width == 1440:
            report["initial"]["checkout-1440"] = card_state(page)
        page.screenshot(path=str(SHOTS / f"checkout-{width}.png"), full_page=True)
        ctx.close()

    browser.close()

SHOTS.mkdir(exist_ok=True)
(SHOTS / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=1))
sys.exit(0)