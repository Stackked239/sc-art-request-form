'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

const DOT_COLORS = ['#f6912d', '#53cfdd', '#e96a6a'];

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4">
      <div
        className="relative w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 ring-2 ring-brand-black overflow-hidden"
        style={{ boxShadow: '2px 2px 0 0 #f6912d' }}
      >
        <Image
          src="/sunday-cool-logo.avif"
          alt="Sunday Cool"
          width={32}
          height={32}
          className="object-contain p-1"
        />
      </div>
      <div
        className="bg-white px-5 py-4 border-2 border-brand-black"
        style={{
          borderRadius: '22px 22px 22px 6px',
          boxShadow: '3px 3px 0 0 #1a1a1a',
        }}
      >
        <div className="flex gap-1.5 items-end h-3">
          {DOT_COLORS.map((c, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: c }}
              animate={{ y: [0, -5, 0], scale: [1, 1.2, 1] }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: i * 0.13,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
