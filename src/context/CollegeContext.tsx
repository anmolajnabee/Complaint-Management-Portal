import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CollegeContextType {
  platformName: string;
  collegeName: string;
  tagline: string;
  logoUrl: string;
  updateCollegeInfo: (name: string, tagline?: string, logoUrl?: string) => void;
  resetToDefault: () => void;
  isRenameModalOpen: boolean;
  openRenameModal: () => void;
  closeRenameModal: () => void;
}

export const DEFAULT_PLATFORM_NAME = 'FIX BUDDY';
export const DEFAULT_COLLEGE_NAME = 'JEC KUKAS';
export const DEFAULT_TAGLINE = 'Quick Grievance & Maintenance Resolution Portal';
export const DEFAULT_LOGO_URL = '/assets/aistudio/Fix_Buddy_Robot_Repair_Logo_220975f8.png';

const CollegeContext = createContext<CollegeContextType | undefined>(undefined);

export const CollegeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [platformName] = useState<string>(DEFAULT_PLATFORM_NAME);
  const [collegeName, setCollegeNameState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('smart_college_name');
      // If previous erroneous setting stored FIX BUDDY or SMART COLLEGE as college name, reset to JEC KUKAS
      if (!saved || saved === 'SMART COLLEGE' || saved === 'FIX BUDDY') {
        localStorage.setItem('smart_college_name', DEFAULT_COLLEGE_NAME);
        return DEFAULT_COLLEGE_NAME;
      }
      return saved;
    } catch {
      return DEFAULT_COLLEGE_NAME;
    }
  });

  const [tagline, setTaglineState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('smart_college_tagline');
      if (!saved || saved === 'Your Voice. Our Responsibility.') {
        return DEFAULT_TAGLINE;
      }
      return saved;
    } catch {
      return DEFAULT_TAGLINE;
    }
  });

  const [logoUrl, setLogoUrlState] = useState<string>(() => {
    try {
      return localStorage.getItem('smart_college_logo') || DEFAULT_LOGO_URL;
    } catch {
      return DEFAULT_LOGO_URL;
    }
  });

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('smart_college_name');
      if (!saved || saved === 'FIX BUDDY' || saved === 'SMART COLLEGE') {
        setCollegeNameState(DEFAULT_COLLEGE_NAME);
        localStorage.setItem('smart_college_name', DEFAULT_COLLEGE_NAME);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    document.title = `${DEFAULT_PLATFORM_NAME} | ${collegeName} Complaint Management System`;
  }, [collegeName]);

  const updateCollegeInfo = (name: string, newTagline?: string, newLogoUrl?: string) => {
    const trimmedName = name.trim() || DEFAULT_COLLEGE_NAME;
    const finalTagline = newTagline !== undefined ? newTagline.trim() : tagline;
    const finalLogo = newLogoUrl !== undefined ? newLogoUrl.trim() : logoUrl;

    setCollegeNameState(trimmedName);
    localStorage.setItem('smart_college_name', trimmedName);

    if (finalTagline) {
      setTaglineState(finalTagline);
      localStorage.setItem('smart_college_tagline', finalTagline);
    }

    if (finalLogo) {
      setLogoUrlState(finalLogo);
      localStorage.setItem('smart_college_logo', finalLogo);
    }

    // Dispatch global event for any legacy listeners
    window.dispatchEvent(new CustomEvent('college-name-changed', { detail: trimmedName }));
    setIsRenameModalOpen(false);
  };

  const resetToDefault = () => {
    setCollegeNameState(DEFAULT_COLLEGE_NAME);
    setTaglineState(DEFAULT_TAGLINE);
    setLogoUrlState(DEFAULT_LOGO_URL);
    localStorage.removeItem('smart_college_name');
    localStorage.removeItem('smart_college_tagline');
    localStorage.removeItem('smart_college_logo');
    window.dispatchEvent(new CustomEvent('college-name-changed', { detail: DEFAULT_COLLEGE_NAME }));
    setIsRenameModalOpen(false);
  };

  return (
    <CollegeContext.Provider
      value={{
        platformName,
        collegeName,
        tagline,
        logoUrl,
        updateCollegeInfo,
        resetToDefault,
        isRenameModalOpen,
        openRenameModal: () => setIsRenameModalOpen(true),
        closeRenameModal: () => setIsRenameModalOpen(false),
      }}
    >
      {children}
    </CollegeContext.Provider>
  );
};

export const useCollege = (): CollegeContextType => {
  const context = useContext(CollegeContext);
  if (!context) {
    throw new Error('useCollege must be used within a CollegeProvider');
  }
  return context;
};
