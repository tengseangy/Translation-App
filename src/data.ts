import { Language, Phrase } from "./types";

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", localName: "English", flag: "🇬🇧" },
  { code: "km", name: "Khmer", localName: "ភាសាខ្មែរ", flag: "🇰🇭" },
  { code: "zh", name: "Chinese (Simplified)", localName: "简体中文", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", localName: "日本語", flag: "🇯🇵" },
  { code: "fr", name: "French", localName: "Français", flag: "🇫🇷" },
  { code: "th", name: "Thai", localName: "ภาษาไทย", flag: "🇹🇭" },
  { code: "vi", name: "Vietnamese", localName: "Tiếng Việt", flag: "🇻🇳" },
  { code: "ko", name: "Korean", localName: "한국어", flag: "🇰🇷" },
  { code: "es", name: "Spanish", localName: "Español", flag: "🇪🇸" },
  { code: "de", name: "German", localName: "Deutsch", flag: "🇩🇪" },
  { code: "ru", name: "Russian", localName: "Русский", flag: "🇷🇺" },
  { code: "ar", name: "Arabic", localName: "العربية", flag: "🇸🇦" },
  { code: "it", name: "Italian", localName: "Italiano", flag: "🇮🇹" },
  { code: "hi", name: "Hindi", localName: "हिन्दी", flag: "🇮🇳" }
];

export const PRESET_PHRASES: Phrase[] = [
  {
    id: "h1",
    english: "Good morning teacher. For the homework that you assigned, after completing it, should I send the worksheet in this chat room? Teacher.",
    khmer: "អរុណសួស្តីអ្នកគ្រូ សម្រាប់កិច្ចការផ្ទះដែលអ្នកគ្រូដាក់ឲ្យធ្វើនោះ បន្ទាប់ពីធ្វើរួច តើត្រូវបញ្ជូនសន្លឹកកិច្ចការនោះនៅក្នុងបន្ទប់ឆាតនេះ មែន?អ្នកគ្រូ",
    category: "Classroom & Homework"
  },
  {
    id: "h2",
    english: "Where can I find the assignment brief?",
    khmer: "តើខ្ញុំអាចរកមើលសេចក្តីណែនាំកិច្ចការផ្ទះបាននៅឯណា?",
    category: "Classroom & Homework"
  },
  {
    id: "h3",
    english: "Please repeat that once more, I didn't quite catch it.",
    khmer: "សូមមេត្តានិយាយម្តងទៀតបានទេ ខ្ញុំស្តាប់មិនសូវទាន់ទេ។",
    category: "Classroom & Homework"
  },
  {
    id: "t1",
    english: "Hello, could you tell me how to get to the nearest station?",
    khmer: "ជម្រាបសួរ តើអ្នកអាចប្រាប់ខ្ញុំពីរបៀបទៅស្ថានីយ៍ដែលជិតបំផុតបានទេ?",
    category: "Travel & Directions"
  },
  {
    id: "t2",
    english: "How much does a ticket to the temple cost?",
    khmer: "តើ សំបុត្រទៅប្រាសាទ ថ្លៃប៉ុន្មានដែរ?",
    category: "Travel & Directions"
  },
  {
    id: "t3",
    english: "Where is the international airport terminal counter?",
    khmer: "តើ کا​វ​ទ័រស្ថានីយអាកាសយានដ្ឋានអន្តរជាតិនៅឯណា?",
    category: "Travel & Directions"
  },
  {
    id: "d1",
    english: "I would like to make a reservation for two people at seven tonight.",
    khmer: "ខ្ញុំចង់កក់កន្លែងសម្រាប់មនុស្សពីរនាក់នៅម៉ោង៧យប់នេះ។",
    category: "Dining & Food"
  },
  {
    id: "d2",
    english: "Does this dish contain any peanuts or seafood?",
    khmer: "តើម្ហូបនេះមានផ្ទុកសណ្តែកដី ឬគ្រឿងសមុទ្រដែរឬទេ?",
    category: "Dining & Food"
  },
  {
    id: "d3",
    english: "The bill, please! Thank you very much.",
    khmer: "សូមគិតលុយ! អរគុណច្រើន។",
    category: "Dining & Food"
  },
  {
    id: "e1",
    english: "Please help! It is an emergency, call an ambulance.",
    khmer: "សូមជួយផង! វាជាករណីបន្ទាន់ សូមហៅឡានពេទ្យសង្គ្រោះបន្ទាន់។",
    category: "Health & Emergency"
  },
  {
    id: "e2",
    english: "Where is the nearest medical clinic or pharmacy?",
    khmer: "តើមន្ទីរព្យាបាល ឬឱសថស្ថានដែលជិតបំផុតនៅឯណា?",
    category: "Health & Emergency"
  }
];
