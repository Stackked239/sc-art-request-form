'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { lookupPMS, formatPMSLabel } from '@/lib/pms-colors';

export interface PMSEntry {
  code: string;
  hex: string | null;
}

type Props = {
  open: boolean;
  initialEntries: PMSEntry[];
  onClose: () => void;
  onSave: (entries: PMSEntry[]) => void;
};

export default function PMSColorModal({ open, initialEntries, onClose, onSave }: Props) {
  const [entries, setEntries] = useState<PMSEntry[]>(initialEntries);
  const [input, setInput] = useState('');

  const previewHex = lookupPMS(input);
  const trimmed = input.trim();
  const canAdd = trimmed.length > 0;

  const reset = (next: PMSEntry[]) => {
    setEntries(next);
    setInput('');
  };

  const addEntry = () => {
    if (!canAdd) return;
    const code = formatPMSLabel(input);
    if (entries.some((e) => e.code === code)) {
      setInput('');
      return;
    }
    reset([...entries, { code, hex: previewHex }]);
  };

  const removeEntry = (code: string) =>
    setEntries(entries.filter((e) => e.code !== code));

  const handleSave = () => {
    onSave(entries);
    onClose();
  };

  const handleCancel = () => {
    setEntries(initialEntries);
    setInput('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleCancel}
        >
          <motion.div
            className="relative bg-brand-daylight rounded-3xl max-w-lg w-full p-7 border-2 border-brand-black"
            style={{ boxShadow: '6px 6px 0 0 #1a1a1a' }}
            initial={{ opacity: 0, scale: 0.94, y: 14, rotate: -1 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="absolute -top-3 -left-3 inline-flex items-center gap-1.5 bg-brand-orange text-brand-black text-[10px] uppercase tracking-[0.18em] font-heading px-3 py-1 rounded-full border-2 border-brand-black">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-black" /> $25/color
            </span>

            <h2 className="sc-display text-3xl uppercase text-brand-black mb-1.5 leading-none">
              PMS <span className="text-brand-orange">Match</span>
            </h2>
            <p className="text-sm text-brand-black/65 mb-5 max-w-sm">
              Type a Pantone Solid Coated code (e.g. <span className="font-semibold text-brand-black">186</span>, <span className="font-semibold text-brand-black">PMS 286 C</span>, or <span className="font-semibold text-brand-black">Reflex Blue</span>).
            </p>

            {/* Input + live swatch */}
            <div className="flex items-stretch gap-3">
              <div
                className="relative w-16 h-16 rounded-2xl border-2 border-brand-black flex-shrink-0 overflow-hidden"
                style={{
                  backgroundColor: previewHex ?? 'transparent',
                  boxShadow: '3px 3px 0 0 #1a1a1a',
                }}
              >
                {!previewHex && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-brand-black/40 font-heading text-center px-1">
                      {trimmed ? 'No match' : 'Swatch'}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 sc-dotgrid opacity-0" />
              </div>

              <div className="flex-1 flex flex-col">
                <input
                  type="text"
                  autoFocus
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addEntry();
                    }
                  }}
                  placeholder="186"
                  className="flex-1 w-full bg-white border-2 border-brand-black rounded-2xl px-4 py-3 text-[15px] font-body text-brand-black placeholder:text-brand-black/40 focus:outline-none focus:ring-4 focus:ring-brand-orange/30"
                  style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
                />
                <p className="text-[11px] mt-1.5 font-heading uppercase tracking-[0.15em] text-brand-black/55 min-h-[14px]">
                  {trimmed
                    ? previewHex
                      ? <>matched · <span className="text-brand-black">{formatPMSLabel(input)}</span></>
                      : <>Not in our quick catalog — we&apos;ll match it for you.</>
                    : <>&nbsp;</>}
                </p>
              </div>

              <button
                type="button"
                onClick={addEntry}
                disabled={!canAdd}
                className="flex-shrink-0 self-start bg-brand-orange text-brand-black px-4 py-3 rounded-full text-sm font-heading uppercase tracking-wide border-2 border-brand-black sc-lift disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>

            {/* Entry list */}
            {entries.length > 0 && (
              <div className="mt-5">
                <p className="text-[11px] font-heading uppercase tracking-[0.18em] text-brand-black/55 mb-2">
                  Selected · {entries.length}
                </p>
                <ul className="space-y-2">
                  {entries.map((e) => (
                    <motion.li
                      key={e.code}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center gap-3 bg-white border-2 border-brand-black rounded-xl px-3 py-2"
                      style={{ boxShadow: '2px 2px 0 0 #1a1a1a' }}
                    >
                      <span
                        className="w-9 h-9 rounded-lg border-2 border-brand-black flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: e.hex ?? '#fff' }}
                      >
                        {!e.hex && (
                          <span className="text-[9px] uppercase font-heading tracking-wide text-brand-black/45">?</span>
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-brand-black truncate">{e.code}</p>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-brand-black/55 font-heading">
                          {e.hex ? e.hex : 'Manual match'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEntry(e.code)}
                        aria-label={`Remove ${e.code}`}
                        className="w-7 h-7 rounded-full bg-white border-2 border-brand-black flex items-center justify-center text-brand-black hover:bg-brand-pink hover:text-white transition-colors text-sm flex-shrink-0"
                      >
                        ×
                      </button>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                className="px-5 py-2.5 rounded-full text-sm font-heading uppercase tracking-wide text-brand-black/70 hover:text-brand-black border-2 border-transparent hover:border-brand-black transition-colors"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-6 py-2.5 rounded-full text-sm font-heading uppercase tracking-wide bg-brand-black text-white border-2 border-brand-black sc-lift disabled:cursor-not-allowed"
                style={{ boxShadow: '3px 3px 0 0 #f6912d' }}
                onClick={handleSave}
                disabled={entries.length === 0}
              >
                Save → {entries.length > 0 ? `(${entries.length})` : ''}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
