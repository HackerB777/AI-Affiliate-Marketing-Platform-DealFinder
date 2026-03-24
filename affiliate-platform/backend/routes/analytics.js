/**
 * routes/analytics.js — Dashboard stats for admin
 */

const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const BlogPost = require('../models/BlogPost');

function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.admin_key;
  if (key !== process.env.ADMIN_API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

router.get('/dashboard', requireAdminKey, async (req, res) => {
  try {
    const [
      totalProducts,
      publishedProducts,
      trendingProducts,
      totalViews,
      totalClicks,
      topProducts,
      recentProducts,
      categoryBreakdown,
    ] = await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({ is_published: true }),
      Product.countDocuments({ is_trending: true, is_published: true }),
      Product.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      Product.aggregate([{ $group: { _id: null, total: { $sum: '$clicks' } } }]),
      Product.find({ is_published: true })
        .sort({ clicks: -1 })
        .limit(5)
        .select('name price discount rating clicks views slug'),
      Product.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name price discount is_published createdAt source'),
      Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

    res.json({
      stats: {
        total_products: totalProducts,
        published: publishedProducts,
        trending: trendingProducts,
        total_views: totalViews[0]?.total || 0,
        total_clicks: totalClicks[0]?.total || 0,
        ctr: totalViews[0]?.total
          ? ((totalClicks[0]?.total / totalViews[0]?.total) * 100).toFixed(1)
          : 0,
      },
      top_products: topProducts,
      recent_products: recentProducts,
      category_breakdown: categoryBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
