/**
 * pages/index.js — Homepage: hero, trending deals, categories, CTA
 */

import Head from 'next/head';
import Link from 'next/link';
import useSWR from 'swr';
import ProductCard from '../components/ProductCard';

const fetcher = (url) => fetch(url).then(r => r.json());
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const CATEGORIES = [
  { name: 'Smartphones', icon: '📱', slug: 'smartphones' },
  { name: 'Laptops', icon: '💻', slug: 'laptops' },
  { name: 'Audio', icon: '🎧', slug: 'headphones' },
  { name: 'Cameras', icon: '📷', slug: 'cameras' },
  { name: 'Smart TVs', icon: '📺', slug: 'smart-tvs' },
  { name: 'Smartwatches', icon: '⌚', slug: 'smartwatches' },
];

export default function Home({ initialTrending }) {
  const { data: trendingData } = useSWR(
    `${API}/api/products/trending`,
    fetcher,
    { fallbackData: { products: initialTrending }, revalidateOnFocus: false }
  );

  const { data: dealsData } = useSWR(
    `${API}/api/products?limit=8&sort=rank_score`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const trending = trendingData?.products || [];
  const deals = dealsData?.products || [];

  return (
    <>
      <Head>
        <title>DealFinder India — Best Deals & Offers | AI-Powered Shopping</title>
        <meta name="description" content="Find the best deals on electronics, gadgets and more. AI-powered deal discovery with price history and expert reviews." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={process.env.NEXT_PUBLIC_SITE_URL} />
      </Head>

      {/* ── Hero Section ──────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-orange-50 via-white to-amber-50 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-sm font-semibold px-4 py-2 rounded-full mb-6">
            🤖 AI-Powered Deal Discovery
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-4">
            Find the{' '}
            <span className="text-brand-500">Best Deals</span>
            <br />Before They Expire
          </h1>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            Our AI scans thousands of products every 6 hours and surfaces only the best discounts.
            Updated prices. Verified ratings. Zero fluff.
          </p>

          {/* Search Bar */}
          <form action="/products" method="GET" className="flex max-w-lg mx-auto gap-0 rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white">
            <input
              name="search"
              placeholder="Search for laptops, phones, earbuds..."
              className="flex-1 px-5 py-4 text-sm focus:outline-none"
            />
            <button
              type="submit"
              className="bg-brand-500 text-white px-6 font-semibold text-sm hover:bg-brand-600 transition-colors whitespace-nowrap"
            >
              Find Deals
            </button>
          </form>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-xs text-gray-400 font-medium">
            {['✅ Updated every 6 hours', '🛡️ Verified affiliate links', '⭐ 4.0+ rated only', '💸 20%+ discount only'].map(b => (
              <span key={b}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="section-heading mb-6">Shop by Category</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl border border-gray-100
                         hover:border-brand-200 hover:shadow-md transition-all group"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">{cat.icon}</span>
              <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Trending Products ──────────────────────────────────────── */}
      {trending.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="section-heading">🔥 Trending Deals</h2>
              <p className="text-sm text-gray-500 mt-1">Top rated & highest discounts right now</p>
            </div>
            <Link href="/products?sort=rank_score" className="text-sm text-brand-600 font-semibold hover:underline">
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {trending.slice(0, 10).map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ── All Deals ───────────────────────────────────────────────── */}
      {deals.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="section-heading">💰 Today's Best Deals</h2>
              <p className="text-sm text-gray-500 mt-1">AI-ranked by discount, rating & popularity</p>
            </div>
            <Link href="/products" className="text-sm text-brand-600 font-semibold hover:underline">
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {deals.map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/products" className="btn-cta px-8 py-3 text-base">
              Browse All Deals →
            </Link>
          </div>
        </section>
      )}

      {/* ── Empty State ─────────────────────────────────────────────── */}
      {deals.length === 0 && trending.length === 0 && (
        <section className="max-w-xl mx-auto px-4 py-24 text-center">
          <div className="text-5xl mb-4">🤖</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">AI is finding the best deals...</h2>
          <p className="text-gray-500 text-sm">Products will appear here once the discovery engine runs. Check back soon!</p>
        </section>
      )}

      {/* ── How It Works ────────────────────────────────────────────── */}
      <section className="bg-gray-900 text-white py-16 px-4 mt-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-2">How DealFinder Works</h2>
          <p className="text-gray-400 mb-10">Our AI never sleeps so you don't miss a deal</p>
          <div className="grid sm:grid-cols-4 gap-6">
            {[
              { icon: '🔍', step: '1', title: 'Discovery', desc: 'AI scans Amazon & Flipkart every 6h' },
              { icon: '📊', step: '2', title: 'Ranking', desc: 'Ranked by discount, rating & demand' },
              { icon: '✍️', step: '3', title: 'Review', desc: 'GPT-4 writes expert reviews & SEO content' },
              { icon: '💰', step: '4', title: 'You Save', desc: 'Click, buy & get the best price guaranteed' },
            ].map(({ icon, step, title, desc }) => (
              <div key={step} className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-brand-500/20 flex items-center justify-center text-2xl mb-3">
                  {icon}
                </div>
                <p className="font-bold text-sm mb-1">{title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// Server-side data fetching for initial load
export async function getServerSideProps() {
  try {
    const res = await fetch(`${API}/api/products/trending`);
    const data = await res.json();
    return { props: { initialTrending: data.products || [] } };
  } catch {
    return { props: { initialTrending: [] } };
  }
}
