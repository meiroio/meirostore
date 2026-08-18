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
  type MptFeature,
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
type SdkSettings = {
  collectionEndpoint: string;
  tracking: boolean;
  banners: boolean;
};
type MarketEvent = {
  id: string;
  name: string;
  capturedAt: string;
  status: EventStatus;
  raw: Record<string, unknown>;
  normalized: Record<string, unknown>;
};

const eventTime = new Intl.DateTimeFormat("en-GB", {
  timeStyle: "medium",
});
const cartStorageKey = "meiro-market-cart";
const sdkSettingsStorageKey = "meiro-market-sdk-settings";
const legacySdkFeaturesStorageKey = "meiro-market-sdk-features";
const defaultSdkSettings: SdkSettings = {
  collectionEndpoint: "",
  tracking: true,
  banners: true,
};
const defaultSdkSettingsSnapshot = JSON.stringify(defaultSdkSettings);
const emptyCartSnapshot = "{}";
const shirtSizes = ["XS", "S", "M", "L", "XL"] as const;
const cartSubscribers = new Set<() => void>();

let mpt: MptClient | null = null;
let mptInit: Promise<MptClient | null> | null = null;
let inMemoryCartSnapshot = emptyCartSnapshot;
let inMemorySdkSettingsSnapshot = defaultSdkSettingsSnapshot;

function subscribeToSdkSettings() {
  return () => {};
}

function readSdkSettingsSnapshot() {
  try {
    const stored =
      window.localStorage.getItem(sdkSettingsStorageKey) ??
      window.localStorage.getItem(legacySdkFeaturesStorageKey);
    inMemorySdkSettingsSnapshot = stored ?? defaultSdkSettingsSnapshot;
  } catch {
    // Keep the default settings when browser storage is unavailable.
  }
  return inMemorySdkSettingsSnapshot;
}

function readServerSdkSettingsSnapshot() {
  return defaultSdkSettingsSnapshot;
}

function parseCollectionEndpoint(value: unknown) {
  if (typeof value !== "string") return "";

  const endpoint = value.trim();
  try {
    const { protocol } = new URL(endpoint);
    return protocol === "http:" || protocol === "https:" ? endpoint : "";
  } catch {
    return "";
  }
}

function parseSdkSettings(snapshot: string): SdkSettings {
  try {
    const value: unknown = JSON.parse(snapshot);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return defaultSdkSettings;
    }

    const settings = value as Partial<SdkSettings>;
    return {
      collectionEndpoint: parseCollectionEndpoint(
        settings.collectionEndpoint,
      ),
      tracking: settings.tracking !== false,
      banners: settings.banners !== false,
    };
  } catch {
    return defaultSdkSettings;
  }
}

function persistSdkSettings(settings: SdkSettings) {
  try {
    const snapshot = JSON.stringify(settings);
    window.localStorage.setItem(sdkSettingsStorageKey, snapshot);
    inMemorySdkSettingsSnapshot = snapshot;
    return true;
  } catch {
    return false;
  }
}

function describeSdkFeatures(settings: SdkSettings) {
  return `core${settings.tracking ? " + tracking" : ""}${
    settings.banners ? " + banners" : ""
  }`;
}

