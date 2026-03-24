/**
 * services/rankingEngine.js
 * Ranking Engine — scores and ranks products using weighted formula
 *
 * Score = (discount_weight × discount%) + (rating_weight × rating)
 *       + (popularity_weight × log(review_count))
 *       + (price_weight × value_score)
 */

const logger = require('../utils/logger');

// ─── Configurable Weights ─────────────────────────────────────────────────
// These weights determine how much each factor contributes to rank score.
// Should sum to 1.0 for a normalized 0-100 score.
const WEIGHTS = {
  discount: 0.35,    // Higher discount = higher rank (biggest driver)
  rating: 0.30,      // Star rating quality signal
  popularity: 0.20,  // Review count as social proof
  value: 0.15,       // Price-to-quality ratio
};

/**
 * Normalizes a value between 0 and 1 given a min/max range
 */
function normalize(value, min, max) {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Calculates a value score based on how much discount is given
 * relative to the price tier. High discount on expensive item = great value.
 */
function valueScore(product) {
  const savingsAbsolute = product.original_price - product.price;
  // Normalize absolute savings on a log scale (₹500 savings ≠ ₹50,000 savings)
  return Math.log10(Math.max(savingsAbsolute, 1));
}

/**
 * Ranks an array of filtered products and returns top N
 * @param {Array} products - Pre-filtered product objects
 * @param {number} topN - Number of top products to return (default 10)
 * @returns {Array} Ranked products with rank_score field populated
 */
function rankProducts(products, topN = 10) {
  if (!products || products.length === 0) return [];

  // Compute raw scores for normalization
  const discounts = products.map(p => p.discount);
  const ratings = products.map(p => p.rating);
  const reviewCounts = products.map(p => Math.log10(Math.max(p.review_count || 1, 1)));
  const values = products.map(p => valueScore(p));

  const discountRange = [Math.min(...discounts), Math.max(...discounts)];
  const ratingRange = [Math.min(...ratings), Math.max(...ratings)];
  const reviewRange = [Math.min(...reviewCounts), Math.max(...reviewCounts)];
  const valueRange = [Math.min(...values), Math.max(...values)];

  // Score each product
  const scored = products.map(product => {
    const normalizedDiscount = normalize(product.discount, ...discountRange);
    const normalizedRating = normalize(product.rating, ...ratingRange);
    const normalizedPopularity = normalize(
      Math.log10(Math.max(product.review_count || 1, 1)), ...reviewRange
    );
    const normalizedValue = normalize(valueScore(product), ...valueRange);

    const score = (
      WEIGHTS.discount * normalizedDiscount +
      WEIGHTS.rating * normalizedRating +
      WEIGHTS.popularity * normalizedPopularity +
      WEIGHTS.value * normalizedValue
    ) * 100; // Scale to 0-100

    return {
      ...product,
      rank_score: parseFloat(score.toFixed(2)),
      is_trending: score >= 75, // Products with 75+ score are marked trending
    };
  });

  // Sort descending by score, return top N
  const ranked = scored
    .sort((a, b) => b.rank_score - a.rank_score)
    .slice(0, topN);

  logger.info(`📊 Ranked ${products.length} products, returning top ${ranked.length}`);
  ranked.forEach((p, i) =>
    logger.info(`  ${i + 1}. [${p.rank_score.toFixed(1)}] ${p.name} (${p.discount}% off, ⭐ ${p.rating})`)
  );

  return ranked;
}

module.exports = { rankProducts, WEIGHTS };
