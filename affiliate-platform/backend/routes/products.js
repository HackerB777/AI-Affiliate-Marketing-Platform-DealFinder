/**
 * routes/products.js — CRUD + discovery endpoints for products
 * GET  /api/products           — list all published products
 * GET  /api/products/:slug     — get single product by slug
 * POST /api/products/discover  — trigger product discovery
 * POST /api/products/rank      — rank and save products
 * GET  /api/products/trending  — get trending products
 * PATCH /api/products/:id/track — track click/view event
 */

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { discoverProducts } = require('../services/productDiscovery');
const { rankProducts } = require('../services/rankingEngine');
const logger = require('../utils/logger');

// ─── GET /api/products ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      sort = 'rank_score',
      order = 'desc',
      search,
      min_price,
      max_price,
      min_discount,
    } = req.query;

    const query = { is_published: true, is_available: true };

    if (category) query.category = category.toLowerCase();
    if (min_price || max_price) {
      query.price = {};
      if (min_price) query.price.$gte = parseFloat(min_price);
      if (max_price) query.price.$lte = parseFloat(max_price);
    }
    if (min_discount) query.discount = { $gte: parseFloat(min_discount) };
    if (search) query.$text = { $search: search };

    const sortObj = { [sort]: order === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-blog_post -price_history -schema_markup'), // Exclude heavy fields for lists
      Product.countDocuments(query),
    ]);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.error(`GET /products error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ─── GET /api/products/trending ─────────────────────────────────────────────
router.get('/trending', async (req, res) => {
  try {
    const products = await Product.find({
      is_published: true,
      is_trending: true,
      is_available: true,
    })
      .sort({ rank_score: -1 })
      .limit(10)
      .select('-blog_post -price_history -schema_markup');

    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trending products' });
  }
});

// ─── GET /api/products/:slug ─────────────────────────────────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      is_published: true,
    });

    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Increment view count asynchronously
    Product.findByIdAndUpdate(product._id, { $inc: { views: 1 } }).catch(() => {});

    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ─── POST /api/products/discover ────────────────────────────────────────────
// Admin-only: triggers product discovery + ranking + save
router.post('/discover', requireAdminKey, async (req, res) => {
  try {
    const { keywords = 'best deals', category = 'Electronics' } = req.body;

    const raw = await discoverProducts({ keywords, category });
    const ranked = rankProducts(raw, 10);

    // Upsert to MongoDB (update if source_product_id exists, insert otherwise)
    const ops = ranked.map(product => ({
      updateOne: {
        filter: { source: product.source, source_product_id: product.source_product_id },
        update: { $set: product },
        upsert: true,
      },
    }));

    const result = await Product.bulkWrite(ops);

    res.json({
      message: `Discovered and saved ${ranked.length} products`,
      discovered: raw.length,
      ranked: ranked.length,
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    });
  } catch (err) {
    logger.error(`POST /discover error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/products/:id/track ──────────────────────────────────────────
router.patch('/:id/track', async (req, res) => {
  try {
    const { event } = req.body; // 'view', 'click', 'conversion'
    const validEvents = { view: 'views', click: 'clicks', conversion: 'conversions' };
    const field = validEvents[event];

    if (!field) return res.status(400).json({ error: 'Invalid event type' });

    await Product.findByIdAndUpdate(req.params.id, { $inc: { [field]: 1 } });
    res.json({ tracked: true });
  } catch (err) {
    res.status(500).json({ error: 'Tracking failed' });
  }
});

// ─── Middleware: Admin API Key Check ─────────────────────────────────────────
function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.admin_key;
  if (key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = router;
