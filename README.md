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

Open the storefront and paste the complete Web SDK collector URL from Meiro
Pipes into the **SDK** settings, including the scheme, host, and source slug.
The settings dialog opens automatically when no collector is saved.

The collector and optional SDK features are stored in browser storage. Each
browser can therefore connect to a different Pipes instance without rebuilding
or redeploying the app. Applying settings reloads the page because the SDK
fixes its configuration on the first `createMpt` call. Clear the collector URL
to return that browser to local-preview mode.

If you do not have a collector yet, the dialog links to
[Meiro Pipes](https://meiro.io/product/meiro-pipes/), where you can choose
**Launch full trial**.

The storefront creates one browser client with
[`@meiroio/web-sdk`](https://www.npmjs.com/package/@meiroio/web-sdk).
Core event collection is always loaded. Use the same settings to independently
enable Tracking Rules and Web Banners. The optional entry points are
dynamically imported, so a core-only page does not load either feature
implementation.

Tracking uses `trackingRules()` from `@meiroio/web-sdk/tracking`; automatic link
tracking remains off to avoid duplicating the explicit commerce events. Banners
use `webBanners()` from `@meiroio/web-sdk/web-banners`.

The setup dialog explains that the demo assumes analytics consent, then grants
SDK storage and identity consent so realtime audience targeting works. Marketing
consent is an unchecked subscription checkbox in the lead popup, beside the
email it applies to. Use test data only.

Without a saved collector URL, the inspector is labeled **Local preview**,
personalization is off, and no request is sent.

## Configure Pipes

1. In **Pipes → Sources**, create a source from the **Web SDK** template and
   enable it.
2. Copy its collection URL from **Tracking Setup** into the storefront's
   **SDK** settings.
3. Keep Tracking Rules enabled in the storefront SDK settings. A
   page-view-only rule is enough for this demo:

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
   `select_content`, `search`, `form_submit`, `view_item`, `add_to_cart`,
   `remove_from_cart`, `view_cart`, `begin_checkout`, `purchase`,
   `web_banner_impression`, `web_banner_click`, `web_banner_close`,
   `web_banner_submit`, and `survey_answer`.
5. Browse the store and verify accepted events and `user_id` extraction on the
   source or Dashboard before building an audience.

All storefront events use predefined Web SDK names, so the demo does not need
a custom event type.

## Capture a known profile

The **Leave us your email** form emits the predefined `form_submit` event and
opens the inspector so the identity enrichment is immediately visible. Its
payload maps directly onto the Web SDK form schema:

| Form value | Event field |
| --- | --- |
| Stable form identifier | `form_id: "meiro_market_lead"` |
| Email | `email` |
| First name | `first_name` |
| Shirt size | `field00` |

Configure email extraction on the Web SDK source, then map `first_name` and
`field00` into profile attributes. Those attributes can drive audiences and
the marketing campaigns demonstrated by the product.

The popup emits the normal `web_banner_submit` event with `first_name`, `email`,
`shirt_size`, and the checked `consent` field. It also posts
`email_subscription_imported` to the Better Pipes Email channel endpoint. That
managed event includes the normalized email, the checkbox boolean,
`blocked: false`, the `meiro-market` subscription topic, browser language, and
the submission time. In **Engage -> Channels -> Email**, select and save the
maintained **Email subscription status** attribute so those events populate the
Email campaign contact state. Its `brand_id` field is reserved by Pipes and
currently remains `null`.

## Configure Engage

Start with an untargeted banner to prove delivery before adding audience
conditions.

1. Open **Engage → Channels → Web Banners** and create a banner using the same
   Web SDK source.
2. For an inline banner, choose an ID anchor and enter either
   `hero-personalization` or `catalog-personalization`.
3. For the lead popup after an action, use the click trigger selector
   `[data-mpt-trigger="open-cart"]` or a category selector such as
   `.tabs button`. The HTML calls the storefront consent bridge while the Web
   SDK emits its normal `web_banner_submit` event.
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
  and trigger on a click matching `[data-mpt-trigger="open-cart"]` or
  `.tabs button`.

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
