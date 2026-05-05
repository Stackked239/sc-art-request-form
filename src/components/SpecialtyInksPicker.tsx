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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {SPECIALTY_INKS.map((ink) => {
          const checked = value.includes(ink.label);
          return (
            <motion.button
              key={ink.label}
              type="button"
              onClick={() => toggle(ink.label)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={`group relative flex flex-col items-center gap-2 rounded-2xl p-3 cursor-pointer border-2 border-brand-black sc-lift ${
                checked ? 'bg-brand-butter' : 'bg-white'
              }`}
              style={{
                boxShadow: checked ? '3px 3px 0 0 #f6912d' : '3px 3px 0 0 #1a1a1a',
              }}
            >
              <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-brand-daylight border-2 border-brand-black/15">
                <div className="absolute inset-0 sc-dotgrid opacity-30" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/images/specialty-inks/${ink.image}`}
                  alt={ink.label}
                  className="relative h-full w-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-[1.04]"
                />
              </div>
              <div className="flex flex-col items-center gap-0.5 text-center">
                <span className="text-[12px] font-heading uppercase tracking-wide text-brand-black leading-tight">
                  {ink.label}
                </span>
                <span className="text-[10px] text-brand-black/55 font-body">
                  +${ink.price}/{ink.priceUnit}
                </span>
              </div>

              {checked && (
                <motion.span
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange border-2 border-brand-black text-brand-black"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.span>
              )}
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
