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
  const isLight = luminance(displayHex) > 0.78;

  return (
    <motion.button
      className="flex flex-col items-center gap-2 group cursor-pointer w-[78px]"
      initial={{ opacity: 0, scale: 0.7, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
    >
      <div className="relative">
        <div
          className={`w-14 h-14 rounded-full transition-all duration-200 ${
            isLight ? 'border-2 border-brand-black' : 'border-2 border-brand-black/0'
          } group-hover:ring-4 group-hover:ring-brand-orange group-hover:ring-offset-2 group-hover:ring-offset-brand-daylight`}
          style={{
            backgroundColor: displayHex,
            boxShadow: '2px 2px 0 0 #1a1a1a',
          }}
        />
        <span className="pointer-events-none absolute -top-1 -right-1 w-3 h-3 rounded-full bg-brand-yellow border-2 border-brand-black opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <span className="text-[11px] uppercase tracking-wide text-brand-black/70 text-center max-w-[80px] leading-tight font-body group-hover:text-brand-black transition-colors">
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
