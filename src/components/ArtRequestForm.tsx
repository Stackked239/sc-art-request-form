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
import CreativeQuestionnaire, { type CreativeData } from './CreativeQuestionnaire';
import { supabase } from '@/lib/supabase';

// -- Types --

type Step =
  | 'welcome'
  | 'product-type'
  | 'sizing-select'
  | 'product-select'
  | 'color-select'       // apparel color OR promo color
  | 'promo-product'      // promo: pick product name within a category
  | 'artwork-type'       // apparel: what type of artwork
  | 'template-details'   // apparel "template": customise template fields
  | 'file-upload'        // apparel "own art": upload files
  | 'placement-select'   // apparel: pick placement location
  | 'artwork-details'    // text area for artwork details/instructions
  | 'creative-questionnaire'  // creative help questionnaire
  | 'ink-color'          // ink color choice
  | 'add-location'       // yes/no for adding another print location
  | 'apparel-review'     // apparel: review & submit
  | 'promo-art-concept'  // promo: describe artwork concept
  | 'promo-art-files'    // promo: upload reference files
  | 'promo-review';      // promo: review & submit

interface LocationData {
  placement: string;
  artworkType: string;
  selectedDesign: Design | null;
  uploadedFiles: File[];
  artworkDetails: string;
  templateHeadline: string;
  templateGroupName: string;
  templateVerseRef: string;
  templateChangeDescription: string;
  templateFiles: File[];
  inkColorChoice: 'match' | 'select';
  selectedInkColors: string[];
  creativeData: CreativeData | null;
}

interface ColorOption {
  name: string;
  hex: string | null;
}

interface CardOption {
  title: string;
  imageSrc: string;
}

// -- Static data --

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

const SIZING_OPTIONS = [
  { id: 'adult' as const, label: 'Adult Only', icon: '👔' },
  { id: 'youth' as const, label: 'Youth Only', icon: '👶' },
  { id: 'both' as const, label: 'Both', icon: '👥' },
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

const INK_COLOR_CHOICE_OPTIONS = [
  { id: 'match', label: 'Match my colors as close as possible.', icon: '🎯' },
  { id: 'select', label: 'Select your own.', icon: '🎨' },
];

const INK_COLORS: string[] = [
  '#EEAFCE', '#C5262F', '#FAE78B', '#005683', '#435C69', '#A24188',
  '#544434', '#E96A6A', '#F79C5E', '#d4e179', '#057C88',
  '#B2d5E8', '#9E55A0', '#AAAAAA', '#F38385', '#F6912D',
  '#d0d728', '#00A3C8', '#48C6E9', '#A86F9C', '#8E8C8A', '#BE3476',
  '#F6912D', '#70BB44', '#2DBAA8', '#00a5d1', '#FFE4C6', '#666665',
  '#E369A7', '#F16624', '#069449', '#5DC099', '#158ECE',
  '#CCA496', '#363636', '#762525', '#C34B27', '#1C6C37',
  '#83C88D', '#134897', '#B59B59', '#FFF7e9', '#492638', '#FFB636',
  '#083A20', '#A4D9D1', '#0C2339', '#C98839', '#331e25', '#FDD900',
  '#4E5424', '#6ecad7', '#442155', '#C68371', '#902439',
  '#FDDE57', '#1f565c', '#7098a8', '#682e76', '#965e30',
  '#ACBBD3', '#D3C8E2', '#5858A4', '#EDC45E', '#DB5547', '#BCC989',
  '#FFFFFF', '#000000',
];

const ADD_LOCATION_OPTIONS = [
  { id: 'yes', label: 'Yes', icon: '➕' },
  { id: 'no', label: "No, I'm all set", icon: '✅' },
];

const PLACEMENT_OPTIONS: CardOption[] = [
  {
    title: 'Front Imprint',
    imageSrc: 'https://uploads-ssl.webflow.com/65cfbeb48bcaf136bfe303ff/662133e5f723bdb3c33276da_Apparel%20Print%20Specs%20Adult%20Short%20Sleeve%20Front%20Imprint.png',
  },
  {
    title: 'Crest',
    imageSrc: 'https://uploads-ssl.webflow.com/65cfbeb48bcaf136bfe303ff/662191317153a4e565e4a53c_ARFadult_ss_crest.png',
  },
  {
    title: 'Back',
    imageSrc: 'https://uploads-ssl.webflow.com/65cfbeb48bcaf136bfe303ff/662191323678a759901af78f_ARFadult_ss_back.png',
  },
  {
    title: 'Locker Tag',
    imageSrc: 'https://uploads-ssl.webflow.com/65cfbeb48bcaf136bfe303ff/66219131493e0a11579a8605_ARFadult_ss_locker_tag.png',
  },
  {
    title: 'Right Sleeve',
    imageSrc: 'https://uploads-ssl.webflow.com/65cfbeb48bcaf136bfe303ff/662288ca46ccb8ed1762199b_ARFadult_ss_sleeve%20right.png',
  },
  {
    title: 'Left Sleeve',
    imageSrc: 'https://uploads-ssl.webflow.com/65cfbeb48bcaf136bfe303ff/66219132b83e7fb6bc6fe7ee_ARFadult_ss_sleeve.png',
  },
];

// -- Animation helper hook --

function useStepAnimation(optionsDelay = 400) {
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
      setTimeout(() => setShowOptions(true), optionsDelay);
    }, 1200);
  }, [optionsDelay]);

  return { showTyping, showMessage, showOptions, start };
}

// -- Main component --