function initMpt(settings: SdkSettings): Promise<MptClient | null> {
  if (mpt) return Promise.resolve(mpt);
  if (!settings.collectionEndpoint) return Promise.resolve(null);
  if (mptInit) return mptInit;

  mptInit = (async () => {
    try {
      const [tracking, banners] = await Promise.all([
        settings.tracking
          ? import("@meiroio/web-sdk/tracking")
          : null,
        settings.banners
          ? import("@meiroio/web-sdk/web-banners")
          : null,
      ]);
      const features: MptFeature[] = [];
      if (tracking) features.push(tracking.trackingRules());
      if (banners) features.push(banners.webBanners());

      mpt = createMpt({
        collectionEndpoint: settings.collectionEndpoint,
        features,
        consent: {
          storagePersistence: "granted",
          userId: "granted",
          sessionId: "granted",
        },
      });
      return mpt;
    } catch (error) {
      console.warn(
        `Meiro SDK: could not initialise — ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  })();

  return mptInit;
}

function normalizeEvent(
  name: string,
  payload: MptEventPayload,
  capturedAt: string,
  client: MptClient | null,
) {
  return {
    event_type: name === "form_submit" ? name : `commerce_${name}`,
    occurred_at: capturedAt,
    identity: {
      user_id: client?.get("userId") || "preview-user",
      session_id: client?.get("sessionId") || "preview-session",
      ...(name === "form_submit" && typeof payload.email === "string"
        ? { email: payload.email }
        : {}),
    },
    properties: {
      ...payload,
      source: "meiro-market",
      page_path: window.location.pathname,
    },
    profile_signal:
      name === "form_submit"
        ? {
            trait: "shirt_size",
            value: payload.field00,
          }
        : name === "add_to_cart"
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

function syncLeadFieldValidity(input: HTMLInputElement) {
  const fields =
    input.type === "radio" && input.form
      ? input.form.querySelectorAll<HTMLInputElement>(
          'input[name="shirt_size"]',
        )
      : [input];

  fields.forEach((field) => {
    field.setAttribute("aria-invalid", String(!field.validity.valid));
  });
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
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const sdkSettingsSnapshot = useSyncExternalStore(
    subscribeToSdkSettings,
    readSdkSettingsSnapshot,
    readServerSdkSettingsSnapshot,
  );
  const sdkSettings = parseSdkSettings(sdkSettingsSnapshot);
  const [draftSdkSettings, setDraftSdkSettings] =
    useState<SdkSettings>(defaultSdkSettings);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const productDialogRef = useRef<HTMLDialogElement>(null);
  const cartDialogRef = useRef<HTMLDialogElement>(null);
  const checkoutDialogRef = useRef<HTMLDialogElement>(null);
  const settingsDialogRef = useRef<HTMLDialogElement>(null);

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
  const collectionEndpoint = sdkSettings.collectionEndpoint || null;
  const endpointHost = collectionEndpoint
    ? new URL(collectionEndpoint).host
    : null;
  const sdkFeatureLabel = describeSdkFeatures(sdkSettings);
  const draftSdkFeatureLabel = describeSdkFeatures(draftSdkSettings);
  const activeOptionalFeatures =
    Number(sdkSettings.tracking) + Number(sdkSettings.banners);
  const sdkSettingsChanged =
    sdkSettings.collectionEndpoint !==
      draftSdkSettings.collectionEndpoint.trim() ||
    sdkSettings.tracking !== draftSdkSettings.tracking ||
    sdkSettings.banners !== draftSdkSettings.banners;

  useEffect(() => {
    const settings = parseSdkSettings(readSdkSettingsSnapshot());
    void initMpt(settings);

    const dialog = settingsDialogRef.current;
    if (!settings.collectionEndpoint && dialog && !dialog.open) {
      setDraftSdkSettings(settings);
      dialog.showModal();
      window.requestAnimationFrame(() => {
        dialog.querySelector<HTMLInputElement>("#collector-url")?.focus();
      });
    }
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
    const nextEvent: MarketEvent = {
      id,
      name,
      capturedAt,
      status: collectionEndpoint ? "sending" : "preview",
      raw: {
        method: "mpt.event",
        event_name: name,
        timestamp: capturedAt,
        payload,
      },
      normalized: normalizeEvent(name, payload, capturedAt, mpt),
    };

    setEvents((current) => [nextEvent, ...current].slice(0, 12));
    setActiveEventId(id);
    setRailOpen(true);

    if (!collectionEndpoint) return;

    const updateEvent = (update: Partial<MarketEvent>) => {
      setEvents((current) =>
        current.map((event) =>
          event.id === id ? { ...event, ...update } : event,
        ),
      );
    };

    void initMpt(sdkSettings).then(async (client) => {
      if (!client) {
        updateEvent({ status: "error" });
        return;
      }

      updateEvent({
        normalized: normalizeEvent(name, payload, capturedAt, client),
      });
      try {
        await client.event(name, payload);
        updateEvent({ status: "sent" });
      } catch {
        updateEvent({ status: "error" });
      }
    });
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

  function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const firstName = String(data.get("first_name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const shirtSize = String(data.get("shirt_size") ?? "");

    if (
      !firstName ||
      !email ||
      !shirtSizes.includes(shirtSize as (typeof shirtSizes)[number])
    ) {
      form.reportValidity();
      return;
    }

    captureEvent("form_submit", {
      form_id: "meiro_market_lead",
      email,
      first_name: firstName,
      field00: shirtSize,
    });
    form.reset();
    setLeadSubmitted(true);
  }

  function openSettings() {
    setDraftSdkSettings(sdkSettings);
    setSettingsError(null);
    const dialog = settingsDialogRef.current;
    dialog?.showModal();
    window.requestAnimationFrame(() => {
      dialog?.querySelector<HTMLInputElement>("input")?.focus();
    });
  }

  function applySdkSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const collectionEndpoint = parseCollectionEndpoint(
      draftSdkSettings.collectionEndpoint,
    );
    if (draftSdkSettings.collectionEndpoint.trim() && !collectionEndpoint) {
      setSettingsError(
        "Enter a complete collector URL beginning with http:// or https://.",
      );
      return;
    }
    if (!persistSdkSettings({ ...draftSdkSettings, collectionEndpoint })) {
      setSettingsError(
        "Browser storage is unavailable. Settings were not changed.",
      );
      return;
    }
    window.location.reload();
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
            personalization{" "}
            <b>
              {collectionEndpoint && sdkSettings.banners ? "armed" : "off"}
            </b>
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
              className="control control--sdk"
              type="button"
              onClick={openSettings}
              aria-haspopup="dialog"
              aria-label={`Configure SDK features, ${activeOptionalFeatures} of 2 optional features enabled`}
            >
              sdk
              <b>{activeOptionalFeatures}/2</b>
            </button>
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
            />
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
            />
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

          <section
            className="lead-capture"
            id="lead-capture"
            aria-labelledby="lead-capture-title"
          >
            <div className="lead-capture__intro">
              <p className="micro">profile enrichment · form_submit</p>
              <h2 id="lead-capture-title">Leave us your email.</h2>
              <p>
                Add one known profile to the event stream. Meiro connects the
                name and shirt size below to the journey already visible in the
                inspector.
              </p>
            </div>

            <div className="lead-capture__body">
              {leadSubmitted ? (
                <div className="lead-success" role="status">
                  <p className="micro">form_submit · captured</p>
                  <h3>Profile signal added.</h3>
                  <p>
                    The inspector now shows how this identity and shirt size
                    join the current session.
                  </p>
                  <button type="button" onClick={() => setLeadSubmitted(false)}>
                    add another profile
                  </button>
                </div>
              ) : (
                <form
                  className="lead-form"
                  method="post"
                  onSubmit={submitLead}
                  onInvalid={(event) => {
                    if (event.target instanceof HTMLInputElement) {
                      syncLeadFieldValidity(event.target);
                    }
                  }}
                  onBlur={(event) => {
                    if (event.target instanceof HTMLInputElement) {
                      syncLeadFieldValidity(event.target);
                    }
                  }}
                  onInput={(event) => {
                    if (
                      event.target instanceof HTMLInputElement &&
                      event.target.validity.valid
                    ) {
                      syncLeadFieldValidity(event.target);
                    }
                  }}
                >
                  <div className="lead-form__identity">
                    <label className="lead-field" htmlFor="lead-first-name">
                      <span>
                        First name <i aria-hidden="true">*</i>
                      </span>
                      <input
                        className="lead-field__control"
                        id="lead-first-name"
                        name="first_name"
                        type="text"
                        autoComplete="given-name"
                        enterKeyHint="next"
                        maxLength={80}
                        aria-errormessage="lead-first-name-error"
                        required
                      />
                      <small
                        className="lead-field__error"
                        id="lead-first-name-error"
                      >
                        × Enter your first name.
                      </small>
                    </label>

                    <label className="lead-field" htmlFor="lead-email">
                      <span>
                        Email <i aria-hidden="true">*</i>
                      </span>
                      <input
                        className="lead-field__control"
                        id="lead-email"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        enterKeyHint="next"
                        maxLength={254}
                        aria-errormessage="lead-email-error"
                        required
                      />
                      <small
                        className="lead-field__error"
                        id="lead-email-error"
                      >
                        × Enter a valid email address.
                      </small>
                    </label>
                  </div>

                  <fieldset className="lead-sizes">
                    <legend>
                      Shirt size <i aria-hidden="true">*</i>
                    </legend>
                    <div className="lead-sizes__options">
                      {shirtSizes.map((size) => (
                        <label className="lead-size" key={size}>
                          <input
                            type="radio"
                            name="shirt_size"
                            value={size}
                            aria-describedby="lead-size-error"
                            required
                          />
                          <span>{size}</span>
                        </label>
                      ))}
                    </div>
                    <small className="lead-field__error" id="lead-size-error">
                      × Choose a shirt size.
                    </small>
                  </fieldset>

                  <button
                    className="lead-form__submit"
                    type="submit"
                    data-mpt-trigger="lead-submit"
                  >
                    create demo profile
                  </button>
                </form>
              )}
            </div>
          </section>

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
                <dd>{sdkFeatureLabel} — optional modules loaded on demand</dd>
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
        className="sheet sheet--settings"
        ref={settingsDialogRef}
        onClick={closeOnBackdrop}
        aria-labelledby="sdk-settings-title"
      >
        <div className="sheet__settings">
          <div className="rail__head">
            <h2 className="micro" id="sdk-settings-title">
              SDK settings
            </h2>
            <button
              className="rail__close"
              type="button"
              onClick={() => settingsDialogRef.current?.close()}
              aria-label="Close SDK settings"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <form className="sdk-settings" onSubmit={applySdkSettings}>
            <p className="prose">
              Connect this browser to your Meiro Pipes collector. These
              settings stay local, so every browser can use a different
              instance.
            </p>

            <label className="sdk-field" htmlFor="collector-url">
              <span>Collector URL</span>
              <small id="collector-url-hint">
                Paste the complete Web SDK collection URL from Pipes. Clear it
                to return to local preview.
              </small>
              <input
                id="collector-url"
                name="collector-url"
                type="url"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="https://pipes.example.com/collect/web-sdk"
                value={draftSdkSettings.collectionEndpoint}
                onChange={(event) => {
                  setDraftSdkSettings((current) => ({
                    ...current,
                    collectionEndpoint: event.target.value,
                  }));
                  setSettingsError(null);
                }}
                aria-describedby={
                  settingsError?.startsWith("Enter")
                    ? "collector-url-hint sdk-settings-error"
                    : "collector-url-hint"
                }
                aria-invalid={
                  settingsError?.startsWith("Enter") || undefined
                }
              />
            </label>

            <aside className="sdk-trial">
              <p>
                <b>Need a collector?</b> Open Meiro Pipes and choose
                <strong> Launch full trial</strong>.
              </p>
              <a
                href="https://meiro.io/product/meiro-pipes/"
                target="_blank"
                rel="noreferrer"
              >
                open Meiro Pipes ↗
              </a>
            </aside>

            <div className="sdk-settings__core">
              <span>Core events</span>
              <b>always on</b>
            </div>

            <fieldset>
              <legend className="visually-hidden">Optional SDK features</legend>
              <label className="sdk-option">
                <input
                  type="checkbox"
                  checked={draftSdkSettings.tracking}
                  onChange={(event) =>
                    setDraftSdkSettings((current) => ({
                      ...current,
                      tracking: event.target.checked,
                    }))
                  }
                />
                <span className="sdk-option__copy">
                  <b>Tracking rules</b>
                  <small>Run remotely configured DOM tracking rules.</small>
                  <code>@meiroio/web-sdk/tracking</code>
                </span>
              </label>
              <label className="sdk-option">
                <input
                  type="checkbox"
                  checked={draftSdkSettings.banners}
                  onChange={(event) =>
                    setDraftSdkSettings((current) => ({
                      ...current,
                      banners: event.target.checked,
                    }))
                  }
                />
                <span className="sdk-option__copy">
                  <b>Web Banners</b>
                  <small>Load and render Engage Web Banners.</small>
                  <code>@meiroio/web-sdk/web-banners</code>
                </span>
              </label>
            </fieldset>

            <aside
              className="sdk-consent"
              aria-labelledby="sdk-consent-title"
            >
              <p className="micro" id="sdk-consent-title">
                Analytics + marketing consent
              </p>
              <p>
                <b>This demo assumes consent for both purposes.</b> Behavioral
                events and submitted lead details may be joined into a profile
                and used for campaign activation. Use test data only. In
                production, replace this assumption with purpose-specific
                choices from your consent-management platform.
              </p>
            </aside>

            <p className="sdk-settings__summary">
              next load <b>{draftSdkFeatureLabel}</b>
            </p>
            <p className="micro micro--note">
              Applying reloads the page because settings are fixed when the SDK
              client is first created.
            </p>
            {settingsError && (
              <p
                className="sdk-settings__error"
                id="sdk-settings-error"
                role="alert"
              >
                {settingsError}
              </p>
            )}
            <button
              className="action"
              type="submit"
              data-dialog-primary
              disabled={!sdkSettingsChanged}
            >
              apply and reload
            </button>
          </form>
        </div>
      </dialog>

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
