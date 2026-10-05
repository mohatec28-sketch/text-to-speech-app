mport { Handler } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
function ensureWavBuffer(rawBuffer: Buffer, defaultSampleRate = 24000) {
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
    return { wavBuffer: rawBuffer, durationSeconds, sampleRate, bitDepth, channels };
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
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);

  const wavBuffer = Buffer.concat([header, rawBuffer]);
  const durationSeconds = Number((dataLength / byteRate).toFixed(2));

  return { wavBuffer, durationSeconds, sampleRate, bitDepth, channels };
}

function sanitizeTargetText(rawText: string): string {
  let cleaned = rawText.trim();
  const targetTextMatch = cleaned.match(/Target Text:\s*["“”«]?([\s\S]*?)["“”»]?\s*$/i);
  if (targetTextMatch && targetTextMatch[1]) {
    cleaned = targetTextMatch[1].trim();
  }
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("“") && cleaned.endsWith("”"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

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
    } = JSON.parse(event.body || "{}");

    if (!text || typeof text !== "string" || !text.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Target text is required for audio synthesis." }),
      };
    }

    const cleanText = sanitizeTargetText(text);
    if (!cleanText || cleanText === "[أدخل النص هنا]") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Please enter valid target text to synthesize (replace '[أدخل النص هنا]').",
        }),
      };
    }

    const selectedVoice = VOICE_API_MAP[voicePersona] || "Kore";
    const selectedSecondaryVoice = VOICE_API_MAP[secondaryVoicePersona] || "Puck";
    const dialectInstruction = DIALECT_PROSODY_GUIDE[dialect] || DIALECT_PROSODY_GUIDE["الفصحى"];
    const toneInstruction = TONE_MODULATION_GUIDE[toneEmotion] || TONE_MODULATION_GUIDE["Natural & Balanced"];
    const combinedStyleDirective = `${dialectInstruction} ${toneInstruction} Speak only the provided text cleanly, accurately, and naturally without any extra commentary.`;

    const ai = getGenAIClient();
    let base64Audio: string | undefined;
    let usedModel = "gemini-3.8-flash-tts";

    if (mode === "dialogue") {
      const lines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const parts =
        lines.length >= 2
          ? lines.map((line, idx) => {
              const isFirst = idx % 2 === 0;
              const speaker = isFirst ? primarySpeakerName : secondarySpeakerName;
              const prefixRegex = new RegExp(`^(${primarySpeakerName}|${secondarySpeakerName})\\s*:`, "i");
              const formattedLine = prefixRegex.test(line) ? line : `${speaker}: ${line}`;
              return { text: formattedLine, speechMetadata: { speaker, style: combinedStyleDirective } };
            })
          : [
              {
                text: `${primarySpeakerName}: ${cleanText}`,
                speechMetadata: { speaker: primarySpeakerName, style: combinedStyleDirective },
              },
            ];

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-tts",
        contents: [{ role: "user", parts: parts as any }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                { speaker: primarySpeakerName, voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
                { speaker: secondarySpeakerName, voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedSecondaryVoice } } },
              ],
            },
          },
        },
      });

      base64Audio = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data)?.inlineData?.data;
    } else {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash-tts",
          contents: [{ role: "user", parts: [{ text: cleanText, speechMetadata: { style: combinedStyleDirective } } as any] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
          },
        });
        base64Audio = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data)?.inlineData?.data;
      } catch {
        usedModel = "gemini-3.8-flash-lite-tts";
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash-lite-tts",
          contents: [{ role: "user", parts: [{ text: cleanText }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
          },
        });
        base64Audio = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data)?.inlineData?.data;
      }
    }

    if (!base64Audio) {
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: "Audio synthesis engine did not return an audio stream. Please verify your target text and try again.",
        }),
      };
    }

    const rawBuffer = Buffer.from(base64Audio, "base64");
    const { wavBuffer, durationSeconds, sampleRate, bitDepth, channels } = ensureWavBuffer(rawBuffer, 24000);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioBase64: wavBuffer.toString("base64"),
        mimeType: "audio/wav",
        durationSeconds,
        sampleRate,
        bitDepth,
        channels,
        byteLength: wavBuffer.length,
        model: usedModel,
        synthesizedText: cleanText,
      }),
    };
  } catch (error: any) {
    console.error("TTS Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || "An unexpected error occurred while synthesizing speech." }),
    };
  }
};