export default function ArtRequestForm() {
  const [step, setStep] = useState<Step>('welcome');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Selections
  const [selectedProductType, setSelectedProductType] = useState<string | null>(null);
  const [selectedSizing, setSelectedSizing] = useState<'adult' | 'youth' | 'both' | null>(null);
  const [availableApparelProducts, setAvailableApparelProducts] = useState<CardOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedPromoCategory, setSelectedPromoCategory] = useState<string | null>(null);
  const [selectedPromoProduct, setSelectedPromoProduct] = useState<string | null>(null);

  // Active location state (current location being configured)
  const [selectedArtworkType, setSelectedArtworkType] = useState<string | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState<string | null>(null);
  const [artworkDetails, setArtworkDetails] = useState('');
  const [templateHeadline, setTemplateHeadline] = useState('');
  const [templateGroupName, setTemplateGroupName] = useState('');
  const [templateVerseRef, setTemplateVerseRef] = useState('');
  const [templateChangeDescription, setTemplateChangeDescription] = useState('');
  const [templateFiles, setTemplateFiles] = useState<File[]>([]);
  const [inkColorChoice, setInkColorChoice] = useState<'match' | 'select' | null>(null);
  const [selectedInkColors, setSelectedInkColors] = useState<string[]>([]);
  const [creativeData, setCreativeData] = useState<CreativeData | null>(null);

  // Completed locations array
  const [completedLocations, setCompletedLocations] = useState<LocationData[]>([]);

  // Welcome state
  const [showWelcomeTyping, setShowWelcomeTyping] = useState(true);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [showButton, setShowButton] = useState(false);

  // Step animations
  const productTypeAnim = useStepAnimation();
  const sizingSelectAnim = useStepAnimation();
  const productSelectAnim = useStepAnimation();
  const colorSelectAnim = useStepAnimation();
  const promoProductAnim = useStepAnimation();
  const artworkTypeAnim = useStepAnimation(1200);
  const creativeQuestionnaireAnim = useStepAnimation();
  const templateDetailsAnim = useStepAnimation();
  const fileUploadAnim = useStepAnimation();
  const placementAnim = useStepAnimation();
  const artworkDetailsAnim = useStepAnimation();
  const addLocationAnim = useStepAnimation();
  const inkColorAnim = useStepAnimation();

  // Apparel review state
  const [selectedApparelColor, setSelectedApparelColor] = useState<string | null>(null);
  const apparelReviewAnim = useStepAnimation();

  // Promo art request state
  const [promoArtConcept, setPromoArtConcept] = useState('');
  const [promoArtFiles, setPromoArtFiles] = useState<File[]>([]);
  const [selectedPromoColor, setSelectedPromoColor] = useState<string | null>(null);
  const promoArtConceptAnim = useStepAnimation();
  const promoArtFilesAnim = useStepAnimation();
  const promoReviewAnim = useStepAnimation();

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
  }, [step, colors, promoProducts, promoCategories, availableApparelProducts, uploadedFiles, templateFiles, completedLocations]);

  // -- Welcome sequence --

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

  // -- Step: Product Type (Apparel vs Promo) --

  const handleProductTypeSelect = (productType: string) => {
    setSelectedProductType(productType);

    if (productType === 'Apparel') {
      setStep('sizing-select');
      sizingSelectAnim.start();
    } else {
      setStep('product-select');
      productSelectAnim.start();
      if (productType === 'Promo Items') {
        fetchPromoCategories();
      }
    }
  };

  // -- Step: Sizing Select (apparel only) --

  const handleSizingSelect = async (sizingId: 'adult' | 'youth' | 'both') => {
    setSelectedSizing(sizingId);

    let query = supabase.from('apparel').select('product_category');
    if (sizingId === 'adult') query = query.not('adult_sizes', 'is', null);
    if (sizingId === 'youth') query = query.not('youth_sizes', 'is', null);
    if (sizingId === 'both') query = query.not('adult_sizes', 'is', null).not('youth_sizes', 'is', null);

    const { data, error } = await query;
    if (error) { console.error(error); return; }

    const categories = new Set(data.map((r) => r.product_category));
    setAvailableApparelProducts(APPAREL_PRODUCTS.filter((p) => categories.has(p.title)));

    setStep('product-select');
    productSelectAnim.start();
  };

  // -- Step: Product Select (apparel product or promo category) --

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

  // -- Step: Promo Product (pick product name within category) --

  const handlePromoProductSelect = (productName: string) => {
    setSelectedPromoProduct(productName);
    setStep('color-select');
    colorSelectAnim.start();
    fetchPromoColors(selectedPromoCategory!, productName);
  };

  // -- Step: Color Select --

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

      setSelectedApparelColor(colorName);
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

      setSelectedPromoColor(colorName);
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
      setStep('placement-select');
      placementAnim.start();
    } else {
      setStep('promo-art-concept');
      promoArtConceptAnim.start();
    }
  };

  const handleApparelSubmit = () => {
    console.log('Apparel request submitted', {
      product: selectedProduct,
      sizing: selectedSizing,
      color: selectedApparelColor,
      locations: completedLocations,
    });
  };

  const handleApparelStartOver = () => {
    setStep('welcome');
    setSelectedProductType(null);
    setSelectedSizing(null);
    setAvailableApparelProducts([]);
    setSelectedProduct(null);
    setSelectedApparelColor(null);
    setCompletedLocations([]);
    setColors([]);
    setSelectedPlacement(null);
    setSelectedArtworkType(null);
    setSelectedDesign(null);
    setUploadedFiles([]);
    setArtworkDetails('');
    setTemplateHeadline('');
    setTemplateGroupName('');
    setTemplateVerseRef('');
    setTemplateChangeDescription('');
    setTemplateFiles([]);
    setInkColorChoice(null);
    setSelectedInkColors([]);
    setCreativeData(null);
  };

  const handlePromoArtConceptSubmit = () => {
    setStep('promo-art-files');
    promoArtFilesAnim.start();
  };

  const handlePromoArtFilesContinue = () => {
    setStep('promo-review');
    promoReviewAnim.start();
  };

  const handlePromoSubmit = () => {
    console.log('Promo request submitted', {
      category: selectedPromoCategory,
      product: selectedPromoProduct,
      color: selectedPromoColor,
      artConcept: promoArtConcept,
      files: promoArtFiles.map((f) => f.name),
    });
  };

  const handlePromoStartOver = () => {
    setStep('welcome');
    setSelectedProductType(null);
    setSelectedPromoCategory(null);
    setSelectedPromoProduct(null);
    setSelectedPromoColor(null);
    setPromoArtConcept('');
    setPromoArtFiles([]);
    setColors([]);
    setPromoCategories([]);
    setPromoProducts([]);
  };

  const handleArtworkTypeSelect = (optionId: string) => {
    const option = ARTWORK_TYPE_OPTIONS.find((o) => o.id === optionId);
    setSelectedArtworkType(option?.label ?? optionId);

    if (optionId === 'template') {
      setTemplatePickerOpen(true);
    } else if (optionId === 'own') {
      setStep('file-upload');
      fileUploadAnim.start();
    } else if (optionId === 'creative') {
      setStep('creative-questionnaire');
      creativeQuestionnaireAnim.start();
    }
  };

  const handleDesignSelect = (design: Design) => {
    setTemplatePickerOpen(false);
    setSelectedDesign(design);
    setStep('template-details');
    templateDetailsAnim.start();
  };

  const handleCreativeComplete = (data: CreativeData) => {
    setCreativeData(data);
    setStep('ink-color');
    inkColorAnim.start();
  };

  const handleTemplateDetailsContinue = () => {
    setStep('ink-color');
    inkColorAnim.start();
  };

  const handleFileUploadContinue = () => {
    setStep('artwork-details');
    artworkDetailsAnim.start();
  };

  const handlePlacementSelect = (placement: string) => {
    setSelectedPlacement(placement);
    setStep('artwork-type');
    artworkTypeAnim.start();
  };

  const handleArtworkDetailsSubmit = () => {
    setStep('ink-color');
    inkColorAnim.start();
  };

  const handleInkColorChoice = (choice: 'match' | 'select') => {
    setInkColorChoice(choice);
    if (choice === 'match') {
      setStep('add-location');
      addLocationAnim.start();
    }
    // 'select' stays on ink-color step to show color grid
  };

  const handleInkColorToggle = (hex: string) => {
    setSelectedInkColors((prev) =>
      prev.includes(hex) ? prev.filter((c) => c !== hex) : [...prev, hex]
    );
  };

  const handleInkColorContinue = () => {
    setStep('add-location');
    addLocationAnim.start();
  };

  // -- Location management --

  const saveCurrentLocation = () => {
    setCompletedLocations(prev => [...prev, {
      placement: selectedPlacement!,
      artworkType: selectedArtworkType!,
      selectedDesign,
      uploadedFiles,
      artworkDetails,
      templateHeadline,
      templateGroupName,
      templateVerseRef,
      templateChangeDescription,
      templateFiles,
      inkColorChoice: inkColorChoice!,
      selectedInkColors,
      creativeData,
    }]);
    // Reset active state
    setSelectedPlacement(null);
    setSelectedArtworkType(null);
    setSelectedDesign(null);
    setUploadedFiles([]);
    setArtworkDetails('');
    setTemplateHeadline('');
    setTemplateGroupName('');
    setTemplateVerseRef('');
    setTemplateChangeDescription('');
    setTemplateFiles([]);
    setInkColorChoice(null);
    setSelectedInkColors([]);
    setCreativeData(null);
  };

  const handleAddLocationChoice = (wantsAnother: boolean) => {
    saveCurrentLocation();
    if (wantsAnother) {
      setStep('placement-select');
      placementAnim.start();
    } else {
      setStep('apparel-review');
      apparelReviewAnim.start();
    }
  };

  // -- Supabase fetchers --

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

  // -- Derived values --

  const productSelectMessage =
    selectedProductType === 'Apparel'
      ? 'Which apparel product are you looking for?'
      : 'Which product category are you interested in?';

  const productSelectOptions =
    selectedProductType === 'Apparel' ? availableApparelProducts : promoCategories;

  const colorMessage =
    selectedProductType === 'Apparel'
      ? `Great choice! What color ${selectedProduct} would you like?`
      : `What color ${selectedPromoProduct} are you looking for?`;

  const isOwnArtPath = selectedArtworkType === 'I will supply my own.';
  const isFirstLocation = completedLocations.length === 0;

  // Helper: which steps have been passed (to show prior messages + user replies)
  const pastProductType = step !== 'welcome' && step !== 'product-type';
  const pastSizingSelect = pastProductType && step !== 'sizing-select';
  const pastProductSelect = pastSizingSelect && step !== 'product-select';
  const pastPromoProduct =
    selectedProductType === 'Promo Items' &&
    (step === 'color-select' || step === 'promo-art-concept' || step === 'promo-art-files' || step === 'promo-review');

  // Active location visibility: steps where the active location sections should show
  const activeLocationSteps: Step[] = ['placement-select', 'artwork-type', 'template-details', 'file-upload', 'artwork-details', 'creative-questionnaire', 'ink-color', 'add-location'];
  const inActiveLocation = activeLocationSteps.includes(step);

  // -- Render --

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

          {/* --- Welcome --- */}
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

          {/* --- Product Type (Apparel vs Promo) --- */}
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

          {/* --- Sizing Select (apparel only) --- */}
          {selectedProductType === 'Apparel' && pastProductType && (
            <>
              <AnimatePresence>
                {sizingSelectAnim.showTyping && (
                  <motion.div key="sz-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {sizingSelectAnim.showMessage && (
                <ChatBubble key="sz-msg" message="What sizing options are you looking for?" />
              )}
              {/* User reply once past this step */}
              {pastSizingSelect && selectedSizing && (
                <UserReply text={SIZING_OPTIONS.find((o) => o.id === selectedSizing)?.label ?? selectedSizing} />
              )}
              {/* Options (only on this step) */}
              <AnimatePresence>
                {sizingSelectAnim.showOptions && step === 'sizing-select' && (
                  <motion.div
                    key="sz-options"
                    className="px-4 pl-15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex flex-col gap-3 max-w-md">
                      {SIZING_OPTIONS.map((opt, i) => (
                        <motion.button
                          key={opt.id}
                          className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-4 text-left shadow-sm hover:border-brand-orange hover:shadow-md transition-all cursor-pointer group"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: i * 0.1, ease: 'easeOut' }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSizingSelect(opt.id)}
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

          {/* --- Product Select (apparel product OR promo category) --- */}
          {pastSizingSelect && (
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

          {/* --- Promo Product (pick product name within category) --- */}
          {selectedProductType === 'Promo Items' && (step === 'promo-product' || step === 'color-select' || step === 'promo-art-concept' || step === 'promo-art-files' || step === 'promo-review') && (
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

          {/* --- Color Select (apparel or promo) --- */}
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

          {/* --- Promo Art Concept --- */}
          {selectedProductType === 'Promo Items' && (step === 'promo-art-concept' || step === 'promo-art-files' || step === 'promo-review') && (
            <>
              <AnimatePresence>
                {promoArtConceptAnim.showTyping && (
                  <motion.div key="pac-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {promoArtConceptAnim.showMessage && (
                <ChatBubble key="pac-msg" message="Describe your desired artwork style or concept." />
              )}
              {/* User reply once past this step */}
              {step !== 'promo-art-concept' && promoArtConcept && (
                <UserReply text={promoArtConcept.length > 120 ? promoArtConcept.slice(0, 120) + '...' : promoArtConcept} />
              )}
              {/* Textarea input (only on this step) */}
              <AnimatePresence>
                {promoArtConceptAnim.showOptions && step === 'promo-art-concept' && (
                  <motion.div
                    key="pac-input"
                    className="px-4 pl-15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <ArtworkDetailsInput
                      value={promoArtConcept}
                      onChange={setPromoArtConcept}
                      onSubmit={handlePromoArtConceptSubmit}
                      placeholder="Describe your artwork style, concept, or vision..."
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* --- Promo Art Files --- */}
          {selectedProductType === 'Promo Items' && (step === 'promo-art-files' || step === 'promo-review') && (
            <>
              <AnimatePresence>
                {promoArtFilesAnim.showTyping && (
                  <motion.div key="paf-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {promoArtFilesAnim.showMessage && (
                <ChatBubble key="paf-msg" message="Upload any files you'd like us to incorporate into your design." />
              )}
              {/* User reply once past this step */}
              {step !== 'promo-art-files' && (
                <UserReply text={promoArtFiles.length > 0 ? `Uploaded ${promoArtFiles.length} file${promoArtFiles.length > 1 ? 's' : ''}` : 'Skipped'} />
              )}
              {/* Upload zone + Skip (only on this step) */}
              <AnimatePresence>
                {promoArtFilesAnim.showOptions && step === 'promo-art-files' && (
                  <motion.div
                    key="paf-upload"
                    className="px-4 pl-15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <FileUploadZone
                      files={promoArtFiles}
                      onFilesChange={setPromoArtFiles}
                      onContinue={handlePromoArtFilesContinue}
                    />
                    <motion.button
                      className="mt-3 text-sm font-medium text-gray-500 hover:text-gray-700 underline transition-colors cursor-pointer"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      onClick={handlePromoArtFilesContinue}
                    >
                      Skip
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* --- Promo Review --- */}
          {selectedProductType === 'Promo Items' && step === 'promo-review' && (
            <>
              <AnimatePresence>
                {promoReviewAnim.showTyping && (
                  <motion.div key="pr-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {promoReviewAnim.showMessage && (
                <ChatBubble key="pr-msg" message="Here's a summary of your promo request:" />
              )}
              <AnimatePresence>
                {promoReviewAnim.showOptions && (
                  <motion.div
                    key="pr-summary"
                    className="px-4 pl-15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
                      <h3 className="text-sm font-heading uppercase tracking-wide text-brand-black">Promo Request Summary</h3>
                      <div className="space-y-2 text-sm font-body text-gray-700">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Category</span>
                          <span className="font-medium">{selectedPromoCategory}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Product</span>
                          <span className="font-medium">{selectedPromoProduct}</span>
                        </div>
                        {selectedPromoColor && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Color</span>
                            <span className="font-medium">{selectedPromoColor}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500 block mb-1">Art Concept</span>
                          <p className="text-gray-800">{promoArtConcept.length > 200 ? promoArtConcept.slice(0, 200) + '...' : promoArtConcept}</p>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Files</span>
                          <span className="font-medium">{promoArtFiles.length > 0 ? `${promoArtFiles.length} file${promoArtFiles.length > 1 ? 's' : ''}` : 'None'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <motion.button
                        className="bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide hover:bg-black transition-colors cursor-pointer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={handlePromoSubmit}
                      >
                        Submit
                      </motion.button>
                      <motion.button
                        className="bg-white text-gray-700 px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide border border-gray-200 hover:border-gray-400 transition-colors cursor-pointer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        onClick={handlePromoStartOver}
                      >
                        Start Over
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* --- Completed Locations (static chat history) --- */}
          {completedLocations.map((loc, i) => (
            <div key={i}>
              {i === 0 ? (
                <>
                  <ChatBubble message="Let's get started on the specifics of your artwork." delay={0} />
                  <ChatBubble message="What is the location placement of this artwork?" delay={0} />
                </>
              ) : (
                <ChatBubble message="Let's work on your next location. What is the location placement?" delay={0} />
              )}
              <UserReply text={loc.placement} />
              <ChatBubble message={`For your ${loc.placement} design, will you supply artwork, use a Sunday Cool template, or do you need art creative help?`} delay={0} />
              <UserReply text={loc.artworkType} />
              {/* Template design card if applicable */}
              {loc.selectedDesign && (
                <DesignCard design={loc.selectedDesign} />
              )}
              {/* Template details reply if applicable */}
              {loc.artworkType === 'Use a Sunday Cool template.' && (
                <>
                  <ChatBubble message="Great choice! Please fill in the details for your template." delay={0} />
                  <UserReply text={[
                    loc.templateHeadline && `Headline: ${loc.templateHeadline}`,
                    loc.templateGroupName && `Group: ${loc.templateGroupName}`,
                    loc.templateVerseRef && `Verse: ${loc.templateVerseRef}`,
                  ].filter(Boolean).join(' | ') || 'Template details submitted'} />
                </>
              )}
              {/* Creative help reply if applicable */}
              {loc.artworkType === 'I need your creative help.' && loc.creativeData && (
                <>
                  <ChatBubble message="Creative questionnaire completed" delay={0} />
                  <UserReply text={`Style: ${loc.creativeData.designStyles.join(', ')} | Headline: ${loc.creativeData.headlineText}`} />
                </>
              )}
              {/* Own art file reply if applicable */}
              {loc.artworkType === 'I will supply my own.' && loc.uploadedFiles.length > 0 && (
                <>
                  <ChatBubble message={`Please upload your artwork file(s) for the ${loc.placement.toLowerCase()}.`} delay={0} />
                  <UserReply text={`Uploaded ${loc.uploadedFiles.length} file${loc.uploadedFiles.length > 1 ? 's' : ''}`} />
                  {loc.artworkDetails && (
                    <>
                      <ChatBubble message="Please provide any details or instructions for your artwork." delay={0} />
                      <UserReply text={loc.artworkDetails.length > 120 ? loc.artworkDetails.slice(0, 120) + '...' : loc.artworkDetails} />
                    </>
                  )}
                </>
              )}
              <ChatBubble message="What ink colors would you like to use?" delay={0} />
              <UserReply text={loc.inkColorChoice === 'match'
                ? 'Match my colors as close as possible.'
                : `Selected ${loc.selectedInkColors.length} ink color${loc.selectedInkColors.length !== 1 ? 's' : ''}`
              } />
              <ChatBubble message="Would you like to add another print location?" delay={0} />
              <UserReply text={i < completedLocations.length - 1 || step !== 'apparel-review' ? 'Yes' : "No, I'm all set"} />
            </div>
          ))}

          {/* --- Placement Select (active location) --- */}
          {inActiveLocation && (
            <>
              <AnimatePresence>
                {placementAnim.showTyping && (
                  <motion.div key="pl-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {placementAnim.showMessage && (
                isFirstLocation ? (
                  <>
                    <ChatBubble key="pl-intro" message="Let's get started on the specifics of your artwork." />
                    <ChatBubble key="pl-msg" message="What is the location placement of this artwork?" delay={0.6} />
                  </>
                ) : (
                  <ChatBubble key="pl-msg" message="Let's work on your next location. What is the location placement?" />
                )
              )}

              {/* Placement user reply */}
              {selectedPlacement && step !== 'placement-select' && (
                <UserReply text={selectedPlacement} />
              )}

              {/* Placement cards */}
              <AnimatePresence>
                {placementAnim.showOptions && step === 'placement-select' && (
                  <motion.div
                    key="pl-cards"
                    className="px-4 pl-15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg">
                      {PLACEMENT_OPTIONS.map((opt, i) => (
                        <motion.button
                          key={opt.title}
                          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:border-brand-orange hover:shadow-md transition-all cursor-pointer group"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: i * 0.08, ease: 'easeOut' }}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handlePlacementSelect(opt.title)}
                        >
                          <div className="relative aspect-square bg-gray-50">
                            <Image
                              src={opt.imageSrc}
                              alt={opt.title}
                              fill
                              className="object-contain p-2"
                              sizes="200px"
                            />
                          </div>
                          <div className="px-3 py-2">
                            <p className="text-xs font-medium text-gray-800 group-hover:text-brand-orange transition-colors text-center">
                              {opt.title}
                            </p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* --- Artwork Type (active location) --- */}
          {(step === 'artwork-type' || step === 'template-details' || step === 'file-upload' || step === 'artwork-details' || step === 'creative-questionnaire' || step === 'ink-color' || step === 'add-location') && (
            <>
              <AnimatePresence>
                {artworkTypeAnim.showTyping && (
                  <motion.div key="at-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {artworkTypeAnim.showMessage && (
                <ChatBubble key="at-msg" message={`For your ${selectedPlacement} design, will you supply artwork, use a Sunday Cool template, or do you need art creative help?`} />
              )}

              {/* Show user reply once they've chosen and moved past this step */}
              {selectedArtworkType && (selectedDesign || step === 'template-details' || step === 'file-upload' || step === 'artwork-details' || step === 'creative-questionnaire' || step === 'ink-color' || step === 'add-location') && (
                <UserReply text={selectedArtworkType} />
              )}

              {/* Show the selected design as a chat card (template path) */}
              {selectedDesign && (
                <DesignCard design={selectedDesign} />
              )}

              {/* Options (only on artwork-type step, hidden once committed) */}
              <AnimatePresence>
                {artworkTypeAnim.showOptions && step === 'artwork-type' && !selectedDesign && (
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

          {/* --- Creative Questionnaire (active location, creative path) --- */}
          {selectedArtworkType === 'I need your creative help.' && (step === 'creative-questionnaire' || step === 'ink-color' || step === 'add-location') && (
            <>
              {step === 'creative-questionnaire' ? (
                <CreativeQuestionnaire
                  scrollRef={chatEndRef}
                  onComplete={handleCreativeComplete}
                />
              ) : (
                creativeData && (
                  <>
                    <ChatBubble message="Creative questionnaire completed" delay={0} />
                    <UserReply text={`Style: ${creativeData.designStyles.join(', ')} | Headline: ${creativeData.headlineText}`} />
                  </>
                )
              )}
            </>
          )}

          {/* --- Template Details (active location, template path) --- */}
          {selectedArtworkType === 'Use a Sunday Cool template.' && (step === 'template-details' || step === 'ink-color' || step === 'add-location') && (
            <>
              <AnimatePresence>
                {templateDetailsAnim.showTyping && (
                  <motion.div key="td-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {templateDetailsAnim.showMessage && (
                <ChatBubble key="td-msg" message="Great choice! Please fill in the details for your template." />
              )}

              {/* User reply once past this step */}
              {step !== 'template-details' && (
                <UserReply
                  text={[
                    templateHeadline && `Headline: ${templateHeadline}`,
                    templateGroupName && `Group: ${templateGroupName}`,
                    templateVerseRef && `Verse: ${templateVerseRef}`,
                  ].filter(Boolean).join(' | ') || 'Template details submitted'}
                />
              )}

              {/* Form (only on this step) */}
              <AnimatePresence>
                {templateDetailsAnim.showOptions && step === 'template-details' && (
                  <motion.div
                    key="td-form"
                    className="px-4 pl-15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <TemplateDetailsForm
                      headline={templateHeadline}
                      onHeadlineChange={setTemplateHeadline}
                      groupName={templateGroupName}
                      onGroupNameChange={setTemplateGroupName}
                      verseRef={templateVerseRef}
                      onVerseRefChange={setTemplateVerseRef}
                      changeDescription={templateChangeDescription}
                      onChangeDescriptionChange={setTemplateChangeDescription}
                      files={templateFiles}
                      onFilesChange={setTemplateFiles}
                      onContinue={handleTemplateDetailsContinue}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* --- File Upload ("I will supply my own" path, active location) --- */}
          {isOwnArtPath && (step === 'file-upload' || step === 'artwork-details' || step === 'ink-color' || step === 'add-location') && (
            <>
              <AnimatePresence>
                {fileUploadAnim.showTyping && (
                  <motion.div key="fu-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {fileUploadAnim.showMessage && (
                <ChatBubble key="fu-msg" message={`Please upload your artwork file(s) for the ${selectedPlacement?.toLowerCase() ?? 'front'}.`} />
              )}

              {/* Upload zone (only on file-upload step) */}
              <AnimatePresence>
                {fileUploadAnim.showOptions && step === 'file-upload' && (
                  <motion.div
                    key="fu-upload"
                    className="px-4 pl-15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <FileUploadZone
                      files={uploadedFiles}
                      onFilesChange={setUploadedFiles}
                      onContinue={handleFileUploadContinue}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Show uploaded file names as user reply once past this step */}
              {step !== 'file-upload' && uploadedFiles.length > 0 && (
                <UserReply text={`Uploaded ${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''}: ${uploadedFiles.map((f) => f.name).join(', ')}`} />
              )}
            </>
          )}

          {/* --- Artwork Details (active location) --- */}
          {isOwnArtPath && (step === 'artwork-details' || step === 'ink-color' || step === 'add-location') && (
            <>
              <AnimatePresence>
                {artworkDetailsAnim.showTyping && (
                  <motion.div key="ad-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {artworkDetailsAnim.showMessage && (
                <ChatBubble key="ad-msg" message="Please provide any details or instructions for your artwork." />
              )}

              {/* Show user reply once past this step */}
              {step !== 'artwork-details' && artworkDetails && (
                <UserReply text={artworkDetails.length > 120 ? artworkDetails.slice(0, 120) + '...' : artworkDetails} />
              )}

              {/* Textarea input (only on this step) */}
              <AnimatePresence>
                {artworkDetailsAnim.showOptions && step === 'artwork-details' && (
                  <motion.div
                    key="ad-input"
                    className="px-4 pl-15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <ArtworkDetailsInput
                      value={artworkDetails}
                      onChange={setArtworkDetails}
                      onSubmit={handleArtworkDetailsSubmit}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* --- Ink Color (active location) --- */}
          {(step === 'ink-color' || step === 'add-location') && (
            <>
              <AnimatePresence>
                {inkColorAnim.showTyping && (
                  <motion.div key="ic-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {inkColorAnim.showMessage && (
                <ChatBubble key="ic-msg" message="What ink colors would you like to use?" />
              )}

              {/* Show user reply once past this step */}
              {inkColorChoice && step !== 'ink-color' && (
                <UserReply
                  text={
                    inkColorChoice === 'match'
                      ? 'Match my colors as close as possible.'
                      : `Selected ${selectedInkColors.length} ink color${selectedInkColors.length !== 1 ? 's' : ''}`
                  }
                />
              )}

              {/* Choice buttons (only before selection) */}
              <AnimatePresence>
                {inkColorAnim.showOptions && step === 'ink-color' && !inkColorChoice && (
                  <motion.div
                    key="ic-choices"
                    className="px-4 pl-15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex flex-col gap-3 max-w-md">
                      {INK_COLOR_CHOICE_OPTIONS.map((opt, i) => (
                        <motion.button
                          key={opt.id}
                          className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-4 text-left shadow-sm hover:border-brand-orange hover:shadow-md transition-all cursor-pointer group"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: i * 0.1, ease: 'easeOut' }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleInkColorChoice(opt.id as 'match' | 'select')}
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

              {/* Color grid (only when "select your own" chosen, on this step) */}
              {step === 'ink-color' && inkColorChoice === 'select' && (
                <motion.div
                  className="px-4 pl-15"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <InkColorPicker
                    colors={INK_COLORS}
                    selected={selectedInkColors}
                    onToggle={handleInkColorToggle}
                    onContinue={handleInkColorContinue}
                  />
                </motion.div>
              )}
            </>
          )}

          {/* --- Add Location (yes/no) --- */}
          {step === 'add-location' && (
            <>
              <AnimatePresence>
                {addLocationAnim.showTyping && (
                  <motion.div key="al-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {addLocationAnim.showMessage && (
                <ChatBubble key="al-msg" message="Would you like to add another print location?" />
              )}

              {/* Buttons (only on this step) */}
              <AnimatePresence>
                {addLocationAnim.showOptions && (
                  <motion.div
                    key="al-options"
                    className="px-4 pl-15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex flex-col gap-3 max-w-md">
                      {ADD_LOCATION_OPTIONS.map((opt, i) => (
                        <motion.button
                          key={opt.id}
                          className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-4 text-left shadow-sm hover:border-brand-orange hover:shadow-md transition-all cursor-pointer group"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: i * 0.1, ease: 'easeOut' }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAddLocationChoice(opt.id === 'yes')}
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

          {/* --- Apparel Review --- */}
          {selectedProductType === 'Apparel' && step === 'apparel-review' && (
            <>
              <AnimatePresence>
                {apparelReviewAnim.showTyping && (
                  <motion.div key="ar-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {apparelReviewAnim.showMessage && (
                <ChatBubble key="ar-msg" message="Here's a summary of your apparel request:" />
              )}
              <AnimatePresence>
                {apparelReviewAnim.showOptions && (
                  <motion.div
                    key="ar-summary"
                    className="px-4 pl-15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="max-w-md bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                      <h3 className="text-sm font-heading uppercase tracking-wide text-brand-black">Apparel Request Summary</h3>
                      <div className="space-y-2 text-sm font-body text-gray-700">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Product</span>
                          <span className="font-medium">{selectedProduct}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Sizing</span>
                          <span className="font-medium">{SIZING_OPTIONS.find((o) => o.id === selectedSizing)?.label ?? selectedSizing}</span>
                        </div>
                        {selectedApparelColor && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Color</span>
                            <span className="font-medium">{selectedApparelColor}</span>
                          </div>
                        )}
                      </div>

                      {completedLocations.length > 0 && (
                        <div className="border-t border-gray-100 pt-3 space-y-3">
                          <h4 className="text-xs font-heading uppercase tracking-wide text-gray-500">
                            Print Locations ({completedLocations.length})
                          </h4>
                          {completedLocations.map((loc, i) => (
                            <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Placement</span>
                                <span className="font-medium text-gray-800">{loc.placement}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Artwork</span>
                                <span className="font-medium text-gray-800">{loc.artworkType}</span>
                              </div>
                              {loc.selectedDesign && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Template</span>
                                  <span className="font-medium text-gray-800">{loc.selectedDesign.name}</span>
                                </div>
                              )}
                              {loc.uploadedFiles.length > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Files</span>
                                  <span className="font-medium text-gray-800">{loc.uploadedFiles.length} file{loc.uploadedFiles.length > 1 ? 's' : ''}</span>
                                </div>
                              )}
                              {loc.artworkDetails && (
                                <div>
                                  <span className="text-gray-500 block">Details</span>
                                  <p className="text-gray-800">{loc.artworkDetails.length > 100 ? loc.artworkDetails.slice(0, 100) + '...' : loc.artworkDetails}</p>
                                </div>
                              )}
                              {loc.creativeData && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Style</span>
                                  <span className="font-medium text-gray-800">{loc.creativeData.designStyles.join(', ')}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-500">Ink Colors</span>
                                <span className="font-medium text-gray-800">
                                  {loc.inkColorChoice === 'match'
                                    ? 'Match colors'
                                    : `${loc.selectedInkColors.length} selected`}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 mt-4">
                      <motion.button
                        className="bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide hover:bg-black transition-colors cursor-pointer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={handleApparelSubmit}
                      >
                        Submit
                      </motion.button>
                      <motion.button
                        className="bg-white text-gray-700 px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide border border-gray-200 hover:border-gray-400 transition-colors cursor-pointer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        onClick={handleApparelStartOver}
                      >
                        Start Over
                      </motion.button>
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

// -- Small helper components --

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

function DesignCard({ design }: { design: Design }) {
  return (
    <motion.div
      className="px-4 pl-15"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden max-w-sm">
        <div className="relative aspect-square bg-gray-50">
          <Image
            src={design.thumbnail_url}
            alt={design.name}
            fill
            className="object-contain p-3"
            sizes="300px"
          />
        </div>
        <div className="px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">{design.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{design.design_id}</p>
        </div>
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

function ArtworkDetailsInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Enter details, special instructions, sizing notes...",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}) {
  return (
    <div className="max-w-md space-y-3">
      <textarea
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-body text-gray-800 bg-white shadow-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange resize-none"
        rows={4}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <motion.button
        className={`bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide transition-colors ${
          value.trim() ? 'hover:bg-black cursor-pointer' : 'opacity-50 cursor-not-allowed'
        }`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        disabled={!value.trim()}
        onClick={onSubmit}
      >
        Continue
      </motion.button>
    </div>
  );
}

function InkColorPicker({
  colors,
  selected,
  onToggle,
  onContinue,
}: {
  colors: string[];
  selected: string[];
  onToggle: (hex: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="max-w-lg space-y-4">
      <div className="flex flex-wrap gap-2">
        {colors.map((hex, i) => {
          const isSelected = selected.includes(hex);
          const isLight = isLightColor(hex);
          return (
            <motion.button
              key={`${hex}-${i}`}
              className={`w-9 h-9 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                isSelected
                  ? 'border-brand-black shadow-md scale-110'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
              style={{ backgroundColor: hex }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: isSelected ? 1.1 : 1 }}
              transition={{ duration: 0.2, delay: i * 0.008 }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onToggle(hex)}
              title={hex}
            >
              {isSelected && (
                <span className={`text-xs font-bold ${isLight ? 'text-gray-800' : 'text-white'}`}>
                  ✓
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="flex items-center gap-3">
          <motion.button
            className="bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide hover:bg-black transition-colors cursor-pointer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onContinue}
          >
            Continue
          </motion.button>
          <span className="text-xs text-gray-500">
            {selected.length} color{selected.length !== 1 ? 's' : ''} selected
          </span>
        </div>
      )}
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

function FileUploadZone({
  files,
  onFilesChange,
  onContinue,
  showContinueButton = true,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onContinue: () => void;
  showContinueButton?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files, ...Array.from(incoming)];
    onFilesChange(next);
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-md space-y-3">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl px-6 py-8 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-brand-orange bg-orange-50'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.ai,.eps,.svg"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="text-3xl mb-2">📂</div>
        <p className="text-sm font-medium text-gray-700">
          Drag & drop your files here
        </p>
        <p className="text-xs text-gray-500 mt-1">
          or click to browse &middot; Images, PDF, AI, EPS, SVG
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2"
            >
              {file.type.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📄</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                className="text-gray-400 hover:text-red-500 transition-colors text-lg flex-shrink-0"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Continue button */}
      {showContinueButton && files.length > 0 && (
        <motion.button
          className="bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide hover:bg-black transition-colors"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onContinue}
        >
          Continue
        </motion.button>
      )}
    </div>
  );
}

function TemplateDetailsForm({
  headline,
  onHeadlineChange,
  groupName,
  onGroupNameChange,
  verseRef,
  onVerseRefChange,
  changeDescription,
  onChangeDescriptionChange,
  files,
  onFilesChange,
  onContinue,
}: {
  headline: string;
  onHeadlineChange: (v: string) => void;
  groupName: string;
  onGroupNameChange: (v: string) => void;
  verseRef: string;
  onVerseRefChange: (v: string) => void;
  changeDescription: string;
  onChangeDescriptionChange: (v: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  onContinue: () => void;
}) {
  return (
    <div className="max-w-md space-y-4">
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Headline</span>
          <input
            type="text"
            className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-body text-gray-800 bg-white shadow-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
            placeholder="e.g. VBS 2025, Fall Retreat"
            value={headline}
            onChange={(e) => onHeadlineChange(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Group / Church Name</span>
          <input
            type="text"
            className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-body text-gray-800 bg-white shadow-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
            placeholder="e.g. Grace Community Church"
            value={groupName}
            onChange={(e) => onGroupNameChange(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Verse Reference</span>
          <input
            type="text"
            className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-body text-gray-800 bg-white shadow-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
            placeholder="e.g. John 3:16"
            value={verseRef}
            onChange={(e) => onVerseRefChange(e.target.value)}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Describe any changes</span>
        <textarea
          className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-body text-gray-800 bg-white shadow-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange resize-none"
          rows={3}
          placeholder="Please describe any changes you are looking for..."
          value={changeDescription}
          onChange={(e) => onChangeDescriptionChange(e.target.value)}
        />
      </label>

      <div>
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-2">
          Reference files (optional)
        </span>
        <FileUploadZone
          files={files}
          onFilesChange={onFilesChange}
          onContinue={() => {}}
          showContinueButton={false}
        />
      </div>

      <motion.button
        className="bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide hover:bg-black transition-colors cursor-pointer"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onContinue}
      >
        Continue
      </motion.button>
    </div>
  );
}
