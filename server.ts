import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

const DIALECT_PROSODY_GUIDE: Record<string, string> = {
  "الجزائرية":
    "Authentic Algerian Arabic dialect (الدارجة الجزائرية / Dziri). Use natural North African Maghrebi cadence, brisk rhythmic syllabic timing, authentic Algerian consonant articulation (including Gaf/Qaf placement as written), and natural Algerian intonation contours.",
  "الفصحى":
    "Pure, eloquent Modern Standard Arabic (العربية الفصحى). Articulate case endings, shadda, and vowel lengths with classical broadcast precision, resonant pharyngeal and emphatic consonants, and balanced pauses at punctuation.",
  "المصرية":
    "Authentic Egyptian Arabic dialect (العامية المصرية - Cairene cadence). Speak with warm, expressive Egyptian melodic inflection, pronouncing ج as hard G (gīm) where natural in Egyptian vernaculary, and smooth conversational vowel elongation.",
  "الخليجية":
    "Authentic Gulf Arabic dialect (اللهجة الخليجية). Deliver with rich Peninsular cadence, warm resonant chest timbre, authentic Gulf vowel coloring and rhythm, and natural Khaliji prosodic flow.",
  "الشامية":
    "Authentic Levantine Arabic dialect (اللهجة الشامية). Use smooth, melodic Levantine pitch contours, soft glottal/consonant transitions, and natural Damascene/Beiruti conversational rhythm.",
  "المغربية":
    "Authentic Moroccan Darija dialect (الدارجة المغربية). Speak with genuine Moroccan prosody, crisp consonant clusters, brisk Darija syllable pacing, and natural Rabat/Casablanca intonation.",
  "التونسية":
    "Authentic Tunisian Derja dialect (الدارجة التونسية). Deliver with distinctive Tunisian melodic cadence, Mediterranean pitch rise-and-fall inflection, and authentic Tounsi pronunciation.",
  English:
    "Native studio English pronunciation with crisp diction, natural stress-timed rhythm, clean vowel articulation, and nuanced phrasing.",
  Français:
    "Native studio French pronunciation (Français standard) with fluid syllable-timed cadence, natural liaisons, precise nasal vowels, and refined prosodic phrasing.",
};

const TONE_MODULATION_GUIDE: Record<string, string> = {
  "Natural & Balanced":
    "Natural, balanced, and grounded vocal delivery. Steady conversational pacing, authentic breath control, and clear, unforced articulation.",
  "Warm & Friendly":
    "Warm, welcoming, and friendly emotional tone. Softened vocal attack, smiling resonance, gentle reassuring inflection, and approachable pacing.",
  "Enthusiastic & Promotional":
    "Enthusiastic, high-energy promotional delivery. Dynamic pitch variation, crisp forward projection, upbeat tempo, and persuasive commercial presence.",
  "Formal & Newsroom":
    "Formal, authoritative newsroom anchor delivery. Composed posture, measured cadence, objective clarity, and crisp broadcast articulation.",
  "Poetic & Calm":
    "Poetic, contemplative, and calm delivery. Slower lyrical tempo, expressive pauses between phrases, velvet vocal timbre, and intimate emotional depth.",
};

const VOICE_API_MAP: Record<string, string> = {
  Kore: "Kore",
  Puck: "Puck",
  "الهواري": "Puck",
  Fenrir: "Fenrir",
  Zephyr: "Zephyr",
  Aoede: "Aoede",
};

/**
 * Ensures the returned buffer is a valid 44-byte RIFF WAVE file.
 * If the buffer already begins with "RIFF....WAVE", returns it as-is.
 * Otherwise wraps raw 24kHz 16-bit mono L16 PCM in a standard 44-byte WAV header.
 */
function ensureWavBuffer(rawBuffer: Buffer, defaultSampleRate = 24000): {
  wavBuffer: Buffer;
  durationSeconds: number;
  sampleRate: number;
  bitDepth: number;
  channels: number;
} {
  if (
    rawBuffer.length >= 44 &&
    rawBuffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    rawBuffer.subarray(8, 12).toString("ascii") === "WAVE"
  ) {
    const channels = rawBuffer.readUInt16LE(22) || 1;
    const sampleRate = rawBuffer.readUInt32LE(24) || defaultSampleRate;
    const bitDepth = rawBuffer.readUInt16LE(34) || 16;
    const bytesPerSample = Math.max(1, (bitDepth / 8) * channels);
    const dataBytes = Math.max(0, rawBuffer.length - 44);
    const durationSeconds = Number((dataBytes / (sampleRate * bytesPerSample)).toFixed(2));
    return {
      wavBuffer: rawBuffer,
      durationSeconds,
      sampleRate,
      bitDepth,
      channels,
    };
  }

  const sampleRate = defaultSampleRate;
  const channels = 1;
  const bitDepth = 16;
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const dataLength = rawBuffer.length;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);

  const wavBuffer = Buffer.concat([header, rawBuffer]);
  const durationSeconds = Number((dataLength / byteRate).toFixed(2));

  return {
    wavBuffer,
    durationSeconds,
    sampleRate,
    bitDepth,
    channels,
  };
}

