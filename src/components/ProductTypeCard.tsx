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
      className="group relative overflow-hidden rounded-2xl bg-white border-2 border-gray-100 cursor-pointer w-full text-left hover:border-brand-orange transition-colors"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-brand-daylight">
        <Image
          src={imageSrc}
          alt={title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 300px"
        />
      </div>
      <div className="p-4">
        <h3 className="text-base font-heading uppercase text-brand-black">{title}</h3>
        <p className="text-xs text-gray-500 font-body mt-1">Click to select</p>
      </div>
    </motion.button>
  );
}
