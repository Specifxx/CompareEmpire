import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotFoundEbay, NotFoundSearch } from "@/components/NotFoundEbay";

// One page for every unknown URL, prerendered: whatever depends on the region in the URL (/au/p/nope searches Australia) is set
// in the browser after mount (components/NotFoundEbay.tsx), as attributes and colours only.
export default function NotFound() {
  return (
    <>
      <Header region={null} />
      <main id="main" className="page flex-1 py-16 text-center sm:py-24">
        <div className="eyebrow">404</div>
        <h1 className="ph-h1 mt-3">This page sold out.</h1>
        <p className="ph-lede mx-auto max-w-md">
          We couldn&rsquo;t find it. DexCompare covers Pokémon <b>sealed</b> product only — single-card pages from the old site are gone.
        </p>
        <NotFoundSearch />
        {/* One eBay unit (a slim listing strip, or the compact CTA row), on the eBay site of the region in the URL (US outside one). */}
        <NotFoundEbay />
      </main>
      <Footer region={null} />
    </>
  );
}
