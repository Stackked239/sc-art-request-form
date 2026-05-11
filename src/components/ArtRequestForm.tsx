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
import SpecialtyInksPicker from './SpecialtyInksPicker';
import PMSColorModal, { type PMSEntry } from './PMSColorModal';
import { supabase } from '@/lib/supabase';
import { uploadToBucket } from '@/lib/storage';

// -- Types --

type Step =
  | 'welcome'
  | 'product-type'
  | 'sizing-select'
  | 'product-select'
  | 'color-select'       // apparel color OR promo color
  | 'promo-product'      // promo: pick product name within a category
  | 'confirm-apparel'    // SF-prefilled flow: confirm apparel type
  | 'garment-color'      // SF-prefilled flow: pick garment color
  | 'artwork-setup-type' // SF-prefilled flow: adult / youth / single
  | 'artwork-type'       // apparel: what type of artwork
  | 'template-details'   // apparel "template": customise template fields
  | 'file-upload'        // apparel "own art": upload files
  | 'placement-select'   // apparel: pick placement location
  | 'artwork-details'    // text area for artwork details/instructions
  | 'creative-questionnaire'  // creative help questionnaire
  | 'ink-color'          // ink color choice
  | 'add-location'       // yes/no for adding another print location
  | 'additional-comments' // apparel: optional final comments
  | 'apparel-review'     // apparel: review & submit
  | 'submitted'           // success state
  | 'promo-art-concept'  // promo: describe artwork concept
  | 'promo-art-files'    // promo: upload reference files
  | 'promo-review';      // promo: review & submit

interface LocationData {
  placement: string;
  artworkType: string;
  selectedDesign: Design | null;
  uploadedFiles: File[];
  uploadedFilePaths: string[];
  artworkDetails: string;
  templateHeadline: string;
  templateGroupName: string;
  templateVerseRef: string;
  templateChangeDescription: string;
  templateFiles: File[];
  templateFilePaths: string[];
  inkColorChoice: InkColorChoice;
  selectedInkColors: string[];
  selectedSpecialtyInks: string[];
  pmsEntries: PMSEntry[];
  creativeData: CreativeData | null;
  artistMessage: string;
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
    id: 'artist',
    label: 'I am not sure.',
    icon: '💬',
  },
];

const INK_COLOR_CHOICE_OPTIONS = [
  { id: 'match', label: 'Match my colors as close as possible.', icon: '🎯' },
  { id: 'select', label: 'Select your own.', icon: '🎨' },
  { id: 'pms', label: 'PMS Match ($25/color, first free at 144+ items).', icon: '🧪' },
];

type InkColorChoice = 'match' | 'select' | 'pms';

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

const APPAREL_TYPE_OPTIONS: { id: string; label: string; imageSrc: string }[] = [
  {
    id: 'short-sleeve',
    label: 'Short Sleeve',
    imageSrc: 'https://cdn.prod.website-files.com/65cfbeb48bcaf136bfe30447/66bc12661c367f75b3707b1b_jpeg_SC-05339_Heather-REd.webp',
  },
  {
    id: 'long-sleeve',
    label: 'Long Sleeve',
    imageSrc: 'https://cdn.prod.website-files.com/65cfbeb48bcaf136bfe30447/65cfbeb48bcaf136bfe31730_SC-05569.jpeg',
  },
  {
    id: 'crew-neck',
    label: 'Crew Neck',
    imageSrc: 'https://cdn.prod.website-files.com/65cfbeb48bcaf136bfe30447/671fe46df8393985b1a83169_Apparel%20crewneck.webp',
  },
  {
    id: 'hoodie',
    label: 'Hoodie',
    imageSrc: 'https://cdn.prod.website-files.com/65cfbeb48bcaf136bfe303ff/65cfbeb48bcaf136bfe3043e_Apparel%20Hoodie-07238.webp',
  },
];

const APPAREL_TYPE_TO_CATEGORY: Record<string, string | null> = {
  'short-sleeve': 'Super Soft Tee',
  'long-sleeve': 'Super Soft Long Sleeve',
  'crew-neck': 'Super Soft Crewneck',
  'hoodie': 'Super Soft Hoodie',
};

