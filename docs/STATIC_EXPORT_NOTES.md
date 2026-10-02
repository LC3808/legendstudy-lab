# Static export notes

## Do not add a route-level `loading.tsx`

`next.config.ts` sets `output: "export"`, so every route is prerendered to static
HTML and a route-level loading boundary has no server-side wait to cover. It only
adds a Suspense boundary around the page.

That boundary becomes harmful once a page grows past React's progressive chunk
size (roughly 12.8 KB of streamed payload). React then flushes the fallback as
the visible `<main>` and moves the real page into a hidden `<div id="S:0">` that
only appears after hydration.

Observed on `/pricing/` while `src/app/loading.tsx` still existed:

```html
<main><!--$?--><template id="B:0"></template>
  <div class="status-page">…<h1>페이지를 준비하고 있습니다.</h1>…</div>
<!--/$--></main>
…
<div hidden id="S:0">…the real pricing page…</div>
```

Consequences: clients without JavaScript, and crawlers that do not execute it,
saw "페이지를 준비하고 있습니다." instead of the pricing page, and a JS chunk
that failed to load would leave a paying user on the placeholder.

`src/app/loading.tsx` has been removed. `scripts/verify-boundaries.mjs` now fails
the build if a `loading.tsx` is reintroduced anywhere under `src/app`.

### Measured threshold

While bisecting the page, `/pricing/` rendered inline with nine of its ten
sections and switched to the fallback as soon as the tenth was added. The page
was therefore sitting just under the limit, and any further content would have
re-triggered the problem silently. Pages smaller than the limit were never
affected, which is why only `/pricing/` showed it.

### Checking for a regression

The condition is only visible in built output, not in source, so check the export
after a build:

```bash
pnpm build
grep -rl '페이지를 준비하고 있습니다' out --include=index.html
```

The command must print nothing.