/**
 * Strips any accidental VoiceCraft AI prompt wrapper if the user pasted the entire
 * system template directly into the Target Text field.
 */
function sanitizeTargetText(rawText: string): string {
  let cleaned = rawText.trim();

  // If the user pasted the full prompt template containing "Target Text:"
  const targetTextMatch = cleaned.match(/Target Text:\s*["“”«]?([\s\S]*?)["“”»]?\s*$/i);
  if (targetTextMatch && targetTextMatch[1]) {
    cleaned = targetTextMatch[1].trim();
  }

  // Strip surrounding quotes if the entire text is wrapped in quotes
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("“") && cleaned.endsWith("”"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  return cleaned;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));

  // Primary VoiceCraft AI Text-to-Speech Synthesis Endpoint
  app.post("/api/tts", async (req, res) => {
    try {
      const {
        text,
        dialect = "الجزائرية",
        voicePersona = "Kore",
        toneEmotion = "Natural & Balanced",
        mode = "single",
        secondaryVoicePersona = "Puck",
        primarySpeakerName = "Speaker1",
        secondarySpeakerName = "Speaker2",
      } = req.body || {};

      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({
          error: "Target text is required for audio synthesis.",
        });
      }

      const cleanText = sanitizeTargetText(text);
      if (!cleanText || cleanText === "[أدخل النص هنا]") {
        return res.status(400).json({
          error: "Please enter valid target text to synthesize (replace '[أدخل النص هنا]').",
        });
      }

      const selectedVoice = VOICE_API_MAP[voicePersona] || "Kore";
      const selectedSecondaryVoice =
        VOICE_API_MAP[secondaryVoicePersona] || "Puck";

      const dialectInstruction =
        DIALECT_PROSODY_GUIDE[dialect] || DIALECT_PROSODY_GUIDE["الفصحى"];
      const toneInstruction =
        TONE_MODULATION_GUIDE[toneEmotion] ||
        TONE_MODULATION_GUIDE["Natural & Balanced"];

      const combinedStyleDirective = `${dialectInstruction} ${toneInstruction} Speak only the provided text cleanly, accurately, and naturally without any extra commentary.`;

      const ai = getGenAIClient();

      let base64Audio: string | undefined;
      let usedModel = "gemini-3.8-flash-tts";

      if (mode === "dialogue") {
        // Multi-speaker synthesis using gemini-3.8-flash-tts
        const lines = cleanText
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        const parts =
          lines.length >= 2
            ? lines.map((line, idx) => {
                const isFirst = idx % 2 === 0;
                const speaker = isFirst ? primarySpeakerName : secondarySpeakerName;
                const prefixRegex = new RegExp(
                  `^(${primarySpeakerName}|${secondarySpeakerName})\\s*:`,
                  "i"
                );
                const formattedLine = prefixRegex.test(line)
                  ? line
                  : `${speaker}: ${line}`;
                return {
                  text: formattedLine,
                  speechMetadata: {
                    speaker,
                    style: combinedStyleDirective,
                  },
                };
              })
            : [
                {
                  text: `${primarySpeakerName}: ${cleanText}`,
                  speechMetadata: {
                    speaker: primarySpeakerName,
                    style: combinedStyleDirective,
                  },
                },
              ];

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash-tts",
          contents: [
            {
              role: "user",
              parts: parts as any,
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                  {
                    speaker: primarySpeakerName,
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: selectedVoice },
                    },
                  },
                  {
                    speaker: secondarySpeakerName,
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: selectedSecondaryVoice },
                    },
                  },
                ],
              },
            },
          },
        });

        base64Audio =
          response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data)
            ?.inlineData?.data;
      } else {
        // Single-speaker synthesis
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.8-flash-tts",
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: cleanText,
                    speechMetadata: {
                      style: combinedStyleDirective,
                    },
                  } as any,
                ],
              },
            ],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: selectedVoice },
                },
              },
            },
          });

          base64Audio =
            response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data)
              ?.inlineData?.data;
        } catch (primaryErr: any) {
          // Fallback to gemini-3.8-flash-lite-tts if needed
          usedModel = "gemini-3.8-flash-lite-tts";
          try {
            const response = await ai.models.generateContent({
              model: "gemini-3.8-flash-lite-tts",
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: cleanText,
                      speechMetadata: {
                        style: combinedStyleDirective,
                      },
                    } as any,
                  ],
                },
              ],
              config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: selectedVoice },
                  },
                },
              },
            });
            base64Audio =
              response.candidates?.[0]?.content?.parts?.find(
                (p: any) => p.inlineData?.data
              )?.inlineData?.data;
          } catch {
            // Final fallback without speechMetadata object in case strict schema validation rejected it
            const response = await ai.models.generateContent({
              model: "gemini-3.8-flash-lite-tts",
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: cleanText,
                    },
                  ],
                },
              ],
              config: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: selectedVoice },
                  },
                },
              },
            });
            base64Audio =
              response.candidates?.[0]?.content?.parts?.find(
                (p: any) => p.inlineData?.data
              )?.inlineData?.data;
          }
        }
      }

      if (!base64Audio) {
        return res.status(502).json({
          error:
            "Audio synthesis engine did not return an audio stream. Please verify your target text and try again.",
        });
      }

      const rawBuffer = Buffer.from(base64Audio, "base64");
      const { wavBuffer, durationSeconds, sampleRate, bitDepth, channels } =
        ensureWavBuffer(rawBuffer, 24000);

      return res.json({
        audioBase64: wavBuffer.toString("base64"),
        mimeType: "audio/wav",
        durationSeconds,
        sampleRate,
        bitDepth,
        channels,
        byteLength: wavBuffer.length,
        model: usedModel,
        synthesizedText: cleanText,
      });
    } catch (error: any) {
      console.error("TTS Synthesis Error:", error);
      return res.status(500).json({
        error:
          error?.message ||
          "An unexpected error occurred while synthesizing speech.",
      });
    }
  });

  // Dialect & Phonetic Script Adaptation Endpoint (optional studio helper)
  app.post("/api/dialect-adapt", async (req, res) => {
    try {
      const {
        text,
        dialect = "الجزائرية",
        toneEmotion = "Natural & Balanced",
        action = "adapt", // "adapt" (convert into chosen dialect) or "diacritize" (add full tashkeel / phonetic polish)
      } = req.body || {};

      if (!text || typeof text !== "string" || !text.trim()) {
        return res.status(400).json({
          error: "Please enter text before running dialect adaptation.",
        });
      }

      const cleanText = sanitizeTargetText(text);
      const ai = getGenAIClient();

      const instruction =
        action === "diacritize"
          ? `You are an expert phonetics and Arabic/multilingual script specialist for a Text-to-Speech studio.
Add accurate vocalization marks (تشكيل مضبوط للنطق الصوتي) and natural punctuation pauses to the user's text so it will be pronounced flawlessly in [${dialect}] with a [${toneEmotion}] tone.
Return ONLY the vocalized/polished script text itself—no explanations, no markdown, no quotes.`
          : `You are an expert native copywriter and dialect linguist for a Text-to-Speech audio studio.
Rewrite and adapt the user's text naturally and authentically into [${dialect}] matching the emotional tone [${toneEmotion}].
- If [${dialect}] is "الجزائرية", write in authentic, natural Algerian Darija (الدارجة الجزائرية) using Arabic script.
- If [${dialect}] is "المغربية", write in authentic Moroccan Darija (الدارجة المغربية) using Arabic script.
- If [${dialect}] is "التونسية", write in authentic Tunisian Derja (الدارجة التونسية) using Arabic script.
- If [${dialect}] is "المصرية", write in authentic Egyptian Arabic (العامية المصرية).
- If [${dialect}] is "الخليجية", write in authentic Gulf Arabic (اللهجة الخليجية).
- If [${dialect}] is "الشامية", write in authentic Levantine Arabic (اللهجة الشامية).
- If [${dialect}] is "الفصحى", write in eloquent Modern Standard Arabic with helpful diacritics (تشكيل).
- If [${dialect}] is "English" or "Français", translate/adapt into natural studio-ready ${dialect}.
Return ONLY the adapted target text ready to be spoken—no explanations, no greetings, no markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: cleanText,
        config: {
          systemInstruction: instruction,
          temperature: 0.5,
        },
      });

      const adaptedText = response.text?.trim() || cleanText;
      return res.json({ adaptedText });
    } catch (error: any) {
      console.error("Dialect Adaptation Error:", error);
      return res.status(500).json({
        error:
          error?.message || "Failed to adapt script to the selected dialect.",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VoiceCraft AI Studio Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
