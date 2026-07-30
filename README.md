# Meiro Market

A self-contained commerce demo for a complete Meiro Web SDK loop. Visitors
browse a local catalog, generate commerce events, receive Engage Web Banners,
complete a simulated purchase, and inspect the explicit storefront events in
the live event drawer.

## Run locally

```bash
npm install
npm run dev
```

The catalog, cart, product art, and transformation preview are local. No
Shopify account, database, or payment provider is required.
The cart is saved in browser storage across reloads and cleared after a
simulated purchase.

## Connect Meiro Pipes

Set the public collection endpoint in `.env.local`. Use the complete Web SDK
collector URL from Meiro Pipes, including the scheme, host, and source slug:

```bash
NEXT_PUBLIC_MEIRO_COLLECTION_ENDPOINT=https://your-pipes-domain/collect/web-sdk
```

Restart or redeploy the app after changing this build-time variable.

The storefront creates one browser client with
[`@meiroio/web-sdk`](https://www.npmjs.com/package/@meiroio/web-sdk).
It enables tracking rules and Web Banners at page load, but leaves automatic
link tracking off to avoid duplicating the explicit commerce events.

The demo grants SDK storage and identity consent so realtime audience targeting
works immediately. A production site must replace this with choices from its
consent-management platform.

Without `NEXT_PUBLIC_MEIRO_COLLECTION_ENDPOINT`, the inspector is labeled
**Local preview**, personalization is off, and no request is sent.

## Configure Pipes

1. In **Pipes → Sources**, create a source from the **Web SDK** template and
   enable it.
2. Copy its collection URL from **Tracking Setup** into
   `NEXT_PUBLIC_MEIRO_COLLECTION_ENDPOINT`.
3. Keep tracking rules enabled. A page-view-only rule is enough for this demo:

   ```js
   function configure(sdk, on, runtime) {
     on.page({}, () => {
       sdk.track("page_view", {
         pathname: runtime.location.pathname,
         title: runtime.title,
       })
     })
   }
   ```

4. Confirm the template's built-in event types include `page_view`,
   `select_content`, `search`, `view_item`, `add_to_cart`,
   `remove_from_cart`, `view_cart`, `begin_checkout`, `purchase`,
   `web_banner_impression`, `web_banner_click`, `web_banner_close`,
   `web_banner_submit`, and `survey_answer`.
5. Browse the store and verify accepted events and `user_id` extraction on the
   source or Dashboard before building an audience.

All storefront events use predefined Web SDK names, so the demo does not need
a custom event type.

## Configure Engage

Start with an untargeted banner to prove delivery before adding audience
conditions.

1. Open **Engage → Channels → Web Banners** and create a banner using the same
   Web SDK source.
2. For an inline banner, choose an ID anchor and enter either
   `hero-personalization` or `catalog-personalization`.
3. For a popup after an action, use the click trigger selector
   `[data-mpt-trigger="add-to-cart"]` or
   `[data-mpt-trigger="complete-purchase"]`.
4. Add a session frequency cap of `1`, preview the banner on the store, save
   it, and enable serving.
5. For targeting, create a realtime attribute from `view_item`,
   `add_to_cart`, or `purchase` events, build a realtime audience from that
   attribute, and add the audience condition to the banner.
6. Create a **Purchase** Goal with the `purchase` event type and `$.value` as
   the numeric value field. Attach it to the banner or realtime audience when
   conversion reporting is needed.

Audience membership is read when Web Banners initialize. Reload the store after
a profile enters a new realtime audience to test the targeted experience.

Ready-to-paste Market-styled HTML:

- [`banners/market-personalization-inline.html`](banners/market-personalization-inline.html):
  use **Inline**, **Full width**, and the `hero-personalization` ID anchor.
- [`banners/market-add-to-cart-popup.html`](banners/market-add-to-cart-popup.html):
  use **Popup**, **Medium**, **Bottom right**, disable the built-in close button,
  and trigger on a click matching `[data-mpt-trigger="add-to-cart"]`.

One per catalog category, each carrying the matching technical drawing. Use
**Inline**, **Full width**, and the `catalog-personalization` ID anchor:

- [`banners/market-category-wear-inline.html`](banners/market-category-wear-inline.html)
- [`banners/market-category-carry-inline.html`](banners/market-category-carry-inline.html)
- [`banners/market-category-desk-inline.html`](banners/market-category-desk-inline.html)
- [`banners/market-category-print-inline.html`](banners/market-category-print-inline.html)

Target each one at a realtime audience built from `view_item` or `add_to_cart`
events carrying that `item_category`, so a visitor who has been browsing Desk
objects sees the Desk banner.

The category banners lay themselves out from the width of the slot they land in
rather than the width of the browser window, using container queries: three
columns above 46rem, plate-beside-stacked-copy down to 26rem, fully stacked
below that. They can go in a sidebar without further work.

Open [`banners/preview.html`](banners/preview.html) over HTTP to check all four
plus both collapse points before pasting anything:

```bash
cd banners && python3 -m http.server 8777
```

Every banner file is standalone, ASCII-only, and free of external fonts, images
and scripts, so nothing depends on the host page beyond a place to sit.

## Stable activation selectors

| Purpose | Selector |
| --- | --- |
| Hero inline banner | `#hero-personalization` |
| Catalog inline banner | `#catalog-personalization` |
| Product view trigger | `[data-mpt-trigger="view-product"]` |
| Add-to-cart trigger | `[data-mpt-trigger="add-to-cart"]` |
| Cart-open trigger | `[data-mpt-trigger="open-cart"]` |
| Checkout trigger | `[data-mpt-trigger="begin-checkout"]` |
| Purchase trigger | `[data-mpt-trigger="complete-purchase"]` |

The in-page inspector records events sent by the storefront adapter. Automatic
tracking-rule and Web Banner lifecycle events are visible in Pipes.

## Checks

```bash
npm run lint
npm run build
```
