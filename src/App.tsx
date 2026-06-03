import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Languages,
  Mic,
  Volume2,
  Copy,
  Check,
  Bookmark,
  History,
  Sparkles,
  ArrowRightLeft,
  RotateCcw,
  Settings,
  AlertCircle,
  Trash2,
  VolumeX,
  Search,
  MessageCircle,
  HelpCircle,
  Lightbulb,
  Play,
  StopCircle,
  Globe,
  Star,
  ChevronRight,
  Info
} from "lucide-react";
import { TranslationResult, VoiceTranslationResult, SavedTranslation } from "./types";
import { LANGUAGES, PRESET_PHRASES } from "./data";

export default function App() {
  // Navigation & Core tab
  const [activeTab, setActiveTab] = useState<"text" | "voice" | "phrasebook" | "history">("text");

  // Translation States
  const [sourceText, setSourceText] = useState("");
  const [sourceLang, setSourceLang] = useState("km");
  const [targetLang, setTargetLang] = useState("en");
  const [tone, setTone] = useState("Standard");
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Copied alerts
  const [isSourceCopied, setIsSourceCopied] = useState(false);
  const [isTargetCopied, setIsTargetCopied] = useState(false);

  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const [voiceResult, setVoiceResult] = useState<VoiceTranslationResult | null>(null);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceTargetLang, setVoiceTargetLang] = useState("en");

  // TTS Voice Setting
  const [selectedVoice, setSelectedVoice] = useState("Kore");
  const [isTTSLoading, setIsTTSLoading] = useState(false);

  // History & Bookmarks Shelf
  const [historyList, setHistoryList] = useState<SavedTranslation[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [onlyShowFavorites, setOnlyShowFavorites] = useState(false);

  // Media Recorder reference
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load History from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("universal_translator_history");
      if (stored) {
        setHistoryList(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load translation logs:", e);
    }
  }, []);

  // Save History helper
  const saveToHistory = (source: string, srcL: string, tgtL: string, result: TranslationResult) => {
    const list = [...historyList];
    const newEntry: SavedTranslation = {
      id: "hist_" + Date.now() + Math.random().toString(36).substr(2, 4),
      timestamp: Date.now(),
      sourceText: source,
      sourceLang: srcL,
      targetLang: tgtL,
      translatedText: result.translatedText,
      pronunciation: result.pronunciation,
      notes: result.notes,
      tone: tone,
      isFavorite: false
    };

    const updated = [newEntry, ...list].slice(0, 50); // limit to last 50
    setHistoryList(updated);
    localStorage.setItem("universal_translator_history", JSON.stringify(updated));
  };

  // Switch Source & Target
  const swapLanguages = () => {
    if (sourceLang === "auto") return; // cannot swap auto-detect
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);

    if (translationResult && translationResult.translatedText) {
      // Setup current translated text as new source
      const currentText = sourceText;
      setSourceText(translationResult.translatedText);
      setTranslationResult({
        translatedText: currentText,
        pronunciation: ""
      });
    }
  };

  // Perform standard Translate
  const handleTranslate = async (textToRun = sourceText) => {
    const textClean = textToRun.trim();
    if (!textClean) return;

    setIsTranslating(true);
    setError(null);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textClean,
          sourceLang,
          targetLang,
          tone
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || `Server returned error status ${res.status}`);
      }

      const data: TranslationResult = await res.json();
      setTranslationResult(data);
      saveToHistory(textClean, sourceLang, targetLang, data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while connecting to the translation service.");
    } finally {
      setIsTranslating(false);
    }
  };

  // Run Text to Speech (TTS)
  const handlePlayTTS = async (textToSpeak: string) => {
    if (!textToSpeak || isTTSLoading) return;

    // Stop prev audio if any is playing
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    setIsTTSLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak,
          voiceName: selectedVoice
        })
      });

      if (!res.ok) {
        throw new Error("Could not synthesize voice");
      }

      const data = await res.json();
      const audioUrl = `data:audio/wav;base64,${data.audioData}`;
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      audio.play();

      audio.onended = () => {
        setIsTTSLoading(false);
      };
    } catch (err) {
      console.error("Speech playback error:", err);
      setIsTTSLoading(false);
    }
  };

  // Start recording audio
  const startRecording = async () => {
    setVoiceError(null);
    setVoiceResult(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processVoiceTranslation(audioBlob);
        
        // Stop all track devices to release resource
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordTimer(0);

      timerIdRef.current = setInterval(() => {
        setRecordTimer((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Failed to access camera/mic stream", err);
      setVoiceError("Microphone permission denied or device not found. Please verify permissions.");
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
    }
    setIsRecording(false);
  };

  // Convert blob to base64 & dispatch to Server translation endpoint
  const processVoiceTranslation = async (audioBlob: Blob) => {
    setIsVoiceProcessing(true);
    setVoiceError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(",")[1];

        const res = await fetch("/api/translate-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioData: base64data,
            mimeType: "audio/webm",
            targetLang: voiceTargetLang
          })
        });

        if (!res.ok) {
          throw new Error("Failed to process audio translation.");
        }

        const data: VoiceTranslationResult = await res.json();
        setVoiceResult(data);

        // Put voice translations in local history
        const dummyResult: TranslationResult = {
          translatedText: data.translatedText,
          pronunciation: data.pronunciation,
          notes: `[Spoken Audio Translate] Original Speech: "${data.transcript}". Detected Language: ${data.detectedLanguage}. ${data.notes || ""}`
        };
        saveToHistory(data.transcript, "audio", voiceTargetLang, dummyResult);
      };
    } catch (err: any) {
      console.error(err);
      setVoiceError(err.message || "An error occurred parsing the spoken speech input.");
    } finally {
      setIsVoiceProcessing(false);
    }
  };

  // Clear translation workspace
  const handleClear = () => {
    setSourceText("");
    setTranslationResult(null);
    setError(null);
  };

  // Clipboard copy utils
  const copyText = (text: string, isSource: boolean) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isSource) {
      setIsSourceCopied(true);
      setTimeout(() => setIsSourceCopied(false), 2000);
    } else {
      setIsTargetCopied(true);
      setTimeout(() => setIsTargetCopied(false), 2000);
    }
  };

  // Bookmark / Favorite item from history
  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = historyList.map((item) => {
      if (item.id === id) {
        return { ...item, isFavorite: !item.isFavorite };
      }
      return item;
    });
    setHistoryList(updated);
    localStorage.setItem("universal_translator_history", JSON.stringify(updated));
  };

  // Delete individual history record
  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = historyList.filter((item) => item.id !== id);
    setHistoryList(updated);
    localStorage.setItem("universal_translator_history", JSON.stringify(updated));
  };

  // Clear all history
  const handleClearAllHistory = () => {
    if (window.confirm("Are you sure you want to clear your translation history?")) {
      setHistoryList([]);
      localStorage.removeItem("universal_translator_history");
    }
  };

  // On phrase click - loads standard translate text
  const selectPhrase = (phraseText: string, catSrcLang: string, catTgtLang: string) => {
    setSourceText(phraseText);
    setSourceLang(catSrcLang);
    setTargetLang(catTgtLang);
    setActiveTab("text");
    handleTranslate(phraseText);
  };

  // Formatter for timestamp
  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " - " + date.toLocaleDateString();
  };

  const currentSourceLanguage = LANGUAGES.find((l) => l.code === sourceLang);
  const currentTargetLanguage = LANGUAGES.find((l) => l.code === targetLang);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-teal-500 selection:text-slate-950">
      
      {/* Upper Navigation & App Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
              <Languages className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold tracking-tight text-slate-100">
                Universal Translator
              </h1>
              <p className="text-xs text-slate-400 select-none">
                កម្មវិធីបកប្រែភាសាសកល • Real-time AI Transcribe & Voice
              </p>
            </div>
          </div>

          {/* Tab buttons */}
          <nav className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("text")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all ${
                activeTab === "text"
                  ? "bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Text Translate
            </button>
            <button
              onClick={() => setActiveTab("voice")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all ${
                activeTab === "voice"
                  ? "bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              Speech & Mic
            </button>
            <button
              onClick={() => setActiveTab("phrasebook")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all ${
                activeTab === "phrasebook"
                  ? "bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Phrasebook
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all ${
                activeTab === "history"
                  ? "bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Logs & Books
            </button>
          </nav>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        
        {/* Banner with original request as a quick load preset helper */}
        <AnimatePresence>
          {sourceText.length === 0 && activeTab === "text" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-teal-950/20 border border-teal-500/20 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 bg-teal-500/10 text-teal-400 rounded-lg shrink-0">
                  <Lightbulb className="w-4 h-4 text-teal-400" />
                </span>
                <div>
                  <h4 className="font-bold text-teal-300">Quick Homework Demo (សាកល្បងឃ្លាកិច្ចការផ្ទះ)</h4>
                  <p className="text-slate-300 mt-0.5 mt-1 leading-relaxed max-w-2xl">
                    "អរុណសួស្តីអ្នកគ្រូ សម្រាប់កិច្ចការផ្ទះដែលអ្នកគ្រូដាក់ឲ្យធ្វើនោះ បន្ទាប់ពីធ្វើរួច តើត្រូវបញ្ជូនសន្លឹកកិច្ចការនោះនៅក្នុងបន្ទប់ឆាតនេះ មែន?អ្នកគ្រូ"
                  </p>
                </div>
              </div>
              <button
                onClick={() => selectPhrase(
                  "អរុណសួស្តីអ្នកគ្រូ សម្រាប់កិច្ចការផ្ទះដែលអ្នកគ្រូដាក់ឲ្យធ្វើនោះ បន្ទាប់ពីធ្វើរួច តើត្រូវបញ្ជូនសន្លឹកកិច្ចការនោះនៅក្នុងបន្ទប់ឆាតនេះ មែន?អ្នកគ្រូ",
                  "km",
                  "en"
                )}
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-4 py-2 rounded-xl transition-all grow-0 shrink-0 self-stretch md:self-auto text-center"
              >
                Instant Try & Read
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Inner Tab Router */}
        <div className="space-y-6">
          
          {/* TAB 1: TEXT TRANSLATE */}
          {activeTab === "text" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Direct Translation Interface */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* Language Select Header Row */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-xl">
                  {/* Source Lang dropdown */}
                  <div className="flex items-center gap-1.5 grow max-w-[45%]">
                    <span className="text-slate-400 text-xs font-mono hidden sm:inline">From:</span>
                    <select
                      value={sourceLang}
                      onChange={(e) => setSourceLang(e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-2.5 py-1.5 text-xs text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer w-full font-sans font-medium"
                    >
                      <option value="auto">🔍 Auto Detect Language</option>
                      {LANGUAGES.map((l) => (
                        <option key={`src_${l.code}`} value={l.code}>
                          {l.flag} {l.name} ({l.localName})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Swap Arrow Button */}
                  <button
                    disabled={sourceLang === "auto"}
                    onClick={swapLanguages}
                    className={`p-2 rounded-xl border border-slate-800 transition-all ${
                      sourceLang === "auto"
                        ? "bg-slate-900 text-slate-600 cursor-not-allowed"
                        : "bg-slate-900 text-teal-400 hover:bg-slate-800 hover:text-teal-300"
                    }`}
                    title="Swap languages"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </button>

                  {/* Target Lang dropdown */}
                  <div className="flex items-center gap-1.5 grow max-w-[45%]">
                    <span className="text-slate-400 text-xs font-mono hidden sm:inline">To:</span>
                    <select
                      value={targetLang}
                      onChange={(e) => setTargetLang(e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl px-2.5 py-1.5 text-xs text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer w-full font-sans font-medium"
                    >
                      {LANGUAGES.map((l) => (
                        <option key={`tgt_${l.code}`} value={l.code}>
                          {l.flag} {l.name} ({l.localName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Main Translate Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Source Phrase Input Area */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between min-h-[300px] shadow-lg focus-within:border-teal-500/50 transition-all">
                    <div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-900 mb-3 text-xs text-slate-400">
                        <span className="font-medium tracking-wide">
                          {sourceLang === "auto" ? "Detecting Speech..." : currentSourceLanguage?.name}
                        </span>
                        <span className="font-mono">{sourceText.length} chars</span>
                      </div>
                      <textarea
                        value={sourceText}
                        onChange={(e) => setSourceText(e.target.value)}
                        placeholder="បញ្ចូលពាក្យ ឬឃ្លាដែលអ្នកចង់បកប្រែនៅទីនេះ... (Type or paste words inside here to translate...)"
                        className="w-full bg-transparent text-slate-100 placeholder-slate-500 resize-none h-44 text-sm focus:outline-none leading-relaxed"
                        style={{ fontFamily: sourceLang === "km" ? "Kantumruy Pro" : "Inter" }}
                        id="src_textbox"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-900 bg-slate-950">
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={!sourceText}
                          onClick={() => copyText(sourceText, true)}
                          className={`p-2 rounded-xl text-xs transition-all ${
                            sourceText
                              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              : "text-slate-600 cursor-not-allowed"
                          }`}
                          title="Copy Source"
                        >
                          {isSourceCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          disabled={!sourceText}
                          onClick={() => handlePlayTTS(sourceText)}
                          className={`p-2 rounded-xl text-xs transition-all ${
                            sourceText
                              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              : "text-slate-600 cursor-not-allowed"
                          }`}
                          title="Listen to Source"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {sourceText && (
                          <button
                            onClick={handleClear}
                            className="text-xs text-slate-400 hover:text-red-400 px-2 py-1 rounded-lg"
                          >
                            Clear
                          </button>
                        )}
                        <button
                          disabled={isTranslating || !sourceText.trim()}
                          onClick={() => handleTranslate()}
                          className={`flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-bold tracking-wider transition-all shadow-lg ${
                            isTranslating || !sourceText.trim()
                              ? "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed"
                              : "bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/5 cursor-pointer"
                          }`}
                        >
                          {isTranslating ? (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                              Translating...
                            </span>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              Translate
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Target Phrase Output Area */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between min-h-[300px] shadow-lg">
                    <div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-900 mb-3 text-xs text-slate-400">
                        <span className="font-medium tracking-wide">
                          {currentTargetLanguage?.name} Output
                        </span>
                        {translationResult?.pronunciation && (
                          <span className="bg-slate-900 text-teal-400 px-2 py-0.5 rounded-md font-mono text-[10px]">
                            Pronounce Phonetics
                          </span>
                        )}
                      </div>

                      {translationResult ? (
                        <div className="space-y-3">
                          <p
                            className="text-slate-100 text-sm leading-relaxed font-medium whitespace-pre-wrap selection:bg-slate-800 selection:text-white"
                            style={{ fontFamily: targetLang === "km" ? "Kantumruy Pro" : "Inter" }}
                          >
                            {translationResult.translatedText}
                          </p>

                          {translationResult.pronunciation && (
                            <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-800 text-[11px] text-slate-300 leading-relaxed flex items-start gap-2">
                              <Info className="w-3.5 h-3.5 mt-0.5 text-teal-400 shrink-0" />
                              <div>
                                <span className="font-mono text-slate-400 block font-semibold mb-0.5 uppercase tracking-wider text-[9px]">Phonetic Reading</span>
                                <span className="text-teal-300 font-mono italic">{translationResult.pronunciation}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-600 text-xs">
                          {isTranslating ? (
                            <div className="space-y-2 text-center animate-pulse">
                              <Sparkles className="w-5 h-5 mx-auto text-teal-500/40" />
                              <p>Configuring linguistic translation...</p>
                            </div>
                          ) : (
                            <>
                              <p>Translation output displays here</p>
                              <p className="text-[10px] text-slate-700 mt-1">Enter some text on the left pane and tap translate.</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-900 bg-slate-950">
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={!translationResult}
                          onClick={() => copyText(translationResult?.translatedText || "", false)}
                          className={`p-2 rounded-xl text-xs transition-all ${
                            translationResult
                              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              : "text-slate-600 cursor-not-allowed"
                          }`}
                          title="Copy Output"
                        >
                          {isTargetCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <button
                          disabled={!translationResult}
                          onClick={() => handlePlayTTS(translationResult?.translatedText || "")}
                          className={`p-2 rounded-xl text-xs transition-all ${
                            translationResult
                              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              : "text-slate-600 cursor-not-allowed"
                          }`}
                          title="Synthesize Voice"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Display Tone Style Option */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 font-mono hidden md:inline">Voice Avatar:</span>
                        <select
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2 py-1 text-[10px] focus:outline-none font-sans cursor-pointer focus:ring-1 focus:ring-teal-500"
                          title="Vocal voice persona for speaker"
                        >
                          <option value="Kore">👩‍💼 Kore (Clear Female)</option>
                          <option value="Zephyr">🧑‍🚀 Zephyr (Airy Medium)</option>
                          <option value="Charon">👨‍💼 Charon (Deep Male)</option>
                          <option value="Fenrir">🦁 Fenrir (Bold Dynamic)</option>
                          <option value="Puck">🧒 Puck (Youthful Playful)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tone/Style configurations */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-md">
                  <h3 className="text-xs font-mono font-bold tracking-wider text-teal-400 mb-3 uppercase">
                    Speech Tone, Dialect, & respect Settings (សម្លេងនិងការគោរព)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {["Standard", "Professional/Formal", "Casual/Conversational", "Honorable/Polite", "Slang"].map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setTone(t);
                          if (sourceText.trim()) handleTranslate(); // re-translate with selected voice parameters
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all ${
                          tone === t
                            ? "bg-teal-500/15 border border-teal-500/60 text-teal-300"
                            : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-4 bg-red-950/20 text-red-300 border border-red-500/20 rounded-2xl flex items-start gap-2.5 text-xs">
                    <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Linguistic Core Error</p>
                      <p className="mt-0.5 text-slate-300">{error}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Dynamic Grammar Insights & Linguistic Notes */}
              <div className="space-y-4">
                
                {/* Visualizer card for Grammar tips / Word Breakdown */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-lg min-h-[180px] flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-teal-400 pb-2 border-b border-slate-900 mb-3 flex items-center justify-between">
                      <span>Grammar & Cultural Notes</span>
                      <Lightbulb className="w-3.5 h-3.5 text-teal-400" />
                    </h3>

                    {translationResult?.notes ? (
                      <div className="bg-teal-950/5 p-3 rounded-xl border border-teal-500/10 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {translationResult.notes}
                      </div>
                    ) : (
                      <div className="text-slate-500 text-xs py-10 text-center leading-relaxed font-sans">
                        <p>No linguistic feedback loaded yet.</p>
                        <p className="text-[10px] text-slate-600 mt-1">Submit translation queries to trigger automated structural analysis.</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-slate-900 text-[10px] text-slate-500 flex justify-between items-center bg-slate-950">
                    <span>Powered by Gemini 3.5</span>
                    <span>No data caps</span>
                  </div>
                </div>

                {/* Alternative phrases / Expressions Panel */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-lg">
                  <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-teal-400 pb-2 border-b border-slate-900 mb-3 flex items-center justify-between">
                    <span>Alternative Versions</span>
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  </h3>

                  {translationResult?.alternatives && translationResult.alternatives.length > 0 ? (
                    <div className="space-y-3">
                      {translationResult.alternatives.map((alt, aiidx) => (
                        <div
                          key={`alt_${aiidx}`}
                          onClick={() => {
                            setTranslationResult(p => p ? { ...p, translatedText: alt.text } : null);
                          }}
                          className="bg-slate-900 rounded-xl p-3 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-all cursor-pointer group"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-slate-200 text-xs group-hover:text-teal-400 transition-colors">
                              {alt.text}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500 uppercase">
                              Form Style
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 italic">
                            {alt.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-xs py-10 text-center leading-relaxed font-sans">
                      <p>Alternatives appear after searching</p>
                      <p className="text-[10px] text-slate-600 mt-1">Shows synonym structures in formal vs informal contexts.</p>
                    </div>
                  )}
                </div>

                {/* Dynamic mini guidance instructions */}
                <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 text-[11px] text-slate-400 leading-relaxed">
                  <span className="font-bold text-teal-400 text-xs block mb-1">💡 Advanced Khmer Protip</span>
                  In Khmer, politeness is governed by <span className="text-slate-200 underline font-mono">social hierarchy</span>. 
                  Use our "Honorable/Polite" tone settings to handle phrases directed towards teachers, monks, or elders seamlessly.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPEECH & VOICE */}
          {activeTab === "voice" && (
            <div className="max-w-2xl mx-auto bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="text-center space-y-2 mb-8">
                <span className="bg-teal-500/10 text-teal-400 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-teal-500/20">
                  Global Voice Processor
                </span>
                <h2 className="text-xl font-display font-bold">Real-time Spoken Interpretation</h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Select your desired target language, hold record, and speak. Gemini will transcribe the speech, detect the source language automatically, and translate it natively.
                </p>
              </div>

              {/* Target Selector row */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 mb-6">
                <span className="text-xs text-slate-400 font-medium shrink-0 ml-1">Translate Voice into:</span>
                <select
                  value={voiceTargetLang}
                  onChange={(e) => setVoiceTargetLang(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer text-sm font-sans font-medium grow"
                >
                  {LANGUAGES.map((l) => (
                    <option key={`vc_${l.code}`} value={l.code}>
                      {l.flag} {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recording Action Box */}
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="relative">
                  {/* Outer Ripple Wave */}
                  {isRecording && (
                    <>
                      <div className="absolute -inset-4 bg-teal-500/20 rounded-full animate-ping pointer-events-none" />
                      <div className="absolute -inset-8 bg-teal-500/10 rounded-full animate-pulse pointer-events-none" />
                    </>
                  )}

                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all border outline-none ${
                      isRecording
                        ? "bg-red-500 hover:bg-red-400 text-slate-950 border-red-400/20 cursor-pointer"
                        : "bg-teal-500 hover:bg-teal-400 text-slate-950 border-teal-400/20 cursor-pointer"
                    }`}
                  >
                    {isRecording ? <StopCircle className="w-9 h-9" /> : <Mic className="w-9 h-9" />}
                  </button>
                </div>

                <div className="text-center">
                  <span className={`text-sm font-mono font-bold ${isRecording ? "text-red-400" : "text-teal-400"}`}>
                    {isRecording ? `RECORDING: ${recordTimer}s` : "Tap mic button to speak"}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {isRecording ? "Click again to complete and process transcription." : "Accept microphone prompts if triggered by your browser."}
                  </p>
                </div>
              </div>

              {/* Error reporting */}
              {voiceError && (
                <div className="p-3 bg-red-950/20 text-red-300 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs mb-6">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Access denied</span>
                    <span>{voiceError}</span>
                  </div>
                </div>
              )}

              {/* Processing loading state */}
              {isVoiceProcessing && (
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-3">
                  <span className="w-8 h-8 border-3 border-teal-400 border-t-transparent rounded-full animate-spin block"></span>
                  <div className="text-center">
                    <span className="text-xs font-bold text-slate-300">Evaluating audio frequencies...</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Gemini is transcribing spoken word sequences and converting to target script.</p>
                  </div>
                </div>
              )}

              {/* Result Pane */}
              {voiceResult && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-mono border-b border-slate-800 pb-2 bg-slate-900">
                    <span className="text-teal-400">Speech Result</span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                      Detected: {voiceResult.detectedLanguage}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Transcript Input */}
                    <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-mono text-slate-500 uppercase block font-semibold">User Spoke</span>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        "{voiceResult.transcript}"
                      </p>
                    </div>

                    {/* Translated text */}
                    <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] font-mono text-teal-400 uppercase block font-semibold">Translation</span>
                      <p className="text-xs text-teal-200 leading-relaxed font-bold">
                        "{voiceResult.translatedText}"
                      </p>
                    </div>
                  </div>

                  {voiceResult.pronunciation && (
                    <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 mt-0.5 text-teal-400 shrink-0" />
                      <div>
                        <span className="font-mono text-[9px] uppercase text-slate-500 block font-semibold mb-0.5">Phonetic guide</span>
                        <span className="text-teal-300 italic font-mono">{voiceResult.pronunciation}</span>
                      </div>
                    </div>
                  )}

                  {voiceResult.notes && (
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap">
                      <span className="font-bold text-slate-300 text-xs block mb-1">Speaker Tip</span>
                      {voiceResult.notes}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => handlePlayTTS(voiceResult.translatedText)}
                      className="flex items-center gap-1.5 bg-teal-500 text-slate-950 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono tracking-wide hover:bg-teal-400 transition-all cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Play translation
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GLOBAL PHRASEBOOK */}
          {activeTab === "phrasebook" && (
            <div className="space-y-6">
              
              {/* Category selector row */}
              <div className="text-center max-w-xl mx-auto space-y-1.5 mb-2">
                <h2 className="text-xl font-display font-bold">Global Traveler Phrasebook</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Practice daily global scenarios. Tap any key sentence to instantiate it in the main text translator interface instantly!
                </p>
              </div>

              {/* Phrase groups */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Classroom Homework (Highly relevant to custom request) */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center gap-2 mb-4 border-b border-slate-900 pb-2.5">
                    <span className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </span>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-teal-400">
                      Classroom & Homework Helpers
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {PRESET_PHRASES.filter((p) => p.category === "Classroom & Homework").map((phrase) => (
                      <div
                        key={phrase.id}
                        onClick={() => selectPhrase(phrase.khmer, "km", "en")}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl p-3 transition-all cursor-pointer flex flex-col justify-between hover:border-slate-700 h-full group"
                      >
                        <div className="space-y-1.5">
                          <span className="font-bold text-slate-200 text-xs block group-hover:text-teal-400 transition-all font-sans leading-relaxed">
                            {phrase.khmer}
                          </span>
                          <span className="text-slate-400 text-[11px] block leading-relaxed font-sans">
                            {phrase.english}
                          </span>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-950 flex justify-between items-center text-[10px] text-slate-500">
                          <span className="bg-slate-950 px-2 py-0.5 rounded">Khmer → English</span>
                          <span className="flex items-center gap-1 text-[9px] font-mono group-hover:text-teal-400">
                            Translate now <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Travel & Directions */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center gap-2 mb-4 border-b border-slate-900 pb-2.5">
                    <span className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg shrink-0">
                      <Globe className="w-4 h-4" />
                    </span>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-teal-400">
                      Travel & Direction Phrases
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {PRESET_PHRASES.filter((p) => p.category === "Travel & Directions").map((phrase) => (
                      <div
                        key={phrase.id}
                        onClick={() => selectPhrase(phrase.english, "en", "km")}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl p-3 transition-all cursor-pointer flex flex-col justify-between hover:border-slate-700 h-full group"
                      >
                        <div className="space-y-1.5">
                          <span className="font-bold text-slate-200 text-xs block group-hover:text-teal-400 transition-all font-sans leading-relaxed">
                            {phrase.english}
                          </span>
                          <span className="text-slate-400 text-[11px] block leading-relaxed font-sans">
                            {phrase.khmer}
                          </span>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-950 flex justify-between items-center text-[10px] text-slate-500">
                          <span className="bg-slate-950 px-2 py-0.5 rounded">English → Khmer</span>
                          <span className="flex items-center gap-1 text-[9px] font-mono group-hover:text-teal-400">
                            Translate now <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* dining & Food */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center gap-2 mb-4 border-b border-slate-900 pb-2.5">
                    <span className="p-1.5 bg-teal-500/10 text-teal-400 rounded-lg shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </span>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-teal-400">
                      Dining & Food
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {PRESET_PHRASES.filter((p) => p.category === "Dining & Food").map((phrase) => (
                      <div
                        key={phrase.id}
                        onClick={() => selectPhrase(phrase.english, "en", "km")}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl p-3 transition-all cursor-pointer flex flex-col justify-between hover:border-slate-700 h-full group"
                      >
                        <div className="space-y-1.5">
                          <span className="font-bold text-slate-200 text-xs block group-hover:text-teal-400 transition-all font-sans leading-relaxed">
                            {phrase.english}
                          </span>
                          <span className="text-slate-400 text-[11px] block leading-relaxed font-sans">
                            {phrase.khmer}
                          </span>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-950 flex justify-between items-center text-[10px] text-slate-500">
                          <span className="bg-slate-950 px-2 py-0.5 rounded">English → Khmer</span>
                          <span className="flex items-center gap-1 text-[9px] font-mono group-hover:text-teal-400">
                            Translate now <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Health & Emergency */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center gap-2 mb-4 border-b border-slate-900 pb-2.5">
                    <span className="p-1.5 bg-red-500/10 text-red-400 rounded-lg shrink-0">
                      <AlertCircle className="w-4 h-4" />
                    </span>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-red-500">
                      Emergency Health Warnings
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {PRESET_PHRASES.filter((p) => p.category === "Health & Emergency").map((phrase) => (
                      <div
                        key={phrase.id}
                        onClick={() => selectPhrase(phrase.english, "en", "km")}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl p-3 transition-all cursor-pointer flex flex-col justify-between hover:border-slate-700 h-full group"
                      >
                        <div className="space-y-1.5">
                          <span className="font-bold text-slate-200 text-xs block group-hover:text-red-400 transition-all font-sans leading-relaxed">
                            {phrase.english}
                          </span>
                          <span className="text-slate-400 text-[11px] block leading-relaxed font-sans">
                            {phrase.khmer}
                          </span>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-950 flex justify-between items-center text-[10px] text-slate-500">
                          <span className="bg-slate-950 px-2.5 py-0.5 rounded text-red-300">Emergency Alert</span>
                          <span className="flex items-center gap-1 text-[9px] font-mono group-hover:text-red-400">
                            Translate now <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: HISTORY & BOOKMARKS */}
          {activeTab === "history" && (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              
              {/* Header and filters shelf */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-display font-bold text-slate-100">Translation Logs Shelf</h2>
                  <p className="text-xs text-slate-400">Keep track of your latest queries and bookmark relevant results.</p>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <button
                    onClick={() => setOnlyShowFavorites(!onlyShowFavorites)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      onlyShowFavorites
                        ? "bg-teal-500/20 border-teal-500/50 text-teal-300"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${onlyShowFavorites ? "fill-teal-300" : ""}`} />
                    Bookmarked Only
                  </button>
                  {historyList.length > 0 && (
                    <button
                      onClick={handleClearAllHistory}
                      className="flex items-center gap-1.5 bg-red-950/20 border border-red-500/20 hover:bg-red-950/40 text-red-400 px-3.5 py-1.5 rounded-xl text-xs transition-all font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear all logs
                    </button>
                  )}
                </div>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Filter and search saved texts..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* List renderer */}
              {(() => {
                const filtered = historyList.filter((item) => {
                  if (onlyShowFavorites && !item.isFavorite) return false;
                  if (!historySearch.trim()) return true;
                  const query = historySearch.toLowerCase();
                  return (
                    item.sourceText.toLowerCase().includes(query) ||
                    item.translatedText.toLowerCase().includes(query)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-16 text-slate-600 text-xs space-y-1">
                      <History className="w-10 h-10 mx-auto text-slate-700 mb-2" />
                      <p>No translation logs found matching your filters.</p>
                      <p className="text-[10px] text-slate-700">Translations requested in the Translate panel will load automatically inside here.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {filtered.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSourceText(item.sourceText);
                          setSourceLang(item.sourceLang);
                          setTargetLang(item.targetLang);
                          setTranslationResult({
                            translatedText: item.translatedText,
                            pronunciation: item.pronunciation,
                            notes: item.notes
                          });
                          setActiveTab("text");
                        }}
                        className="bg-slate-900 hover:bg-slate-900/60 border border-slate-800 rounded-2xl p-4 transition-all cursor-pointer group flex flex-col md:flex-row justify-between items-start gap-4 hover:border-slate-700"
                      >
                        <div className="space-y-3 grow">
                          {/* Top Meta info */}
                          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                            <span className="bg-slate-950 px-2 py-0.5 rounded text-slate-400 font-bold uppercase">
                              {item.sourceLang === "audio" ? "🗣️ AUDIO TRANSCRIPT" : `${item.sourceLang} → ${item.targetLang}`}
                            </span>
                            <span>•</span>
                            <span>{formatTime(item.timestamp)}</span>
                            {item.tone && (
                              <>
                                <span>•</span>
                                <span className="text-teal-400 font-bold">{item.tone} Style</span>
                              </>
                            )}
                          </div>

                          {/* Dual texts */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-0.5">
                              <span className="text-[9px] uppercase font-mono text-slate-500">Original text</span>
                              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                                "{item.sourceText}"
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[9px] uppercase font-mono text-teal-500">Translated output</span>
                              <p className="text-xs text-teal-300 font-bold leading-relaxed font-sans">
                                "{item.translatedText}"
                              </p>
                            </div>
                          </div>

                          {item.pronunciation && (
                            <div className="bg-slate-950/60 p-2 rounded-lg text-[10px] font-mono text-slate-400 border border-slate-800/60 leading-relaxed">
                              <span className="text-slate-500 mr-2">Pronunciation Guide:</span>
                              <span className="text-teal-300 italic">{item.pronunciation}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions drawer */}
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                          <button
                            onClick={(e) => toggleFavorite(item.id, e)}
                            className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-colors"
                            title="Bookmark"
                          >
                            <Star className={`w-3.5 h-3.5 ${item.isFavorite ? "fill-teal-300 text-teal-300" : "text-slate-400"}`} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayTTS(item.translatedText);
                            }}
                            className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Play Voice Audio"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteHistory(item.id, e)}
                            className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-red-500/40 hover:bg-red-950/20 text-slate-400 hover:text-red-400 transition-colors animate-fade-in"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

            </div>
          )}

        </div>

      </main>

      {/* Footer credits and informational labels */}
      <footer className="border-t border-slate-800 bg-slate-950/50 py-8 px-4 mt-16 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <span className="font-semibold text-slate-400">Universal Translator Applet</span>
            <p className="mt-1">Natively designed in high-resolution React and styled with Tailwind CSS.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">⚡ Multi-Modal Interpretation</span>
            <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">🗣️ Standard WebRTC Recorder</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
