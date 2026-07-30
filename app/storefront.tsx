"use client";
/* eslint-disable @next/next/no-img-element -- Tiny static brand SVG. */

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type MouseEvent,
} from "react";
import {
  createMpt,
  type MptClient,
  type MptEventPayload,
} from "@meiroio/web-sdk";
import { TechnicalDrawing } from "./drawings";
import {
  categories,
  currency,
  formatPrice,
  type Category,
  type Product,
} from "@/lib/catalog";

type EventStatus = "preview" | "sending" | "sent" | "error";
type Cart = Record<string, number>;
type MarketEvent = {
  id: string;
  name: string;
  capturedAt: string;
  status: EventStatus;
  raw: Record<string, unknown>;
  normalized: Record<string, unknown>;
};

const configuredEndpoint =
  process.env.NEXT_PUBLIC_MEIRO_COLLECTION_ENDPOINT?.trim();
const collectionEndpoint =
  configuredEndpoint && URL.canParse(configuredEndpoint)
    ? configuredEndpoint
    : null;
const endpointHost = collectionEndpoint
  ? new URL(collectionEndpoint).host
  : null;
const eventTime = new Intl.DateTimeFormat("en-GB", {
  timeStyle: "medium",
});
const cartStorageKey = "meiro-market-cart";
const emptyCartSnapshot = "{}";
const cartSubscribers = new Set<() => void>();

let mpt: MptClient | null = null;
let mptInitFailed = false;
let inMemoryCartSnapshot = emptyCartSnapshot;

