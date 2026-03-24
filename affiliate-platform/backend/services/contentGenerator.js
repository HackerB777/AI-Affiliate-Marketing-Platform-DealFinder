/**
 * services/contentGenerator.js
 * AI Content Generator — uses OpenAI GPT-4 to generate SEO-optimized
 * blog posts, titles, descriptions, pros/cons, and CTAs for each product
 */

const OpenAI = require('openai');
const slugify = require('slugify');
const logger = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── System Prompt (sets AI persona) ────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert affiliate marketing copywriter and SEO specialist.
You write authentic, conversion-optimized product reviews in a friendly, trustworthy tone.
Your content is:
- Human-sounding and natural (never robotic)
- SEO-optimized with strategic keyword placement
- Conversion-focused with clear CTAs
- Helpful and informative, not just promotional
- Structured for both readers and search engines
Always output valid JSON as specified. Never add markdown backticks around JSON.`;

/**
 * Generates a JSON-LD Product schema markup for SEO
 */
function generateSchemaMarkup(product, blogSlug) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": [product.image].filter(Boolean),
    "description": product.description || product.seo_description,
    "brand": {
      "@type": "Brand",
      "name": product.brand || product.name.split(' ')[0],
    },
    "offers": {
      "@type": "Offer",
      "url": product.affiliate_link,
      "priceCurrency": product.currency || "INR",
      "price": product.price,
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": product.source === 'amazon' ? 'Amazon.in' : 'Flipkart',
      },
    },
    "aggregateRating": product.rating > 0 ? {
      "@type": "AggregateRating",
      "ratingValue": product.rating,
      "reviewCount": product.review_count || 1,
      "bestRating": 5,
      "worstRating": 1,
    } : undefined,
    "review": {
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": product.rating,
        "bestRating": 5,
      },
      "author": {
        "@type": "Organization",
        "name": "DealFinder India",
      },
    },
  };
}

/**
 * Main content generation function
 * Calls OpenAI to generate a complete content package for a product
 *
 * @param {Object} product - Normalized product object
 * @returns {Object} Content object with all SEO & marketing fields
 */
async function generateContent(product) {
  logger.info(`✍️  Generating content for: ${product.name}`);

  const prompt = `
Generate complete SEO content for this affiliate product. Return ONLY valid JSON, no markdown.

PRODUCT DATA:
Name: ${product.name}
Price: ₹${product.price.toLocaleString('en-IN')}
Original Price: ₹${product.original_price.toLocaleString('en-IN')}
Discount: ${Math.round(product.discount)}% off
Rating: ${product.rating}/5 (${product.review_count} reviews)
Category: ${product.category}
Features: ${product.features?.join(', ') || 'Not available'}
Source: ${product.source}
Affiliate Link: ${product.affiliate_link}

Generate this JSON structure:
{
  "seo_title": "60-char SEO title with main keyword and benefit",
  "seo_description": "150-160 char meta description with CTA and keyword",
  "slug": "url-friendly-slug-with-keywords",
  "keywords": ["keyword1", "keyword2", ... up to 10 keywords],
  "blog_post": "Full 800-word HTML blog post. Use <h2>, <h3>, <p>, <ul>, <li> tags. Include: intro hook, key features, performance, pros/cons table, price analysis, final verdict. Embed the affiliate link naturally.",
  "features": ["Feature 1 with benefit", "Feature 2 with benefit", ... up to 6],
  "pros": ["Pro 1", "Pro 2", "Pro 3", "Pro 4", "Pro 5"],
  "cons": ["Con 1", "Con 2", "Con 3"],
  "comparison_intro": "2-3 sentences introducing what makes this product unique vs competitors",
  "cta_headline": "Compelling 8-10 word CTA headline",
  "cta_body": "2-3 sentence persuasive CTA body text emphasizing deal",
  "cta_button_text": "5-7 word button text"
}

Requirements:
- blog_post must be ~800 words with actual HTML tags
- Include the current ₹${product.price} price and ${Math.round(product.discount)}% discount in the content
- Keywords should be realistic search terms people use
- Tone: enthusiastic but honest, conversational
- Mention the deal expires or stock is limited (creates urgency)
`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' }, // Enforces JSON output
    });

    const raw = completion.choices[0].message.content;
    const content = JSON.parse(raw);

    // Ensure slug is valid even if AI produces something unusual
    content.slug = slugify(content.slug || product.name, {
      lower: true,
      strict: true,
      trim: true,
    }).substring(0, 100);

    // Attach schema markup
    content.schema_markup = generateSchemaMarkup(product, content.slug);

    logger.info(`✅ Content generated for: ${product.name} (slug: ${content.slug})`);
    return content;

  } catch (err) {
    logger.error(`❌ Content generation failed for ${product.name}: ${err.message}`);

    // Fallback: minimal content so the product can still be published
    const fallbackSlug = slugify(product.name, { lower: true, strict: true }).substring(0, 100);
    return {
      seo_title: `${product.name} - ${Math.round(product.discount)}% Off Deal | Best Price`,
      seo_description: `Buy ${product.name} at ₹${product.price} (${Math.round(product.discount)}% off). Check the latest price and reviews.`,
      slug: fallbackSlug,
      keywords: [product.category, product.name.split(' ').slice(0, 3).join(' ')],
      blog_post: `<p>Get the best deal on <strong>${product.name}</strong> at just ₹${product.price} — that's ${Math.round(product.discount)}% off the original price of ₹${product.original_price}.</p><p>Rated ${product.rating}/5 by customers. <a href="${product.affiliate_link}">Check current price →</a></p>`,
      features: product.features || [],
      pros: ['Great discount', 'High rating', 'Fast delivery'],
      cons: ['Limited stock'],
      cta_headline: `Grab ${Math.round(product.discount)}% Off — Limited Time Deal!`,
      cta_body: `Don't miss this incredible deal on ${product.name}. Stock is limited and price may go up soon.`,
      cta_button_text: `Check Best Price on ${product.source === 'amazon' ? 'Amazon' : 'Flipkart'}`,
      comparison_intro: `${product.name} stands out in its category with exceptional value.`,
      schema_markup: generateSchemaMarkup(product, fallbackSlug),
    };
  }
}

/**
 * Generates content for multiple products in parallel (with concurrency limit)
 * @param {Array} products - Array of product objects
 * @param {number} concurrency - Max parallel OpenAI requests (default 3)
 */
async function generateBatchContent(products, concurrency = 3) {
  const results = [];

  for (let i = 0; i < products.length; i += concurrency) {
    const batch = products.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(generateContent));

    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.push({ product: batch[idx], content: result.value });
      } else {
        logger.error(`Failed for ${batch[idx]?.name}: ${result.reason}`);
      }
    });

    // Small delay between batches to respect rate limits
    if (i + concurrency < products.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

module.exports = { generateContent, generateBatchContent, generateSchemaMarkup };
