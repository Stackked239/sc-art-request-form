'use client';

import { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import TypingIndicator from './TypingIndicator';
import ChatBubble from './ChatBubble';

// -- Types --

export interface CreativeData {
  targetAudience: string[];
  designedFor: string;
  audienceNotes: string;
  designStyles: string[];
  stylesToAvoid: string;
  headlineText: string;
  additionalText: string;
  extraText: string;
  mustHaveElements: string;
  elementFiles: File[];
  fileDescriptions: string;
  inspirationFiles: File[];
  inspirationDescription: string;
  moods: string[];
  perfectReaction: string;
}

type Phase =
  | 'audience-who'
  | 'audience-gender'
  | 'audience-notes'
  | 'style-direction'
  | 'style-avoid'
  | 'text-headline'
  | 'text-additional'
  | 'text-extra'
  | 'elements-musthave'
  | 'elements-upload'
  | 'elements-description'
  | 'inspiration-upload'
  | 'inspiration-describe'
  | 'mood-select'
  | 'mood-reaction';

interface PhaseConfig {
  id: Phase;
  message: string;
  inputType: 'multi-select' | 'single-select' | 'text' | 'skippable-text' | 'file-upload';
}

// -- Static data --

const AUDIENCE_OPTIONS = [
  { id: 'kids', label: 'Kids (5-12)', icon: '🧒' },
  { id: 'teens', label: 'Teens (13-17)', icon: '🎒' },
  { id: 'young-adults', label: 'Young Adults (18-30)', icon: '🎓' },
  { id: 'adults', label: 'Adults (30+)', icon: '👔' },
  { id: 'all-ages', label: 'All Ages', icon: '👨‍👩‍👧‍👦' },
];

const GENDER_OPTIONS = [
  { id: 'male', label: 'Primarily Male', icon: '👨' },
  { id: 'female', label: 'Primarily Female', icon: '👩' },
  { id: 'mixed', label: 'Mixed / Unisex', icon: '👥' },
];

const STYLE_OPTIONS = [
  { id: 'vintage', label: 'Vintage / Retro', icon: '🕰️' },
  { id: 'modern', label: 'Modern / Clean', icon: '✨' },
  { id: 'bold', label: 'Bold / Loud', icon: '🔥' },
  { id: 'playful', label: 'Playful / Fun', icon: '🎉' },
  { id: 'elegant', label: 'Elegant / Refined', icon: '🌿' },
  { id: 'edgy', label: 'Edgy / Street', icon: '⚡' },
  { id: 'hand-drawn', label: 'Hand-Drawn / Artistic', icon: '🎨' },
  { id: 'minimalist', label: 'Minimalist', icon: '⬜' },
  { id: 'not-sure', label: 'Not sure — need guidance', icon: '🤔' },
];

const MOOD_OPTIONS = [
  { id: 'joyful', label: 'Joyful', icon: '😊' },
  { id: 'inspiring', label: 'Inspiring', icon: '🌟' },
  { id: 'peaceful', label: 'Peaceful', icon: '🕊️' },
  { id: 'energetic', label: 'Energetic', icon: '⚡' },
  { id: 'reverent', label: 'Reverent', icon: '🙏' },
  { id: 'nostalgic', label: 'Nostalgic', icon: '📷' },
  { id: 'adventurous', label: 'Adventurous', icon: '🏔️' },
  { id: 'community', label: 'Community / Togetherness', icon: '🤝' },
];

const PHASE_CONFIGS: PhaseConfig[] = [
  { id: 'audience-who', message: "Let's start with who this design is for. Who is your target audience?", inputType: 'multi-select' },
  { id: 'audience-gender', message: 'Is this design primarily for a specific gender?', inputType: 'single-select' },
  { id: 'audience-notes', message: 'Any additional details about your audience? (e.g. youth group name, event theme)', inputType: 'skippable-text' },
  { id: 'style-direction', message: 'What design style(s) are you drawn to? Pick all that apply.', inputType: 'multi-select' },
  { id: 'style-avoid', message: "Is there anything you'd like us to avoid in the design?", inputType: 'skippable-text' },
  { id: 'text-headline', message: "What's the main headline or text you want on the design?", inputType: 'text' },
  { id: 'text-additional', message: 'What additional text should be included? (e.g. church name, date, verse reference)', inputType: 'text' },
  { id: 'text-extra', message: 'Any other text or copy to include?', inputType: 'skippable-text' },
  { id: 'elements-musthave', message: 'Are there any must-have elements? (e.g. a cross, specific imagery, a logo)', inputType: 'text' },
  { id: 'elements-upload', message: 'Do you have any logos or reference files to upload?', inputType: 'file-upload' },
  { id: 'elements-description', message: 'Please describe the files you uploaded and how they should be used.', inputType: 'text' },
  { id: 'inspiration-upload', message: 'Do you have any inspiration images to share? (designs you love, color palettes, mood boards)', inputType: 'file-upload' },
  { id: 'inspiration-describe', message: "Describe what you're looking for or what you like about your inspiration.", inputType: 'text' },
  { id: 'mood-select', message: 'What mood or feeling should this design evoke? Pick all that apply.', inputType: 'multi-select' },
  { id: 'mood-reaction', message: "When someone sees this design, what's the reaction you're hoping for?", inputType: 'text' },
];

// -- Animation helper hook (local copy) --

function useStepAnimation(optionsDelay = 400) {
  const [showTyping, setShowTyping] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const start = useCallback(() => {
    setShowTyping(true);
    setShowMessage(false);
    setShowOptions(false);
    setTimeout(() => {
      setShowTyping(false);
      setShowMessage(true);
      setTimeout(() => setShowOptions(true), optionsDelay);
    }, 1200);
  }, [optionsDelay]);

  return { showTyping, showMessage, showOptions, start };
}

// -- Main component --

interface CreativeQuestionnaireProps {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onComplete: (data: CreativeData) => void;
}

export default function CreativeQuestionnaire({ scrollRef, onComplete }: CreativeQuestionnaireProps) {
  const [phase, setPhase] = useState<Phase>('audience-who');
  const anim = useStepAnimation();

  // Collected data
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [designedFor, setDesignedFor] = useState('');
  const [audienceNotes, setAudienceNotes] = useState('');
  const [designStyles, setDesignStyles] = useState<string[]>([]);
  const [stylesToAvoid, setStylesToAvoid] = useState('');
  const [headlineText, setHeadlineText] = useState('');
  const [additionalText, setAdditionalText] = useState('');
  const [extraText, setExtraText] = useState('');
  const [mustHaveElements, setMustHaveElements] = useState('');
  const [elementFiles, setElementFiles] = useState<File[]>([]);
  const [fileDescriptions, setFileDescriptions] = useState('');
  const [inspirationFiles, setInspirationFiles] = useState<File[]>([]);
  const [inspirationDescription, setInspirationDescription] = useState('');
  const [moods, setMoods] = useState<string[]>([]);
  const [perfectReaction, setPerfectReaction] = useState('');

  // Completed phases history
  const [completedPhases, setCompletedPhases] = useState<{ phase: Phase; message: string; reply: string }[]>([]);

  // Whether the first animation has been triggered
  const [started, setStarted] = useState(false);

  // Start the first phase animation on mount
  if (!started) {
    setStarted(true);
    setTimeout(() => anim.start(), 100);
  }

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
  };

  const advancePhase = (currentPhase: Phase, replyText: string) => {
    const config = PHASE_CONFIGS.find((c) => c.id === currentPhase)!;
    setCompletedPhases((prev) => [...prev, { phase: currentPhase, message: config.message, reply: replyText }]);

    const phaseOrder: Phase[] = PHASE_CONFIGS.map((c) => c.id);
    const currentIndex = phaseOrder.indexOf(currentPhase);

    // Handle conditional skips
    let nextIndex = currentIndex + 1;

    // Skip elements-description if no element files were uploaded
    if (phaseOrder[nextIndex] === 'elements-description' && elementFiles.length === 0) {
      nextIndex++;
    }

    if (nextIndex >= phaseOrder.length) {
      // Questionnaire complete
      onComplete({
        targetAudience,
        designedFor,
        audienceNotes,
        designStyles,
        stylesToAvoid,
        headlineText,
        additionalText,
        extraText,
        mustHaveElements,
        elementFiles,
        fileDescriptions,
        inspirationFiles,
        inspirationDescription,
        moods,
        perfectReaction,
      });
      return;
    }

    setPhase(phaseOrder[nextIndex]);
    anim.start();
    scrollToBottom();
  };

  const handleMultiSelectContinue = (currentPhase: Phase) => {
    if (currentPhase === 'audience-who') {
      const labels = targetAudience.map((id) => AUDIENCE_OPTIONS.find((o) => o.id === id)?.label ?? id);
      advancePhase(currentPhase, labels.join(', '));
    } else if (currentPhase === 'style-direction') {
      const labels = designStyles.map((id) => STYLE_OPTIONS.find((o) => o.id === id)?.label ?? id);
      advancePhase(currentPhase, labels.join(', '));
    } else if (currentPhase === 'mood-select') {
      const labels = moods.map((id) => MOOD_OPTIONS.find((o) => o.id === id)?.label ?? id);
      advancePhase(currentPhase, labels.join(', '));
    }
  };

  const handleSingleSelect = (currentPhase: Phase, optionId: string, label: string) => {
    if (currentPhase === 'audience-gender') {
      setDesignedFor(label);
      advancePhase(currentPhase, label);
    }
  };

  const handleTextSubmit = (currentPhase: Phase, value: string) => {
    advancePhase(currentPhase, value.length > 120 ? value.slice(0, 120) + '...' : value);
  };

  const handleSkip = (currentPhase: Phase) => {
    advancePhase(currentPhase, 'Skipped');
  };

  const handleFileUploadContinue = (currentPhase: Phase) => {
    const files = currentPhase === 'elements-upload' ? elementFiles : inspirationFiles;
    if (files.length > 0) {
      advancePhase(currentPhase, `Uploaded ${files.length} file${files.length > 1 ? 's' : ''}`);
    } else {
      advancePhase(currentPhase, 'Skipped');
    }
  };

  const getMultiSelectItems = (): { id: string; label: string; icon: string }[] => {
    if (phase === 'audience-who') return AUDIENCE_OPTIONS;
    if (phase === 'style-direction') return STYLE_OPTIONS;
    if (phase === 'mood-select') return MOOD_OPTIONS;
    return [];
  };

  const getMultiSelectState = (): [string[], (val: string[]) => void] => {
    if (phase === 'audience-who') return [targetAudience, setTargetAudience];
    if (phase === 'style-direction') return [designStyles, setDesignStyles];
    if (phase === 'mood-select') return [moods, setMoods];
    return [[], () => {}];
  };

  const getTextValue = (): [string, (val: string) => void] => {
    switch (phase) {
      case 'audience-notes': return [audienceNotes, setAudienceNotes];
      case 'style-avoid': return [stylesToAvoid, setStylesToAvoid];
      case 'text-headline': return [headlineText, setHeadlineText];
      case 'text-additional': return [additionalText, setAdditionalText];
      case 'text-extra': return [extraText, setExtraText];
      case 'elements-musthave': return [mustHaveElements, setMustHaveElements];
      case 'elements-description': return [fileDescriptions, setFileDescriptions];
      case 'inspiration-describe': return [inspirationDescription, setInspirationDescription];
      case 'mood-reaction': return [perfectReaction, setPerfectReaction];
      default: return ['', () => {}];
    }
  };

  const getFileState = (): [File[], (files: File[]) => void] => {
    if (phase === 'elements-upload') return [elementFiles, setElementFiles];
    if (phase === 'inspiration-upload') return [inspirationFiles, setInspirationFiles];
    return [[], () => {}];
  };

  const currentConfig = PHASE_CONFIGS.find((c) => c.id === phase)!;

  return (
    <div className="space-y-4">
      {/* Completed phases history */}
      {completedPhases.map((cp, i) => (
        <div key={i} className="space-y-4">
          <ChatBubble message={cp.message} delay={0} />
          <UserReply text={cp.reply} />
        </div>
      ))}

      {/* Active phase */}
      <AnimatePresence>
        {anim.showTyping && (
          <motion.div key={`cq-typing-${phase}`} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
            <TypingIndicator />
          </motion.div>
        )}
      </AnimatePresence>
      {anim.showMessage && (
        <ChatBubble key={`cq-msg-${phase}`} message={currentConfig.message} />
      )}

      {/* Input area */}
      <AnimatePresence>
        {anim.showOptions && (
          <motion.div
            key={`cq-input-${phase}`}
            className="px-4 pl-15"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.3 }}
          >
            {currentConfig.inputType === 'multi-select' && (
              <MultiSelectInput
                options={getMultiSelectItems()}
                selected={getMultiSelectState()[0]}
                onSelectedChange={getMultiSelectState()[1]}
                onContinue={() => handleMultiSelectContinue(phase)}
              />
            )}
            {currentConfig.inputType === 'single-select' && phase === 'audience-gender' && (
              <SingleSelectInput
                options={GENDER_OPTIONS}
                onSelect={(id, label) => handleSingleSelect(phase, id, label)}
              />
            )}
            {currentConfig.inputType === 'text' && (
              <TextInput
                value={getTextValue()[0]}
                onChange={getTextValue()[1]}
                onSubmit={() => handleTextSubmit(phase, getTextValue()[0])}
              />
            )}
            {currentConfig.inputType === 'skippable-text' && (
              <SkippableTextInput
                value={getTextValue()[0]}
                onChange={getTextValue()[1]}
                onSubmit={() => handleTextSubmit(phase, getTextValue()[0])}
                onSkip={() => handleSkip(phase)}
              />
            )}
            {currentConfig.inputType === 'file-upload' && (
              <FileUploadWithSkip
                files={getFileState()[0]}
                onFilesChange={getFileState()[1]}
                onContinue={() => handleFileUploadContinue(phase)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// -- Sub-components --

function UserReply({ text }: { text: string }) {
  return (
    <motion.div
      className="flex justify-end px-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-brand-black text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm max-w-xs">
        <p className="text-sm font-body">{text}</p>
      </div>
    </motion.div>
  );
}

function MultiSelectInput({
  options,
  selected,
  onSelectedChange,
  onContinue,
}: {
  options: { id: string; label: string; icon: string }[];
  selected: string[];
  onSelectedChange: (val: string[]) => void;
  onContinue: () => void;
}) {
  const toggle = (id: string) => {
    onSelectedChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    );
  };

  return (
    <div className="space-y-3 max-w-md">
      <div className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const isSelected = selected.includes(opt.id);
          return (
            <motion.button
              key={opt.id}
              className={`flex items-center gap-3 border rounded-xl px-5 py-4 text-left shadow-sm transition-all cursor-pointer group ${
                isSelected
                  ? 'bg-brand-black text-white border-brand-black'
                  : 'bg-white border-gray-200 hover:border-brand-orange hover:shadow-md'
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: 'easeOut' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggle(opt.id)}
            >
              <span className="text-2xl">{opt.icon}</span>
              <span className={`text-sm font-medium transition-colors ${
                isSelected ? 'text-white' : 'text-gray-800 group-hover:text-brand-orange'
              }`}>
                {opt.label}
              </span>
              {isSelected && <span className="ml-auto text-white text-sm">&#10003;</span>}
            </motion.button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <motion.button
          className="bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide hover:bg-black transition-colors cursor-pointer"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onContinue}
        >
          Continue
        </motion.button>
      )}
    </div>
  );
}

function SingleSelectInput({
  options,
  onSelect,
}: {
  options: { id: string; label: string; icon: string }[];
  onSelect: (id: string, label: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 max-w-md">
      {options.map((opt, i) => (
        <motion.button
          key={opt.id}
          className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-5 py-4 text-left shadow-sm hover:border-brand-orange hover:shadow-md transition-all cursor-pointer group"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: i * 0.1, ease: 'easeOut' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(opt.id, opt.label)}
        >
          <span className="text-2xl">{opt.icon}</span>
          <span className="text-sm font-medium text-gray-800 group-hover:text-brand-orange transition-colors">
            {opt.label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="max-w-md space-y-3">
      <textarea
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-body text-gray-800 bg-white shadow-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange resize-none"
        rows={3}
        placeholder="Type your answer..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <motion.button
        className={`bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide transition-colors ${
          value.trim() ? 'hover:bg-black cursor-pointer' : 'opacity-50 cursor-not-allowed'
        }`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        disabled={!value.trim()}
        onClick={onSubmit}
      >
        Continue
      </motion.button>
    </div>
  );
}

function SkippableTextInput({
  value,
  onChange,
  onSubmit,
  onSkip,
}: {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="max-w-md space-y-3">
      <textarea
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-body text-gray-800 bg-white shadow-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange resize-none"
        rows={3}
        placeholder="Type your answer..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="flex gap-3">
        <motion.button
          className={`bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide transition-colors ${
            value.trim() ? 'hover:bg-black cursor-pointer' : 'opacity-50 cursor-not-allowed'
          }`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          disabled={!value.trim()}
          onClick={onSubmit}
        >
          Continue
        </motion.button>
        <motion.button
          className="border border-gray-300 text-gray-600 px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide hover:border-gray-400 hover:text-gray-800 transition-colors cursor-pointer"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          onClick={onSkip}
        >
          Skip
        </motion.button>
      </div>
    </div>
  );
}

function FileUploadWithSkip({
  files,
  onFilesChange,
  onContinue,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onContinue: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    onFilesChange([...files, ...Array.from(incoming)]);
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-md space-y-3">
      <div
        className={`relative border-2 border-dashed rounded-xl px-6 py-8 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-brand-orange bg-orange-50'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.ai,.eps,.svg"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="text-3xl mb-2">📂</div>
        <p className="text-sm font-medium text-gray-700">Drag & drop your files here</p>
        <p className="text-xs text-gray-500 mt-1">or click to browse &middot; Images, PDF, AI, EPS, SVG</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2"
            >
              {file.type.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📄</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                className="text-gray-400 hover:text-red-500 transition-colors text-lg flex-shrink-0"
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <motion.button
          className="bg-brand-black text-white px-6 py-3 rounded-full text-sm font-heading uppercase tracking-wide hover:bg-black transition-colors cursor-pointer"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onContinue}
        >
          {files.length > 0 ? 'Continue' : 'Skip'}
        </motion.button>
        {files.length > 0 && (
          <span className="text-xs text-gray-500 self-center">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </span>
        )}
      </div>
    </div>
  );
}
