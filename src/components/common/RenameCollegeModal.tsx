import React, { useState, useEffect } from 'react';
import { Modal } from './Modal.tsx';
import { useCollege } from '../../context/CollegeContext.tsx';
import { Building2, Sparkles, RotateCcw, Check, School } from 'lucide-react';

interface RenameCollegeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLLEGES = [
  'JEC KUKAS',
  'Apex Institute of Technology',
  'National Institute of Technology',
  'Delhi Technological University',
  'St. Xavier\'s College',
  'Stanford University',
  'Indian Institute of Technology',
  'Oxford College of Engineering',
];

export const RenameCollegeModal: React.FC<RenameCollegeModalProps> = ({ isOpen, onClose }) => {
  const { platformName, collegeName, tagline, logoUrl, updateCollegeInfo, resetToDefault } = useCollege();
  const [nameInput, setNameInput] = useState(collegeName);
  const [taglineInput, setTaglineInput] = useState(tagline);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNameInput(collegeName);
      setTaglineInput(tagline);
      setError(null);
    }
  }, [isOpen, collegeName, tagline]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setError('Please provide a valid college or institute name.');
      return;
    }
    updateCollegeInfo(nameInput, taglineInput);
    onClose();
  };

  const handleSelectPreset = (presetName: string) => {
    setNameInput(presetName);
    setError(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Replace College / Institute Name" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <p className="text-xs text-slate-500 mb-3">
            Customize the name and branding displayed across the portal header, landing page, notifications, and footer.
          </p>

          <label htmlFor="college-name-input" className="block text-xs font-semibold text-slate-700 mb-1">
            College / Institute Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <School size={16} />
            </div>
            <input
              id="college-name-input"
              type="text"
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Apex Institute of Technology"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium text-slate-900"
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        </div>

        <div>
          <label htmlFor="college-tagline-input" className="block text-xs font-semibold text-slate-700 mb-1">
            System Tagline / Motto
          </label>
          <input
            id="college-tagline-input"
            type="text"
            value={taglineInput}
            onChange={(e) => setTaglineInput(e.target.value)}
            placeholder="e.g. Your Voice. Our Responsibility."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          />
        </div>

        {/* Quick One-Click Presets */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2">
            <Sparkles size={13} className="text-amber-500" />
            <span>Quick Presets (Click to Auto-fill)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLLEGES.map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => handleSelectPreset(preset)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  nameInput === preset
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-medium'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Live Preview
          </span>
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0 p-0.5 shadow-2xs">
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                <Building2 size={16} />
              </div>
            )}
            <div>
              <div className="text-sm font-extrabold text-slate-900 leading-tight">
                {nameInput.trim() || 'Your College Name'}
              </div>
              <div className="text-[11px] text-slate-500 leading-tight">
                {taglineInput.trim() || 'Complaint Management System'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              resetToDefault();
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600 font-medium py-1.5 px-2 rounded hover:bg-slate-100 transition-colors"
          >
            <RotateCcw size={13} />
            <span>Restore Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Check size={14} />
              <span>Apply & Save Name</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
