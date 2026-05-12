'use client';

import { motion } from 'framer-motion';
import { SPECIALTY_INKS } from '@/lib/specialty-inks';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
};

export default function SpecialtyInksPicker({ value, onChange }: Props) {
  const toggle = (label: string) =>
    onChange(value.includes(label) ? value.filter((l) => l !== label) : [...value, label]);

  return (
    <div className="mt-6 pt-5 border-t-2 border-dashed border-brand-black/20">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="sc-display text-lg uppercase text-brand-black leading-none">
          Specialty <span className="text-brand-orange">Inks</span>
        </h3>
        <span className="text-[10px] uppercase tracking-[0.18em] font-heading text-brand-black/55">
          Optional
        </span>
      </div>
      <p className="text-[12px] text-brand-black/60 mb-4 max-w-sm">
        Add a finish with a little more attitude. Pricing is per location.
      </p>

      <div className="grid grid-cols-2 gap-4 max-w-lg">
        {SPECIALTY_INKS.map((ink, i) => {
          const checked = value.includes(ink.label);
          return (
            <motion.button
              key={ink.label}
              type="button"
              onClick={() => toggle(ink.label)}
              initial={{ opacity: 0, y: 24, rotate: -1 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 0.55, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              aria-pressed={checked}
              className={`group relative overflow-hidden rounded-[26px] bg-white border-2 border-brand-black cursor-pointer w-full text-left sc-lift ${
                checked ? 'ring-4 ring-brand-orange' : ''
              }`}
              style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}
            >
              <div className="relative w-full aspect-[4/3] overflow-hidden bg-brand-butter">
                <div className="absolute inset-0 sc-dotgrid opacity-40" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/images/specialty-inks/${ink.image}`}
                  alt={ink.label}
                  className="relative h-full w-full object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-[1.07] group-hover:rotate-[0.6deg]"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent" />
                {checked && (
                  <span className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-orange text-brand-black border-2 border-brand-black text-base font-bold">
                    ✓
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-t-2 border-brand-black bg-white">
                <div className="min-w-0">
                  <h4 className="sc-display text-xl sm:text-2xl uppercase text-brand-black leading-none truncate">
                    {ink.label}
                  </h4>
                  <p className="mt-1 text-[11px] uppercase tracking-wide font-heading text-brand-black/55">
                    +${ink.price}/{ink.priceUnit}
                  </p>
                </div>
                <span
                  className={`flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-brand-black text-base transition-colors ${
                    checked ? 'bg-brand-orange text-brand-black' : 'bg-white text-brand-black'
                  }`}
                  aria-hidden
                >
                  {checked ? '✓' : '+'}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {value.length > 0 && (
        <p className="mt-4 text-[11px] uppercase tracking-[0.18em] font-heading text-brand-black/60">
          {value.length} specialty ink{value.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
