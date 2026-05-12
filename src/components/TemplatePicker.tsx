'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface Design {
  id: number;
  design_id: string;
  name: string;
  description: string | null;
  ink_colors: string | null;
  garment_colors: string[] | null;
  product_types: string[] | null;
  thumbnail_url: string | null;
  image_urls: string[] | null;
  category: string | null;
}

const CATEGORIES = [
  'Summer',
  'Winter',
  'Fall',
  'VBS',
  'Camp',
  'Missions',
  'DNOW',
  'Baptism',
  'Sun Reveal',
  'Wet Reveal',
] as const;

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (design: Design) => void;
  apparelProduct: string;
}

const PAGE_SIZE = 24;

function getProductTypeFilters(apparelProduct: string): string[] {
  switch (apparelProduct) {
    case 'Super Soft Tee':
      return ['T-Shirt', 'Short Sleeve'];
    case 'Super Soft Long Sleeve':
      return ['Long Sleeve'];
    case 'Super Soft Crewneck':
      return ['Pullover', 'Fleecewear'];
    case 'Super Soft Hoodie':
      return ['Hoodie'];
    default:
      return [];
  }
}

export type { Design };

export default function TemplatePicker({
  open,
  onClose,
  onSelect,
  apparelProduct,
}: TemplatePickerProps) {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [preview, setPreview] = useState<Design | null>(null);
  const [previewImageIdx, setPreviewImageIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Stabilize: use refs for values needed inside scroll handler
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const pageRef = useRef(0);
  const searchRef = useRef('');

  const productTypeFilters = useMemo(
    () => getProductTypeFilters(apparelProduct),
    [apparelProduct]
  );

  const fetchPage = async (pageNum: number, searchTerm: string, append: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('customizable_designs')
      .select(
        'id, design_id, name, description, ink_colors, garment_colors, product_types, thumbnail_url, image_urls, category',
        { count: 'exact' }
      )
      .order('name', { ascending: false })
      .range(from, to);

    if (searchTerm.trim()) {
      query = query.ilike('name', `%${searchTerm.trim()}%`);
    }

    if (productTypeFilters.length > 0) {
      query = query.overlaps('product_types', productTypeFilters);
    }

    if (selectedCategory) {
      query = query.eq('category', selectedCategory);
    }

    const { data, error, count } = await query;

    loadingRef.current = false;
    setLoading(false);

    if (error) {
      console.error(error);
      return;
    }

    const newHasMore = (data?.length ?? 0) === PAGE_SIZE;
    hasMoreRef.current = newHasMore;
    setHasMore(newHasMore);
    setTotalCount(count);

    if (append) {
      setDesigns((prev) => [...prev, ...(data ?? [])]);
    } else {
      setDesigns(data ?? []);
      scrollRef.current?.scrollTo({ top: 0 });
    }
  };

  // Load initial page when modal opens or filters change
  useEffect(() => {
    if (!open) return;
    pageRef.current = 0;
    fetchPage(0, search, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, search, productTypeFilters, selectedCategory]);

  // Keep search ref in sync
  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const handleScroll = () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 400) {
      const nextPage = pageRef.current + 1;
      pageRef.current = nextPage;
      fetchPage(nextPage, searchRef.current, true);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col"
          style={{ maxHeight: '90vh' }}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-heading uppercase text-brand-black">Choose a Template</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {totalCount !== null ? `${totalCount} designs` : 'Loading...'} available for{' '}
                {apparelProduct}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M6 6l8 8M14 6l-8 8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="flex-shrink-0 px-6 py-3 border-b border-gray-100">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
              >
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M13.5 13.5L17 17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="text"
                placeholder="Search designs by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange focus:border-transparent"
              />
            </div>
          </div>

          {/* Category filter */}
          <div className="flex-shrink-0 px-6 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-0.5">
              <span className="flex-shrink-0 text-[11px] uppercase tracking-[0.18em] font-heading text-gray-500 mr-1">
                Category
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-heading uppercase tracking-wide border transition-colors cursor-pointer ${
                  selectedCategory === null
                    ? 'bg-brand-black text-white border-brand-black'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-brand-orange hover:text-brand-black'
                }`}
              >
                All
              </button>
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(active ? null : cat)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-heading uppercase tracking-wide border transition-colors cursor-pointer ${
                      active
                        ? 'bg-brand-orange text-brand-black border-brand-black'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-brand-orange hover:text-brand-black'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid */}
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4"
            onScroll={handleScroll}
          >
            {designs.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">
                  No designs found{search ? ` for "${search}"` : ''}.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {designs.map((d) => (
                <button
                  key={d.id}
                  className="group bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-brand-orange transition-all text-left cursor-pointer"
                  onClick={() => setPreview(d)}
                >
                  <div className="relative aspect-square bg-gray-50">
                    {d.thumbnail_url ? (
                      <Image
                        src={d.thumbnail_url}
                        alt={d.name}
                        fill
                        className="object-contain p-2 group-hover:scale-105 transition-transform duration-200"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 200px"
                      />
                    ) : (
                      <ImagePlaceholder />
                    )}
                  </div>
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-gray-900 truncate">{d.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {d.ink_colors} ink color{d.ink_colors !== '1' ? 's' : ''}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {loading && (
              <div className="flex justify-center py-6">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-brand-orange animate-pulse"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ─── Design Preview Sub-Modal ─── */}
        <AnimatePresence>
          {preview && (
            <motion.div
              key="preview-overlay"
              className="absolute inset-0 z-[60] flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => {
                  setPreview(null);
                  setPreviewImageIdx(0);
                }}
              />
              <motion.div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.25 }}
              >
                {/* Preview image */}
                <div className="relative aspect-square bg-gray-50">
                  {(() => {
                    const previewSrc =
                      (preview.image_urls && preview.image_urls[previewImageIdx]) ||
                      preview.thumbnail_url;
                    return previewSrc ? (
                      <Image
                        src={previewSrc}
                        alt={preview.name}
                        fill
                        className="object-contain p-4"
                        sizes="500px"
                      />
                    ) : (
                      <ImagePlaceholder />
                    );
                  })()}
                  <button
                    onClick={() => {
                      setPreview(null);
                      setPreviewImageIdx(0);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M6 6l8 8M14 6l-8 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>

                {/* Image thumbnails */}
                {preview.image_urls && preview.image_urls.filter(Boolean).length > 1 && (
                  <div className="flex gap-2 px-4 py-3 overflow-x-auto border-t border-gray-100">
                    {preview.image_urls.map((url, i) =>
                      url ? (
                        <button
                          key={i}
                          className={`relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                            i === previewImageIdx
                              ? 'border-brand-orange'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                          onClick={() => setPreviewImageIdx(i)}
                        >
                          <Image
                            src={url}
                            alt=""
                            fill
                            className="object-contain p-1"
                            sizes="56px"
                          />
                        </button>
                      ) : null
                    )}
                  </div>
                )}

                {/* Details + select */}
                <div className="px-5 py-4 space-y-2">
                  <h3 className="text-base font-semibold text-gray-900">{preview.name}</h3>
                  {preview.description && (
                    <p className="text-sm text-gray-600">{preview.description}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {preview.ink_colors && (
                      <span>
                        {preview.ink_colors} ink color{preview.ink_colors !== '1' ? 's' : ''}
                      </span>
                    )}
                    {preview.garment_colors && preview.garment_colors.length > 0 && (
                      <span>Garments: {preview.garment_colors.join(', ')}</span>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <button
                    onClick={() => {
                      onSelect(preview);
                      setPreview(null);
                      setPreviewImageIdx(0);
                    }}
                    className="w-full bg-brand-black text-white py-3 rounded-full text-sm font-heading uppercase tracking-wide hover:bg-black transition-colors shadow-md hover:shadow-lg cursor-pointer"
                  >
                    Use This Template
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

function ImagePlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-300">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
