'use client';

import { motion } from 'framer-motion';

interface ChatBubbleProps {
  message: string;
  delay?: number;
}

export default function ChatBubble({ message, delay = 0 }: ChatBubbleProps) {
  return (
    <motion.div
      className="flex items-start gap-3 px-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    >
      <div className="w-8 h-8 rounded-full bg-brand-black flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-heading">SC</span>
      </div>
      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 max-w-md">
        <p className="text-brand-black text-sm leading-relaxed font-body">{message}</p>
      </div>
    </motion.div>
  );
}
