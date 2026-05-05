'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface ProductTypeCardProps {
  title: string;
  imageSrc: string;
  delay?: number;
  onClick: () => void;
}

export default function ProductTypeCard({
  title,
  imageSrc,
  delay = 0,
  onClick,
}: ProductTypeCardProps) {
  return (
    <motion.button
      className="group relative overflow-hidden rounded-[26px] bg-white border-2 border-brand-black cursor-pointer w-full text-left sc-lift"
      style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}
      initial={{ opacity: 0, y: 24, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
    >
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-brand-butter">
        <div className="absolute inset-0 sc-dotgrid opacity-40" />
        <Image
          src={imageSrc}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.07] group-hover:rotate-[0.6deg]"
          sizes="(max-width: 768px) 100vw, 300px"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent" />
      </div>

      <div className="flex items-center justify-between gap-3 px-5 py-4 border-t-2 border-brand-black bg-white">
        <h3 className="sc-display text-2xl uppercase text-brand-black">{title}</h3>
        <span
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-brand-black text-white text-base transition-transform duration-300 group-hover:translate-x-0.5 group-hover:bg-brand-orange"
          aria-hidden
        >
          →
        </span>
      </div>
    </motion.button>
  );
}
