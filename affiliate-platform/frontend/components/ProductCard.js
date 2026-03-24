/**
 * components/ProductCard.js — Reusable product card with affiliate CTA
 */

import Image from 'next/image';
import Link from 'next/link';
import { productAPI } from '../lib/api';

// Star rating renderer
function Stars({ rating }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`text-sm ${i <= full ? 'text-amber-400' : (half && i === full + 1 ? 'text-amber-300' : 'text-gray-200')}`}>
          ★
        </span>
      ))}
      <span className="text-xs text-gray-500 ml-1">({rating})</span>
    </div>
  );
}

export default function ProductCard({ product, variant = 'default' }) {
  const {
    _id, name, price, original_price, discount, rating, review_count,
    image, affiliate_link, slug, source, is_trending, category,
  } = product;

  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(price);
  const formattedOriginal = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(original_price);

  const handleAffiliateClick = async () => {
    // Track click analytics
    try { await productAPI.track(_id, 'click'); } catch {}
    window.open(affiliate_link, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-brand-200 hover:shadow-sm transition-all">
        <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-50">
          {image ? (
            <Image src={image} alt={name} fill className="object-contain p-1" sizes="64px" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm font-bold text-gray-900">{formattedPrice}</span>
            <span className="text-xs text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded">
              {Math.round(discount)}% off
            </span>
          </div>
        </div>
        <button onClick={handleAffiliateClick} className="btn-cta text-xs px-3 py-2 flex-shrink-0">
          Buy
        </button>
      </div>
    );
  }

  return (
    <div className="product-card group animate-fade-in">
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">
            📦
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {is_trending && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              🔥 Hot
            </span>
          )}
          <span className="badge-discount">{Math.round(discount)}% OFF</span>
        </div>

        {/* Source badge */}
        <div className="absolute top-3 right-3">
          <span className="bg-white/90 text-gray-600 text-xs font-medium px-2 py-1 rounded-full border border-gray-100 capitalize">
            {source}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        <p className="text-xs text-brand-600 font-semibold uppercase tracking-wide mb-1.5 capitalize">
          {category}
        </p>

        {/* Product Name */}
        <Link href={`/products/${slug}`}>
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 hover:text-brand-600 transition-colors mb-2">
            {name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center justify-between mb-3">
          <Stars rating={rating} />
          <span className="text-xs text-gray-400">
            {review_count?.toLocaleString('en-IN')} reviews
          </span>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-xl font-black text-gray-900">{formattedPrice}</span>
          <span className="text-sm text-gray-400 line-through">{formattedOriginal}</span>
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleAffiliateClick}
            className="btn-cta flex-1 text-sm py-2.5"
          >
            Check Price →
          </button>
          <Link
            href={`/products/${slug}`}
            className="btn-secondary text-sm py-2.5 px-3"
          >
            Review
          </Link>
        </div>
      </div>
    </div>
  );
}
