# Meiro Market

A self-contained commerce demo for the Meiro web SDK. Visitors browse a local
catalog, add products to a cart, and inspect the raw and normalized event
shapes in the live event drawer.

## Run locally

```bash
npm install
npm run dev
```

The catalog, cart, product art, and transformation preview are local. No
Shopify account, database, payment provider, or environment variable is
required for preview mode.

## Connect Meiro Pipes

Set the public collection endpoint in `.env.local`. Use the complete Web SDK
collector URL from Meiro Pipes, including the scheme, host, and path—not only
the instance hostname:

```bash
NEXT_PUBLIC_MEIRO_COLLECTION_ENDPOINT=https://docs.dev.pipes.meiro.io/collect/web-sdk
```

The storefront creates one browser client with
[`@meiroio/web-sdk`](https://www.npmjs.com/package/@meiroio/web-sdk) and calls:

```js
mpt.event("add_to_cart", {
  item_id: "schema-tee",
  item_name: "Schema Tee",
  price: 42,
  currency: "USD",
});
```

Without `NEXT_PUBLIC_MEIRO_COLLECTION_ENDPOINT`, the inspector is labeled
**Local preview** and no network request is made.

The adapter lives in `app/storefront.tsx` in `initMpt()` and `captureEvent()`.
Automatic link tracking and web banners are disabled so only the storefront's
explicit demo events are sent.

## Checks

```bash
npm run lint
npm run build
```
