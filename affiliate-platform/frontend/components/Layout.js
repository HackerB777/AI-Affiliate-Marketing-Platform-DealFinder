/**
 * components/Layout.js — Site-wide layout: header, main, footer
 */

import Link from 'next/link';
import { useState } from 'react';
import ChatWidget from './ChatWidget';

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'All Deals' },
    { href: '/blog', label: 'Reviews' },
    { href: '/categories', label: 'Categories' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Announcement Bar ──────────────────────────────────────── */}
      <div className="bg-brand-600 text-white text-center py-2 text-xs font-medium tracking-wide">
        🔥 New deals added daily — All prices updated every 6 hours
      </div>

      {/* ── Navbar ────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-black text-brand-500">Deal</span>
              <span className="text-2xl font-black text-gray-800">Finder</span>
              <span className="hidden sm:block text-xs font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full ml-1">
                India
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Search Bar */}
            <div className="hidden md:flex items-center gap-3">
              <form
                action="/products"
                method="GET"
                className="flex items-center"
              >
                <input
                  name="search"
                  placeholder="Search deals..."
                  className="w-52 text-sm border border-gray-200 rounded-l-lg px-3 py-2 focus:outline-none focus:border-brand-400"
                />
                <button
                  type="submit"
                  className="bg-brand-500 text-white px-3 py-2 rounded-r-lg text-sm hover:bg-brand-600 transition-colors"
                >
                  🔍
                </button>
              </form>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span className="text-xl">{menuOpen ? '✕' : '☰'}</span>
            </button>
          </div>

          {/* Mobile Nav */}
          {menuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100">
              {navLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="block py-2 text-sm font-medium text-gray-700 hover:text-brand-600"
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-3">DealFinder India</h4>
              <p className="text-xs leading-relaxed">
                AI-powered deal discovery. We find the best discounts so you don't have to.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Categories</h4>
              <ul className="space-y-1 text-sm">
                {['Smartphones', 'Laptops', 'Audio', 'Cameras', 'Smart TVs'].map(c => (
                  <li key={c}>
                    <Link href={`/products?category=${c.toLowerCase()}`} className="hover:text-white transition-colors">
                      {c}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Resources</h4>
              <ul className="space-y-1 text-sm">
                {['Buying Guides', 'Price History', 'Top Rated', 'New Arrivals'].map(r => (
                  <li key={r}><Link href="/blog" className="hover:text-white transition-colors">{r}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Legal</h4>
              <ul className="space-y-1 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/affiliate-disclosure" className="hover:text-white transition-colors">Affiliate Disclosure</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs">© 2025 DealFinder India. All rights reserved.</p>
            <p className="text-xs">
              ⚠️ Affiliate Disclosure: We earn commissions from qualifying purchases.{' '}
              <Link href="/affiliate-disclosure" className="underline hover:text-white">Learn more</Link>
            </p>
          </div>
        </div>
      </footer>

      {/* ── Floating AI Chat Widget ───────────────────────────────── */}
      <ChatWidget />
    </div>
  );
}
