/**
 * Language utilities for Multilingual Mandi
 * Handles language detection, validation, and formatting
 */

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageInfo> = {
  'hi': {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    rtl: false
  },
  'en': {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    rtl: false
  },
  'bn': {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇧🇩',
    rtl: false
  },
  'ta': {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇮🇳',
    rtl: false
  },
  'te': {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    flag: '🇮🇳',
    rtl: false
  },
  'mr': {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    flag: '🇮🇳',
    rtl: false
  },
  'gu': {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    flag: '🇮🇳',
    rtl: false
  },
  'kn': {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    flag: '🇮🇳',
    rtl: false
  },
  'ml': {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    flag: '🇮🇳',
    rtl: false
  },
  'pa': {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    flag: '🇮🇳',
    rtl: false
  },
  'ur': {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    flag: '🇵🇰',
    rtl: true
  }
};

/**
 * Detect language from text using simple heuristics
 */
export function detectLanguage(text: string): string {
  if (!text || text.trim().length === 0) {
    return 'en'; // Default to English
  }

  const cleanText = text.toLowerCase().trim();

  // Check for common Hindi words and Devanagari script
  const hindiPatterns = [
    /[\u0900-\u097F]/, // Devanagari script
    /\b(है|हैं|का|की|के|में|से|को|पर|और|या|यह|वह|मैं|आप|हम|तुम)\b/,
    /\b(कीमत|दाम|रुपये|पैसे|मंडी|बाजार|सब्जी|फल)\b/
  ];

  if (hindiPatterns.some(pattern => pattern.test(cleanText))) {
    return 'hi';
  }

  // Check for Bengali script
  if (/[\u0980-\u09FF]/.test(text)) {
    return 'bn';
  }

  // Check for Tamil script
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return 'ta';
  }

  // Check for Telugu script
  if (/[\u0C00-\u0C7F]/.test(text)) {
    return 'te';
  }

  // Check for Gujarati script
  if (/[\u0A80-\u0AFF]/.test(text)) {
    return 'gu';
  }

  // Check for Kannada script
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return 'kn';
  }

  // Check for Malayalam script
  if (/[\u0D00-\u0D7F]/.test(text)) {
    return 'ml';
  }

  // Check for Punjabi script
  if (/[\u0A00-\u0A7F]/.test(text)) {
    return 'pa';
  }

  // Check for Urdu/Arabic script
  if (/[\u0600-\u06FF]/.test(text)) {
    return 'ur';
  }

  // Check for common English patterns
  const englishPatterns = [
    /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/,
    /\b(price|cost|money|market|vegetable|fruit|quality|fresh)\b/,
    /\b(this|that|these|those|what|where|when|how|why)\b/
  ];

  if (englishPatterns.some(pattern => pattern.test(cleanText))) {
    return 'en';
  }

  // Default to Hindi for Indian context
  return 'hi';
}

/**
 * Get language information by code
 */
export function getLanguageInfo(code: string): LanguageInfo | null {
  return SUPPORTED_LANGUAGES[code.toLowerCase()] || null;
}

/**
 * Get all supported languages as array
 */
export function getAllLanguages(): LanguageInfo[] {
  return Object.values(SUPPORTED_LANGUAGES);
}

/**
 * Format language display name
 */
export function formatLanguageName(code: string, showNative: boolean = true): string {
  const info = getLanguageInfo(code);
  if (!info) return code.toUpperCase();

  if (showNative && info.nativeName !== info.name) {
    return `${info.name} (${info.nativeName})`;
  }
  
  return info.name;
}

/**
 * Check if language is right-to-left
 */
export function isRTL(code: string): boolean {
  const info = getLanguageInfo(code);
  return info?.rtl || false;
}

/**
 * Normalize language code
 */
export function normalizeLanguageCode(input: string): string {
  const normalized = input.toLowerCase().trim();
  
  // Handle common variations
  const variations: Record<string, string> = {
    'hindi': 'hi',
    'english': 'en',
    'bengali': 'bn',
    'bangla': 'bn',
    'tamil': 'ta',
    'telugu': 'te',
    'marathi': 'mr',
    'gujarati': 'gu',
    'kannada': 'kn',
    'malayalam': 'ml',
    'punjabi': 'pa',
    'urdu': 'ur'
  };

  return variations[normalized] || normalized;
}

/**
 * Get appropriate font family for language
 */
export function getLanguageFont(code: string): string {
  const fontMap: Record<string, string> = {
    'hi': 'Noto Sans Devanagari, system-ui, sans-serif',
    'bn': 'Noto Sans Bengali, system-ui, sans-serif',
    'ta': 'Noto Sans Tamil, system-ui, sans-serif',
    'te': 'Noto Sans Telugu, system-ui, sans-serif',
    'mr': 'Noto Sans Devanagari, system-ui, sans-serif',
    'gu': 'Noto Sans Gujarati, system-ui, sans-serif',
    'kn': 'Noto Sans Kannada, system-ui, sans-serif',
    'ml': 'Noto Sans Malayalam, system-ui, sans-serif',
    'pa': 'Noto Sans Gurmukhi, system-ui, sans-serif',
    'ur': 'Noto Nastaliq Urdu, system-ui, sans-serif',
    'en': 'system-ui, -apple-system, sans-serif'
  };

  return fontMap[code] || fontMap['en'];
}

/**
 * Validate if text contains the expected language script
 */
export function validateLanguageScript(text: string, expectedLanguage: string): boolean {
  const detectedLanguage = detectLanguage(text);
  return detectedLanguage === expectedLanguage;
}

/**
 * Get common greetings in different languages
 */
export function getGreeting(code: string): string {
  const greetings: Record<string, string> = {
    'hi': 'नमस्ते',
    'en': 'Hello',
    'bn': 'নমস্কার',
    'ta': 'வணக்கம்',
    'te': 'నమస్కారం',
    'mr': 'नमस्कार',
    'gu': 'નમસ્તે',
    'kn': 'ನಮಸ್ಕಾರ',
    'ml': 'നമസ്കാരം',
    'pa': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ',
    'ur': 'السلام علیکم'
  };

  return greetings[code] || greetings['hi'];
}

/**
 * Get currency formatting for Indian context
 */
export function formatCurrency(amount: number, language: string = 'hi'): string {
  // Indian number formatting with lakhs and crores
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  const formatted = formatter.format(amount);
  
  // For Hindi, replace currency symbol
  if (language === 'hi') {
    return formatted.replace('₹', '₹');
  }
  
  return formatted;
}