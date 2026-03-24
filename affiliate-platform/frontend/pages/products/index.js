/**
 * pages/products/index.js — Filterable, sortable product listing page
 */

import Head from 'next/head';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import ProductCard from '../../components/ProductCard';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const fetcher = (url) => fetch(url).then(r => r.json());

const SORT_OPTIONS = [
  { value: 'rank_score', label: '⭐ Best Match' },
  { value: 'discount', label: '💸 Highest Discount' },
  { value: 'price', label: '💰 Price: Low to High' },
  { value: 'rating', label: '🌟 Highest Rated' },
  { value: 'createdAt', label: '🆕 Newest First' },
];

const CATEGORIES = ['smartphones', 'laptops', 'headphones', 'cameras', 'smartwatches', 'tablets', 'speakers'];

export default function ProductsPage() {
  const router = useRouter();
  const {
    category = '',
    sort = 'rank_score',
    order = 'desc',
    search = '',
    min_discount = '',
    page = '1',
  } = router.query;

  const [localSearch, setLocalSearch] = useState(search);

  // Build query params for the API
  const params = new URLSearchParams({
    ...(category && { category }),
    sort,
    order,
    ...(search && { search }),
    ...(min_discount && { min_discount }),
    page,
    limit: '12',
  });

  const { data, isLoading } = useSWR(
    `${API}/api/products?${params.toString()}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const products = data?.products || [];
  const pagination = data?.pagination || {};

  const updateQuery = useCallback((updates) => {
    router.push({
      pathname: '/products',
      query: { ...router.query, ...updates, page: 1 },
    }, undefined, { shallow: true });
  }, [router]);

  const handleSearch = (e) => {
    e.preventDefault();
    updateQuery({ search: localSearch });
  };

  return (
    <>
      <Head>
        <title>All Deals | DealFinder India</title>
        <meta name="description" content="Browse all AI-curated deals. Filter by category, discount and rating." />
      </Head>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Sidebar Filters ────────────────────────────────────── */}
          <aside className="lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-20">
              <h3 className="font-bold text-gray-900 mb-4">Filters</h3>

              {/* Category Filter */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Category</p>
                <button
                  onClick={() => updateQuery({ category: '' })}
                  className={`block w-full text-left text-sm px-2 py-1.5 rounded-lg mb-1 transition-colors ${
                    !category ? 'bg-brand-100 text-brand-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All Categories
                </button>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => updateQuery({ category: cat })}
                    className={`block w-full text-left text-sm px-2 py-1.5 rounded-lg mb-1 capitalize transition-colors ${
                      category === cat ? 'bg-brand-100 text-brand-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Min Discount Filter */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Minimum Discount</p>
                {[20, 30, 40, 50, 60].map(pct => (
                  <button
                    key={pct}
                    onClick={() => updateQuery({ min_discount: pct })}
                    className={`block w-full text-left text-sm px-2 py-1.5 rounded-lg mb-1 transition-colors ${
                      parseInt(min_discount) === pct ? 'bg-green-100 text-green-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {pct}%+ off
                  </button>
                ))}
                {min_discount && (
                  <button
                    onClick={() => updateQuery({ min_discount: '' })}
                    className="text-xs text-red-500 hover:underline mt-1"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* ── Main Content ──────────────────────────────────────── */}
          <div className="flex-1">
            {/* Top Bar: search + sort */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <input
                  value={localSearch}
                  onChange={e => setLocalSearch(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-400"
                />
                <button type="submit" className="btn-cta px-4 py-2.5">Search</button>
              </form>
              <select
                value={sort}
                onChange={e => updateQuery({ sort: e.target.value })}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-brand-400"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Results Count */}
            {!isLoading && (
              <p className="text-sm text-gray-500 mb-4">
                {pagination.total
                  ? `${pagination.total.toLocaleString()} deals found${category ? ` in "${category}"` : ''}${search ? ` for "${search}"` : ''}`
                  : 'No products found'
                }
              </p>
            )}

            {/* Loading Skeleton */}
            {isLoading && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                    <div className="aspect-square bg-gray-100" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-8 bg-gray-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Product Grid */}
            {!isLoading && products.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {products.map(product => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && products.length === 0 && (
              <div className="text-center py-20">
                <div className="text-4xl mb-3">😕</div>
                <p className="text-gray-600 font-medium">No products found</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
              </div>
            )}

            {/* Pagination */}
            {!isLoading && pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {Array.from({ length: pagination.pages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => updateQuery({ page: i + 1 })}
                    className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${
                      parseInt(page) === i + 1
                        ? 'bg-brand-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
