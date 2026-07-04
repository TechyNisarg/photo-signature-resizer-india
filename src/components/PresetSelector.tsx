import React from 'react';
import type { PresetCategory, PresetType } from '../utils/presetData';
import { User, PenTool, Fingerprint, FileText, ImageIcon, Sliders } from 'lucide-react';
import { motion } from 'framer-motion';

interface PresetSelectorProps {
  currentCategory: PresetCategory;
  onCategorySelect: (cat: PresetCategory) => void;
  currentType: PresetType;
  onTypeSelect: (type: PresetType) => void;
  availableTypes: { type: PresetType, label: string }[];
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  photo: User,
  signature: PenTool,
  thumb: Fingerprint,
  handwritten: FileText,
  postcard: ImageIcon,
  custom: Sliders
};

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  currentCategory, currentType, onTypeSelect, availableTypes
}) => {
  if (availableTypes.length <= 1 || currentCategory === 'custom') {
    return null;
  }

  return (
    <div style={{ width: '100%', marginBottom: '0' }}>
      <div className="segmented-control" style={availableTypes.length > 3 ? { flexWrap: 'wrap' } : {}}>
        {availableTypes.map(t => {
          const TypeIcon = TYPE_ICONS[t.type as string];
          const isActive = currentType === t.type;
          return (
            <button
              key={t.type}
              className={`segmented-btn ${isActive ? 'active' : ''}`}
              onClick={() => onTypeSelect(t.type)}
            >
              {isActive && (
                <motion.div
                  layoutId="segmented-highlight"
                  className="segmented-highlight"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              {TypeIcon && <TypeIcon size={16} style={{ zIndex: 10 }} />}
              <span style={{ zIndex: 10 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
