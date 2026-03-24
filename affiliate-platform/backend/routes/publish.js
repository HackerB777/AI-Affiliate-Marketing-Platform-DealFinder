/**
 * routes/publish.js — Auto Publisher endpoints
 * POST /api/publish/:productId   — publish a single product
 * POST /api/publish/auto         — publish all ready products
 * GET  /api/publish/status       — get publishing queue status
 */

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const BlogPost = require('../models/BlogPost');
const logger = require('../utils/logger');

function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.admin_key;
  if (key !== process.env.ADMIN_API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

/**
 * Publishes a product: marks it published and creates a BlogPost document
 */
async function publishProduct(productId) {
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');
  if (!product.slug) throw new Error('Product has no slug — generate content first');
  if (!product.blog_post) throw new Error('Product has no blog content — generate content first');

  // Create or update the blog post
  const blogData = {
    title: product.seo_title || product.name,
    slug: product.slug,
    excerpt: product.seo_description,
    content: product.blog_post,
    product_id: product._id,
    product_name: product.name,
    affiliate_link: product.affiliate_link,
    seo_title: product.seo_title,
    seo_description: product.seo_description,
    keywords: product.keywords,
    schema_markup: product.schema_markup,
    category: product.category,
    tags: product.keywords?.slice(0, 5) || [],
    type: 'product_review',
    status: 'published',
    published_at: new Date(),
    featured_image: product.image,
    image_alt: product.name,
  };

  await BlogPost.findOneAndUpdate(
    { slug: product.slug },
    blogData,
    { upsert: true, new: true }
  );

  // Mark product as published
  await Product.findByIdAndUpdate(productId, {
    is_published: true,
    published_at: new Date(),
  });

  logger.info(`📢 Published: ${product.name} → /${product.slug}`);
  return { name: product.name, slug: product.slug };
}

// ─── POST /api/publish/:productId ─────────────────────────────────────────
router.post('/:productId', requireAdminKey, async (req, res) => {
  try {
    const result = await publishProduct(req.params.productId);
    res.json({ message: 'Published successfully', ...result });
  } catch (err) {
    logger.error(`Publish error: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

// ─── POST /api/publish/auto ───────────────────────────────────────────────
// Publishes all products that have content but aren't published yet
router.post('/auto', requireAdminKey, async (req, res) => {
  try {
    const ready = await Product.find({
      is_published: false,
      content_generated_at: { $exists: true },
      slug: { $exists: true },
      blog_post: { $exists: true },
    }).select('_id name');

    if (ready.length === 0) {
      return res.json({ message: 'No products ready to publish' });
    }

    const results = await Promise.allSettled(
      ready.map(p => publishProduct(p._id.toString()))
    );

    const published = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({ message: `Published ${published} products`, published, failed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/publish/status ──────────────────────────────────────────────
router.get('/status', requireAdminKey, async (req, res) => {
  try {
    const [total, published, withContent, readyToPublish] = await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({ is_published: true }),
      Product.countDocuments({ content_generated_at: { $exists: true } }),
      Product.countDocuments({
        is_published: false,
        content_generated_at: { $exists: true },
        slug: { $exists: true },
      }),
    ]);

    res.json({ total, published, with_content: withContent, ready_to_publish: readyToPublish });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