const ARTWORK_SETUP_OPTIONS = [
  { id: 'adult', label: 'Adult', icon: '🧑' },
  { id: 'youth', label: 'Youth', icon: '🧒' },
  { id: 'single', label: 'Single Setup', icon: '🎯' },
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

export default function ArtRequestForm({ embedded = false }: { embedded?: boolean } = {}) {
  const [step, setStep] = useState<Step>('confirm-apparel');
  const [stepHistory, setStepHistory] = useState<Step[]>([]);
  const isBackNavRef = useRef(false);
  const prevStepRef = useRef<Step>('confirm-apparel');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  // Selections
  const [selectedProductType, setSelectedProductType] = useState<string | null>('Apparel');
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
  const [uploadedFilePaths, setUploadedFilePaths] = useState<string[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState<string | null>(null);
  const [artworkDetails, setArtworkDetails] = useState('');
  const [templateHeadline, setTemplateHeadline] = useState('');
  const [templateGroupName, setTemplateGroupName] = useState('');
  const [templateVerseRef, setTemplateVerseRef] = useState('');
  const [templateChangeDescription, setTemplateChangeDescription] = useState('');
  const [templateFiles, setTemplateFiles] = useState<File[]>([]);
  const [templateFilePaths, setTemplateFilePaths] = useState<string[]>([]);
  const [inkColorChoice, setInkColorChoice] = useState<InkColorChoice | null>(null);
  const [selectedInkColors, setSelectedInkColors] = useState<string[]>([]);
  const [selectedSpecialtyInks, setSelectedSpecialtyInks] = useState<string[]>([]);
  const [pmsEntries, setPmsEntries] = useState<PMSEntry[]>([]);
  const [pmsModalOpen, setPmsModalOpen] = useState(false);
  const [creativeData, setCreativeData] = useState<CreativeData | null>(null);
  const [artistMessage, setArtistMessage] = useState('');
  const [talkToArtistOpen, setTalkToArtistOpen] = useState(false);
  const [artistDraft, setArtistDraft] = useState('');
  const [additionalComments, setAdditionalComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Completed locations array
  const [completedLocations, setCompletedLocations] = useState<LocationData[]>([]);

  // Welcome state (skipped — flow starts at placement-select)
  const [showWelcomeTyping] = useState(false);
  const [showWelcomeMessage] = useState(false);
  const [showButton] = useState(false);

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
  const additionalCommentsAnim = useStepAnimation();
  const confirmApparelAnim = useStepAnimation();
  const garmentColorAnim = useStepAnimation();
  const artworkSetupAnim = useStepAnimation();

  // SF-prefilled flow state
  const [selectedApparelTypes, setSelectedApparelTypes] = useState<string[]>([]);
  const [colorsByCategory, setColorsByCategory] = useState<Record<string, ColorOption[]>>({});
  const [garmentColorsByType, setGarmentColorsByType] = useState<Record<string, string[]>>({});
  const [selectedArtworkSetupTypes, setSelectedArtworkSetupTypes] = useState<string[]>([]);
  const [artworkSetupHelpOpen, setArtworkSetupHelpOpen] = useState(false);

  // Apparel review state
  const [selectedApparelColor, setSelectedApparelColor] = useState<string | null>(null);
  const apparelReviewAnim = useStepAnimation();

  // Promo art request state
  const [promoArtConcept, setPromoArtConcept] = useState('');
  const [promoArtFiles, setPromoArtFiles] = useState<File[]>([]);
  const [promoArtFilePaths, setPromoArtFilePaths] = useState<string[]>([]);
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

  // Auto-scroll: pin the active question near the top of the viewport across animation phases.
  useEffect(() => {
    if (step === 'welcome') return;
    const scrollToActiveQuestion = () => {
      const bubbles = document.querySelectorAll<HTMLElement>('[data-chat-bubble]');
      const last = bubbles[bubbles.length - 1];
      if (!last) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        return;
      }
      const top = last.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(top - 96, 0), behavior: 'smooth' });
    };
    const timers = [200, 1300, 1900, 2400].map((ms) => setTimeout(scrollToActiveQuestion, ms));
    return () => timers.forEach(clearTimeout);
  }, [step, colors, promoProducts, promoCategories, availableApparelProducts, uploadedFiles, templateFiles, completedLocations, selectedArtworkType, inkColorChoice, pmsEntries, selectedSpecialtyInks]);

  // -- Initial step: confirm-apparel (run once on mount) --

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { confirmApparelAnim.start(); }, []);

  // -- Step history tracking (for Back button) --
  useEffect(() => {
    if (step === prevStepRef.current) return;
    if (isBackNavRef.current) {
      isBackNavRef.current = false;
    } else if (prevStepRef.current !== 'welcome') {
      setStepHistory((h) => [...h, prevStepRef.current]);
    }
    prevStepRef.current = step;
  }, [step]);

  const stepAnimRestart: Partial<Record<Step, () => void>> = {
    'confirm-apparel': confirmApparelAnim.start,
    'garment-color': garmentColorAnim.start,
    'artwork-setup-type': artworkSetupAnim.start,
    'placement-select': placementAnim.start,
    'artwork-type': artworkTypeAnim.start,
    'template-details': templateDetailsAnim.start,
    'file-upload': fileUploadAnim.start,
    'artwork-details': artworkDetailsAnim.start,
    'creative-questionnaire': creativeQuestionnaireAnim.start,
    'ink-color': inkColorAnim.start,
    'add-location': addLocationAnim.start,
    'additional-comments': additionalCommentsAnim.start,
    'apparel-review': apparelReviewAnim.start,
    'product-type': productTypeAnim.start,
    'sizing-select': sizingSelectAnim.start,
    'product-select': productSelectAnim.start,
    'color-select': colorSelectAnim.start,
    'promo-product': promoProductAnim.start,
    'promo-art-concept': promoArtConceptAnim.start,
    'promo-art-files': promoArtFilesAnim.start,
    'promo-review': promoReviewAnim.start,
  };

  const handleBack = () => {
    setStepHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      isBackNavRef.current = true;
      setStep(prev);
      stepAnimRestart[prev]?.();
      return h.slice(0, -1);
    });
  };

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

  // -- SF-prefilled: Confirm Apparel --

  const toggleApparelType = (optionId: string) => {
    setSelectedApparelTypes((prev) =>
      prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]
    );
  };

  const handleApparelTypesContinue = async () => {
    if (selectedApparelTypes.length === 0) return;
    const categories = selectedApparelTypes
      .map((id) => APPAREL_TYPE_TO_CATEGORY[id])
      .filter((c): c is string => Boolean(c));
    setSelectedProduct(categories.join(', '));

    const next: Record<string, ColorOption[]> = {};
    await Promise.all(
      selectedApparelTypes.map(async (typeId) => {
        const category = APPAREL_TYPE_TO_CATEGORY[typeId];
        if (!category) return;
        const { data, error } = await supabase
          .from('apparel')
          .select('color_name, color_hex')
          .eq('product_category', category)
          .order('color_name');
        if (error || !data) return;
        next[typeId] = data.map((r) => ({ name: r.color_name, hex: r.color_hex }));
      })
    );
    setColorsByCategory(next);

    setStep('garment-color');
    garmentColorAnim.start();
  };

  const toggleGarmentColor = (typeId: string, colorName: string) => {
    setGarmentColorsByType((prev) => {
      const current = prev[typeId] ?? [];
      const updated = current.includes(colorName)
        ? current.filter((c) => c !== colorName)
        : [...current, colorName];
      return { ...prev, [typeId]: updated };
    });
  };

  const handleGarmentColorsContinue = () => {
    // Pick the first selected color as the legacy single-color field for downstream submission.
    const firstType = selectedApparelTypes.find((t) => (garmentColorsByType[t]?.length ?? 0) > 0);
    const firstColor = firstType ? garmentColorsByType[firstType][0] : null;
    setSelectedApparelColor(firstColor);
    setSummaryData(null);
    setStep('artwork-setup-type');
    artworkSetupAnim.start();
  };

  const allTypesHaveColor = selectedApparelTypes.length > 0
    && selectedApparelTypes.every((t) => (garmentColorsByType[t]?.length ?? 0) > 0);

  const toggleArtworkSetupType = (id: string) => {
    setSelectedArtworkSetupTypes((prev) => {
      // Single is mutually exclusive with adult/youth.
      if (id === 'single') {
        return prev.includes('single') ? [] : ['single'];
      }
      const withoutSingle = prev.filter((x) => x !== 'single');
      return withoutSingle.includes(id)
        ? withoutSingle.filter((x) => x !== id)
        : [...withoutSingle, id];
    });
  };

  const handleArtworkSetupContinue = () => {
    if (selectedArtworkSetupTypes.length === 0) return;
    setStep('placement-select');
    placementAnim.start();
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

  const handleApparelSubmit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    const payload = {
      session_id: sessionIdRef.current,
      product_type: 'Apparel',
      product_category: selectedProduct,
      sizing: selectedSizing,
      apparel_color: selectedApparelColor,
      additional_comments: additionalComments,
      locations: completedLocations.map((l) => ({
        placement: l.placement,
        artworkType: l.artworkType,
        selectedDesign: l.selectedDesign,
        uploadedFilePaths: l.uploadedFilePaths,
        artworkDetails: l.artworkDetails,
        templateHeadline: l.templateHeadline,
        templateGroupName: l.templateGroupName,
        templateVerseRef: l.templateVerseRef,
        templateChangeDescription: l.templateChangeDescription,
        templateFilePaths: l.templateFilePaths,
        inkColorChoice: l.inkColorChoice,
        selectedInkColors: l.selectedInkColors,
        selectedSpecialtyInks: l.selectedSpecialtyInks,
        pmsEntries: l.pmsEntries,
        creativeData: l.creativeData,
        artistMessage: l.artistMessage,
      })),
    };
    const { error } = await supabase.from('art_requests').insert(payload);
    setSubmitting(false);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    setStep('submitted');
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
    setUploadedFilePaths([]);
    setArtworkDetails('');
    setTemplateHeadline('');
    setTemplateGroupName('');
    setTemplateVerseRef('');
    setTemplateChangeDescription('');
    setTemplateFiles([]);
    setTemplateFilePaths([]);
    setInkColorChoice(null);
    setSelectedInkColors([]);
    setSelectedSpecialtyInks([]);
    setPmsEntries([]);
    setCreativeData(null);
    setArtistMessage('');
  };

  const handlePromoArtConceptSubmit = () => {
    setStep('promo-art-files');
    promoArtFilesAnim.start();
  };

  const handlePromoArtFilesContinue = () => {
    setStep('promo-review');
    promoReviewAnim.start();
  };

  const handlePromoSubmit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    const payload = {
      session_id: sessionIdRef.current,
      product_type: 'Promo Items',
      promo_category: selectedPromoCategory,
      promo_product: selectedPromoProduct,
      promo_color: selectedPromoColor,
      promo_art_concept: promoArtConcept,
      promo_art_file_paths: promoArtFilePaths,
    };
    const { error } = await supabase.from('art_requests').insert(payload);
    setSubmitting(false);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    setStep('submitted');
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
    } else if (optionId === 'artist') {
      setArtistDraft('');
      setUploadedFiles([]);
      setUploadedFilePaths([]);
      setTalkToArtistOpen(true);
    }
  };

  const handleArtistSubmit = () => {
    setArtistMessage(artistDraft);
    setTalkToArtistOpen(false);
    setStep('ink-color');
    inkColorAnim.start();
  };

  const handleArtistCancel = () => {
    setTalkToArtistOpen(false);
    setSelectedArtworkType(null);
    setUploadedFiles([]);
    setUploadedFilePaths([]);
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

  const handleInkColorChoice = (choice: InkColorChoice) => {
    setInkColorChoice(choice);
    if (choice === 'pms') {
      setPmsModalOpen(true);
    }
    // Stay on ink-color step so the user can also pick specialty inks before advancing.
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
      uploadedFilePaths,
      artworkDetails,
      templateHeadline,
      templateGroupName,
      templateVerseRef,
      templateChangeDescription,
      templateFiles,
      templateFilePaths,
      inkColorChoice: inkColorChoice!,
      selectedInkColors,
      selectedSpecialtyInks,
      pmsEntries,
      creativeData,
      artistMessage,
    }]);
    // Reset active state
    setSelectedPlacement(null);
    setSelectedArtworkType(null);
    setSelectedDesign(null);
    setUploadedFiles([]);
    setUploadedFilePaths([]);
    setArtworkDetails('');
    setTemplateHeadline('');
    setTemplateGroupName('');
    setTemplateVerseRef('');
    setTemplateChangeDescription('');
    setTemplateFiles([]);
    setTemplateFilePaths([]);
    setInkColorChoice(null);
    setSelectedInkColors([]);
    setSelectedSpecialtyInks([]);
    setPmsEntries([]);
    setCreativeData(null);
    setArtistMessage('');
  };

  const handleAddLocationChoice = (wantsAnother: boolean) => {
    saveCurrentLocation();
    if (wantsAnother) {
      setStep('placement-select');
      placementAnim.start();
    } else {
      setStep('additional-comments');
      additionalCommentsAnim.start();
    }
  };

  const handleAdditionalCommentsContinue = () => {
    setStep('apparel-review');
    apparelReviewAnim.start();
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

  // SF-prefilled flow visibility (chat-history persistence after step is passed)
  const pastConfirmApparel = step !== 'confirm-apparel';
  const pastGarmentColor = pastConfirmApparel && step !== 'garment-color';
  const pastArtworkSetup = pastGarmentColor && step !== 'artwork-setup-type';
  const apparelTypeLabel = selectedApparelTypes
    .map((id) => APPAREL_TYPE_OPTIONS.find((o) => o.id === id)?.label)
    .filter(Boolean)
    .join(', ');
  const artworkSetupLabel = selectedArtworkSetupTypes
    .map((id) => ARTWORK_SETUP_OPTIONS.find((o) => o.id === id)?.label)
    .filter(Boolean)
    .join(' + ');

  // -- Render --

  return (
    <div className={embedded ? '' : 'min-h-screen flex flex-col'}>
      {!embedded && (
        <header className="sticky top-0 z-30 backdrop-blur-md bg-brand-daylight/85 border-b-2 border-brand-black px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="relative w-12 h-12 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-brand-black sc-wobble"
                style={{ boxShadow: '3px 3px 0 0 #f6912d' }}
              >
                <Image
                  src="/sunday-cool-logo.avif"
                  alt="Sunday Cool"
                  width={40}
                  height={40}
                  className="object-contain p-1"
                />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-brand-yellow border-2 border-brand-black" />
              </div>
              <div className="leading-tight">
                <h1 className="sc-display text-xl uppercase text-brand-black">Sunday Cool</h1>
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-black/60 font-body">Art Request</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-brand-black/60">Live</span>
            </div>
          </div>
        </header>
      )}

      {/* Floating Back button */}
      {stepHistory.length > 0 && step !== 'submitted' && (
        <motion.button
          type="button"
          onClick={handleBack}
          className="fixed left-4 bottom-4 sm:left-6 sm:bottom-6 z-40 inline-flex items-center gap-2 bg-white border-2 border-brand-black rounded-full pl-3 pr-4 py-2 sc-display text-sm uppercase tracking-wide text-brand-black sc-lift cursor-pointer"
          style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          aria-label="Go back to previous step"
        >
          <span aria-hidden>←</span> Back
        </motion.button>
      )}

      {/* Chat area */}
      <div className={embedded ? '' : 'flex-1 overflow-y-auto'}>
        <div className="max-w-2xl mx-auto py-8 space-y-5 px-1">

          {/* --- Hero banner (welcome only) --- */}
          {step === 'welcome' && (
            <motion.div
              className="px-4 pt-4 pb-2 text-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-flex items-center gap-2 bg-white border-2 border-brand-black rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em] font-heading text-brand-black mb-4"
                style={{ boxShadow: '2px 2px 0 0 #1a1a1a' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-brand-orange" />
                New project
              </span>
              <h2 className="sc-display text-[clamp(2.4rem,7vw,4rem)] uppercase text-brand-black leading-[0.9]">
                Let&apos;s make<br/>
                <span className="sc-underline">something cool.</span>
              </h2>
              <p className="mt-3 text-sm text-brand-black/60 max-w-md mx-auto">
                A quick chat — about 8 minutes — and we&apos;ll have everything we need to build your art.
              </p>
            </motion.div>
          )}

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
                  className="group inline-flex items-center gap-2.5 bg-brand-orange text-brand-black px-7 py-3.5 rounded-full sc-display text-xl uppercase border-2 border-brand-black sc-lift"
                  style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}
                >
                  Get Started
                  <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
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
              {pastProductType && selectedProductType && productTypeAnim.showMessage && (
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
                          className="flex items-center gap-4 bg-white border-2 border-brand-black rounded-2xl px-5 py-4 text-left cursor-pointer group sc-lift"
                          style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: i * 0.1, ease: 'easeOut' }}
                          
                          
                          onClick={() => handleSizingSelect(opt.id)}
                        >
                          <span className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-butter border-2 border-brand-black flex items-center justify-center text-xl">{opt.icon}</span>
                          <span className="text-[15px] font-semibold text-brand-black flex-1">
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
                      sessionId={sessionIdRef.current}
                      folder="promo"
                      onUploadedPathsChange={setPromoArtFilePaths}
                    />
                    <motion.button
                      className="mt-3 text-[11px] font-heading uppercase tracking-[0.18em] text-brand-black/55 hover:text-brand-black underline underline-offset-4 transition-colors cursor-pointer"
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
                    <div
                      className="relative max-w-md bg-white rounded-3xl border-2 border-brand-black p-6 space-y-4"
                      style={{ boxShadow: '5px 5px 0 0 #1a1a1a' }}
                    >
                      <span className="absolute -top-3 left-5 inline-flex items-center gap-1.5 bg-brand-yellow text-brand-black text-[10px] uppercase tracking-[0.18em] font-heading px-3 py-1 rounded-full border-2 border-brand-black">
                        Receipt
                      </span>
                      <h3 className="sc-display text-2xl uppercase text-brand-black leading-none pt-1">Promo Request</h3>
                      <div className="h-px bg-brand-black/15" />
                      <div className="space-y-2.5 text-[13px] font-body text-brand-black">
                        <SummaryRow label="Category" value={selectedPromoCategory ?? ''} />
                        <SummaryRow label="Product" value={selectedPromoProduct ?? ''} />
                        {selectedPromoColor && <SummaryRow label="Color" value={selectedPromoColor} />}
                        <div>
                          <span className="text-[11px] uppercase tracking-[0.18em] text-brand-black/55 block mb-1">Art Concept</span>
                          <p className="text-brand-black">{promoArtConcept.length > 200 ? promoArtConcept.slice(0, 200) + '...' : promoArtConcept}</p>
                        </div>
                        <SummaryRow label="Files" value={promoArtFiles.length > 0 ? `${promoArtFiles.length} file${promoArtFiles.length > 1 ? 's' : ''}` : 'None'} />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <motion.button
                        className="bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide border-2 border-brand-black sc-lift cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={handlePromoSubmit}
                        disabled={submitting}
                      >
                        {submitting ? 'Submitting…' : 'Submit'}
                      </motion.button>
                      <motion.button
                        className="bg-white text-brand-black px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide border-2 border-brand-black sc-lift cursor-pointer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        onClick={handlePromoStartOver}
                        disabled={submitting}
                      >
                        Start Over
                      </motion.button>
                    </div>
                    {submitError && (
                      <p className="mt-3 text-sm text-red-600">Error submitting: {submitError}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* --- Completed Locations (static chat history) --- */}
          {completedLocations.map((loc, i) => (
            <div key={i}>
              {i === 0 ? (
                <ChatBubble message="What is the location placement of this artwork?" delay={0} />
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
              {/* Talk-to-artist reply if applicable */}
              {loc.artworkType === 'I am not sure.' && loc.artistMessage && (
                <UserReply text={loc.artistMessage.length > 160 ? loc.artistMessage.slice(0, 160) + '…' : loc.artistMessage} />
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
              <UserReply text={(loc.inkColorChoice === 'match'
                ? 'Match my colors as close as possible.'
                : loc.inkColorChoice === 'pms'
                  ? `PMS Match · ${loc.pmsEntries?.map((e) => e.code).join(', ') ?? ''}`
                  : `Selected ${loc.selectedInkColors.length} ink color${loc.selectedInkColors.length !== 1 ? 's' : ''}`)
                + (loc.selectedSpecialtyInks && loc.selectedSpecialtyInks.length > 0
                  ? ` · +${loc.selectedSpecialtyInks.length} specialty`
                  : '')
              } />
              <ChatBubble message="Would you like to add another print location?" delay={0} />
              <UserReply text={i < completedLocations.length - 1 || step !== 'apparel-review' ? 'Yes' : "No, I'm all set"} />
            </div>
          ))}

          {/* --- Confirm Apparel (SF-prefilled flow) --- */}
          <>
            <AnimatePresence>
              {confirmApparelAnim.showTyping && (
                <motion.div key="ca-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                  <TypingIndicator />
                </motion.div>
              )}
            </AnimatePresence>
            {confirmApparelAnim.showMessage && (
              <ChatBubble key="ca-msg" message="Let's confirm your apparel." />
            )}
            {pastConfirmApparel && selectedApparelTypes.length > 0 && (
              <UserReply text={apparelTypeLabel} />
            )}
            <AnimatePresence>
              {confirmApparelAnim.showOptions && step === 'confirm-apparel' && (
                <motion.div
                  key="ca-options"
                  className="px-4 pl-15"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-[11px] font-heading uppercase tracking-[0.18em] text-brand-black/55 mb-3">
                    Select all that apply
                  </p>
                  <OptionsGrid>
                    {APPAREL_TYPE_OPTIONS.map((opt, i) => {
                      const isSelected = selectedApparelTypes.includes(opt.id);
                      return (
                        <motion.button
                          key={opt.id}
                          type="button"
                          className={`group relative overflow-hidden rounded-[26px] bg-white border-2 border-brand-black cursor-pointer w-full text-left sc-lift ${isSelected ? 'ring-4 ring-brand-orange' : ''}`}
                          style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}
                          initial={{ opacity: 0, y: 24, rotate: -1 }}
                          animate={{ opacity: 1, y: 0, rotate: 0 }}
                          transition={{ duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                          onClick={() => toggleApparelType(opt.id)}
                          aria-pressed={isSelected}
                        >
                          <div className="relative w-full aspect-[4/3] overflow-hidden bg-brand-butter">
                            <div className="absolute inset-0 sc-dotgrid opacity-40" />
                            <Image
                              src={opt.imageSrc}
                              alt={opt.label}
                              fill
                              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.07] group-hover:rotate-[0.6deg]"
                              sizes="(max-width: 768px) 100vw, 300px"
                            />
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent" />
                            {isSelected && (
                              <span className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-orange text-brand-black border-2 border-brand-black text-base font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-3 px-5 py-4 border-t-2 border-brand-black bg-white">
                            <h3 className="sc-display text-2xl uppercase text-brand-black">{opt.label}</h3>
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-brand-black text-base transition-colors ${isSelected ? 'bg-brand-orange text-brand-black' : 'bg-white text-brand-black'}`}
                              aria-hidden
                            >
                              {isSelected ? '✓' : '+'}
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </OptionsGrid>

                  <motion.button
                    type="button"
                    onClick={handleApparelTypesContinue}
                    disabled={selectedApparelTypes.length === 0}
                    className="mt-5 inline-flex items-center gap-2 bg-brand-orange text-brand-black px-6 py-3 rounded-full sc-display text-base uppercase border-2 border-brand-black sc-lift disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    Continue <span aria-hidden>→</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </>

          {/* --- Garment Color (SF-prefilled flow, per apparel type) --- */}
          {pastConfirmApparel && (
            <>
              <AnimatePresence>
                {garmentColorAnim.showTyping && (
                  <motion.div key="gc-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {garmentColorAnim.showMessage && (
                <ChatBubble
                  key="gc-msg"
                  message={selectedApparelTypes.length > 1
                    ? "Choose your garment colors for each apparel type."
                    : "Choose your garment color."}
                />
              )}
              {pastGarmentColor && Object.keys(garmentColorsByType).length > 0 && (
                <UserReply
                  text={selectedApparelTypes
                    .map((t) => {
                      const label = APPAREL_TYPE_OPTIONS.find((o) => o.id === t)?.label ?? t;
                      const picks = garmentColorsByType[t] ?? [];
                      return picks.length ? `${label}: ${picks.join(', ')}` : null;
                    })
                    .filter(Boolean)
                    .join(' · ')}
                />
              )}
              <AnimatePresence>
                {garmentColorAnim.showOptions && step === 'garment-color' && (
                  <motion.div
                    key="gc-sections"
                    className="px-4 pl-15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="space-y-6">
                      {selectedApparelTypes.map((typeId) => {
                        const opt = APPAREL_TYPE_OPTIONS.find((o) => o.id === typeId);
                        const swatches = colorsByCategory[typeId] ?? [];
                        const selected = garmentColorsByType[typeId] ?? [];
                        return (
                          <div key={typeId} className="max-w-lg">
                            <div className="flex items-baseline justify-between mb-3">
                              <h4 className="sc-display text-lg uppercase text-brand-black">
                                {opt?.label ?? typeId}
                              </h4>
                              <span className="text-[11px] font-heading uppercase tracking-[0.18em] text-brand-black/55">
                                {selected.length} selected
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4">
                              {swatches.map((c, i) => {
                                const isSelected = selected.includes(c.name);
                                const displayHex = c.hex || '#CCCCCC';
                                return (
                                  <motion.button
                                    key={`${typeId}-${c.name}`}
                                    type="button"
                                    className="flex flex-col items-center gap-2 group cursor-pointer w-[78px]"
                                    initial={{ opacity: 0, scale: 0.7, y: 8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                                    whileHover={{ y: -3 }}
                                    whileTap={{ scale: 0.92 }}
                                    onClick={() => toggleGarmentColor(typeId, c.name)}
                                    aria-pressed={isSelected}
                                  >
                                    <div className="relative">
                                      <div
                                        className={`w-14 h-14 rounded-full border-2 border-brand-black transition-all duration-200 ${isSelected ? 'ring-4 ring-brand-orange ring-offset-2 ring-offset-brand-daylight' : 'group-hover:ring-4 group-hover:ring-brand-orange/60 group-hover:ring-offset-2 group-hover:ring-offset-brand-daylight'}`}
                                        style={{ backgroundColor: displayHex, boxShadow: '2px 2px 0 0 #1a1a1a' }}
                                      />
                                      {isSelected && (
                                        <span className="pointer-events-none absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-orange border-2 border-brand-black flex items-center justify-center text-[10px] font-bold text-brand-black">
                                          ✓
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] uppercase tracking-wide text-brand-black/70 text-center max-w-[80px] leading-tight font-body group-hover:text-brand-black transition-colors">
                                      {c.name}
                                    </span>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <motion.button
                      type="button"
                      onClick={handleGarmentColorsContinue}
                      disabled={!allTypesHaveColor}
                      className="mt-6 inline-flex items-center gap-2 bg-brand-orange text-brand-black px-6 py-3 rounded-full sc-display text-base uppercase border-2 border-brand-black sc-lift disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                    >
                      Continue <span aria-hidden>→</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* --- Artwork Setup Type (SF-prefilled flow) --- */}
          {pastGarmentColor && (
            <>
              <AnimatePresence>
                {artworkSetupAnim.showTyping && (
                  <motion.div key="as-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {artworkSetupAnim.showMessage && (
                <ChatBubble key="as-msg" message="Choose your artwork setup type." />
              )}
              {pastArtworkSetup && selectedArtworkSetupTypes.length > 0 && (
                <UserReply text={artworkSetupLabel} />
              )}
              <AnimatePresence>
                {artworkSetupAnim.showOptions && step === 'artwork-setup-type' && (
                  <motion.div
                    key="as-options"
                    className="px-4 pl-15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="text-[11px] font-heading uppercase tracking-[0.18em] text-brand-black/55 mb-3">
                      Select Adult and/or Youth — or pick Single Setup on its own
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                      {ARTWORK_SETUP_OPTIONS.map((opt, i) => {
                        const isSelected = selectedArtworkSetupTypes.includes(opt.id);
                        return (
                          <motion.button
                            key={opt.id}
                            type="button"
                            className={`group relative bg-white border-2 border-brand-black rounded-[22px] overflow-hidden text-left cursor-pointer sc-lift ${isSelected ? 'ring-4 ring-brand-orange' : ''}`}
                            style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}
                            initial={{ opacity: 0, y: 16, rotate: -1 }}
                            animate={{ opacity: 1, y: 0, rotate: 0 }}
                            transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                            onClick={() => toggleArtworkSetupType(opt.id)}
                            aria-pressed={isSelected}
                          >
                            <div className="relative aspect-[4/3] bg-brand-butter overflow-hidden">
                              <div className="absolute inset-0 sc-dotgrid opacity-30" />
                              <ArtworkSetupIllustration kind={opt.id as 'adult' | 'youth' | 'single'} />
                              {isSelected && (
                                <span className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-orange text-brand-black border-2 border-brand-black text-sm font-bold">
                                  ✓
                                </span>
                              )}
                            </div>
                            <div className="px-4 py-3 border-t-2 border-brand-black bg-white">
                              <p className="sc-display text-lg uppercase text-brand-black leading-tight">{opt.label}</p>
                              <p className="text-[11px] font-body text-brand-black/55 mt-0.5">
                                {opt.id === 'adult' && '~12" print · adult sizes'}
                                {opt.id === 'youth' && '~9" print · youth sizes'}
                                {opt.id === 'single' && '~9" print · all sizes'}
                              </p>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="mt-5 flex flex-col items-start gap-4">
                      <motion.button
                        type="button"
                        onClick={handleArtworkSetupContinue}
                        disabled={selectedArtworkSetupTypes.length === 0}
                        className="inline-flex items-center gap-2 bg-brand-orange text-brand-black px-6 py-3 rounded-full sc-display text-base uppercase border-2 border-brand-black sc-lift disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.3 }}
                      >
                        Continue <span aria-hidden>→</span>
                      </motion.button>

                      <button
                        type="button"
                        onClick={() => setArtworkSetupHelpOpen((v) => !v)}
                        className="text-[11px] font-heading uppercase tracking-[0.18em] text-brand-black/60 hover:text-brand-black underline underline-offset-4 cursor-pointer"
                      >
                        {artworkSetupHelpOpen ? 'Hide help' : "Not sure? See what's the difference"}
                      </button>
                    </div>

                    <AnimatePresence>
                      {artworkSetupHelpOpen && (
                        <motion.div
                          key="as-help"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div
                            className="mt-3 bg-brand-butter/50 border-2 border-brand-black rounded-2xl p-5 text-[13px] font-body text-brand-black space-y-4 max-w-md"
                            style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
                          >
                            <div>
                              <p className="sc-display text-base uppercase mb-1">Youth</p>
                              <ul className="list-disc pl-5 space-y-0.5">
                                <li>Designed specifically for youth shirts</li>
                                <li>Standard print width: ~9 inches</li>
                                <li>Scales well for smaller garment sizes</li>
                                <li>On adult shirts, this size will look noticeably small</li>
                              </ul>
                            </div>
                            <div>
                              <p className="sc-display text-base uppercase mb-1">Adult</p>
                              <ul className="list-disc pl-5 space-y-0.5">
                                <li>Designed for adult shirts only</li>
                                <li>Standard print width: ~12 inches</li>
                                <li>Provides a full, proportional look on adult sizes</li>
                                <li>Too large to print on youth garments</li>
                              </ul>
                            </div>
                            <div>
                              <p className="sc-display text-base uppercase mb-1">Single Set Up</p>
                              <ul className="list-disc pl-5 space-y-0.5">
                                <li>Uses youth-sized artwork (~9&quot;) across all shirts</li>
                                <li>Works on both youth + adult garments</li>
                                <li>Design will look small on adult garments</li>
                              </ul>
                            </div>
                            <div className="text-[12px] text-brand-black/75 border-t-2 border-brand-black/20 pt-3">
                              <p className="font-semibold mb-1">Minimums per setup:</p>
                              <p>Total minimum of 12 pieces for single ink color water-base prints and digital prints, and 36 pieces for multi ink color water-base prints and plastisol prints.</p>
                            </div>
                            <div className="text-[12px] border-t-2 border-brand-black/20 pt-3">
                              <p className="sc-display text-sm uppercase mb-1">Quick Summary</p>
                              <ul className="list-disc pl-5 space-y-0.5">
                                <li>Best fit + best look across all sizes? → Do both youth + adult setups</li>
                                <li>Budget-friendly? → Single setup</li>
                                <li>Youth-only order? → Single youth setup</li>
                                <li>Adult-only order? → Adult setup</li>
                              </ul>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

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
                  <ChatBubble key="pl-msg" message="What is the location placement of this artwork?" />
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
                          className="bg-white rounded-2xl border-2 border-brand-black overflow-hidden cursor-pointer group sc-lift"
                          style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
                          initial={{ opacity: 0, y: 20, rotate: -1 }}
                          animate={{ opacity: 1, y: 0, rotate: 0 }}
                          transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                          onClick={() => handlePlacementSelect(opt.title)}
                        >
                          <div className="relative aspect-square bg-brand-butter">
                            <div className="absolute inset-0 sc-dotgrid opacity-30" />
                            <Image
                              src={opt.imageSrc}
                              alt={opt.title}
                              fill
                              className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.05]"
                              sizes="200px"
                            />
                          </div>
                          <div className="px-3 py-2.5 border-t-2 border-brand-black">
                            <p className="text-[11px] font-heading uppercase tracking-wide text-brand-black text-center">
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

              {/* Artist message reply (talk-to-artist path) */}
              {selectedArtworkType === 'I am not sure.' && artistMessage && (
                <UserReply text={artistMessage.length > 160 ? artistMessage.slice(0, 160) + '…' : artistMessage} />
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
                          className="flex items-center gap-4 bg-white border-2 border-brand-black rounded-2xl px-5 py-4 text-left cursor-pointer group sc-lift"
                          style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: i * 0.1, ease: 'easeOut' }}
                          
                          
                          onClick={() => handleArtworkTypeSelect(opt.id)}
                        >
                          <span className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-butter border-2 border-brand-black flex items-center justify-center text-xl">{opt.icon}</span>
                          <span className="text-[15px] font-semibold text-brand-black flex-1">
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
                      sessionId={sessionIdRef.current}
                      folder={`location-${completedLocations.length + 1}/template`}
                      onUploadedPathsChange={setTemplateFilePaths}
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
                      sessionId={sessionIdRef.current}
                      folder={`location-${completedLocations.length + 1}/own-art`}
                      onUploadedPathsChange={setUploadedFilePaths}
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
                    (inkColorChoice === 'match'
                      ? 'Match my colors as close as possible.'
                      : inkColorChoice === 'pms'
                        ? `PMS Match · ${pmsEntries.map((e) => e.code).join(', ')}`
                        : `Selected ${selectedInkColors.length} ink color${selectedInkColors.length !== 1 ? 's' : ''}`)
                    + (selectedSpecialtyInks.length > 0
                      ? ` · +${selectedSpecialtyInks.length} specialty`
                      : '')
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
                          className="flex items-center gap-4 bg-white border-2 border-brand-black rounded-2xl px-5 py-4 text-left cursor-pointer group sc-lift"
                          style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: i * 0.1, ease: 'easeOut' }}
                          
                          
                          onClick={() => handleInkColorChoice(opt.id as InkColorChoice)}
                        >
                          <span className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-butter border-2 border-brand-black flex items-center justify-center text-xl">{opt.icon}</span>
                          <span className="text-[15px] font-semibold text-brand-black flex-1">
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
                  <InkColorGrid
                    colors={INK_COLORS}
                    selected={selectedInkColors}
                    onToggle={handleInkColorToggle}
                  />
                </motion.div>
              )}

              {/* PMS entries chips (after PMS chosen + saved) */}
              {step === 'ink-color' && inkColorChoice === 'pms' && pmsEntries.length > 0 && !pmsModalOpen && (
                <motion.div
                  className="px-4 pl-15"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="max-w-lg flex flex-wrap items-center gap-2">
                    {pmsEntries.map((e) => (
                      <span
                        key={e.code}
                        className="inline-flex items-center gap-2 bg-white border-2 border-brand-black rounded-full pl-1.5 pr-3 py-1"
                        style={{ boxShadow: '2px 2px 0 0 #1a1a1a' }}
                      >
                        <span
                          className="w-5 h-5 rounded-full border-2 border-brand-black flex-shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: e.hex ?? '#fff' }}
                        >
                          {!e.hex && <span className="text-[8px] font-heading text-brand-black/50">?</span>}
                        </span>
                        <span className="text-[12px] font-semibold text-brand-black">{e.code}</span>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPmsModalOpen(true)}
                      className="text-[11px] uppercase tracking-[0.18em] font-heading text-brand-black/70 hover:text-brand-black underline underline-offset-4"
                    >
                      Edit
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Specialty inks + Continue (after a choice has been made) */}
              {step === 'ink-color' && inkColorChoice && !pmsModalOpen && (
                <motion.div
                  className="px-4 pl-15"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="max-w-lg">
                    <SpecialtyInksPicker
                      value={selectedSpecialtyInks}
                      onChange={setSelectedSpecialtyInks}
                    />
                    <motion.button
                      className="mt-5 bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide border-2 border-brand-black sc-lift cursor-pointer disabled:cursor-not-allowed"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      onClick={handleInkColorContinue}
                      disabled={
                        (inkColorChoice === 'select' && selectedInkColors.length === 0) ||
                        (inkColorChoice === 'pms' && pmsEntries.length === 0)
                      }
                    >
                      Continue →
                    </motion.button>
                  </div>
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
                          className="flex items-center gap-4 bg-white border-2 border-brand-black rounded-2xl px-5 py-4 text-left cursor-pointer group sc-lift"
                          style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: i * 0.1, ease: 'easeOut' }}
                          
                          
                          onClick={() => handleAddLocationChoice(opt.id === 'yes')}
                        >
                          <span className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-butter border-2 border-brand-black flex items-center justify-center text-xl">{opt.icon}</span>
                          <span className="text-[15px] font-semibold text-brand-black flex-1">
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

          {/* --- Additional Comments --- */}
          {selectedProductType === 'Apparel' && (step === 'additional-comments' || step === 'apparel-review') && (
            <>
              <AnimatePresence>
                {additionalCommentsAnim.showTyping && (
                  <motion.div key="ac-typing" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>
              {additionalCommentsAnim.showMessage && (
                <ChatBubble key="ac-msg" message="Anything else we should know about this art request?" />
              )}

              {/* Reply once they continue */}
              {step === 'apparel-review' && additionalComments.trim() && (
                <UserReply text={additionalComments.length > 160 ? additionalComments.slice(0, 160) + '…' : additionalComments} />
              )}
              {step === 'apparel-review' && !additionalComments.trim() && (
                <UserReply text="No additional comments." />
              )}

              {/* Textarea + continue (only on this step) */}
              <AnimatePresence>
                {additionalCommentsAnim.showOptions && step === 'additional-comments' && (
                  <motion.div
                    key="ac-input"
                    className="px-4 pl-15 max-w-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3 }}
                  >
                    <textarea
                      value={additionalComments}
                      onChange={(e) => setAdditionalComments(e.target.value)}
                      placeholder="Anything else we should know about this art request?"
                      rows={4}
                      className="w-full bg-white border-2 border-brand-black rounded-2xl px-4 py-3 text-[14px] text-brand-black placeholder:text-brand-black/40 focus:outline-none focus:ring-4 focus:ring-brand-orange/30 resize-none"
                      style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
                    />
                    <button
                      className="mt-3 bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide border-2 border-brand-black sc-lift"
                      onClick={handleAdditionalCommentsContinue}
                    >
                      Continue
                    </button>
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
                    <div
                      className="relative max-w-md bg-white rounded-3xl border-2 border-brand-black p-6 space-y-4"
                      style={{ boxShadow: '5px 5px 0 0 #1a1a1a' }}
                    >
                      <span className="absolute -top-3 left-5 inline-flex items-center gap-1.5 bg-brand-yellow text-brand-black text-[10px] uppercase tracking-[0.18em] font-heading px-3 py-1 rounded-full border-2 border-brand-black">
                        Receipt
                      </span>
                      <h3 className="sc-display text-2xl uppercase text-brand-black leading-none pt-1">Apparel Request</h3>
                      <div className="h-px bg-brand-black/15" />
                      <div className="space-y-2.5 text-[13px] font-body text-brand-black">
                        <SummaryRow label="Product" value={selectedProduct ?? ''} />
                        <SummaryRow label="Sizing" value={SIZING_OPTIONS.find((o) => o.id === selectedSizing)?.label ?? selectedSizing ?? ''} />
                        {selectedApparelColor && <SummaryRow label="Color" value={selectedApparelColor} />}
                      </div>

                      {completedLocations.length > 0 && (
                        <div className="border-t-2 border-dashed border-brand-black/20 pt-4 space-y-3">
                          <h4 className="text-[11px] font-heading uppercase tracking-[0.18em] text-brand-black/60">
                            Print Locations · {completedLocations.length}
                          </h4>
                          {completedLocations.map((loc, i) => (
                            <div key={i} className="bg-brand-butter/40 border-2 border-brand-black/20 rounded-2xl p-3.5 space-y-1.5 text-sm">
                              <div className="flex justify-between">
                                <span className="text-[10px] uppercase tracking-[0.18em] text-brand-black/55 font-heading">Placement</span>
                                <span className="font-semibold text-brand-black">{loc.placement}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[10px] uppercase tracking-[0.18em] text-brand-black/55 font-heading">Artwork</span>
                                <span className="font-semibold text-brand-black">{loc.artworkType}</span>
                              </div>
                              {loc.selectedDesign && (
                                <div className="flex justify-between">
                                  <span className="text-[10px] uppercase tracking-[0.18em] text-brand-black/55 font-heading">Template</span>
                                  <span className="font-semibold text-brand-black">{loc.selectedDesign.name}</span>
                                </div>
                              )}
                              {loc.uploadedFiles.length > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-[10px] uppercase tracking-[0.18em] text-brand-black/55 font-heading">Files</span>
                                  <span className="font-semibold text-brand-black">{loc.uploadedFiles.length} file{loc.uploadedFiles.length > 1 ? 's' : ''}</span>
                                </div>
                              )}
                              {loc.artworkDetails && (
                                <div>
                                  <span className="text-[10px] uppercase tracking-[0.18em] text-brand-black/55 font-heading block mb-0.5">Details</span>
                                  <p className="text-brand-black">{loc.artworkDetails.length > 100 ? loc.artworkDetails.slice(0, 100) + '...' : loc.artworkDetails}</p>
                                </div>
                              )}
                              {loc.creativeData && (
                                <div className="flex justify-between">
                                  <span className="text-[10px] uppercase tracking-[0.18em] text-brand-black/55 font-heading">Style</span>
                                  <span className="font-semibold text-brand-black">{loc.creativeData.designStyles.join(', ')}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-[10px] uppercase tracking-[0.18em] text-brand-black/55 font-heading">Ink</span>
                                <span className="font-semibold text-brand-black">
                                  {loc.inkColorChoice === 'match'
                                    ? 'Match colors'
                                    : loc.inkColorChoice === 'pms'
                                      ? 'PMS Match'
                                      : `${loc.selectedInkColors.length} selected`}
                                </span>
                              </div>
                              {loc.inkColorChoice === 'pms' && loc.pmsEntries && loc.pmsEntries.length > 0 && (
                                <div className="flex justify-between gap-3">
                                  <span className="text-[10px] uppercase tracking-[0.18em] text-brand-black/55 font-heading flex-shrink-0">PMS</span>
                                  <span className="font-semibold text-brand-black text-right">{loc.pmsEntries.map((e) => e.code).join(', ')}</span>
                                </div>
                              )}
                              {loc.selectedSpecialtyInks && loc.selectedSpecialtyInks.length > 0 && (
                                <div className="flex justify-between gap-3">
                                  <span className="text-[10px] uppercase tracking-[0.18em] text-brand-black/55 font-heading flex-shrink-0">Specialty</span>
                                  <span className="font-semibold text-brand-black text-right">{loc.selectedSpecialtyInks.join(', ')}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 mt-4">
                      <motion.button
                        className="bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide border-2 border-brand-black sc-lift cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={handleApparelSubmit}
                        disabled={submitting}
                      >
                        {submitting ? 'Submitting…' : 'Submit'}
                      </motion.button>
                      <motion.button
                        className="bg-white text-brand-black px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide border-2 border-brand-black sc-lift cursor-pointer"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        onClick={handleApparelStartOver}
                        disabled={submitting}
                      >
                        Start Over
                      </motion.button>
                    </div>
                    {submitError && (
                      <p className="mt-3 text-sm text-red-600">Error submitting: {submitError}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {step === 'submitted' && (
            <>
              <ChatBubble message="Your art request has been submitted! 🎉" delay={0} />
              <ChatBubble message="A Sunday Cool artist will be in touch soon. You can close this window." delay={0.4} />
              <motion.div
                className="px-4 pl-15 pt-4"
                initial={{ opacity: 0, y: 16, rotate: -1.5 }}
                animate={{ opacity: 1, y: 0, rotate: -2 }}
                transition={{ duration: 0.7, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  className="inline-block bg-brand-orange border-2 border-brand-black rounded-3xl px-6 py-5 max-w-sm"
                  style={{ boxShadow: '5px 5px 0 0 #1a1a1a' }}
                >
                  <p className="text-[10px] uppercase tracking-[0.22em] font-heading text-brand-black/70 mb-1">Stamp of approval</p>
                  <p className="sc-display text-2xl uppercase text-brand-black leading-none">All wrapped up.</p>
                  <p className="text-sm text-brand-black/80 mt-2">Catch you on the next one. ✌️</p>
                </div>
              </motion.div>
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

      {/* PMS Match modal */}
      <PMSColorModal
        open={pmsModalOpen}
        initialEntries={pmsEntries}
        onClose={() => {
          setPmsModalOpen(false);
          // If they backed out without saving any entries, let them re-pick.
          if (pmsEntries.length === 0 && inkColorChoice === 'pms') {
            setInkColorChoice(null);
          }
        }}
        onSave={(entries) => {
          setPmsEntries(entries);
        }}
      />

      {/* Talk-to-artist modal */}
      <AnimatePresence>
        {talkToArtistOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleArtistCancel}
          >
            <motion.div
              className="relative bg-brand-daylight rounded-3xl max-w-lg w-full p-7 border-2 border-brand-black"
              style={{ boxShadow: '6px 6px 0 0 #1a1a1a' }}
              initial={{ opacity: 0, scale: 0.94, y: 14, rotate: -1 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="absolute -top-3 -left-3 inline-flex items-center gap-1.5 bg-brand-orange text-brand-black text-[10px] uppercase tracking-[0.18em] font-heading px-3 py-1 rounded-full border-2 border-brand-black">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-black" /> Direct line
              </span>

              <h2 className="sc-display text-3xl uppercase text-brand-black mb-1.5 leading-none">
                I'm not sure <span className="text-brand-orange">yet</span>
              </h2>
              <p className="text-sm text-brand-black/65 mb-5 max-w-sm">
                Tell us what you have in mind — an artist will follow up to walk through your project.
              </p>

              <textarea
                value={artistDraft}
                onChange={(e) => setArtistDraft(e.target.value)}
                placeholder="Describe your project, vibe, references, deadlines, or any questions…"
                rows={6}
                className="w-full bg-white border-2 border-brand-black rounded-2xl px-4 py-3 text-[14px] text-brand-black placeholder:text-brand-black/40 focus:outline-none focus:ring-4 focus:ring-brand-orange/30 resize-none"
                autoFocus
              />

              <div className="mt-5">
                <p className="text-[11px] font-heading uppercase tracking-[0.18em] text-brand-black/60 mb-2">
                  Attach references <span className="text-brand-black/40 normal-case tracking-normal">(optional)</span>
                </p>
                <FileUploadZone
                  files={uploadedFiles}
                  onFilesChange={setUploadedFiles}
                  onContinue={() => {}}
                  showContinueButton={false}
                  sessionId={sessionIdRef.current}
                  folder={`location-${completedLocations.length + 1}/artist-references`}
                  onUploadedPathsChange={setUploadedFilePaths}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  className="px-5 py-2.5 rounded-full text-sm font-heading uppercase tracking-wide text-brand-black/70 hover:text-brand-black border-2 border-transparent hover:border-brand-black transition-colors"
                  onClick={handleArtistCancel}
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-2.5 rounded-full text-sm font-heading uppercase tracking-wide bg-brand-black text-white border-2 border-brand-black sc-lift disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                  style={{ boxShadow: '3px 3px 0 0 #f6912d' }}
                  onClick={handleArtistSubmit}
                  disabled={artistDraft.trim().length === 0}
                >
                  Send →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// -- Small helper components --

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline gap-3">
      <span className="text-[11px] uppercase tracking-[0.18em] text-brand-black/55 font-heading">{label}</span>
      <span className="font-semibold text-brand-black text-right">{value}</span>
    </div>
  );
}

function UserReply({ text }: { text: string }) {
  return (
    <motion.div
      className="flex justify-end px-4"
      initial={{ opacity: 0, y: 10, rotate: 1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="bg-brand-black text-white px-5 py-3 max-w-xs border-2 border-brand-black"
        style={{
          borderRadius: '22px 22px 6px 22px',
          boxShadow: '-3px 3px 0 0 #f6912d',
        }}
      >
        <p className="text-[14px] font-body leading-snug">{text}</p>
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
      <div
        className="bg-white rounded-2xl border-2 border-brand-black overflow-hidden max-w-sm"
        style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}
      >
        <div className="relative aspect-square bg-brand-butter">
          <div className="absolute inset-0 sc-dotgrid opacity-30" />
          <Image
            src={design.thumbnail_url}
            alt={design.name}
            fill
            className="object-contain p-4"
            sizes="300px"
          />
        </div>
        <div className="px-4 py-3 border-t-2 border-brand-black flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-heading uppercase tracking-wide text-brand-black truncate">{design.name}</p>
            <p className="text-[10px] text-brand-black/55 mt-0.5 font-mono">{design.design_id}</p>
          </div>
          <span className="text-[10px] uppercase tracking-[0.18em] bg-brand-orange text-brand-black border-2 border-brand-black rounded-full px-2 py-0.5 font-heading flex-shrink-0">
            Picked
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function ArtworkSetupIllustration({ kind }: { kind: 'adult' | 'youth' | 'single' }) {
  // Tee outline path (centered around 0,0 in a 200x150 viewBox)
  // Print box is sized to convey relative print size.
  const Tee = ({ x, scale, printW, printH, sizeLabel }: { x: number; scale: number; printW: number; printH: number; sizeLabel: string }) => {
    const cx = x;
    const cy = 78;
    // Tee dimensions
    const w = 60 * scale;
    const h = 75 * scale;
    const sleeve = 14 * scale;
    const neckW = 14 * scale;
    const neckH = 6 * scale;
    const top = cy - h / 2;
    const bottom = cy + h / 2;
    const left = cx - w / 2;
    const right = cx + w / 2;
    const path = `
      M ${left} ${top + 8 * scale}
      L ${left - sleeve} ${top + 18 * scale}
      L ${left - sleeve + 4 * scale} ${top + 30 * scale}
      L ${left} ${top + 22 * scale}
      L ${left} ${bottom}
      L ${right} ${bottom}
      L ${right} ${top + 22 * scale}
      L ${right + sleeve - 4 * scale} ${top + 30 * scale}
      L ${right + sleeve} ${top + 18 * scale}
      L ${right} ${top + 8 * scale}
      Q ${cx + neckW / 2} ${top + 2 * scale} ${cx} ${top + neckH}
      Q ${cx - neckW / 2} ${top + 2 * scale} ${left} ${top + 8 * scale}
      Z
    `;
    return (
      <g>
        <path d={path} fill="#FFFFFF" stroke="#1a1a1a" strokeWidth="2" strokeLinejoin="round" />
        {/* Print box */}
        <rect
          x={cx - printW / 2}
          y={cy - printH / 2 - 2}
          width={printW}
          height={printH}
          fill="none"
          stroke="#F6912D"
          strokeWidth="2"
          strokeDasharray="4 3"
          rx="2"
        />
        <text
          x={cx}
          y={cy - printH / 2 - 6}
          textAnchor="middle"
          fontSize="9"
          fontFamily="ui-sans-serif, system-ui"
          fontWeight="700"
          fill="#1a1a1a"
        >
          {sizeLabel}
        </text>
      </g>
    );
  };

  if (kind === 'adult') {
    return (
      <svg viewBox="0 0 200 150" className="absolute inset-0 w-full h-full p-2">
        <Tee x={100} scale={1.25} printW={56} printH={48} sizeLabel={'12"'} />
      </svg>
    );
  }
  if (kind === 'youth') {
    return (
      <svg viewBox="0 0 200 150" className="absolute inset-0 w-full h-full p-2">
        <Tee x={100} scale={0.9} printW={36} printH={32} sizeLabel={'9"'} />
      </svg>
    );
  }
  // single: youth-sized print on both an adult tee and a youth tee
  return (
    <svg viewBox="0 0 200 150" className="absolute inset-0 w-full h-full p-2">
      <Tee x={68} scale={1.15} printW={32} printH={28} sizeLabel={'9"'} />
      <Tee x={148} scale={0.78} printW={28} printH={24} sizeLabel={'9"'} />
    </svg>
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
        className="w-full bg-white border-2 border-brand-black rounded-2xl px-4 py-3 text-[14px] font-body text-brand-black placeholder:text-brand-black/40 focus:outline-none focus:ring-4 focus:ring-brand-orange/30 resize-none"
        style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
        rows={4}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <motion.button
        className="bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide border-2 border-brand-black sc-lift cursor-pointer disabled:cursor-not-allowed"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        disabled={!value.trim()}
        onClick={onSubmit}
      >
        Continue →
      </motion.button>
    </div>
  );
}

function InkColorGrid({
  colors,
  selected,
  onToggle,
}: {
  colors: string[];
  selected: string[];
  onToggle: (hex: string) => void;
}) {
  return (
    <div className="max-w-lg space-y-3">
      <div className="flex flex-wrap gap-2">
        {colors.map((hex, i) => {
          const isSelected = selected.includes(hex);
          const isLight = isLightColor(hex);
          return (
            <motion.button
              key={`${hex}-${i}`}
              className={`w-10 h-10 rounded-full border-2 border-brand-black transition-all cursor-pointer flex items-center justify-center ${
                isSelected ? 'ring-4 ring-brand-orange ring-offset-2 ring-offset-brand-daylight' : ''
              }`}
              style={{
                backgroundColor: hex,
                boxShadow: isSelected ? '2px 2px 0 0 #1a1a1a' : '1px 1px 0 0 #1a1a1a',
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: isSelected ? 1.05 : 1 }}
              transition={{ duration: 0.2, delay: i * 0.008 }}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onToggle(hex)}
              title={hex}
            >
              {isSelected && (
                <span className={`text-[11px] font-bold ${isLight ? 'text-brand-black' : 'text-white'}`}>
                  ✓
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <span className="text-[11px] uppercase tracking-[0.18em] text-brand-black/60 font-heading">
          {selected.length} color{selected.length !== 1 ? 's' : ''} selected
        </span>
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

type UploadStatus = 'uploading' | 'done' | 'error';
interface UploadEntry {
  status: UploadStatus;
  path?: string;
  error?: string;
}

function FileUploadZone({
  files,
  onFilesChange,
  onContinue,
  showContinueButton = true,
  sessionId,
  folder,
  onUploadedPathsChange,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onContinue: () => void;
  showContinueButton?: boolean;
  sessionId: string;
  folder: string;
  onUploadedPathsChange?: (paths: string[]) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Map<File, UploadEntry>>(new Map());

  const reportPaths = useCallback((map: Map<File, UploadEntry>) => {
    if (!onUploadedPathsChange) return;
    const paths = Array.from(map.values())
      .filter((e) => e.status === 'done' && e.path)
      .map((e) => e.path!);
    onUploadedPathsChange(paths);
  }, [onUploadedPathsChange]);

  const addFiles = async (incoming: FileList | null) => {
    if (!incoming) return;
    const newFiles = Array.from(incoming);
    const next = [...files, ...newFiles];
    onFilesChange(next);

    setUploads((prev) => {
      const m = new Map(prev);
      newFiles.forEach((f) => m.set(f, { status: 'uploading' }));
      return m;
    });

    await Promise.all(newFiles.map(async (file) => {
      try {
        const { path } = await uploadToBucket(file, sessionId, folder);
        setUploads((prev) => {
          const m = new Map(prev);
          m.set(file, { status: 'done', path });
          reportPaths(m);
          return m;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setUploads((prev) => {
          const m = new Map(prev);
          m.set(file, { status: 'error', error: message });
          return m;
        });
      }
    }));
  };

  const removeFile = (index: number) => {
    const file = files[index];
    onFilesChange(files.filter((_, i) => i !== index));
    setUploads((prev) => {
      const m = new Map(prev);
      m.delete(file);
      reportPaths(m);
      return m;
    });
  };

  const anyUploading = Array.from(uploads.values()).some((e) => e.status === 'uploading');

  return (
    <div className="max-w-md space-y-3">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl px-6 py-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-brand-orange bg-brand-butter scale-[1.01]'
            : 'border-brand-black/40 bg-white hover:border-brand-black hover:bg-brand-butter/40'
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
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-butter border-2 border-brand-black mb-3 text-xl">
          ↑
        </div>
        <p className="text-sm font-heading uppercase tracking-wide text-brand-black">
          Drag & drop your files
        </p>
        <p className="text-[11px] text-brand-black/55 mt-1 font-body">
          or click to browse · Images, PDF, AI, EPS, SVG
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => {
            const entry = uploads.get(file);
            return (
              <motion.div
                key={`${file.name}-${i}`}
                className="flex items-center gap-3 bg-white border-2 border-brand-black rounded-xl px-3 py-2"
                style={{ boxShadow: '2px 2px 0 0 #1a1a1a' }}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
              >
                {file.type.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border-2 border-brand-black"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-brand-butter border-2 border-brand-black flex items-center justify-center flex-shrink-0">
                    <span className="text-base">📄</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-brand-black truncate">{file.name}</p>
                  <p className="text-[11px] text-brand-black/55 flex items-center gap-1.5">
                    <span>{(file.size / 1024).toFixed(0)} KB</span>
                    {entry?.status === 'uploading' && (
                      <span className="inline-flex items-center gap-1 text-brand-orange">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse" />
                        Uploading
                      </span>
                    )}
                    {entry?.status === 'done' && (
                      <span className="text-brand-black/70">· ✓ Uploaded</span>
                    )}
                    {entry?.status === 'error' && (
                      <span className="text-brand-pink">· ✗ {entry.error ?? 'Failed'}</span>
                    )}
                  </p>
                </div>
                <button
                  className="w-7 h-7 rounded-full bg-white border-2 border-brand-black flex items-center justify-center text-brand-black hover:bg-brand-pink hover:text-white transition-colors text-sm flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  aria-label="Remove file"
                >
                  ×
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Continue button */}
      {showContinueButton && files.length > 0 && (
        <motion.button
          className="bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide border-2 border-brand-black sc-lift disabled:opacity-50 disabled:cursor-not-allowed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onContinue}
          disabled={anyUploading}
        >
          {anyUploading ? 'Uploading…' : 'Continue'}
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
  sessionId,
  folder,
  onUploadedPathsChange,
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
  sessionId: string;
  folder: string;
  onUploadedPathsChange?: (paths: string[]) => void;
}) {
  return (
    <div className="max-w-md space-y-4">
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Headline</span>
          <input
            type="text"
            className="mt-1.5 w-full border-2 border-brand-black rounded-2xl px-4 py-3 text-[14px] font-body text-brand-black placeholder:text-brand-black/40 bg-white focus:outline-none focus:ring-4 focus:ring-brand-orange/30"
            placeholder="e.g. VBS 2025, Fall Retreat"
            value={headline}
            onChange={(e) => onHeadlineChange(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Group / Church Name</span>
          <input
            type="text"
            className="mt-1.5 w-full border-2 border-brand-black rounded-2xl px-4 py-3 text-[14px] font-body text-brand-black placeholder:text-brand-black/40 bg-white focus:outline-none focus:ring-4 focus:ring-brand-orange/30"
            placeholder="e.g. Grace Community Church"
            value={groupName}
            onChange={(e) => onGroupNameChange(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Verse Reference</span>
          <input
            type="text"
            className="mt-1.5 w-full border-2 border-brand-black rounded-2xl px-4 py-3 text-[14px] font-body text-brand-black placeholder:text-brand-black/40 bg-white focus:outline-none focus:ring-4 focus:ring-brand-orange/30"
            placeholder="e.g. John 3:16"
            value={verseRef}
            onChange={(e) => onVerseRefChange(e.target.value)}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Describe any changes</span>
        <textarea
          className="mt-1.5 w-full border-2 border-brand-black rounded-2xl px-4 py-3 text-[14px] font-body text-brand-black placeholder:text-brand-black/40 bg-white focus:outline-none focus:ring-4 focus:ring-brand-orange/30 resize-none"
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
          sessionId={sessionId}
          folder={folder}
          onUploadedPathsChange={onUploadedPathsChange}
        />
      </div>

      <motion.button
        className="bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide border-2 border-brand-black sc-lift cursor-pointer"
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
