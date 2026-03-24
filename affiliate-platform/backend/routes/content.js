/**
 * routes/content.js — AI content generation endpoints
 * POST /api/content/generate/:productId  — generate AI content for a product
 * POST /api/content/generate-batch       — generate content for multiple products
 */

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { generateContent, generateBatchContent } = require('../services/contentGenerator');
const logger = require('../utils/logger');

function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.admin_key;
  if (key !== process.env.ADMIN_API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ─── POST /api/content/generate/:productId ───────────────────────────────────
router.post('/generate/:productId', requireAdminKey, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const content = await generateContent(product.toObject());

    await Product.findByIdAndUpdate(req.params.productId, {
      ...content,
      content_generated_at: new Date(),
    });

    res.json({ message: 'Content generated', slug: content.slug });
  } catch (err) {
    logger.error(`Content generation error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/content/generate-batch ────────────────────────────────────────
// Generates content for all products that don't have it yet
router.post('/generate-batch', requireAdminKey, async (req, res) => {
  try {
    const { limit = 10 } = req.body;
    const products = await Product.find({
      content_generated_at: { $exists: false },
      is_available: true,
    }).limit(parseInt(limit));

    if (products.length === 0) {
      return res.json({ message: 'No products need content generation' });
    }

    const results = await generateBatchContent(products.map(p => p.toObject()));

    const updateOps = results.map(({ product, content }) => ({
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { ...content, content_generated_at: new Date() } },
      },
    }));
    await Product.bulkWrite(updateOps);

    res.json({
      message: `Generated content for ${results.length} products`,
      count: results.length,
    });
  } catch (err) {
    logger.error(`Batch content error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
