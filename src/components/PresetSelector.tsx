import React from 'react';
import type { PresetCategory, PresetType } from '../utils/presetData';
import { User, PenTool, Fingerprint, FileText, ImageIcon, Sliders } from 'lucide-react';

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
    <div className="preset-selector" style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '0' }}>
      <div className="pills-container" style={{ 
        display: 'inline-flex', 
        background: 'var(--surface-solid)', 
        padding: '0.35rem', 
        borderRadius: '12px', 
        border: '1px solid var(--border-color)',
        gap: '0.25rem'
      }}>
        {availableTypes.map(t => {
          const TypeIcon = TYPE_ICONS[t.type as string];
          return (
            <button
              key={t.type}
              className={`pill-btn ${currentType === t.type ? 'active' : ''}`}
              onClick={() => onTypeSelect(t.type)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                border: 'none',
                background: currentType === t.type ? 'var(--primary)' : 'transparent',
                color: currentType === t.type ? 'white' : 'var(--text-secondary)',
                boxShadow: currentType === t.type ? '0 4px 14px rgba(59, 130, 246, 0.3)' : 'none'
              }}
            >
              {TypeIcon && <TypeIcon size={16} style={{ position: 'relative', top: '1px' }} />}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
