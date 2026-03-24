/**
 * models/Product.js — MongoDB schema for affiliate products
 * Stores product data, pricing history, affiliate metadata, and SEO fields
 */

const mongoose = require('mongoose');

// ─── Price History Sub-Schema ───────────────────────────────────────────────
const PriceHistorySchema = new mongoose.Schema({
  price: { type: Number, required: true },
  original_price: { type: Number },
  discount: { type: Number },
  recorded_at: { type: Date, default: Date.now },
}, { _id: false });

// ─── Product Schema ─────────────────────────────────────────────────────────
const ProductSchema = new mongoose.Schema({
  // Core product data
  name: { type: String, required: true, trim: true, maxlength: 500 },
  description: { type: String, trim: true },
  category: { type: String, required: true, trim: true, lowercase: true },
  subcategory: { type: String, trim: true, lowercase: true },
  brand: { type: String, trim: true },

  // Pricing
  price: { type: Number, required: true, min: 0 },
  original_price: { type: Number, required: true, min: 0 },
  discount: { type: Number, min: 0, max: 100 }, // percentage
  currency: { type: String, default: 'INR' },

  // Ratings & Reviews
  rating: { type: Number, min: 0, max: 5, default: 0 },
  review_count: { type: Number, default: 0 },

  // Images
  image: { type: String },
  images: [{ type: String }],

  // Affiliate Data
  affiliate_link: { type: String, required: true },
  source: {
    type: String,
    enum: ['amazon', 'flipkart', 'meesho', 'myntra', 'manual'],
    required: true,
  },
  source_product_id: { type: String }, // ASIN for Amazon, etc.

  // Ranking Engine Score
  rank_score: { type: Number, default: 0 },
  is_trending: { type: Boolean, default: false },

  // SEO Fields
  slug: { type: String, unique: true, sparse: true },
  seo_title: { type: String },
  seo_description: { type: String },
  keywords: [{ type: String }],

  // Generated Content
  blog_post: { type: String }, // HTML content
  features: [{ type: String }],
  pros: [{ type: String }],
  cons: [{ type: String }],
  schema_markup: { type: mongoose.Schema.Types.Mixed }, // JSON-LD object

  // Publishing
  is_published: { type: Boolean, default: false },
  published_at: { type: Date },
  content_generated_at: { type: Date },

  // Price tracking
  price_history: [PriceHistorySchema],
  last_price_check: { type: Date, default: Date.now },

  // Availability
  is_available: { type: Boolean, default: true },
  stock_status: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock'],
    default: 'in_stock',
  },

  // Analytics
  views: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 }, // click-through rate
}, {
  timestamps: true, // adds createdAt & updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Indexes for Performance ─────────────────────────────────────────────────
ProductSchema.index({ slug: 1 });
ProductSchema.index({ category: 1, rank_score: -1 });
ProductSchema.index({ is_published: 1, rank_score: -1 });
ProductSchema.index({ source: 1, source_product_id: 1 }, { unique: true, sparse: true });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ '$**': 'text' }); // full-text search on all string fields

// ─── Virtual: Discount Display ───────────────────────────────────────────────
ProductSchema.virtual('discount_display').get(function () {
  return this.discount ? `${Math.round(this.discount)}% off` : null;
});

// ─── Virtual: Savings Amount ─────────────────────────────────────────────────
ProductSchema.virtual('savings').get(function () {
  return this.original_price - this.price;
});

// ─── Pre-save: Auto-calculate Discount ──────────────────────────────────────
ProductSchema.pre('save', function (next) {
  if (this.price && this.original_price && this.original_price > 0) {
    this.discount = ((this.original_price - this.price) / this.original_price) * 100;
  }
  next();
});

module.exports = mongoose.model('Product', ProductSchema);
