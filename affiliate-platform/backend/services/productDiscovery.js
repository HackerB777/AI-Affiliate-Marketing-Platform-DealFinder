/**
 * services/productDiscovery.js
 * Product Discovery Agent — fetches products from Amazon & Flipkart,
 * filters by discount/rating, and outputs structured JSON
 */

const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

// ─── Amazon Product Advertising API (PA-API 5.0) ────────────────────────────
class AmazonAPI {
  constructor() {
    this.accessKey = process.env.AMAZON_ACCESS_KEY;
    this.secretKey = process.env.AMAZON_SECRET_KEY;
    this.partnerTag = process.env.AMAZON_PARTNER_TAG;
    this.host = process.env.AMAZON_HOST || 'webservices.amazon.in';
    this.region = process.env.AMAZON_REGION || 'eu-west-1';
    this.endpoint = `https://${this.host}/paapi5/searchitems`;
  }

  /**
   * Generates AWS Signature v4 headers required for PA-API authentication
   */
  _sign(payload) {
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateShort = date.substr(0, 8);
    const service = 'ProductAdvertisingAPI';

    const canonicalHeaders = [
      `content-encoding:amz-1.0`,
      `content-type:application/json; charset=utf-8`,
      `host:${this.host}`,
      `x-amz-date:${date}`,
      `x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems`,
    ].join('\n');

    const canonicalRequest = [
      'POST',
      '/paapi5/searchitems',
      '',
      canonicalHeaders + '\n',
      'content-encoding;content-type;host;x-amz-date;x-amz-target',
      crypto.createHash('sha256').update(payload).digest('hex'),
    ].join('\n');

    const credentialScope = `${dateShort}/${this.region}/${service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      date,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
    const signingKey = hmac(
      hmac(hmac(hmac(`AWS4${this.secretKey}`, dateShort), this.region), service),
      'aws4_request'
    );
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    return {
      'Content-Encoding': 'amz-1.0',
      'Content-Type': 'application/json; charset=utf-8',
      Host: this.host,
      'X-Amz-Date': date,
      'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems',
      Authorization: `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope},SignedHeaders=content-encoding;content-type;host;x-amz-date;x-amz-target,Signature=${signature}`,
    };
  }

  /**
   * Search Amazon for products in a given category
   * @param {string} keywords - Search keywords
   * @param {string} category - Browse node / category
   * @returns {Array} Raw product items
   */
  async searchProducts(keywords, category = 'Electronics') {
    const payload = JSON.stringify({
      PartnerTag: this.partnerTag,
      PartnerType: 'Associates',
      Keywords: keywords,
      SearchIndex: category,
      ItemCount: 10,
      Resources: [
        'ItemInfo.Title',
        'ItemInfo.Features',
        'ItemInfo.ContentInfo',
        'Offers.Listings.Price',
        'Offers.Listings.SavingBasis',
        'Offers.Summaries.LowestPrice',
        'Images.Primary.Large',
        'CustomerReviews.StarRating',
        'CustomerReviews.Count',
        'BrowseNodeInfo.BrowseNodes',
      ],
    });

    try {
      const headers = this._sign(payload);
      const response = await axios.post(this.endpoint, payload, { headers, timeout: 10000 });
      return response.data?.SearchResult?.Items || [];
    } catch (err) {
      logger.error(`Amazon API error: ${err.message}`);
      return [];
    }
  }

  /**
   * Normalizes Amazon item data to our standard format
   */
  normalizeItem(item) {
    const listing = item.Offers?.Listings?.[0];
    const price = listing?.Price?.Amount;
    const originalPrice = listing?.SavingBasis?.Amount || price;
    const rating = item.CustomerReviews?.StarRating?.Value || 0;
    const reviewCount = item.CustomerReviews?.Count || 0;

    if (!price || !originalPrice) return null;

    const discount = originalPrice > 0
      ? ((originalPrice - price) / originalPrice) * 100
      : 0;

    return {
      name: item.ItemInfo?.Title?.DisplayValue || 'Unknown Product',
      price: parseFloat(price),
      original_price: parseFloat(originalPrice),
      discount: parseFloat(discount.toFixed(2)),
      rating: parseFloat(rating),
      review_count: parseInt(reviewCount),
      affiliate_link: item.DetailPageURL,
      image: item.Images?.Primary?.Large?.URL,
      features: item.ItemInfo?.Features?.DisplayValues || [],
      source: 'amazon',
      source_product_id: item.ASIN,
      category: 'electronics',
    };
  }
}

// ─── Flipkart Affiliate API ─────────────────────────────────────────────────
class FlipkartAPI {
  constructor() {
    this.trackingId = process.env.FLIPKART_TRACKING_ID;
    this.token = process.env.FLIPKART_TOKEN;
    this.baseUrl = 'https://affiliate-api.flipkart.net/affiliate';
  }

  /**
   * Fetches trending deals from Flipkart
   */
  async getTrendingDeals(category = 'mobiles') {
    try {
      const response = await axios.get(`${this.baseUrl}/1.0/feeds/${this.trackingId}/category/${category}/json`, {
        headers: { 'Fk-Affiliate-Token': this.token },
        timeout: 10000,
      });
      return response.data?.apiGroups?.[0]?.apiListings || [];
    } catch (err) {
      logger.error(`Flipkart API error: ${err.message}`);
      return [];
    }
  }

  /**
   * Normalizes Flipkart item data to our standard format
   */
  normalizeItem(item) {
    const info = item.productBaseInfoV1;
    if (!info) return null;

    const price = info.flipkartSpecialPrice?.amount || info.maximumRetailPrice?.amount;
    const mrp = info.maximumRetailPrice?.amount;

    if (!price || !mrp) return null;

    const discount = mrp > 0 ? ((mrp - price) / mrp) * 100 : 0;

    return {
      name: info.title || 'Unknown Product',
      price: parseFloat(price),
      original_price: parseFloat(mrp),
      discount: parseFloat(discount.toFixed(2)),
      rating: parseFloat(info.overallRating || 0),
      review_count: parseInt(info.totalReviewCount || 0),
      affiliate_link: info.productUrl?.replace('https://', `https://${this.trackingId}.`),
      image: info.imageUrls?.['400x400'],
      features: info.keySpecs || [],
      source: 'flipkart',
      source_product_id: info.productId,
      category: info.categoryPath?.split('/')[0]?.toLowerCase() || 'general',
    };
  }
}

