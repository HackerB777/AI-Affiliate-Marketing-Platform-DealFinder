/**
 * automation/scheduler.js — Main automation orchestrator
 * Runs scheduled jobs using node-cron:
 *   - Every 6 hours: update prices
 *   - Every 12 hours: discover new products
 *   - Every 24 hours: generate content + auto-publish
 *
 * Run: node automation/scheduler.js
 * Or start via: npm run cron
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const cron = require('node-cron');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { discoverProducts } = require('../services/productDiscovery');
const { rankProducts } = require('../services/rankingEngine');
const { generateBatchContent } = require('../services/contentGenerator');
const { runPriceUpdateCycle } = require('../services/priceTracker');
const Product = require('../models/Product');
const BlogPost = require('../models/BlogPost');

// ─── Database Connection ────────────────────────────────────────────────────
async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  logger.info('✅ Scheduler connected to MongoDB');
}

// ─── Job 1: Price Update (Every 6 hours) ────────────────────────────────────
async function jobPriceUpdate() {
  logger.info('⏰ [CRON] Starting price update job...');
  try {
    const result = await runPriceUpdateCycle();
    logger.info(`⏰ [CRON] Price update complete: ${JSON.stringify(result)}`);
  } catch (err) {
    logger.error(`⏰ [CRON] Price update failed: ${err.message}`);
  }
}

// ─── Job 2: Product Discovery (Every 12 hours) ──────────────────────────────
const DISCOVERY_QUERIES = [
  { keywords: 'best smartphones under 20000', category: 'Electronics' },
  { keywords: 'laptop deals student', category: 'Computers' },
  { keywords: 'wireless earbuds noise cancelling', category: 'Electronics' },
  { keywords: 'smart tv 4k best price', category: 'Electronics' },
  { keywords: 'gaming chair ergonomic', category: 'Home' },
];

async function jobProductDiscovery() {
  logger.info('⏰ [CRON] Starting product discovery job...');
  let totalSaved = 0;

  for (const query of DISCOVERY_QUERIES) {
    try {
      const products = await discoverProducts(query);
      const ranked = rankProducts(products, 10);

      const ops = ranked.map(p => ({
        updateOne: {
          filter: { source: p.source, source_product_id: p.source_product_id },
          update: { $set: p },
          upsert: true,
        },
      }));

      if (ops.length > 0) {
        const result = await Product.bulkWrite(ops);
        totalSaved += result.upsertedCount;
        logger.info(`  → "${query.keywords}": saved ${result.upsertedCount} new products`);
      }

      // Throttle between queries
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (err) {
      logger.error(`  → Discovery error for "${query.keywords}": ${err.message}`);
    }
  }

  logger.info(`⏰ [CRON] Discovery complete: ${totalSaved} new products saved`);
}

// ─── Job 3: Content Generation (Every 24 hours) ──────────────────────────────
async function jobContentGeneration() {
  logger.info('⏰ [CRON] Starting content generation job...');

  try {
    // Find products without content
    const products = await Product.find({
      content_generated_at: { $exists: false },
      is_available: true,
    })
      .sort({ rank_score: -1 })
      .limit(5); // Generate 5 per cycle to control API costs

    if (products.length === 0) {
      logger.info('⏰ [CRON] No products need content generation');
      return;
    }

    const results = await generateBatchContent(products.map(p => p.toObject()), 2);

    // Save content to products
    const updateOps = results.map(({ product, content }) => ({
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { ...content, content_generated_at: new Date() } },
      },
    }));
    await Product.bulkWrite(updateOps);

    logger.info(`⏰ [CRON] Content generated for ${results.length} products`);
  } catch (err) {
    logger.error(`⏰ [CRON] Content generation failed: ${err.message}`);
  }
}

// ─── Job 4: Auto Publish (Every 24 hours, 30 min after content) ─────────────
async function jobAutoPublish() {
  if (process.env.PUBLISH_AUTO !== 'true') {
    logger.info('⏰ [CRON] Auto-publish disabled (PUBLISH_AUTO != true)');
    return;
  }

  logger.info('⏰ [CRON] Starting auto-publish job...');

  try {
    const ready = await Product.find({
      is_published: false,
      content_generated_at: { $exists: true },
      slug: { $exists: true },
      blog_post: { $exists: true },
    });

    let published = 0;
    for (const product of ready) {
      try {
        await BlogPost.findOneAndUpdate(
          { slug: product.slug },
          {
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
            status: 'published',
            published_at: new Date(),
            featured_image: product.image,
          },
          { upsert: true }
        );

        await Product.findByIdAndUpdate(product._id, {
          is_published: true,
          published_at: new Date(),
        });

        published++;
        logger.info(`  → Published: ${product.name}`);
      } catch (err) {
        logger.error(`  → Failed to publish ${product.name}: ${err.message}`);
      }
    }

    logger.info(`⏰ [CRON] Auto-publish complete: ${published}/${ready.length} published`);
  } catch (err) {
    logger.error(`⏰ [CRON] Auto-publish failed: ${err.message}`);
  }
}

// ─── Register Cron Jobs ──────────────────────────────────────────────────────
async function startScheduler() {
  await connectDB();

  logger.info('🕐 Starting cron scheduler...');

  // Price update: every 6 hours
  cron.schedule('0 */6 * * *', jobPriceUpdate, { name: 'price-update' });

  // Product discovery: every 12 hours at midnight and noon
  cron.schedule('0 0,12 * * *', jobProductDiscovery, { name: 'product-discovery' });

  // Content generation: every day at 2 AM
  cron.schedule('0 2 * * *', jobContentGeneration, { name: 'content-generation' });

  // Auto publish: every day at 3 AM (30 min after content gen)
  cron.schedule('30 2 * * *', jobAutoPublish, { name: 'auto-publish' });

  logger.info('✅ Cron jobs registered:');
  logger.info('  🔄 Price updates:     Every 6 hours');
  logger.info('  🔍 Product discovery: Every 12 hours');
  logger.info('  ✍️  Content gen:       Daily at 2:00 AM');
  logger.info('  📢 Auto publish:      Daily at 2:30 AM');

  // Run discovery immediately on first start if DB is empty
  const count = await Product.countDocuments();
  if (count === 0) {
    logger.info('📦 No products in DB — running initial discovery...');
    await jobProductDiscovery();
    await jobContentGeneration();
    await jobAutoPublish();
  }
}

startScheduler().catch(err => {
  logger.error(`Scheduler failed to start: ${err.message}`);
  process.exit(1);
});
