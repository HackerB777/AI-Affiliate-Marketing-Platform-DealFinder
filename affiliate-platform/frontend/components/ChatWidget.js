/**
 * components/ChatWidget.js — Floating AI chat assistant
 * Opens a slide-up panel with product-aware conversational AI
 */

import { useState, useRef, useEffect } from 'react';
import { chatAPI, productAPI } from '../lib/api';
import toast from 'react-hot-toast';

// Unique session ID per browser visit
const SESSION_ID = typeof window !== 'undefined'
  ? (sessionStorage.getItem('chat_session') || (() => {
      const id = Math.random().toString(36).slice(2);
      sessionStorage.setItem('chat_session', id);
      return id;
    })())
  : 'ssr';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Hi! Ask me anything like:\n• "Best smartphone under ₹20,000"\n• "Laptop with best battery life"\n• "Top rated earphones today"',
      products: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const { data } = await chatAPI.send(msg, SESSION_ID);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.message, products: data.products || [] },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '❌ Sorry, I\'m having trouble connecting. Please try again.', products: [] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const QUICK_PROMPTS = [
    'Best phone under ₹15K',
    'Top laptops 2024',
    'Earphones with ANC',
    'Best TV under ₹30K',
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-brand-500 text-white shadow-lg
                   hover:bg-brand-600 transition-all duration-200 hover:scale-110 flex items-center justify-center text-2xl"
        aria-label="Open AI chat"
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ height: 520, animation: 'slideUp 0.25s ease-out' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white px-4 py-3 flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <div>
              <p className="font-semibold text-sm">DealFinder AI</p>
              <p className="text-xs text-orange-100">Find the best deals instantly</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-slow"></span>
              <span className="text-xs text-orange-100">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} chat-bubble-enter`}>
                <div className={`max-w-[85%] ${msg.role === 'user'
                  ? 'bg-brand-500 text-white rounded-2xl rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100 shadow-sm'
                  } px-4 py-2.5 text-sm leading-relaxed`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>

                  {/* Product Quick Results */}
                  {msg.products?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.products.slice(0, 3).map(p => (
                        <div key={p._id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white flex-shrink-0 border border-gray-100">
                            {p.image
                              ? <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                              : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{p.name}</p>
                            <p className="text-xs text-green-600 font-semibold">
                              ₹{p.price?.toLocaleString('en-IN')} · {p.discount}% off
                            </p>
                          </div>
                          <button
                            onClick={() => window.open(p.affiliate_link, '_blank')}
                            className="text-xs text-brand-600 font-semibold hover:underline flex-shrink-0"
                          >
                            Buy →
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto scrollbar-hide">
            {QUICK_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                className="flex-shrink-0 text-xs bg-gray-100 hover:bg-brand-50 hover:text-brand-700 text-gray-600
                           px-2.5 py-1.5 rounded-full transition-colors whitespace-nowrap"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about any product..."
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-400"
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="btn-cta px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}