// ─── Mock Product Generator (for development without API keys) ───────────────
function generateMockProducts(count = 20) {
  const categories = ['laptops', 'smartphones', 'headphones', 'cameras', 'smartwatches'];
  const brands = ['Samsung', 'Apple', 'Sony', 'LG', 'Xiaomi', 'OnePlus', 'Realme', 'Boat'];
  const products = [];

  for (let i = 0; i < count; i++) {
    const cat = categories[i % categories.length];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const mrp = Math.floor(Math.random() * 80000) + 5000;
    const discount = Math.floor(Math.random() * 60) + 10;
    const price = Math.floor(mrp * (1 - discount / 100));
    const rating = (3.5 + Math.random() * 1.5).toFixed(1);

    products.push({
      name: `${brand} ${cat.charAt(0).toUpperCase() + cat.slice(1)} Model ${2024 + (i % 2)}`,
      price,
      original_price: mrp,
      discount,
      rating: parseFloat(rating),
      review_count: Math.floor(Math.random() * 5000) + 100,
      affiliate_link: `https://www.amazon.in/dp/MOCK${String(i).padStart(4, '0')}?tag=${process.env.AMAZON_PARTNER_TAG || 'mock-21'}`,
      image: `https://via.placeholder.com/400x400?text=${encodeURIComponent(brand)}`,
      features: [`Feature 1 of ${brand}`, 'High performance', 'Long battery life'],
      source: i % 2 === 0 ? 'amazon' : 'flipkart',
      source_product_id: `MOCK${String(i).padStart(8, '0')}`,
      category: cat,
      brand,
    });
  }
  return products;
}

// ─── Main Discovery + Filter Logic ──────────────────────────────────────────

/**
 * MIN_DISCOUNT and MIN_RATING are our quality thresholds.
 * Products not meeting these are excluded from ranking.
 */
const MIN_DISCOUNT = 20;   // 20% minimum discount
const MIN_RATING = 4.0;    // 4.0+ stars only

/**
 * Filters products based on quality thresholds
 * @param {Array} products - Raw normalized product objects
 * @returns {Array} Filtered products
 */
function filterProducts(products) {
  return products.filter(p =>
    p &&
    p.price > 0 &&
    p.original_price > 0 &&
    p.discount >= MIN_DISCOUNT &&
    p.rating >= MIN_RATING &&
    p.affiliate_link
  );
}

/**
 * Main export: discovers and filters products from all sources
 * @param {Object} options - { keywords, category, useMock }
 * @returns {Array} Filtered & normalized product list
 */
async function discoverProducts(options = {}) {
  const {
    keywords = 'best deals',
    category = 'Electronics',
    useMock = !process.env.AMAZON_ACCESS_KEY, // fallback to mock if no API keys
  } = options;

  logger.info(`🔍 Discovering products: keywords="${keywords}", category="${category}"`);

  if (useMock) {
    logger.info('⚠️  Using mock products (no API keys configured)');
    const mocks = generateMockProducts(30);
    return filterProducts(mocks);
  }

  const amazon = new AmazonAPI();
  const flipkart = new FlipkartAPI();

  const [amazonItems, flipkartItems] = await Promise.allSettled([
    amazon.searchProducts(keywords, category),
    flipkart.getTrendingDeals(category.toLowerCase()),
  ]);

  const allProducts = [
    ...(amazonItems.status === 'fulfilled' ? amazonItems.value.map(i => amazon.normalizeItem(i)) : []),
    ...(flipkartItems.status === 'fulfilled' ? flipkartItems.value.map(i => flipkart.normalizeItem(i)) : []),
  ].filter(Boolean);

  const filtered = filterProducts(allProducts);
  logger.info(`✅ Discovered ${allProducts.length} products, ${filtered.length} passed filters`);
  return filtered;
}

module.exports = { discoverProducts, filterProducts, generateMockProducts };
