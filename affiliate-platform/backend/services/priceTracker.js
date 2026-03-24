/**
 * services/priceTracker.js
 * Price Tracker — updates product prices every 6 hours via cron
 * Stores historical price data for trend analysis
 */

const axios = require('axios');
const Product = require('../models/Product');
const logger = require('../utils/logger');

/**
 * Fetches the current price for a single product from its source
 * Uses lightweight scraping as fallback when API is unavailable
 *
 * @param {Object} product - Product document from MongoDB
 * @returns {Object|null} { price, original_price } or null on failure
 */
async function fetchCurrentPrice(product) {
  try {
    if (product.source === 'amazon' && process.env.AMAZON_ACCESS_KEY) {
      // PA-API lookup by ASIN (similar to productDiscovery.js)
      // In production, use the full signed request via AmazonAPI class
      logger.debug(`Fetching Amazon price for ASIN: ${product.source_product_id}`);
      // Placeholder — replace with full signed PA-API call in production
      return null;
    }

    if (product.source === 'flipkart' && process.env.FLIPKART_TOKEN) {
      const response = await axios.get(
        `https://affiliate-api.flipkart.net/affiliate/1.0/product.json?id=${product.source_product_id}`,
        {
          headers: { 'Fk-Affiliate-Token': process.env.FLIPKART_TOKEN },
          timeout: 8000,
        }
      );
      const info = response.data?.productBaseInfoV1;
      if (info) {
        return {
          price: info.flipkartSpecialPrice?.amount || info.maximumRetailPrice?.amount,
          original_price: info.maximumRetailPrice?.amount,
        };
      }
    }
  } catch (err) {
    logger.warn(`Price fetch failed for ${product.name}: ${err.message}`);
  }
  return null;
}

/**
 * Updates a single product's price and appends to price history
 * @param {Object} product - Mongoose product document
 * @returns {boolean} true if price changed
 */
async function updateProductPrice(product) {
  const newPriceData = await fetchCurrentPrice(product);

  if (!newPriceData || !newPriceData.price) {
    logger.debug(`No price update available for: ${product.name}`);
    await Product.findByIdAndUpdate(product._id, { last_price_check: new Date() });
    return false;
  }

  const { price: newPrice, original_price: newOriginal } = newPriceData;
  const priceChanged = Math.abs(newPrice - product.price) > 0.01;

  if (priceChanged) {
    const newDiscount = newOriginal > 0
      ? ((newOriginal - newPrice) / newOriginal) * 100
      : 0;

    // Append to price history and update current price
    await Product.findByIdAndUpdate(product._id, {
      price: newPrice,
      original_price: newOriginal,
      discount: newDiscount,
      last_price_check: new Date(),
      $push: {
        price_history: {
          $each: [{ price: newPrice, original_price: newOriginal, discount: newDiscount }],
          $slice: -90, // Keep last 90 snapshots (6h intervals = ~22 days)
        },
      },
    });

    logger.info(`💰 Price updated: ${product.name}: ₹${product.price} → ₹${newPrice}`);
    return true;
  }

  await Product.findByIdAndUpdate(product._id, { last_price_check: new Date() });
  return false;
}

/**
 * Runs price updates for all published products in batches
 * Called by the cron scheduler every 6 hours
 */
async function runPriceUpdateCycle() {
  logger.info('🔄 Starting price update cycle...');
  const startTime = Date.now();

  try {
    // Only update published, available products
    const products = await Product.find({
      is_published: true,
      is_available: true,
    }).select('_id name price original_price source source_product_id');

    logger.info(`Found ${products.length} products to check`);

    let updated = 0;
    let failed = 0;
    const BATCH_SIZE = 10;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(updateProductPrice));

      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value) updated++;
        if (r.status === 'rejected') failed++;
      });

      // Throttle: avoid hammering APIs
      if (i + BATCH_SIZE < products.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`✅ Price cycle done: ${updated} updated, ${failed} failed, ${duration}s elapsed`);
    return { updated, failed, total: products.length, duration };

  } catch (err) {
    logger.error(`❌ Price update cycle error: ${err.message}`);
    throw err;
  }
}

module.exports = { runPriceUpdateCycle, updateProductPrice };
