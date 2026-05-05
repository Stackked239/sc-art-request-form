export const SPECIALTY_INKS = [
  { label: 'Sun Reveal', image: 'sun-reveal.png', price: 1, priceUnit: 'color/location' },
  { label: 'Wet Reveal', image: 'wet-reveal.png', price: 1, priceUnit: 'location' },
  { label: 'Puff', image: 'puff.png', price: 1, priceUnit: 'location' },
  { label: 'Iridescent', image: 'iridescent.png', price: 1, priceUnit: 'location' },
  { label: 'Silver Shimmer', image: 'silver-shimmer.png', price: 1, priceUnit: 'location' },
  { label: 'Gold Shimmer', image: 'gold-shimmer.png', price: 1, priceUnit: 'location' },
  { label: 'Glow', image: 'glow.png', price: 2, priceUnit: 'location' },
] as const;

export type SpecialtyInkLabel = (typeof SPECIALTY_INKS)[number]['label'];
