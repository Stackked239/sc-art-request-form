'use client';

import { motion } from 'framer-motion';

interface ColorSwatchProps {
  name: string;
  hex: string | null;
  delay?: number;
  onClick: () => void;
}

export default function ColorSwatch({ name, hex, delay = 0, onClick }: ColorSwatchProps) {
  const displayHex = hex || '#CCCCCC';
  const isLight =
    displayHex.toUpperCase() === '#F9F9F9' ||
    displayHex.toUpperCase() === '#FFFFFF' ||
    displayHex.toUpperCase() === '#E3D3C1' ||
    displayHex.toUpperCase() === '#DDD5D1' ||
    displayHex.toUpperCase() === '#DFD2B1' ||
    displayHex.toUpperCase() === '#FFFF00' ||
    displayHex.toUpperCase() === '#E7F967' ||
    displayHex.toUpperCase() === '#D4FC7E' ||
    displayHex.toUpperCase() === '#C5DF5C' ||
    displayHex.toUpperCase() === '#B6F2B6' ||
    displayHex.toUpperCase() === '#FDDD00' ||
    luminance(displayHex) > 0.5;

  return (
    <motion.button
      className="flex flex-col items-center gap-2 group cursor-pointer"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <div
        className={`w-12 h-12 rounded-full shadow-md transition-shadow group-hover:shadow-lg group-hover:ring-2 group-hover:ring-brand-orange group-hover:ring-offset-2 ${isLight ? 'border border-gray-200' : ''}`}
        style={{ backgroundColor: displayHex }}
      />
      <span className="text-xs text-gray-600 text-center max-w-[80px] leading-tight">
        {name}
      </span>
    </motion.button>
  );
}

function luminance(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 0;
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
