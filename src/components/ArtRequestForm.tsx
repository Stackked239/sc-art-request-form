'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import TypingIndicator from './TypingIndicator';
import ChatBubble from './ChatBubble';
import ProductTypeCard from './ProductTypeCard';
import ColorSwatch from './ColorSwatch';
import ProductSummaryModal, { type SummaryData } from './ProductSummaryModal';
import TemplatePicker, { type Design } from './TemplatePicker';
import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────────────

type Step =
  | 'welcome'
  | 'product-type'
  | 'product-select'
  | 'color-select'       // apparel color OR promo color
  | 'promo-product'      // promo: pick product name within a category
  | 'artwork-type';      // apparel: what type of artwork

interface ColorOption {
  name: string;
  hex: string | null;
}

interface CardOption {
  title: string;
  imageSrc: string;
}

// ── Static data ────────────────────────────────────────────────

const WELCOME_MESSAGE =
  "Hey there! We're excited to work with you on this project. I'll be walking you through the art details on your project. This will take about 8 minutes.";

const PRODUCT_TYPES: CardOption[] = [
  {
    title: 'Apparel',
    imageSrc: 'https://cdn.prod.website-files.com/65cfbeb48bcaf136bfe303ff/65cfe040a4a677a37956f31f_SC-05339_Heather%20REd_2.webp',
  },
  {
    title: 'Promo Items',
    imageSrc: 'https://cdn.prod.website-files.com/65cfbeb48bcaf136bfe303ff/65cfbeb48bcaf136bfe3043c_untitled-00856-2.webp',
  },
];

const APPAREL_PRODUCTS: CardOption[] = [
  {
    title: 'Super Soft Tee',
    imageSrc: 'https://cdn.prod.website-files.com/65cfbeb48bcaf136bfe30447/66bc12661c367f75b3707b1b_jpeg_SC-05339_Heather-REd.webp',
  },
  {
    title: 'Super Soft Long Sleeve',
    imageSrc: 'https://cdn.prod.website-files.com/65cfbeb48bcaf136bfe30447/65cfbeb48bcaf136bfe31730_SC-05569.jpeg',
  },
  {
    title: 'Super Soft Crewneck',
    imageSrc: 'https://cdn.prod.website-files.com/65cfbeb48bcaf136bfe30447/671fe46df8393985b1a83169_Apparel%20crewneck.webp',
  },
  {
    title: 'Super Soft Hoodie',
    imageSrc: 'https://cdn.prod.website-files.com/65cfbeb48bcaf136bfe303ff/65cfbeb48bcaf136bfe3043e_Apparel%20Hoodie-07238.webp',
  },
];

const ARTWORK_TYPE_OPTIONS = [
  {
    id: 'own',
    label: 'I will supply my own.',
    icon: '📁',
  },
  {
    id: 'template',
    label: 'Use a Sunday Cool template.',
    icon: '🎨',
  },
  {
    id: 'creative',
    label: 'I need your creative help.',
    icon: '✨',
  },
];

// ── Animation helper hook ──────────────────────────────────────

function useStepAnimation() {
  const [showTyping, setShowTyping] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const start = useCallback(() => {
    setShowTyping(true);
    setShowMessage(false);
    setShowOptions(false);
    setTimeout(() => {
      setShowTyping(false);
      setShowMessage(true);
      setTimeout(() => setShowOptions(true), 400);
    }, 1200);
  }, []);

  return { showTyping, showMessage, showOptions, start };
}

// ── Main component ─────────────────────────────────────────────

