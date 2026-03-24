/**
 * routes/chat.js — AI Chat Assistant endpoint
 * POST /api/chat — takes a natural language query, returns product recommendations
 *
 * Example input: "Best laptop under 50000"
 * Example output: { products: [...], comparison: "...", message: "..." }
 */

const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const Product = require('../models/Product');
const logger = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Conversation history store (in-memory; use Redis for production)
const conversationStore = new Map();
const MAX_HISTORY = 10; // Keep last 10 message pairs

/**
 * Extracts search intent from user message using GPT
 * Returns { budget, category, keywords, intent }
 */
async function parseIntent(message) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Extract search intent from this affiliate product query. Return only JSON:
Query: "${message}"
JSON: { "budget_max": number|null, "category": string|null, "keywords": string[], "sort": "price"|"discount"|"rating" }`,
      }],
      temperature: 0,
      max_tokens: 150,
      response_format: { type: 'json_object' },
    });
    return JSON.parse(completion.choices[0].message.content);
  } catch {
    return { budget_max: null, category: null, keywords: message.split(' '), sort: 'rating' };
  }
}

/**
 * Builds a MongoDB query from parsed intent
 */
function buildQuery(intent) {
  const query = { is_published: true, is_available: true };

  if (intent.budget_max) {
    query.price = { $lte: intent.budget_max };
  }
  if (intent.category) {
    query.category = { $regex: intent.category, $options: 'i' };
  }

  return query;
}

// ─── POST /api/chat ──────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { message, session_id = 'default' } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    logger.info(`💬 Chat query: "${message}" (session: ${session_id})`);

    // 1. Parse intent from user message
    const intent = await parseIntent(message);

    // 2. Search products matching intent
    const query = buildQuery(intent);
    const sortMap = {
      price: { price: 1 },
      discount: { discount: -1 },
      rating: { rating: -1, rank_score: -1 },
    };
    const sortObj = sortMap[intent.sort] || { rank_score: -1 };

    let products = await Product.find(query)
      .sort(sortObj)
      .limit(5)
      .select('-blog_post -price_history');

    // Fallback: text search if intent-based returns nothing
    if (products.length === 0 && message) {
      products = await Product.find({
        is_published: true,
        $text: { $search: message },
      })
        .sort({ score: { $meta: 'textScore' } })
        .limit(5)
        .select('-blog_post -price_history');
    }

    // 3. Get or initialize conversation history
    if (!conversationStore.has(session_id)) {
      conversationStore.set(session_id, []);
    }
    const history = conversationStore.get(session_id);

    // 4. Generate AI response with product context
    const productContext = products.length > 0
      ? `Available products:\n${products.map((p, i) =>
          `${i + 1}. ${p.name} — ₹${p.price} (${Math.round(p.discount)}% off, ⭐${p.rating}) | ${p.affiliate_link}`
        ).join('\n')}`
      : 'No matching products found in database.';

    const messages = [
      {
        role: 'system',
        content: `You are a helpful shopping assistant for DealFinder India, an affiliate site.
Help users find the best products. Be concise, friendly, and always include affiliate links when products are shown.
Format product recommendations as a numbered list with price and key benefit.
Always end with a clear CTA to check the deal.`,
      },
      ...history.slice(-MAX_HISTORY * 2),
      {
        role: 'user',
        content: `User query: "${message}"\n\n${productContext}\n\nProvide a helpful response with product recommendations.`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages,
      temperature: 0.7,
      max_tokens: 600,
    });

    const aiResponse = completion.choices[0].message.content;

    // 5. Save to conversation history
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: aiResponse });
    if (history.length > MAX_HISTORY * 2) {
      conversationStore.set(session_id, history.slice(-MAX_HISTORY * 2));
    }

    res.json({
      message: aiResponse,
      products: products.map(p => ({
        _id: p._id,
        name: p.name,
        price: p.price,
        original_price: p.original_price,
        discount: Math.round(p.discount),
        rating: p.rating,
        image: p.image,
        affiliate_link: p.affiliate_link,
        slug: p.slug,
      })),
      intent,
      session_id,
    });

  } catch (err) {
    logger.error(`Chat error: ${err.message}`);
    res.status(500).json({ error: 'Chat service unavailable. Please try again.' });
  }
});

module.exports = router;
