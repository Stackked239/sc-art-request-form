'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface ApparelSummary {
  type: 'apparel';
  product: string;
  colorName: string;
  colorHex: string | null;
  material: string | null;
  adultSizes: string | null;
  youthSizes: string | null;
  printability: string | null;
  availableDecorations: string[] | null;
}

interface PromoSummary {
  type: 'promo';
  category: string;
  product: string;
  colorName: string;
  colorHex: string | null;
  decorationOptions: string | null;
  printableArea: string | null;
}

export type SummaryData = ApparelSummary | PromoSummary;

interface ProductSummaryModalProps {
  data: SummaryData | null;
  onContinue: () => void;
}

export default function ProductSummaryModal({ data, onContinue }: ProductSummaryModalProps) {
  if (!data) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/40" />

        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* Header */}
          <div className="bg-brand-black px-6 py-4">
            <h2 className="text-white text-lg font-heading uppercase">Your Selection</h2>
            <p className="text-gray-400 text-sm font-body mt-0.5">
              {data.type === 'apparel' ? data.product : data.product}
            </p>
          </div>

          {/* Color badge */}
          <div className="px-6 pt-5 pb-3 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full border border-gray-200 flex-shrink-0"
              style={{ backgroundColor: data.colorHex || '#CCCCCC' }}
            />
            <div>
              <p className="text-sm font-semibold text-brand-black font-body">{data.colorName}</p>
              <p className="text-xs text-gray-500 font-body">Selected color</p>
            </div>
          </div>

          {/* Details */}
          <div className="px-6 pb-6 space-y-3">
            {data.type === 'apparel' ? (
              <>
                {data.material && <DetailRow label="Material" value={data.material} />}
                {(data.adultSizes || data.youthSizes) && (
                  <DetailRow
                    label="Sizes"
                    value={[
                      data.adultSizes && `Adult: ${data.adultSizes}`,
                      data.youthSizes && `Youth: ${data.youthSizes}`,
                    ]
                      .filter(Boolean)
                      .join(' | ')}
                  />
                )}
                {data.printability && (
                  <DetailRow label="Printability" value={data.printability} />
                )}
                {data.availableDecorations && data.availableDecorations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 font-body">
                      Available Decorations
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.availableDecorations.map((d) => (
                        <span
                          key={d}
                          className="inline-block bg-brand-butter text-brand-black text-xs font-semibold px-2.5 py-1 rounded-full font-body"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <DetailRow label="Category" value={data.category} />
                {data.decorationOptions && (
                  <DetailRow label="Decoration Options" value={data.decorationOptions} />
                )}
                {data.printableArea && (
                  <DetailRow label="Printable Area" value={data.printableArea} />
                )}
              </>
            )}
          </div>

          {/* CTA */}
          <div className="px-6 pb-6">
            <button
              onClick={onContinue}
              className="w-full bg-brand-black text-white py-3 rounded-full text-sm font-heading uppercase tracking-wide hover:bg-black transition-colors"
            >
              Let&apos;s get started on the details of your art.
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5 font-body">
        {label}
      </p>
      <p className="text-sm text-brand-black font-body">{value}</p>
    </div>
  );
}
