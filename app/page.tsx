import Storefront from "./storefront";
import { products } from "@/lib/catalog";

export default function Home() {
  return <Storefront products={products} />;
}