function initMpt(): MptClient | null {
  if (mpt || mptInitFailed || !collectionEndpoint) return mpt;
  try {
    mpt = createMpt({
      collectionEndpoint,
      linkTracking: { enabled: false },
      trackingRules: { enabled: true },
      webBanners: { enabled: true },
      consent: {
        storagePersistence: "granted",
        userId: "granted",
        sessionId: "granted",
      },
    });
  } catch (error) {
    mptInitFailed = true;
    console.warn(
      `Meiro SDK: could not initialise — ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
  return mpt;
}

function normalizeEvent(
  name: string,
  payload: MptEventPayload,
  capturedAt: string,
  client: MptClient | null,
) {
  return {
    event_type: `commerce_${name}`,
    occurred_at: capturedAt,
    identity: {
      user_id: client?.get("userId") || "preview-user",
      session_id: client?.get("sessionId") || "preview-session",
    },
    properties: {
      ...payload,
      source: "meiro-market",
      page_path: window.location.pathname,
    },
    profile_signal:
      name === "add_to_cart"
        ? {
            trait: "last_cart_item",
            value: payload.item_name,
          }
        : name === "view_item"
          ? {
              trait: "last_product_viewed",
              value: payload.item_name,
            }
          : {
              trait: "last_commerce_action",
              value: name,
            },
  };
}

function subscribeToCart(onCartChange: () => void) {
  cartSubscribers.add(onCartChange);
  return () => cartSubscribers.delete(onCartChange);
}

function readCartSnapshot() {
  try {
    const storedCart = window.localStorage.getItem(cartStorageKey);
    inMemoryCartSnapshot = storedCart ?? emptyCartSnapshot;
  } catch {
    // Keep the cart functional when browser storage is unavailable.
  }
  return inMemoryCartSnapshot;
}

function readServerCartSnapshot() {
  return emptyCartSnapshot;
}

function parseCart(snapshot: string, products: Product[]): Cart {
  try {
    const storedCart: unknown = JSON.parse(snapshot);
    if (
      !storedCart ||
      typeof storedCart !== "object" ||
      Array.isArray(storedCart)
    ) {
      return {};
    }

    const productIds = new Set(products.map((product) => product.id));
    return Object.fromEntries(
      Object.entries(storedCart).filter(
        ([productId, quantity]) =>
          productIds.has(productId) &&
          typeof quantity === "number" &&
          Number.isSafeInteger(quantity) &&
          quantity > 0,
      ),
    );
  } catch {
    return {};
  }
}

function persistCart(cart: Cart) {
  const snapshot = JSON.stringify(cart);
  inMemoryCartSnapshot = snapshot;
  try {
    window.localStorage.setItem(cartStorageKey, snapshot);
  } catch {
    // The in-memory fallback still preserves cart behavior for this page load.
  }
  cartSubscribers.forEach((onCartChange) => onCartChange());
}

/* Waiting state for an Engage inline slot. Deliberately built from the same
   parts as a real category banner - dashed plate, copy block, action block -
   so the slot reads as "a banner belongs here" rather than as leftover empty
   space, and so the swap to real content is not a jarring change of shape.
   The sweep is the only animation; it is what separates waiting from broken. */
function ActivationPlaceholder({
  label,
  anchor,
}: {
  label: string;
  anchor: string;
}) {
  return (
    <div className="slot-skeleton">
      <span className="slot-skeleton__plate" aria-hidden="true">
        <svg className="slot-skeleton__mark" viewBox="0 0 32 32">
          <path d="M16 4L28 16L16 28L4 16Z" />
        </svg>
      </span>

      {/* Mirrors the banner's lead column: eyebrow, then a two-line headline. */}
      <span className="slot-skeleton__copy">
        <span className="slot-skeleton__label">
          <i aria-hidden="true" />
          {label}
        </span>
        <span
          className="slot-skeleton__bar slot-skeleton__bar--wide"
          aria-hidden="true"
        />
        <span
          className="slot-skeleton__bar slot-skeleton__bar--narrow"
          aria-hidden="true"
        />
        <code>{anchor}</code>
      </span>

      {/* Mirrors the banner's action column: lede, item index, then the CTA. */}
      <span className="slot-skeleton__action">
        <span
          className="slot-skeleton__bar slot-skeleton__bar--wide"
          aria-hidden="true"
        />
        <span
          className="slot-skeleton__bar slot-skeleton__bar--narrow"
          aria-hidden="true"
        />
        <span className="slot-skeleton__cta" aria-hidden="true" />
      </span>
    </div>
  );
}

export default function Storefront({ products }: { products: Product[] }) {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [query, setQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const cartSnapshot = useSyncExternalStore(
    subscribeToCart,
    readCartSnapshot,
    readServerCartSnapshot,
  );
  const cart = parseCart(cartSnapshot, products);
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const productDialogRef = useRef<HTMLDialogElement>(null);
  const cartDialogRef = useRef<HTMLDialogElement>(null);
  const checkoutDialogRef = useRef<HTMLDialogElement>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      activeCategory === "All" || product.category === activeCategory;
    const matchesQuery =
      !normalizedQuery ||
      `${product.name} ${product.category}`
        .toLowerCase()
        .includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });
  const cartItems = products
    .filter((product) => cart[product.id])
    .map((product) => ({
      product,
      quantity: cart[product.id] ?? 0,
    }));

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartValue = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const eventItems = cartItems.map(({ product, quantity }) => ({
    item_id: product.id,
    item_name: product.name,
    item_category: product.category,
    price: product.price,
    quantity,
  }));
  const activeEvent =
    events.find((event) => event.id === activeEventId) ?? events[0];

  useEffect(() => {
    initMpt();
  }, []);

  useEffect(() => {
    const dialog = productDialogRef.current;
    if (selectedProduct && dialog && !dialog.open) {
      dialog.showModal();
      window.requestAnimationFrame(() => {
        dialog.querySelector<HTMLElement>("[data-dialog-primary]")?.focus();
      });
    }
  }, [selectedProduct]);

  function captureEvent(name: string, payload: MptEventPayload) {
    const id = crypto.randomUUID();
    const capturedAt = new Date().toISOString();
    const client = initMpt();
    const nextEvent: MarketEvent = {
      id,
      name,
      capturedAt,
      status: client ? "sending" : "preview",
      raw: {
        method: "mpt.event",
        event_name: name,
        timestamp: capturedAt,
        payload,
      },
      normalized: normalizeEvent(name, payload, capturedAt, client),
    };

    setEvents((current) => [nextEvent, ...current].slice(0, 12));
    setActiveEventId(id);
    setRailOpen(true);

    if (client) {
      void client
        .event(name, payload)
        .then(() => {
          setEvents((current) =>
            current.map((event) =>
              event.id === id ? { ...event, status: "sent" } : event,
            ),
          );
        })
        .catch(() => {
          setEvents((current) =>
            current.map((event) =>
              event.id === id ? { ...event, status: "error" } : event,
            ),
          );
        });
    }
  }

  function openProduct(product: Product) {
    setSelectedProduct(product);
    captureEvent("view_item", {
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price,
      currency,
    });
  }

  function addToCart(product: Product, closeProduct = false) {
    updateCart((current) => ({
      ...current,
      [product.id]: (current[product.id] ?? 0) + 1,
    }));
    setAddedProductId(product.id);
    window.setTimeout(() => setAddedProductId(null), 1200);
    captureEvent("add_to_cart", {
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price,
      currency,
      quantity: 1,
      value: product.price,
    });
    if (closeProduct) productDialogRef.current?.close();
  }

  function removeFromCart(product: Product) {
    updateCart((current) => {
      const next = { ...current };
      delete next[product.id];
      return next;
    });
    captureEvent("remove_from_cart", {
      item_id: product.id,
      item_name: product.name,
      price: product.price,
      currency,
      quantity: cart[product.id],
    });
  }

  function openCart() {
    captureEvent("view_cart", {
      item_count: cartCount,
      value: cartValue,
      currency,
    });
    const dialog = cartDialogRef.current;
    dialog?.showModal();
    window.requestAnimationFrame(() => {
      dialog?.querySelector<HTMLElement>("[data-dialog-primary]")?.focus();
    });
  }

  function beginCheckout() {
    captureEvent("begin_checkout", {
      items: eventItems,
      item_count: cartCount,
      value: cartValue,
      currency,
    });
    cartDialogRef.current?.close();
    setCompletedOrderId(null);
    const dialog = checkoutDialogRef.current;
    dialog?.showModal();
    window.requestAnimationFrame(() => {
      dialog?.querySelector<HTMLElement>("[data-dialog-primary]")?.focus();
    });
  }

  function completePurchase() {
    const transactionId = crypto.randomUUID();
    captureEvent("purchase", {
      transaction_id: transactionId,
      items: eventItems,
      item_count: cartCount,
      value: cartValue,
      currency,
    });
    updateCart(() => ({}));
    setCompletedOrderId(transactionId);
  }

  function updateCart(update: (current: Cart) => Cart) {
    const currentCart = parseCart(readCartSnapshot(), products);
    persistCart(update(currentCart));
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    captureEvent("search", {
      search_term: query || "(empty)",
      result_count: filteredProducts.length,
    });
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) event.currentTarget.close();
  }

  return (
    <div className="shell">
      <header className="chrome">
        <div className="chrome__rail">
          <span className="readout">
            <span
              className="state"
              data-transport={collectionEndpoint ? "live" : "local"}
              aria-hidden="true"
            />
            <b>{collectionEndpoint ? "live" : "local preview"}</b>
          </span>
          <span className="readout">
            collector <b>{endpointHost ?? "—"}</b>
          </span>
          <span className="readout">
            personalization <b>{collectionEndpoint ? "armed" : "off"}</b>
          </span>
          <span className="readout" aria-live="polite">
            events <b>{String(events.length).padStart(3, "0")}</b>
          </span>
          <span className="readout readout--end" aria-live="polite">
            cart <b>{formatPrice(cartValue)}</b>
          </span>
        </div>

        <div className="chrome__bar">
          <a className="wordmark" href="#catalog" aria-label="Meiro Market home">
            <img
              className="lockup"
              src="/icon.svg"
              width="18"
              height="18"
              alt=""
            />
            <span className="wordmark__name">meiro</span>
            <span className="wordmark__tail">Market</span>
          </a>

          <form className="search" role="search" onSubmit={submitSearch}>
            <label className="visually-hidden" htmlFor="product-search">
              Search products
            </label>
            <input
              id="product-search"
              name="q"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="search catalog"
              enterKeyHint="search"
            />
            <button type="submit" aria-label="Run search">
              <span aria-hidden="true">↵</span>
            </button>
          </form>

          <div className="chrome__actions">
            <button
              className="control control--rail"
              type="button"
              onClick={() => setRailOpen((open) => !open)}
              aria-expanded={railOpen}
              aria-controls="event-rail"
            >
              inspect
              <b>{String(events.length).padStart(2, "0")}</b>
            </button>
            <button
              className="control"
              type="button"
              onClick={openCart}
              data-mpt-trigger="open-cart"
              aria-label={`Open cart with ${cartCount} ${
                cartCount === 1 ? "item" : "items"
              }`}
            >
              cart
              <b>{String(cartCount).padStart(2, "0")}</b>
            </button>
          </div>
        </div>
      </header>

      <div className="workbench">
        <main className="catalog" id="catalog">
          <div className="catalog__head">
            <h1>Every tap can shape the next visit.</h1>
            <p>
              Open a product, add it to the cart, run a search. The inspector
              shows what the browser captured while Engage can turn those
              signals into banners, surveys, and audience-based experiences.
            </p>
          </div>

          <div className="activation-fit activation-fit--hero">
          <section
            className="activation-slot"
            id="hero-personalization"
            aria-label="Hero personalization slot"
          >
            <ActivationPlaceholder
              label="Engage inline slot"
              anchor="#hero-personalization"
            />
          </section>
          </div>

          <div className="filter-bar">
            <nav className="tabs" aria-label="Product categories">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={
                    category === activeCategory ? "is-active" : undefined
                  }
                  aria-pressed={category === activeCategory}
                  onClick={() => {
                    setActiveCategory(category);
                    captureEvent("select_content", {
                      content_type: "catalog_category",
                      item_id: category,
                    });
                  }}
                >
                  {category}
                </button>
              ))}
            </nav>
            <span className="tally" aria-live="polite">
              {String(filteredProducts.length).padStart(2, "0")}/
              {String(products.length).padStart(2, "0")}
            </span>
          </div>

          <div className="activation-fit activation-fit--catalog">
          <section
            className="activation-slot"
            id="catalog-personalization"
            aria-label="Catalog personalization slot"
          >
            <ActivationPlaceholder
              label="Catalog activation"
              anchor="#catalog-personalization"
            />
          </section>
          </div>

          {filteredProducts.length ? (
            <section className="cells" aria-label="Product catalog">
              {filteredProducts.map((product) => (
                <article className="cell" key={product.id}>
                  <button
                    className="cell__open"
                    type="button"
                    onClick={() => openProduct(product)}
                    data-mpt-trigger="view-product"
                    aria-label={`View ${product.name}, ${formatPrice(product.price)}`}
                  >
                    <span className="cell__well">
                      <TechnicalDrawing kind={product.art} />
                    </span>
                    <span className="cell__spec">
                      <span className="cell__title">{product.name}</span>
                      <span className="cell__price">
                        {formatPrice(product.price)}
                      </span>
                      <span className="cell__sku">
                        {product.category} · {product.id}
                      </span>
                    </span>
                  </button>
                  <button
                    className="cell__add"
                    type="button"
                    onClick={() => addToCart(product)}
                    data-mpt-trigger="add-to-cart"
                    data-state={
                      addedProductId === product.id ? "success" : "default"
                    }
                    aria-label={`Add ${product.name} to cart`}
                  >
                    {addedProductId === product.id ? "added" : "add"}
                  </button>
                </article>
              ))}
            </section>
          ) : (
            <section className="void" aria-live="polite">
              <p className="void__line">no objects match `{query}`</p>
              <button type="button" onClick={() => setQuery("")}>
                clear search
              </button>
            </section>
          )}

          <footer className="colophon">
            <dl>
              <div>
                <dt>transport</dt>
                <dd>
                  {collectionEndpoint
                    ? `POST ${endpointHost}`
                    : "local preview — no requests leave the browser"}
                </dd>
              </div>
              <div>
                <dt>sdk</dt>
                <dd>
                  events + tracking rules + web banners — link tracking off
                </dd>
              </div>
              <div>
                <dt>catalog</dt>
                <dd>
                  {products.length} objects · static · lib/catalog.ts
                </dd>
              </div>
              <div>
                <dt>checkout</dt>
                <dd>
                  simulated — emits begin_checkout + purchase, no payment
                </dd>
              </div>
            </dl>
            <p className="colophon__foot">
              <span>© 2026 Meiro</span>
              <a
                href="https://www.npmjs.com/package/@meiroio/web-sdk"
                target="_blank"
                rel="noreferrer"
              >
                @meiroio/web-sdk ↗
              </a>
              <a href="https://www.meiro.io/" target="_blank" rel="noreferrer">
                meiro.io ↗
              </a>
            </p>
          </footer>
        </main>

        <aside
          id="event-rail"
          className={`rail${railOpen ? " is-open" : ""}`}
          aria-label="Live event inspector"
        >
          <div className="rail__head">
            <p className="micro">Event pipeline</p>
            <button
              className="rail__close"
              type="button"
              onClick={() => setRailOpen(false)}
              aria-label="Close event inspector"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <ol
            className="stages"
            data-armed={activeEvent ? "yes" : "no"}
            aria-label="Transformation stages"
          >
            <li>
              <span className="stages__wide">captured</span>
              <span className="stages__narrow">capture</span>
            </li>
            <li>
              <span className="stages__wide">normalized</span>
              <span className="stages__narrow">shape</span>
            </li>
            <li>
              <span className="stages__wide">profile signal</span>
              <span className="stages__narrow">profile</span>
            </li>
          </ol>

          {activeEvent ? (
            <>
              <div className="log">
                <p className="log__head">
                  <span>time</span>
                  <span>event</span>
                  <span>status</span>
                </p>
                <div className="log__body">
                  {events.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      className={
                        event.id === activeEvent.id ? "is-active" : undefined
                      }
                      onClick={() => setActiveEventId(event.id)}
                      aria-current={event.id === activeEvent.id}
                    >
                      <span>{eventTime.format(new Date(event.capturedAt))}</span>
                      <span>{event.name}</span>
                      <span data-status={event.status}>
                        <i aria-hidden="true" />
                        {event.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <section className="payload">
                <h2>browser payload</h2>
                <pre>{JSON.stringify(activeEvent.raw, null, 2)}</pre>
              </section>
              <section className="payload">
                <h2>cdp-ready shape</h2>
                <pre>{JSON.stringify(activeEvent.normalized, null, 2)}</pre>
              </section>
            </>
          ) : (
            <div className="rail__empty">
              <p>Waiting for the first event.</p>
              <p>Open an object or add one to the cart.</p>
            </div>
          )}
        </aside>
      </div>

      <dialog
        className="sheet sheet--product"
        ref={productDialogRef}
        onClick={closeOnBackdrop}
        onClose={() => setSelectedProduct(null)}
      >
        {selectedProduct && (
          <div className="sheet__body">
            <div className="sheet__well">
              <TechnicalDrawing kind={selectedProduct.art} />
            </div>
            <div className="sheet__copy">
              <p className="micro">{selectedProduct.category}</p>
              <h2>{selectedProduct.name}</h2>
              <p className="sheet__price">
                {formatPrice(selectedProduct.price)}
              </p>
              <p className="prose">{selectedProduct.description}</p>
              <ul className="sheet__details">
                {selectedProduct.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
              <p className="sheet__sku">sku · {selectedProduct.id}</p>
              <button
                className="action"
                type="button"
                data-dialog-primary
                data-mpt-trigger="add-to-cart"
                onClick={() => addToCart(selectedProduct, true)}
              >
                add to cart · {formatPrice(selectedProduct.price)}
              </button>
              <button
                className="sheet__close"
                type="button"
                onClick={() => productDialogRef.current?.close()}
                aria-label="Close product details"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </div>
        )}
      </dialog>

      <dialog
        className="sheet sheet--cart"
        ref={cartDialogRef}
        onClick={closeOnBackdrop}
      >
        <div className="sheet__cart">
          <div className="rail__head">
            <p className="micro">Cart · saved locally</p>
            <button
              className="rail__close"
              type="button"
              onClick={() => cartDialogRef.current?.close()}
              aria-label="Close cart"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          {cartItems.length ? (
            <>
              <ul className="lines">
                {cartItems.map(({ product, quantity }) => (
                  <li key={product.id}>
                    <span className="lines__well">
                      <TechnicalDrawing kind={product.art} />
                    </span>
                    <span className="lines__meta">
                      <b>{product.name}</b>
                      <small>
                        {quantity} × {formatPrice(product.price)}
                      </small>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(product)}
                    >
                      remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className="lines__total">
                <span>subtotal</span>
                <b>{formatPrice(cartValue)}</b>
              </div>
              <button
                className="action"
                type="button"
                data-dialog-primary
                data-mpt-trigger="begin-checkout"
                onClick={beginCheckout}
              >
                simulate checkout
              </button>
              <p className="micro micro--note">
                No payment is collected. Continue to emit purchase.
              </p>
            </>
          ) : (
            <div className="rail__empty">
              <p>The cart is empty.</p>
              <button
                type="button"
                data-dialog-primary
                onClick={() => cartDialogRef.current?.close()}
              >
                browse the catalog
              </button>
            </div>
          )}
        </div>
      </dialog>

      <dialog
        className="sheet sheet--checkout"
        ref={checkoutDialogRef}
        onClick={closeOnBackdrop}
        onClose={() => setCompletedOrderId(null)}
      >
        <div className="sheet__checkout">
          <div className="rail__head">
            <p className="micro">
              {completedOrderId ? "Order complete" : "Simulated checkout"}
            </p>
            <button
              className="rail__close"
              type="button"
              onClick={() => checkoutDialogRef.current?.close()}
              aria-label="Close checkout"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          {completedOrderId ? (
            <div className="checkout-result" aria-live="polite">
              <p className="checkout-result__mark" aria-hidden="true">
                ✓
              </p>
              <h2>
                {collectionEndpoint
                  ? "Purchase event sent."
                  : "Purchase event captured."}
              </h2>
              <p>
                {collectionEndpoint
                  ? "The cart is clear and Engage can now measure this conversion."
                  : "The cart is clear. Connect Pipes to send this conversion."}
              </p>
              <code>{completedOrderId}</code>
              <button
                className="action"
                type="button"
                data-dialog-primary
                onClick={() => checkoutDialogRef.current?.close()}
              >
                continue browsing
              </button>
            </div>
          ) : (
            <div className="checkout-confirm">
              <p className="prose">
                Complete the demo order to send a purchase event with the
                transaction, line items, currency, and order value.
              </p>
              <div className="lines__total">
                <span>
                  {cartCount} {cartCount === 1 ? "item" : "items"}
                </span>
                <b>{formatPrice(cartValue)}</b>
              </div>
              <button
                className="action"
                type="button"
                data-dialog-primary
                data-mpt-trigger="complete-purchase"
                onClick={completePurchase}
              >
                complete simulated purchase
              </button>
              <p className="micro micro--note">
                Demo only. No address, card data, or payment is collected.
              </p>
            </div>
          )}
        </div>
      </dialog>
    </div>
  );
}
