export interface TranslationResult {
  translatedText: string;
  pronunciation?: string;
  alternatives?: Array<{
    text: string;
    explanation: string;
  }>;
  notes?: string;
}

export interface VoiceTranslationResult {
  transcript: string;
  translatedText: string;
  detectedLanguage: string;
  pronunciation?: string;
  notes?: string;
}

export interface SavedTranslation {
  id: string;
  timestamp: number;
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  translatedText: string;
  pronunciation?: string;
  notes?: string;
  tone?: string;
  isFavorite?: boolean;
}

export interface Phrase {
  id: string;
  english: string;
  khmer: string;
  category: string;
  context?: string;
}

export interface Language {
  code: string;
  name: string;
  localName: string;
  flag: string;
}
