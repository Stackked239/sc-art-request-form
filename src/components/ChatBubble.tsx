'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface ChatBubbleProps {
  message: string;
  delay?: number;
}

export default function ChatBubble({ message, delay = 0 }: ChatBubbleProps) {
  return (
    <motion.div
      data-chat-bubble
      className="flex items-start gap-3 px-4"
      initial={{ opacity: 0, y: 14, rotate: -1.2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="relative w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 ring-2 ring-brand-black overflow-hidden"
        style={{ boxShadow: '2px 2px 0 0 #f6912d' }}
        whileHover={{ rotate: -8, scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        <Image
          src="/sunday-cool-logo.avif"
          alt="Sunday Cool"
          width={32}
          height={32}
          className="object-contain p-1"
        />
      </motion.div>

      <div className="relative max-w-md">
        <div
          className="bg-white px-5 py-3.5 text-brand-black text-[15px] leading-relaxed font-body border-2 border-brand-black"
          style={{
            borderRadius: '22px 22px 22px 6px',
            boxShadow: '3px 3px 0 0 #1a1a1a',
          }}
        >
          {message}
        </div>
      </div>
    </motion.div>
  );
}
