/**
 * models/BlogPost.js — Schema for published blog/review posts
 */

const mongoose = require('mongoose');

const BlogPostSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  excerpt: { type: String, trim: true, maxlength: 300 },
  content: { type: String, required: true }, // Full HTML content

  // Related product
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  product_name: { type: String },
  affiliate_link: { type: String },

  // SEO
  seo_title: { type: String },
  seo_description: { type: String, maxlength: 160 },
  keywords: [String],
  schema_markup: { type: mongoose.Schema.Types.Mixed }, // JSON-LD

  // Content classification
  category: { type: String },
  tags: [String],
  type: {
    type: String,
    enum: ['product_review', 'comparison', 'buying_guide', 'deals'],
    default: 'product_review',
  },

  // Publishing
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  published_at: { type: Date },

  // Analytics
  views: { type: Number, default: 0 },
  avg_time_on_page: { type: Number, default: 0 }, // seconds
  bounce_rate: { type: Number, default: 0 },

  // Featured image
  featured_image: { type: String },
  image_alt: { type: String },
}, {
  timestamps: true,
});

BlogPostSchema.index({ slug: 1 }, { unique: true });
BlogPostSchema.index({ status: 1, published_at: -1 });
BlogPostSchema.index({ category: 1, status: 1 });
BlogPostSchema.index({ '$**': 'text' });

module.exports = mongoose.model('BlogPost', BlogPostSchema);
