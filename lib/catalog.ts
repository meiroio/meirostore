export const categories = ["All", "Wear", "Carry", "Desk", "Print"] as const;

export type Category = (typeof categories)[number];
export type ProductCategory = Exclude<Category, "All">;
export type ProductArt =
  | "tee"
  | "hoodie"
  | "cap"
  | "socks"
  | "beanie"
  | "jacket"
  | "tote"
  | "bottle"
  | "backpack"
  | "duffel"
  | "pouch"
  | "lanyard"
  | "mug"
  | "notebook"
  | "pins"
  | "keycaps"
  | "deskmat"
  | "cable"
  | "poster"
  | "sticker"
  | "zine"
  | "postcards"
  | "tape"
  | "calendar";

export const currency = "USD";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  description: string;
  details: string[];
  art: ProductArt;
};

export const products: Product[] = [
  /* ── Wear ── */
  {
    id: "schema-tee",
    name: "Schema Tee",
    category: "Wear",
    price: 42,
    description:
      "Heavy cotton with a quiet event-schema print. Built for conference halls and late deploys.",
    details: ["240 gsm cotton", "Relaxed fit", "Screen printed"],
    art: "tee",
  },
  {
    id: "identity-hoodie",
    name: "Identity Hoodie",
    category: "Wear",
    price: 88,
    description:
      "A heavyweight zip hoodie for stitching sessions together without stitching logos everywhere.",
    details: ["Organic cotton", "Two-way zip", "Embroidered mark"],
    art: "hoodie",
  },
  {
    id: "profile-cap",
    name: "Profile Cap",
    category: "Wear",
    price: 32,
    description:
      "Six panels, one profile. The smallest possible customer-data joke.",
    details: ["Washed canvas", "Brass adjuster", "One size"],
    art: "cap",
  },
  {
    id: "cohort-socks",
    name: "Cohort Socks",
    category: "Wear",
    price: 16,
    description:
      "Two socks, one cohort. They will be re-segmented in the wash.",
    details: ["Combed cotton", "Ribbed cuff", "Sizes 39–46"],
    art: "socks",
  },
  {
    id: "cluster-beanie",
    name: "Cluster Beanie",
    category: "Wear",
    price: 34,
    description:
      "A tight cluster of merino for the walk between buildings.",
    details: ["Merino wool", "Fold cuff", "One size"],
    art: "beanie",
  },
  {
    id: "consent-jacket",
    name: "Consent Jacket",
    category: "Wear",
    price: 124,
    description:
      "A coach jacket that asks before it does anything. Snaps, never zips.",
    details: ["Cotton twill", "Snap placket", "Lined body"],
    art: "jacket",
  },

  /* ── Carry ── */
  {
    id: "event-tote",
    name: "Event Tote",
    category: "Carry",
    price: 28,
    description:
      "Carries a laptop, a charger, and more context than a page-view event.",
    details: ["Recycled canvas", "Internal pocket", "38 × 42 cm"],
    art: "tote",
  },
  {
    id: "pipeline-bottle",
    name: "Pipeline Bottle",
    category: "Carry",
    price: 26,
    description:
      "Insulated steel for data that should stay hot and water that should not.",
    details: ["600 ml", "Double-wall steel", "BPA free"],
    art: "bottle",
  },
  {
    id: "ingest-backpack",
    name: "Ingest Backpack",
    category: "Carry",
    price: 148,
    description:
      "Takes everything you hand it and sorts it out later. Eighteen litres of it.",
    details: ["18 L", "Padded sleeve", "Water resistant"],
    art: "backpack",
  },
  {
    id: "batch-duffel",
    name: "Batch Duffel",
    category: "Carry",
    price: 96,
    description:
      "For the trips you kept deferring and will now take all at once.",
    details: ["42 L", "Grab handle", "Separate base"],
    art: "duffel",
  },
  {
    id: "token-pouch",
    name: "Token Pouch",
    category: "Carry",
    price: 22,
    description:
      "Small enough to lose, costly enough to keep. Holds cables and secrets.",
    details: ["Zip closure", "Coated canvas", "22 × 12 cm"],
    art: "pouch",
  },
  {
    id: "attribute-lanyard",
    name: "Attribute Lanyard",
    category: "Carry",
    price: 14,
    description:
      "One string, one badge, one attribute you cannot edit at the door.",
    details: ["Woven polyester", "Safety break", "Card holder"],
    art: "lanyard",
  },

  /* ── Desk ── */
  {
    id: "segment-mug",
    name: "Segment Mug",
    category: "Desk",
    price: 24,
    description:
      "A ceramic mug for the audience of one currently fixing the taxonomy.",
    details: ["Stoneware", "350 ml", "Dishwasher safe"],
    art: "mug",
  },
  {
    id: "session-notebook",
    name: "Session Notebook",
    category: "Desk",
    price: 18,
    description:
      "Dot-grid pages for tracking the session before the session tracks you.",
    details: ["160 pages", "Lay-flat binding", "FSC paper"],
    art: "notebook",
  },
  {
    id: "signal-pin-set",
    name: "Signal Pin Set",
    category: "Desk",
    price: 12,
    description:
      "Three enamel signals: captured, transformed, and ready for activation.",
    details: ["Set of three", "Soft enamel", "Rubber backs"],
    art: "pins",
  },
  {
    id: "query-keycaps",
    name: "Query Keycaps",
    category: "Desk",
    price: 58,
    description:
      "Five caps for the five keys you actually use. Profile-agnostic.",
    details: ["PBT double-shot", "MX stem", "Set of five"],
    art: "keycaps",
  },
  {
    id: "latency-deskmat",
    name: "Latency Deskmat",
    category: "Desk",
    price: 36,
    description:
      "Nine hundred millimetres of stitched calm under a loud keyboard.",
    details: ["900 × 400 mm", "Stitched edge", "Rubber base"],
    art: "deskmat",
  },
  {
    id: "webhook-cable",
    name: "Webhook Cable",
    category: "Desk",
    price: 19,
    description:
      "Braided, one metre, and it delivers on the first attempt.",
    details: ["USB-C to USB-C", "1 m braided", "100 W"],
    art: "cable",
  },

  /* ── Print ── */
  {
    id: "taxonomy-poster",
    name: "Taxonomy Poster",
    category: "Print",
    price: 22,
    description:
      "The whole naming scheme on one sheet, so the argument happens only once.",
    details: ["A2 offset", "170 gsm uncoated", "Unframed"],
    art: "poster",
  },
  {
    id: "payload-sticker-sheet",
    name: "Payload Sticker Sheet",
    category: "Print",
    price: 9,
    description:
      "Six die-cut shapes for laptops, bottles, and other people's laptops.",
    details: ["Six stickers", "Die-cut vinyl", "A6 sheet"],
    art: "sticker",
  },
  {
    id: "field-zine",
    name: "Field Zine",
    category: "Print",
    price: 11,
    description:
      "Twenty-four stapled pages on collecting things properly the first time.",
    details: ["24 pages", "Saddle stitched", "Riso printed"],
    art: "zine",
  },
  {
    id: "journey-postcards",
    name: "Journey Postcards",
    category: "Print",
    price: 14,
    description:
      "Eight stages, eight cards. Post them out of order if that is your journey.",
    details: ["Set of eight", "300 gsm board", "A6"],
    art: "postcards",
  },
  {
    id: "ingest-tape",
    name: "Ingest Tape",
    category: "Print",
    price: 7,
    description:
      "Fifty metres of printed paper tape for boxes that need a source.",
    details: ["50 m roll", "48 mm wide", "Paper tape"],
    art: "tape",
  },
  {
    id: "retention-calendar",
    name: "Retention Calendar",
    category: "Print",
    price: 26,
    description:
      "Twelve months of not churning. Hang it where the team can see it.",
    details: ["12 months", "A3 portrait", "Wire bound"],
    art: "calendar",
  },
];

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency,
  minimumFractionDigits: 0,
});

export function formatPrice(price: number) {
  return priceFormatter.format(price);
}
