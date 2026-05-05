"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { OpportunityData } from "@/lib/salesforce";
import ArtRequestForm from "@/components/ArtRequestForm";

function parseSkusAndColors(raw: string | null): { sku: string; color: string }[] {
  if (!raw) return [];
  const pairs: { sku: string; color: string }[] = [];
  const regex = /sku\s*:\s*(\S+)\s*,\s*color\s*:\s*([^,]+?)(?=\s*,\s*sku\s*:|$)/gi;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    const sku = match[1].trim();
    const color = match[2].trim();
    if (!pairs.some((p) => p.sku === sku && p.color === color)) {
      pairs.push({ sku, color });
    }
  }
  return pairs;
}

export default function ConsultForm({ opportunity }: { opportunity: OpportunityData }) {
  const garmentItems = parseSkusAndColors(opportunity.Skus_and_Colors__c);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-[#fdf9ec]">
      <AnimatePresence>
        {stuck && (
          <motion.header
            key="sticky-header"
            className="fixed top-0 left-0 right-0 z-30 backdrop-blur-md bg-brand-daylight/85 border-b-2 border-brand-black"
            initial={{ y: -64, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -64, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mx-auto max-w-xl px-4 py-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/sunday-cool-logo.avif" alt="Sunday Cool" className="h-10 w-auto flex-shrink-0" />
              <h2 className="sc-display text-lg sm:text-xl uppercase text-brand-black leading-none">
                Sunday Cool <span className="text-brand-orange">Art Request</span> Form
              </h2>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-xl px-4 pb-24 pt-8">
        <section className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sunday-cool-logo.avif" alt="Sunday Cool" className="mb-6 h-12 w-auto" />

          <div className="mb-8 text-center">
            <h2 className="sc-display text-[clamp(2rem,6vw,3.25rem)] uppercase text-brand-black leading-[0.9]">
              Sunday Cool <span className="text-brand-orange">Art Request</span> Form
            </h2>
            <p className="mt-3 text-sm text-brand-black/65 max-w-md mx-auto">
              Big idea? Tiny tweak? Tell us everything below.
            </p>
          </div>

          <div ref={sentinelRef} aria-hidden className="h-px w-full" />

          <h1 className="mb-3 mt-6 text-3xl font-bold uppercase tracking-tight md:text-4xl">
            {opportunity.Name || "Opportunity"} - {opportunity.Contact_Name__c || "Client"}
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            {garmentItems.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs shadow-sm"
              >
                <span className="font-semibold">{item.color}</span>
                <span className="text-neutral-400">SKU {item.sku}</span>
              </span>
            ))}
            {opportunity.Set_Up_Type__c && (
              <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-sm">
                {opportunity.Set_Up_Type__c}
              </span>
            )}
            {opportunity.Wrike_ART_Type__c && (
              <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-sm">
                {opportunity.Wrike_ART_Type__c}
              </span>
            )}
            {opportunity.Owner?.Name && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs shadow-sm">
                <span className="text-neutral-400">Sales Rep</span>
                <span className="font-semibold">{opportunity.Owner.Name}</span>
              </span>
            )}
          </div>
        </section>

        <ArtRequestForm embedded />
      </div>
    </main>
  );
}
