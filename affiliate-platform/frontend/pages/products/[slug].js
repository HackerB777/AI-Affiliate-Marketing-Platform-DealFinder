/**
 * pages/products/[slug].js — Product detail page
 * Full blog review, price history chart, pros/cons, affiliate CTA
 */

import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { productAPI } from '../../lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`text-lg ${i <= Math.floor(rating) ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
      ))}
      <span className="ml-2 text-sm font-semibold text-gray-700">{rating}/5</span>
    </div>
  );
}

export default function ProductDetail({ product }) {
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    if (product?._id) {
      productAPI.track(product._id, 'view').catch(() => {});
    }
  }, [product?._id]);

  if (!product) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center px-4">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Product Not Found</h1>
        <p className="text-gray-500 mb-6">This deal may have expired or been removed.</p>
        <Link href="/products" className="btn-cta">Browse Active Deals →</Link>
      </div>
    );
  }

  const {
    name, price, original_price, discount, rating, review_count,
    image, affiliate_link, source, category, features, pros, cons,
    blog_post, seo_title, seo_description, keywords, schema_markup,
    price_history, cta_headline, cta_body, cta_button_text,
    published_at,
  } = product;

  const formattedPrice = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
  const formattedOriginal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(original_price);
  const savings = original_price - price;

  const priceChartData = (price_history || []).slice(-30).map(h => ({
    date: new Date(h.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    price: h.price,
  }));

  const handleBuy = async () => {
    setClicked(true);
    try { await productAPI.track(product._id, 'click'); } catch {}
    window.open(affiliate_link, '_blank', 'noopener,noreferrer');
    setTimeout(() => setClicked(false), 2000);
  };

  return (
    <>
      <Head>
        <title>{seo_title || name}</title>
        <meta name="description" content={seo_description || `Buy ${name} at the best price`} />
        {keywords?.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
        <meta property="og:title" content={seo_title || name} />
        <meta property="og:description" content={seo_description} />
        {image && <meta property="og:image" content={image} />}
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_SITE_URL}/products/${product.slug}`} />
        {/* JSON-LD Schema Markup for SEO */}
        {schema_markup && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema_markup) }}
          />
        )}
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-6">
          <Link href="/" className="hover:text-brand-500">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-brand-500">Deals</Link>
          <span>/</span>
          <Link href={`/products?category=${category}`} className="hover:text-brand-500 capitalize">{category}</Link>
          <span>/</span>
          <span className="text-gray-600 truncate max-w-xs">{name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-10 mb-12">
          {/* ── Left: Image ───────────────────────────────────────── */}
          <div>
            <div className="relative aspect-square bg-gray-50 rounded-3xl overflow-hidden border border-gray-100">
              {image ? (
                <Image src={image} alt={name} fill className="object-contain p-8" sizes="(max-width: 768px) 100vw, 50vw" priority />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl text-gray-200">📦</div>
              )}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <span className="bg-green-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  {Math.round(discount)}% OFF
                </span>
                {product.is_trending && (
                  <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">🔥 Hot Deal</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Product Info ───────────────────────────────── */}
          <div className="flex flex-col">
            <p className="text-sm text-brand-600 font-semibold uppercase tracking-wider mb-2 capitalize">{category}</p>
            <h1 className="text-2xl font-black text-gray-900 leading-snug mb-4">{name}</h1>

            <Stars rating={rating} />
            <p className="text-xs text-gray-400 mt-1 mb-5">
              Based on {review_count?.toLocaleString('en-IN')} verified reviews
            </p>

            {/* Price Block */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-100 mb-5">
              <div className="flex items-end gap-3 mb-1">
                <span className="text-4xl font-black text-gray-900">{formattedPrice}</span>
                <span className="text-lg text-gray-400 line-through pb-1">{formattedOriginal}</span>
              </div>
              <p className="text-green-700 font-semibold text-sm">
                💰 You save {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(savings)} ({Math.round(discount)}% off)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Available on <span className="capitalize font-medium text-gray-600">{source}</span> · Price verified recently
              </p>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleBuy}
              className={`btn-cta w-full py-4 text-base mb-3 ${clicked ? 'bg-green-600' : ''}`}
            >
              {clicked ? '✓ Opening Deal...' : (cta_button_text || `Check Best Price on ${source === 'amazon' ? 'Amazon' : 'Flipkart'} →`)}
            </button>
            <p className="text-xs text-center text-gray-400 mb-5">
              ⚠️ Affiliate link — we earn a small commission at no extra cost to you
            </p>

            {/* Key Features */}
            {features?.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-2 text-sm">Key Features</h3>
                <ul className="space-y-1.5">
                  {features.slice(0, 5).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ── Pros & Cons ──────────────────────────────────────────── */}
        {(pros?.length > 0 || cons?.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-5 mb-10">
            {pros?.length > 0 && (
              <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
                <h3 className="font-bold text-green-800 mb-3">👍 Pros</h3>
                <ul className="space-y-2">
                  {pros.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-green-900">
                      <span className="text-green-500 flex-shrink-0 mt-0.5">+</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {cons?.length > 0 && (
              <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                <h3 className="font-bold text-red-800 mb-3">👎 Cons</h3>
                <ul className="space-y-2">
                  {cons.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-red-900">
                      <span className="text-red-400 flex-shrink-0 mt-0.5">–</span> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Price History Chart ───────────────────────────────────── */}
        {priceChartData.length > 1 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-10">
            <h2 className="font-bold text-gray-900 mb-1">📈 Price History</h2>
            <p className="text-xs text-gray-400 mb-4">Last 30 data points · Updated every 6 hours</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={priceChartData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`}
                  width={45}
                />
                <Tooltip
                  formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Price']}
                  labelStyle={{ fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Blog Post Content ─────────────────────────────────────── */}
        {blog_post && (
          <article className="bg-white rounded-2xl border border-gray-100 p-8 mb-10">
            <div
              className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: blog_post }}
            />
            {published_at && (
              <p className="text-xs text-gray-400 mt-6 pt-4 border-t border-gray-100">
                Last updated: {new Date(published_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
              </p>
            )}
          </article>
        )}

        {/* ── Final CTA Block ───────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-brand-500 to-brand-600 text-white rounded-3xl p-8 text-center">
          <h2 className="text-2xl font-black mb-2">{cta_headline || `Get ${Math.round(discount)}% Off — Don't Miss This Deal!`}</h2>
          <p className="text-orange-100 text-sm mb-6 max-w-md mx-auto">
            {cta_body || `Stock is limited. This ${Math.round(discount)}% discount may not last long.`}
          </p>
          <button
            onClick={handleBuy}
            className="bg-white text-brand-600 font-bold px-8 py-4 rounded-2xl hover:bg-orange-50 transition-colors text-sm"
          >
            {cta_button_text || 'Check Price Now →'}
          </button>
          <p className="text-xs text-orange-200 mt-3">Affiliate link · Price verified on {source}</p>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps({ params }) {
  try {
    const res = await fetch(`${API}/api/products/${params.slug}`);
    if (!res.ok) return { props: { product: null } };
    const data = await res.json();
    return { props: { product: data.product || null } };
  } catch {
    return { props: { product: null } };
  }
}