export default function ArtRequestForm() {
  const [step, setStep] = useState<Step>('welcome');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Selections
  const [selectedProductType, setSelectedProductType] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedPromoCategory, setSelectedPromoCategory] = useState<string | null>(null);
  const [selectedPromoProduct, setSelectedPromoProduct] = useState<string | null>(null);
  const [selectedArtworkType, setSelectedArtworkType] = useState<string | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);

  // Welcome state
  const [showWelcomeTyping, setShowWelcomeTyping] = useState(true);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [showButton, setShowButton] = useState(false);

  // Step animations
  const productTypeAnim = useStepAnimation();
  const productSelectAnim = useStepAnimation();
  const colorSelectAnim = useStepAnimation();
  const promoProductAnim = useStepAnimation();
  const artworkTypeAnim = useStepAnimation();

  // Dynamic data
  const [promoCategories, setPromoCategories] = useState<CardOption[]>([]);
  const [promoProducts, setPromoProducts] = useState<CardOption[]>([]);
  const [colors, setColors] = useState<ColorOption[]>([]);

  // Summary modal
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

  // Auto-scroll on step change
  useEffect(() => {
    const t = setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
    return () => clearTimeout(t);
  }, [step, colors, promoProducts, promoCategories]);

  // ── Welcome sequence ──

  useEffect(() => {
    const t = setTimeout(() => {
      setShowWelcomeTyping(false);
      setShowWelcomeMessage(true);
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (showWelcomeMessage && step === 'welcome') {
      const t = setTimeout(() => setShowButton(true), 600);
      return () => clearTimeout(t);
    }
  }, [showWelcomeMessage, step]);

  const handleGetStarted = () => {
    setStep('product-type');
    productTypeAnim.start();
  };

  // ── Step: Product Type (Apparel vs Promo) ──

  const handleProductTypeSelect = (productType: string) => {
    setSelectedProductType(productType);
    setStep('product-select');
    productSelectAnim.start();

    if (productType === 'Promo Items') {
      fetchPromoCategories();
    }
  };

  // ── Step: Product Select (apparel product or promo category) ──

  const handleProductSelect = (product: string) => {
    if (selectedProductType === 'Apparel') {
      setSelectedProduct(product);
      setStep('color-select');
      colorSelectAnim.start();
      fetchApparelColors(product);
    } else {
      // Promo: they picked a category, now show products in it
      setSelectedPromoCategory(product);
      setStep('promo-product');
      promoProductAnim.start();
      fetchPromoProducts(product);
    }
  };

  // ── Step: Promo Product (pick product name within category) ──

  const handlePromoProductSelect = (productName: string) => {
    setSelectedPromoProduct(productName);
    setStep('color-select');
    colorSelectAnim.start();
    fetchPromoColors(selectedPromoCategory!, productName);
  };

  // ── Step: Color Select ──

  const handleColorSelect = async (colorName: string) => {
    const colorHex = colors.find((c) => c.name === colorName)?.hex ?? null;

    if (selectedProductType === 'Apparel') {
      const { data, error } = await supabase
        .from('apparel')
        .select('material, color_name, adult_sizes, youth_sizes, printability, available_decorations')
        .eq('product_category', selectedProduct!)
        .eq('color_name', colorName)
        .limit(1)
        .single();

      if (error) { console.error(error); return; }

      setSummaryData({
        type: 'apparel',
        product: selectedProduct!,
        colorName: data.color_name,
        colorHex: colorHex,
        material: data.material,
        adultSizes: data.adult_sizes,
        youthSizes: data.youth_sizes,
        printability: data.printability,
        availableDecorations: data.available_decorations,
      });
    } else {
      const { data, error } = await supabase
        .from('promo_items')
        .select('decoration_options, printable_area')
        .eq('product_category', selectedPromoCategory!)
        .eq('product_name', selectedPromoProduct!)
        .eq('color_name', colorName)
        .limit(1)
        .single();

      if (error) { console.error(error); return; }

      setSummaryData({
        type: 'promo',
        category: selectedPromoCategory!,
        product: selectedPromoProduct!,
        colorName,
        colorHex,
        decorationOptions: data.decoration_options,
        printableArea: data.printable_area,
      });
    }
  };

  const handleSummaryContinue = () => {
    setSummaryData(null);
    if (selectedProductType === 'Apparel') {
      setStep('artwork-type');
      artworkTypeAnim.start();
    } else {
      // Future: promo art details step
      console.log('Promo art details — coming soon');
    }
  };

  const handleArtworkTypeSelect = (optionId: string) => {
    const option = ARTWORK_TYPE_OPTIONS.find((o) => o.id === optionId);
    setSelectedArtworkType(option?.label ?? optionId);

    if (optionId === 'template') {
      setTemplatePickerOpen(true);
    } else {
      // Future: handle 'own' and 'creative' paths
      console.log('Artwork type selected:', optionId);
    }
  };

  const handleDesignSelect = (design: Design) => {
    setSelectedDesign(design);
    setTemplatePickerOpen(false);
    console.log('Template selected:', design.design_id, design.name);
    // Future: advance to next step
  };

  // ── Supabase fetchers ──

  const fetchPromoCategories = async () => {
    const { data, error } = await supabase
      .from('promo_items')
      .select('product_category, thumbnail_url')
      .order('product_category');

    if (error) { console.error(error); return; }

    const seen = new Map<string, string>();
    data.forEach((r) => {
      if (!seen.has(r.product_category)) seen.set(r.product_category, r.thumbnail_url);
    });

    setPromoCategories(
      Array.from(seen.entries()).map(([cat, thumb]) => ({ title: cat, imageSrc: thumb }))
    );
  };

  const fetchApparelColors = async (productCategory: string) => {
    const { data, error } = await supabase
      .from('apparel')
      .select('color_name, color_hex')
      .eq('product_category', productCategory)
      .order('color_name');

    if (error) { console.error(error); return; }
    setColors(data.map((r) => ({ name: r.color_name, hex: r.color_hex })));
  };

  const fetchPromoProducts = async (category: string) => {
    const { data, error } = await supabase
      .from('promo_items')
      .select('product_name, thumbnail_url')
      .eq('product_category', category)
      .order('product_name');

    if (error) { console.error(error); return; }

    const seen = new Map<string, string>();
    data.forEach((r) => {
      if (!seen.has(r.product_name)) seen.set(r.product_name, r.thumbnail_url);
    });

    setPromoProducts(
      Array.from(seen.entries()).map(([name, thumb]) => ({ title: name, imageSrc: thumb }))
    );
  };

  const fetchPromoColors = async (category: string, productName: string) => {
    const { data, error } = await supabase
      .from('promo_items')
      .select('color_name, color_hex')
      .eq('product_category', category)
      .eq('product_name', productName)
      .order('color_name');

    if (error) { console.error(error); return; }
    setColors(data.map((r) => ({ name: r.color_name, hex: r.color_hex })));
  };

  // ── Derived values ──

  const productSelectMessage =
    selectedProductType === 'Apparel'
      ? 'Which apparel product are you looking for?'
      : 'Which product category are you interested in?';

  const productSelectOptions =
    selectedProductType === 'Apparel' ? APPAREL_PRODUCTS : promoCategories;

  const colorMessage =
    selectedProductType === 'Apparel'
      ? `Great choice! What color ${selectedProduct} would you like?`
      : `What color ${selectedPromoProduct} are you looking for?`;

  // Helper: which steps have been passed (to show prior messages + user replies)
  const pastProductType = step !== 'welcome' && step !== 'product-type';
  const pastProductSelect = pastProductType && step !== 'product-select';
  const pastPromoProduct =
    selectedProductType === 'Promo Items' &&
    (step === 'color-select');

  // ── Render ──

  return (
    <div className="min-h-screen bg-brand-daylight flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-black flex items-center justify-center">
            <span className="text-white text-sm font-heading">SC</span>
          </div>
          <div>
            <h1 className="text-sm font-heading uppercase text-brand-black">Sunday Cool</h1>
            <p className="text-xs text-gray-500 font-body">Art Request Form</p>
          </div>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 space-y-4">

          {/* ─── Welcome ─── */}
          <AnimatePresence>
            {showWelcomeTyping && (
              <motion.div key="w-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                <TypingIndicator />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showWelcomeMessage && <ChatBubble key="w-msg" message={WELCOME_MESSAGE} />}
          </AnimatePresence>
          <AnimatePresence>
            {showButton && step === 'welcome' && (
              <motion.div
                key="get-started"
                className="px-4 pl-15"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <button
                  onClick={handleGetStarted}
                  className="bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide hover:bg-black transition-colors"
                >
                  Get Started
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Product Type (Apparel vs Promo) ─── */}
          {step !== 'welcome' && (
            <>
              <AnimatePresence>
                {productTypeAnim.showTyping && (
                  <motion.div key="pt-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {productTypeAnim.showMessage && (
                <ChatBubble key="pt-msg" message="What products are you interested in?" />
              )}
              {/* User reply (once past this step) */}
              {pastProductType && selectedProductType && (
                <UserReply text={selectedProductType} />
              )}
              {/* Cards (only on this step) */}
              <AnimatePresence>
                {productTypeAnim.showOptions && step === 'product-type' && (
                  <OptionsGrid key="pt-cards">
                    {PRODUCT_TYPES.map((p, i) => (
                      <ProductTypeCard
                        key={p.title}
                        title={p.title}
                        imageSrc={p.imageSrc}
                        delay={i * 0.15}
                        onClick={() => handleProductTypeSelect(p.title)}
                      />
                    ))}
                  </OptionsGrid>
                )}
              </AnimatePresence>
            </>
          )}

          {/* ─── Product Select (apparel product OR promo category) ─── */}
          {pastProductType && (
            <>
              <AnimatePresence>
                {productSelectAnim.showTyping && (
                  <motion.div key="ps-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {productSelectAnim.showMessage && (
                <ChatBubble key="ps-msg" message={productSelectMessage} />
              )}
              {/* User reply */}
              {pastProductSelect && (selectedProduct || selectedPromoCategory) && (
                <UserReply text={(selectedProduct || selectedPromoCategory)!} />
              )}
              {/* Cards */}
              <AnimatePresence>
                {productSelectAnim.showOptions && step === 'product-select' && productSelectOptions.length > 0 && (
                  <OptionsGrid key="ps-cards">
                    {productSelectOptions.map((p, i) => (
                      <ProductTypeCard
                        key={p.title}
                        title={p.title}
                        imageSrc={p.imageSrc}
                        delay={i * 0.1}
                        onClick={() => handleProductSelect(p.title)}
                      />
                    ))}
                  </OptionsGrid>
                )}
              </AnimatePresence>
            </>
          )}

          {/* ─── Promo Product (pick product name within category) ─── */}
          {selectedProductType === 'Promo Items' && (step === 'promo-product' || step === 'color-select') && (
            <>
              <AnimatePresence>
                {promoProductAnim.showTyping && (
                  <motion.div key="pp-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {promoProductAnim.showMessage && (
                <ChatBubble
                  key="pp-msg"
                  message={`Which ${selectedPromoCategory} product would you like?`}
                />
              )}
              {/* User reply */}
              {pastPromoProduct && selectedPromoProduct && (
                <UserReply text={selectedPromoProduct} />
              )}
              {/* Cards */}
              <AnimatePresence>
                {promoProductAnim.showOptions && step === 'promo-product' && promoProducts.length > 0 && (
                  <OptionsGrid key="pp-cards">
                    {promoProducts.map((p, i) => (
                      <ProductTypeCard
                        key={p.title}
                        title={p.title}
                        imageSrc={p.imageSrc}
                        delay={i * 0.1}
                        onClick={() => handlePromoProductSelect(p.title)}
                      />
                    ))}
                  </OptionsGrid>
                )}
              </AnimatePresence>
            </>
          )}

          {/* ─── Color Select (apparel or promo) ─── */}
          {step === 'color-select' && (
            <>
              <AnimatePresence>
                {colorSelectAnim.showTyping && (
                  <motion.div key="cs-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {colorSelectAnim.showMessage && (
                <ChatBubble key="cs-msg" message={colorMessage} />
              )}
              <AnimatePresence>
                {colorSelectAnim.showOptions && colors.length > 0 && (
                  <motion.div
                    key="cs-swatches"
                    className="px-4 pl-15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex flex-wrap gap-4 max-w-lg">
                      {colors.map((c, i) => (
                        <ColorSwatch
                          key={c.name}
                          name={c.name}
                          hex={c.hex}
                          delay={i * 0.05}
                          onClick={() => handleColorSelect(c.name)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* ─── Artwork Type (apparel only) ─── */}
          {step === 'artwork-type' && (
            <>
              <AnimatePresence>
                {artworkTypeAnim.showTyping && (
                  <motion.div key="at-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {artworkTypeAnim.showMessage && (
                <ChatBubble key="at-msg" message="What type of artwork would you like?" />
              )}

              {/* Show user reply once they've chosen */}
              {selectedArtworkType && selectedDesign && (
                <UserReply text={selectedArtworkType} />
              )}

              {/* Show the selected design as a chat card */}
              {selectedDesign && (
                <motion.div
                  className="px-4 pl-15"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden max-w-sm">
                    <div className="relative aspect-square bg-gray-50">
                      <Image
                        src={selectedDesign.thumbnail_url}
                        alt={selectedDesign.name}
                        fill
                        className="object-contain p-3"
                        sizes="300px"
                      />
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{selectedDesign.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{selectedDesign.design_id}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Options (hidden once a design is selected) */}
              <AnimatePresence>
                {artworkTypeAnim.showOptions && !selectedDesign && (
                  <motion.div
                    key="at-options"
                    className="px-4 pl-15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex flex-col gap-3 max-w-md">
                      {ARTWORK_TYPE_OPTIONS.map((opt, i) => (
                        <motion.button
                          key={opt.id}
                          className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-4 text-left shadow-sm hover:border-brand-orange hover:shadow-md transition-all cursor-pointer group"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: i * 0.1, ease: 'easeOut' }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleArtworkTypeSelect(opt.id)}
                        >
                          <span className="text-2xl">{opt.icon}</span>
                          <span className="text-sm font-medium text-gray-800 group-hover:text-brand-orange transition-colors">
                            {opt.label}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Summary modal */}
      <ProductSummaryModal data={summaryData} onContinue={handleSummaryContinue} />

      {/* Template picker modal */}
      <TemplatePicker
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onSelect={handleDesignSelect}
        apparelProduct={selectedProduct ?? ''}
      />
    </div>
  );
}

// ── Small helper components ────────────────────────────────────

function UserReply({ text }: { text: string }) {
  return (
    <motion.div
      className="flex justify-end px-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-brand-black text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm max-w-xs">
        <p className="text-sm font-body">{text}</p>
      </div>
    </motion.div>
  );
}

function OptionsGrid({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="px-4 pl-15"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-2 gap-4 max-w-lg">{children}</div>
    </motion.div>
  );
}
