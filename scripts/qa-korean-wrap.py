#!/usr/bin/env python3
"""전수 한국어 개행 감사.

한국어 어절(공백으로 나뉜 덩어리)이 줄 중간에서 끊기면 보고한다.
`word-break: keep-all`이 걸려 있어도 `overflow-wrap: anywhere`가 함께 있으면
좁은 컨테이너에서 어절이 음절 단위로 쪼개질 수 있으므로, 실제 렌더링에서
글자별 client rect를 읽어 줄이 바뀌는 지점을 직접 확인한다.

사용: python3 scripts/qa-korean-wrap.py <base-url> [widths...]
"""
import json
import re
import sys
from playwright.sync_api import sync_playwright

PAGES = [
    "/", "/pricing/", "/login/", "/signup/", "/score-analysis/", "/exam-analysis/",
    "/essay-lab/", "/terms/", "/privacy/", "/refund/", "/support/",
    "/lab/coverage/", "/lab/how-it-works/",
]

# 글자별 rect를 읽어 어절이 줄을 넘는지 판정한다.
JS = r"""
() => {
  const HANGUL = /[\u3131-\u318E\uAC00-\uD7A3]/;
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let node;
  while ((node = walker.nextNode())) {
    const text = node.nodeValue;
    if (!text || !HANGUL.test(text) || !text.trim()) continue;
    const el = node.parentElement;
    if (!el || seen.has(el)) continue;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) continue;
    const box = el.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    seen.add(el);

    // 어절 단위로 자른다 (공백 기준). 각 글자의 줄 위치를 모은다.
    const tokens = [];
    let current = { start: -1, end: -1 };
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (/\s/.test(ch)) {
        if (current.start >= 0) { tokens.push(current); current = { start: -1, end: -1 }; }
        continue;
      }
      if (current.start < 0) current.start = i;
      current.end = i + 1;
    }
    if (current.start >= 0) tokens.push(current);

    for (const t of tokens) {
      const raw = text.slice(t.start, t.end);
      if (!HANGUL.test(raw)) continue;
      if (raw.replace(/[^\uAC00-\uD7A3]/g, '').length < 2) continue;
      const lines = [];
      for (let i = t.start; i < t.end; i++) {
        const r = document.createRange();
        r.setStart(node, i);
        r.setEnd(node, i + 1);
        const rect = r.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;
        lines.push(Math.round(rect.top));
      }
      const distinct = [...new Set(lines)];
      if (distinct.length > 1) {
        // 가장 넓은 줄이 그 줄에서 차지한 폭과 컨테이너 폭을 비교해
        // "어절이 컨테이너보다 길어서 어쩔 수 없이 잘린" 경우를 구분한다.
        out.push({
          token: raw,
          lines: distinct.length,
          width: Math.round(box.width),
          cls: (el.className || el.tagName).toString().slice(0, 60),
          tag: el.tagName,
        });
      }
    }
  }
  return out;
}
"""


def audit(base, widths):
    problems = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for width in widths:
            for page in PAGES:
                ctx = browser.new_context(viewport={"width": width, "height": 1200})
                pg = ctx.new_page()
                try:
                    pg.goto(base + page, wait_until="networkidle", timeout=45000)
                    pg.wait_for_timeout(400)
                    found = pg.evaluate(JS)
                except Exception as exc:  # noqa: BLE001
                    found = [{"token": f"<load failed: {exc}>", "lines": 0, "width": 0, "cls": "", "tag": ""}]
                if found:
                    problems.setdefault(width, {})[page] = found
                ctx.close()
        browser.close()
    return problems


if __name__ == "__main__":
    base = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8099"
    widths = [int(x) for x in sys.argv[2:]] or [1440]
    result = audit(base, widths)
    total = 0
    for width in sorted(result):
        print(f"=== {width}px ===")
        for page, items in result[width].items():
            total += len(items)
            print(f"  {page}  ({len(items)})")
            for it in items[:12]:
                print(f"    - 「{it['token']}」 {it['lines']}줄 · w={it['width']} · {it['tag']}.{it['cls']}")
        print()
    print(f"  TOTAL_SPLIT_WORDS={total}")