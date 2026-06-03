import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy init Gemini client to avoid crashes if GEMINI_API_KEY is not defined yet
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please add your key in the Settings > Secrets section.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Text Translate API
app.post("/api/translate", async (req, res) => {
  try {
    const { text, sourceLang, targetLang, tone } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text is required" });
    }

    const ai = getGeminiClient();
    
    const prompt = `You are an expert translator. Please translate the following text.
Source Language: ${sourceLang || "Auto Detect"}
Target Language: ${targetLang}
Desired Tone/Style: ${tone || "Standard"}

Text to Translate:
"${text}"

Provide the translation. In addition, suggest 2-3 common alternative ways to say it (e.g. formal, casual, or shorter version) and provide a brief phonetic pronunciation guide of the translated text if it is in a different script.
Format your final response in a clean, structured JSON containing:
1. "translatedText": The main translation
2. "pronunciation": Phonetic pronunciation of the translated text (e.g. romaji for Japanese, pinyin for Chinese, or general phonetics readable in English/latin characters)
3. "alternatives": An array of alternative translations, each having:
   - "text": The alternative translation strings
   - "explanation": Why or when you'd use this alternative (e.g. "More formal", "Slightly more conversational", "Polite")
4. "notes": Any brief linguistic, cultural, or grammatical tips about this translation (respect levels, structures, or interesting word facts).

Response must be strictly a valid JSON object matching the schema above.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            translatedText: { type: "STRING" },
            pronunciation: { type: "STRING" },
            alternatives: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  text: { type: "STRING" },
                  explanation: { type: "STRING" }
                },
                required: ["text", "explanation"]
              }
            },
            notes: { type: "STRING" }
          },
          required: ["translatedText", "pronunciation"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No translation text returned from Gemini API");
    }

    const result = JSON.parse(resultText.trim());
    res.json(result);
  } catch (error: any) {
    console.error("Translation error:", error);
    res.status(500).json({ error: error.message || "Failed to translate" });
  }
});

// 2. Audio/Voice Translation API (Speech to Translated Text)
app.post("/api/translate-audio", async (req, res) => {
  try {
    const { audioData, mimeType, targetLang } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: "Audio data is required" });
    }

    const ai = getGeminiClient();

    const audioPart = {
      inlineData: {
        mimeType: mimeType || "audio/webm",
        data: audioData, // Base64 string
      },
    };

    const promptPart = {
      text: `Listen closely to this audio recording.
1. Transcribe the spoken text in its original language.
2. Translate the transcript into the target language: ${targetLang}.
Briefly provide phonetic pronunciation and alternate ways if needed.

Return the transcript, translation, and detected language inside a JSON object containing:
- "transcript": The exact transcription in the original language.
- "translatedText": The translation into the target language.
- "detectedLanguage": The name of the detected spoken language.
- "pronunciation": Phonetic pronunciation of the translated text.
- "notes": Short cultural or grammatical remarks back.

Return strictly a valid JSON matching this schema.`
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [audioPart, promptPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            transcript: { type: "STRING" },
            translatedText: { type: "STRING" },
            detectedLanguage: { type: "STRING" },
            pronunciation: { type: "STRING" },
            notes: { type: "STRING" }
          },
          required: ["transcript", "translatedText", "detectedLanguage", "pronunciation"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No text response returned from audio processing");
    }

    const result = JSON.parse(resultText.trim());
    res.json(result);
  } catch (error: any) {
    console.error("Audio translation error:", error);
    res.status(500).json({ error: error.message || "Failed to process voice translation" });
  }
});

// 3. Text to Speech API (synthesize voice using gemini-3.1-flash-tts-preview)
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voiceName } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text is required" });
    }

    const ai = getGeminiClient();

    // Available prebuilt voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
    const allowedVoices = ["Puck", "Charon", "Kore", "Fenrir", "Zephyr"];
    const voiceToUse = allowedVoices.includes(voiceName) ? voiceName : "Kore";

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Read this text back naturally. Do not add any extra conversational additions: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceToUse }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No speech audio returned from Gemini TTS model.");
    }

    res.json({ audioData: base64Audio, rate: 24000 });
  } catch (error: any) {
    console.error("TTS generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate talk audio" });
  }
});

// Vite middleware configuration and Static Asset Server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
