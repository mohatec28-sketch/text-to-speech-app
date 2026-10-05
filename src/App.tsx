import React, { useState, useMemo, useRef } from "react";
import {
  Volume2,
  Wand2,
  Play,
  Download,
  Trash2,
  Languages,
  AlertCircle,
  Loader2,
  User,
  Users,
  Mic,
  Radio,
  AudioLines,
  Waves,
  Sparkles,
  Heart,
  Zap,
  Newspaper,
  Feather,
  Scale,
  Globe,
  RotateCcw,
  Timer,
  Check,
  Award,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  DIALECTS,
  VOICE_PERSONAS,
  TONE_EMOTIONS,
  DialectId,
  VoicePersonaId,
  ToneEmotionId,
  VoicePersonaConfig,
  ToneEmotionConfig,
  parseVoiceCraftPrompt,
} from "./data/voicecraftPresets";
import { WaveformPlayer, AudioTake, UILang } from "./components/WaveformPlayer";
import heroStudioImg from "./assets/images/hero_luxury_voice_studio_1791133259708.jpg";

const DIALECT_BADGE_META: Record<
  DialectId,
  { code: string; accentColor: string; regionTag: string }
> = {
  "الجزائرية": { code: "DZ", accentColor: "text-emerald-400", regionTag: "Algiers · الدارجة" },
  "الفصحى": { code: "AR", accentColor: "text-amber-400", regionTag: "Standard · الفصحى" },
  "المصرية": { code: "EG", accentColor: "text-amber-300", regionTag: "Cairo · العامية" },
  "الخليجية": { code: "GC", accentColor: "text-teal-400", regionTag: "Gulf · الخليج" },
  "الشامية": { code: "LV", accentColor: "text-sky-400", regionTag: "Levant · الشام" },
  "المغربية": { code: "MA", accentColor: "text-rose-400", regionTag: "Rabat · الدارجة" },
  "التونسية": { code: "TN", accentColor: "text-red-400", regionTag: "Tunis · التونسية" },
  English: { code: "EN", accentColor: "text-indigo-400", regionTag: "English · Studio" },
  Français: { code: "FR", accentColor: "text-blue-400", regionTag: "Français · Studio" },
};

const UI_TRANSLATIONS: Record<
  UILang,
  {
    dir: "rtl" | "ltr";
    heroKicker: string;
    heroTitle: string;
    heroSubtitle: string;
    heroPrimaryCta: string;
    heroSecondaryCta: string;
    heroMeta1: string;
    heroMeta2: string;
    heroMeta3: string;
    step1Title: string;
    step2Title: string;
    step3Title: string;
    singleMode: string;
    dialogueMode: string;
    speaker2Label: string;
    targetTextLabel: string;
    sampleBtn: string;
    adaptBtn: (dialect: string) => string;
    tashkeelBtn: string;
    clearBtn: string;
    speakBtn: string;
    synthesizingBtn: string;
    quickAuditionHint: string;
    recentTakesTitle: string;
    clearHistory: string;
    charsLabel: string;
    wordsLabel: string;
    estDurationLabel: string;
    actualDurationLabel: string;
    ownerRoleLabel: string;
    ownerName: string;
  }
> = {
  ar: {
    dir: "rtl",
    heroKicker: "استوديو الهندسة الصوتية الذكي · الجيل الاحترافي",
    heroTitle: "فخامة الأداء الصوتي بجميع اللهجات العربية والعالمية",
    heroSubtitle:
      "محرك نطق صوتي سينمائي يحول نصوصك فوراً إلى مقاطع صوتية نابضة بالحياة باللهجة الجزائرية، الفصحى، المصرية، الخليجية، الشامية، المغربية، التونسية، الإنجليزية والفرنسية بدقة استوديو فائقة.",
    heroPrimaryCta: "تجربة صوت «الهواري» باللهجة الجزائرية",
    heroSecondaryCta: "توليد ونطق النص الحالي",
    heroMeta1: "9 لغات ولهجات أصيلة",
    heroMeta2: "5 شخصيات صوتية تشمل «الهواري»",
    heroMeta3: "جودة ماستر 24,000 Hz WAV",
    step1Title: "1. اختر اللغة أو اللهجة (كل لغة مستقلة)",
    step2Title: "2. اختر الشخصية الصوتية",
    step3Title: "3. اختر النبرة والعاطفة",
    singleMode: "صوت مفرد",
    dialogueMode: "حوار ثنائي",
    speaker2Label: "صوت المتحدث الثاني",
    targetTextLabel: "النص المستهدف للنطق الصوتي",
    sampleBtn: "نص تجريبي تلقائي",
    adaptBtn: (d) => `تحويل النص إلى (${d})`,
    tashkeelBtn: "ضبط التشكيل والنطق",
    clearBtn: "مسح النص",
    speakBtn: "توليد ونطق الصوت الآن",
    synthesizingBtn: "جاري توليد الصوت...",
    quickAuditionHint: "تشغيل تجريبي فوري لهذه اللغة",
    recentTakesTitle: "التسجيلات الصوتية الأخيرة",
    clearHistory: "مسح السجل",
    charsLabel: "حرف",
    wordsLabel: "كلمة",
    estDurationLabel: "المدة المتوقعة للمقطع",
    actualDurationLabel: "مدة المقطع المسجّل",
    ownerRoleLabel: "صاحب ومطوّر التطبيق",
    ownerName: "طارق محجوب محمد",
  },
  en: {
    dir: "ltr",
    heroKicker: "Flagship Acoustic Synthesis Studio · Master Edition",
    heroTitle: "Studio-Grade Multilingual Voice Synthesis & Dialect Mastery",
    heroSubtitle:
      "Transform any script into lifelike broadcast audio across Algerian, MSA, Egyptian, Gulf, Levantine, Moroccan, and Tunisian Arabic dialects alongside English and French.",
    heroPrimaryCta: "Audition «El Houari» Voice Now",
    heroSecondaryCta: "Synthesize Current Script",
    heroMeta1: "9 Native Languages & Dialects",
    heroMeta2: "5 Studio Personas incl. El Houari (الهواري)",
    heroMeta3: "24,000 Hz 16-Bit Master WAV",
    step1Title: "1. Select Standalone Language or Dialect",
    step2Title: "2. Select Voice Persona",
    step3Title: "3. Select Tone & Emotion",
    singleMode: "Single Voice",
    dialogueMode: "Dual Dialogue",
    speaker2Label: "Second Speaker Voice",
    targetTextLabel: "Target Text to Speak",
    sampleBtn: "Load Sample Script",
    adaptBtn: (d) => `Adapt Text to ${d}`,
    tashkeelBtn: "Phonetic Polish",
    clearBtn: "Clear",
    speakBtn: "Generate & Speak Audio",
    synthesizingBtn: "Synthesizing Audio...",
    quickAuditionHint: "Quick audition this language",
    recentTakesTitle: "Recent Audio Recordings",
    clearHistory: "Clear All",
    charsLabel: "chars",
    wordsLabel: "words",
    estDurationLabel: "Estimated Clip Duration",
    actualDurationLabel: "Recorded Clip Duration",
    ownerRoleLabel: "Application Owner & Creator",
    ownerName: "طارق محجوب محمد (Tarek Mahjoub Mohammed)",
  },
  fr: {
    dir: "ltr",
    heroKicker: "Studio de Synthèse Vocale Acoustique · Édition Prestige",
    heroTitle: "L'Excellence Vocale Multilingue et Dialectale en Qualité Studio",
    heroSubtitle:
      "Donnez vie à vos textes avec une justesse émotionnelle remarquable en Français, Anglais et dans les 7 grands dialectes arabes avec des voix de qualité diffusion.",
    heroPrimaryCta: "Écouter la voix « El Houari »",
    heroSecondaryCta: "Générer le Texte Actuel",
    heroMeta1: "9 Langues & Dialectes Natifs",
    heroMeta2: "5 Voix Studio dont El Houari (الهواري)",
    heroMeta3: "Audio Master WAV 24 000 Hz",
    step1Title: "1. Choisir la Langue ou le Dialecte",
    step2Title: "2. Choisir la Voix (Persona)",
    step3Title: "3. Choisir le Ton & l'Émotion",
    singleMode: "Voix Unique",
    dialogueMode: "Dialogue Duo",
    speaker2Label: "Voix du 2e Interlocuteur",
    targetTextLabel: "Texte Cible à Prononcer",
    sampleBtn: "Texte d'Exemple",
    adaptBtn: (d) => `Adapter en ${d}`,
    tashkeelBtn: "Optimiser la Diction",
    clearBtn: "Effacer",
    speakBtn: "Générer et Écouter l'Audio",
    synthesizingBtn: "Synthèse en cours...",
    quickAuditionHint: "Écoute rapide de cette langue",
    recentTakesTitle: "Enregistrements Récents",
    clearHistory: "Effacer",
    charsLabel: "caractères",
    wordsLabel: "mots",
    estDurationLabel: "Durée Estimée du Clip",
    actualDurationLabel: "Durée Enregistrée",
    ownerRoleLabel: "Propriétaire & Créateur de l'Application",
    ownerName: "طارق محجوب محمد (Tarek Mahjoub Mohammed)",
  },
};

function getVoiceIcon(id: VoicePersonaId) {
  switch (id) {
    case "Kore":
      return Mic;
    case "الهواري":
      return AudioLines;
    case "Fenrir":
      return Radio;
    case "Zephyr":
      return Waves;
    case "Aoede":
      return Sparkles;
  }
}

function getToneIcon(id: ToneEmotionId) {
  switch (id) {
    case "Natural & Balanced":
      return Scale;
    case "Warm & Friendly":
      return Heart;
    case "Enthusiastic & Promotional":
      return Zap;
    case "Formal & Newsroom":
      return Newspaper;
    case "Poetic & Calm":
      return Feather;
  }
}

export default function App() {
  const [uiLang, setUiLang] = useState<UILang>("ar");
  const ui = UI_TRANSLATIONS[uiLang];
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const studioSectionRef = useRef<HTMLDivElement | null>(null);

  // Core VoiceCraft AI Parameters
  const [dialect, setDialect] = useState<DialectId>("الجزائرية");
  const [voicePersona, setVoicePersona] = useState<VoicePersonaId>("الهواري");
  const [toneEmotion, setToneEmotion] =
    useState<ToneEmotionId>("Natural & Balanced");
  const [mode, setMode] = useState<"single" | "dialogue">("single");
  const [secondaryVoicePersona, setSecondaryVoicePersona] =
    useState<VoicePersonaId>("Kore");

  // Target Text
  const [targetText, setTargetText] = useState<string>(
    DIALECTS[0].toneSamples["Natural & Balanced"]
  );

  // Synthesis & Processing States
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [adaptingAction, setAdaptingAction] = useState<
    "adapt" | "diacritize" | null
  >(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audio Output & Session History
  const [currentTake, setCurrentTake] = useState<AudioTake | null>(null);
  const [takesHistory, setTakesHistory] = useState<AudioTake[]>([]);
  const [autoPlayTrigger, setAutoPlayTrigger] = useState<number>(0);

  const activeDialectConfig = useMemo(
    () => DIALECTS.find((d) => d.id === dialect) || DIALECTS[0],
    [dialect]
  );

  const handleSwitchUILang = (nextLang: UILang) => {
    setUiLang(nextLang);
    if (nextLang === "en" && dialect !== "English") {
      handleSelectDialect("English", true);
    } else if (nextLang === "fr" && dialect !== "Français") {
      handleSelectDialect("Français", true);
    } else if (
      nextLang === "ar" &&
      (dialect === "English" || dialect === "Français")
    ) {
      handleSelectDialect("الجزائرية", true);
    }
  };

  const handleSelectDialect = (newDialect: DialectId, forceSample = false) => {
    const prevDialectObj = DIALECTS.find((d) => d.id === dialect);
    const nextDialectObj =
      DIALECTS.find((d) => d.id === newDialect) || DIALECTS[0];
    setDialect(newDialect);
    setErrorMsg(null);

    const isCurrentDefaultSample =
      !targetText.trim() ||
      targetText === "[أدخل النص هنا]" ||
      (prevDialectObj &&
        (targetText === prevDialectObj.defaultSample ||
          targetText === prevDialectObj.dialogueSample ||
          Object.values(prevDialectObj.toneSamples).includes(targetText)));

    if (forceSample || isCurrentDefaultSample) {
      if (mode === "dialogue") {
        setTargetText(nextDialectObj.dialogueSample);
      } else {
        setTargetText(
          nextDialectObj.toneSamples[toneEmotion] ||
            nextDialectObj.defaultSample
        );
      }
    }
  };

  const handleSelectTone = (newTone: ToneEmotionId) => {
    const prevSamples = Object.values(activeDialectConfig.toneSamples);
    const isUsingPresetSample =
      prevSamples.includes(targetText) ||
      targetText === activeDialectConfig.defaultSample;
    setToneEmotion(newTone);
    if (isUsingPresetSample && mode === "single") {
      setTargetText(activeDialectConfig.toneSamples[newTone]);
    }
  };

  const handleToggleMode = (nextMode: "single" | "dialogue") => {
    setMode(nextMode);
    if (nextMode === "dialogue") {
      const isSingleSample =
        Object.values(activeDialectConfig.toneSamples).includes(targetText) ||
        targetText === activeDialectConfig.defaultSample;
      if (isSingleSample) {
        setTargetText(activeDialectConfig.dialogueSample);
      }
    } else if (targetText === activeDialectConfig.dialogueSample) {
      setTargetText(activeDialectConfig.toneSamples[toneEmotion]);
    }
  };

  const handleTextChange = (val: string) => {
    setErrorMsg(null);
    const parsed = parseVoiceCraftPrompt(val);
    if (parsed.isTemplate && parsed.targetText) {
      if (parsed.dialect) setDialect(parsed.dialect);
      if (parsed.voicePersona) setVoicePersona(parsed.voicePersona);
      if (parsed.toneEmotion) setToneEmotion(parsed.toneEmotion);
      setTargetText(parsed.targetText);
      return;
    }
    setTargetText(val);
  };

  const handleSynthesizeSpeech = async (overrideParams?: {
    text?: string;
    dialect?: DialectId;
    voicePersona?: VoicePersonaId;
    toneEmotion?: ToneEmotionId;
    mode?: "single" | "dialogue";
  }) => {
    const synthText = (overrideParams?.text ?? targetText).trim();
    const synthDialect = overrideParams?.dialect ?? dialect;
    const synthVoice = overrideParams?.voicePersona ?? voicePersona;
    const synthTone = overrideParams?.toneEmotion ?? toneEmotion;
    const synthMode = overrideParams?.mode ?? mode;

    if (!synthText || synthText === "[أدخل النص هنا]") {
      setErrorMsg(
        uiLang === "ar"
          ? "يرجى إدخال النص أولاً لتوليد الصوت."
          : uiLang === "fr"
          ? "Veuillez saisir un texte à synthétiser."
          : "Please enter target text to synthesize."
      );
      return;
    }

    setIsSynthesizing(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: synthText,
          dialect: synthDialect,
          voicePersona: synthVoice,
          toneEmotion: synthTone,
          mode: synthMode,
          secondaryVoicePersona,
          primarySpeakerName: "Speaker1",
          secondarySpeakerName: "Speaker2",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate speech audio.");
      }

      const newTake: AudioTake = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
        dialect: synthDialect,
        voicePersona: synthVoice,
        toneEmotion: synthTone,
        mode: synthMode,
        secondaryVoicePersona:
          synthMode === "dialogue" ? secondaryVoicePersona : undefined,
        text: data.synthesizedText || synthText,
        audioBase64: data.audioBase64,
        mimeType: data.mimeType || "audio/wav",
        durationSeconds: data.durationSeconds || 0,
        sampleRate: data.sampleRate || 24000,
        bitDepth: data.bitDepth || 16,
        byteLength: data.byteLength || 0,
      };

      setCurrentTake(newTake);
      setTakesHistory((prev) => [newTake, ...prev]);
      setAutoPlayTrigger((prev) => prev + 1);
    } catch (err: any) {
      setErrorMsg(
        err?.message || "حدث خطأ أثناء توليد الصوت. يرجى المحاولة مرة أخرى."
      );
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleDialectAdapt = async (action: "adapt" | "diacritize") => {
    if (!targetText.trim() || targetText === "[أدخل النص هنا]") {
      setErrorMsg(
        uiLang === "ar"
          ? "يرجى كتابة نص أولاً قبل التحويل."
          : "Please enter text first."
      );
      return;
    }

    setAdaptingAction(action);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/dialect-adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: targetText,
          dialect,
          toneEmotion,
          action,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to adapt text.");
      }

      if (data.adaptedText) {
        setTargetText(data.adaptedText);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "تعذر تحويل النص.");
    } finally {
      setAdaptingAction(null);
    }
  };

  const wordCount = useMemo(() => {
    const trimmed = targetText.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [targetText]);

  const estimatedDurationSec = useMemo(() => {
    if (wordCount === 0) return 0;
    return Math.max(1.2, Math.round((wordCount / 2.2) * 10) / 10);
  }, [wordCount]);

  const formatClipDuration = (sec: number) => {
    if (!Number.isFinite(sec) || sec <= 0) return "00:00.0s";
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const tenths = Math.floor((sec % 1) * 10);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}s`;
  };

  const getVoiceLocalizedDesc = (v: VoicePersonaConfig) => {
    if (uiLang === "ar") return `${v.arabicGender} · ${v.arabicTimbre}`;
    return `${v.gender} · ${v.timbreProfile}`;
  };

  const getToneLocalizedTitle = (t: ToneEmotionConfig) => {
    if (uiLang === "ar") return t.arabicLabel;
    return t.id;
  };

  const getToneLocalizedSub = (t: ToneEmotionConfig) => {
    if (uiLang === "ar") return t.id;
    return t.arabicLabel;
  };

  return (
    <div
      dir={ui.dir}
      className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-arabic"
    >
      {/* Strict 3-Zone Top Bar with Standalone Language Selector Buttons */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800/90 bg-[#0B0F17]/95 backdrop-blur sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => e.preventDefault()}
          className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap"
        >
          VoiceCraft AI
        </a>

        {/* Zone 2: 3 Standalone Interactive Language Buttons */}
        <nav className="flex items-center gap-2.5">
          {(
            [
              { id: "ar", code: "AR", label: "العربية" },
              { id: "en", code: "EN", label: "English" },
              { id: "fr", code: "FR", label: "Français" },
            ] as const
          ).map((lang) => {
            const isActive = uiLang === lang.id;
            return (
              <motion.button
                whileHover={{ y: -1, scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                key={lang.id}
                type="button"
                onClick={() => handleSwitchUILang(lang.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-amber-500/15 border-amber-500 text-amber-300 shadow-sm"
                    : "bg-[#111827] border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono-tabular font-bold ${
                    isActive
                      ? "bg-amber-500 text-slate-950"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {lang.code}
                </span>
                <span>{lang.label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => handleSynthesizeSpeech()}
            disabled={isSynthesizing}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 rounded-xl hover:bg-amber-400 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
            <span>{isSynthesizing ? ui.synthesizingBtn : ui.speakBtn}</span>
          </motion.button>
        </div>
      </header>

      {/* Unified Single-Screen Workspace */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-7">
        {/* Grand Luxury Top Hero Showcase (واجهة رائعة وكبيرة فخمة بتصميم جذاب) */}
        <section className="relative rounded-2xl overflow-hidden border border-amber-500/30 bg-[#111827] min-h-[320px] lg:min-h-[360px] flex items-end">
          {/* Background Studio Photography + Resilient Fallback */}
          {!heroImgFailed ? (
            <img
              src={heroStudioImg}
              alt="VoiceCraft AI Luxury Acoustic Recording Studio"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="absolute inset-0 w-full h-full object-cover object-center opacity-65"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1A150E] via-[#111827] to-[#0B0F17]" />
          )}

          {/* Measured High-Contrast Scrim for WCAG AA Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17] via-[#0B0F17]/80 to-[#0B0F17]/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F17]/90 via-[#0B0F17]/55 to-transparent" />

          {/* Hero Content Grid */}
          <div className="relative z-10 w-full p-6 sm:p-10 lg:p-12 flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8">
            <div className="max-w-2xl flex flex-col gap-3.5">
              {/* Quiet Unboxed Kicker */}
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 tracking-wide">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{ui.heroKicker}</span>
              </div>

              {/* Expressive Display Headline */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight text-balance">
                {ui.heroTitle}
              </h1>

              {/* Body Copy */}
              <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed max-w-xl">
                {ui.heroSubtitle}
              </p>

              {/* Unboxed Metadata Highlights with · Separators */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-amber-300/90 pt-1 font-medium">
                <span>{ui.heroMeta1}</span>
                <span aria-hidden="true" className="text-slate-500">
                  ·
                </span>
                <span>{ui.heroMeta2}</span>
                <span aria-hidden="true" className="text-slate-500">
                  ·
                </span>
                <span className="font-mono-tabular">{ui.heroMeta3}</span>
              </div>

              {/* Hero Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  disabled={isSynthesizing}
                  onClick={() => {
                    setDialect("الجزائرية");
                    setVoicePersona("الهواري");
                    const sample = DIALECTS[0].defaultSample;
                    setTargetText(sample);
                    handleSynthesizeSpeech({
                      text: sample,
                      dialect: "الجزائرية",
                      voicePersona: "الهواري",
                      toneEmotion,
                      mode: "single",
                    });
                  }}
                  className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer shadow-lg"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{ui.heroPrimaryCta}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => {
                    studioSectionRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold border border-slate-700/90 bg-[#0B0F17]/80 text-slate-100 hover:border-amber-500/60 hover:text-amber-300 transition-colors whitespace-nowrap cursor-pointer backdrop-blur"
                >
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span>{ui.heroSecondaryCta}</span>
                </motion.button>
              </div>
            </div>

            {/* Right Interactive Luxury Acoustic Visualizer Badge */}
            <div className="hidden sm:flex flex-col items-end gap-3 shrink-0 bg-[#0B0F17]/85 backdrop-blur-md border border-slate-800/90 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    {voicePersona} · {dialect}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono-tabular">
                    24,000 Hz · 16-Bit Master
                  </div>
                </div>
              </div>

              {/* Animated Golden Soundwave Bars */}
              <div className="flex items-end gap-1.5 h-10 pt-2">
                {[0.4, 0.75, 1.0, 0.6, 0.9, 0.5, 0.85, 0.95, 0.55, 0.8, 0.45, 0.7].map(
                  (h, i) => (
                    <motion.span
                      key={i}
                      animate={{
                        scaleY: [0.45, 1, 0.55],
                        opacity: [0.65, 1, 0.65],
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.09,
                        ease: "easeInOut",
                      }}
                      className="w-1.5 rounded-full bg-gradient-to-t from-amber-600 to-amber-300 origin-bottom"
                      style={{ height: `${Math.round(h * 34)}px` }}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Top Section: 3 Parameter Columns */}
        <div
          ref={studioSectionRef}
          className="grid grid-cols-1 lg:grid-cols-12 gap-5"
        >
          {/* Card 1: Standalone Language & Dialect Cards (كل لغة وحدها بأيقونة مستقلة) */}
          <section className="lg:col-span-5 border border-slate-800/90 bg-[#111827] rounded-xl p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.08 }}
                  className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400"
                >
                  <Globe className="w-4 h-4" />
                </motion.div>
                <h2 className="text-sm font-bold text-slate-100">
                  {ui.step1Title}
                </h2>
              </div>
              <span className="text-xs font-mono-tabular text-slate-400">
                {activeDialectConfig.isoCode}
              </span>
            </div>

            {/* Grid of Standalone Language & Dialect Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              {DIALECTS.map((d) => {
                const isSelected = d.id === dialect;
                const badge = DIALECT_BADGE_META[d.id];
                return (
                  <motion.div
                    key={d.id}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelectDialect(d.id, false)}
                    className={`group relative rounded-xl border p-3 flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-500 shadow-sm"
                        : "bg-[#0B0F17] border-slate-800/90 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <motion.div
                        animate={
                          isSelected ? { scale: [1, 1.12, 1] } : { scale: 1 }
                        }
                        transition={{ duration: 0.35 }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono-tabular text-xs font-bold border transition-colors ${
                          isSelected
                            ? "bg-amber-500 text-slate-950 border-amber-400"
                            : `bg-slate-900 border-slate-800 ${badge.accentColor}`
                        }`}
                      >
                        {badge.code}
                      </motion.div>

                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        title={ui.quickAuditionHint}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDialect(d.id);
                          const sample = d.toneSamples[toneEmotion];
                          setTargetText(sample);
                          handleSynthesizeSpeech({
                            text: sample,
                            dialect: d.id,
                            voicePersona,
                            toneEmotion,
                            mode: "single",
                          });
                        }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-amber-500/25 text-amber-300 hover:bg-amber-500 hover:text-slate-950"
                            : "bg-slate-800/80 text-slate-400 group-hover:text-amber-400 group-hover:bg-slate-800"
                        }`}
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </motion.button>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-bold truncate ${
                            isSelected ? "text-amber-300" : "text-slate-100"
                          }`}
                        >
                          {d.id}
                        </span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {badge.regionTag}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Card 2: Voice Persona Selector (with الهواري) */}
          <section className="lg:col-span-4 border border-slate-800/90 bg-[#111827] rounded-xl p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400"
                >
                  <AudioLines className="w-4 h-4" />
                </motion.div>
                <h2 className="text-sm font-bold text-slate-100">
                  {ui.step2Title}
                </h2>
              </div>

              {/* Single vs Dual Speaker Toggle */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleMode("single")}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                    mode === "single"
                      ? "bg-amber-500/15 border-amber-500/70 text-amber-300"
                      : "bg-[#0B0F17] border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <User className="w-3 h-3" />
                  <span>{ui.singleMode}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMode("dialogue")}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                    mode === "dialogue"
                      ? "bg-amber-500/15 border-amber-500/70 text-amber-300"
                      : "bg-[#0B0F17] border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Users className="w-3 h-3" />
                  <span>{ui.dialogueMode}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {VOICE_PERSONAS.map((v) => {
                const isSelected = v.id === voicePersona;
                const IconComponent = getVoiceIcon(v.id);
                return (
                  <motion.button
                    key={v.id}
                    whileHover={{ x: ui.dir === "rtl" ? -3 : 3 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setVoicePersona(v.id)}
                    className={`w-full px-3 py-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-500 text-slate-100"
                        : "bg-[#0B0F17] border-slate-800/90 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <motion.div
                        animate={
                          isSelected ? { scale: [1, 1.14, 1] } : { scale: 1 }
                        }
                        transition={{ duration: 0.4 }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-800/80 text-slate-400"
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </motion.div>
                      <div className="text-start min-w-0">
                        <div className="text-xs font-bold truncate">
                          {v.displayLabel}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {getVoiceLocalizedDesc(v)}
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono-tabular text-slate-400 shrink-0">
                      {v.fundamentalRange}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {mode === "dialogue" && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {ui.speaker2Label}:
                </span>
                <div className="flex items-center gap-1">
                  {VOICE_PERSONAS.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSecondaryVoicePersona(v.id)}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                        secondaryVoicePersona === v.id
                          ? "bg-amber-500 text-slate-950 border-amber-500 font-semibold"
                          : "bg-[#0B0F17] border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {v.id}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Card 3: Tone & Emotion Selector */}
          <section className="lg:col-span-3 border border-slate-800/90 bg-[#111827] rounded-xl p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <motion.div
                  whileHover={{ rotate: -12, scale: 1.08 }}
                  className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400"
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
                <h2 className="text-sm font-bold text-slate-100">
                  {ui.step3Title}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {TONE_EMOTIONS.map((t) => {
                const isSelected = t.id === toneEmotion;
                const ToneIcon = getToneIcon(t.id);
                return (
                  <motion.button
                    key={t.id}
                    whileHover={{ x: ui.dir === "rtl" ? -3 : 3 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => handleSelectTone(t.id)}
                    className={`w-full px-3 py-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-500 text-slate-100"
                        : "bg-[#0B0F17] border-slate-800/90 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <motion.div
                        animate={
                          isSelected
                            ? { rotate: [0, -10, 10, 0], scale: [1, 1.12, 1] }
                            : { rotate: 0, scale: 1 }
                        }
                        transition={{ duration: 0.45 }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-800/80 text-slate-400"
                        }`}
                      >
                        <ToneIcon className="w-4 h-4" />
                      </motion.div>
                      <div className="text-start min-w-0">
                        <div className="text-xs font-bold truncate">
                          {getToneLocalizedTitle(t)}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {getToneLocalizedSub(t)}
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono-tabular text-slate-400 shrink-0">
                      {t.pacingProfile}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Error Alert Banner */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="px-4 py-3 rounded-xl border border-rose-500/50 bg-rose-500/10 text-rose-200 text-xs flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Middle Section: Unified Target Text Editor + Upgraded Audio Duration Indicator */}
        <section className="border border-slate-800/90 bg-[#111827] rounded-xl p-5 flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <label
                htmlFor="target-text-input"
                className="text-sm font-bold text-slate-100"
              >
                {ui.targetTextLabel}
              </label>
              <span className="text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="text-xs text-amber-400 font-semibold">
                {dialect} · {voicePersona} · {toneEmotion}
              </span>
            </div>

            {/* Interactive Studio Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() =>
                  setTargetText(
                    mode === "dialogue"
                      ? activeDialectConfig.dialogueSample
                      : activeDialectConfig.toneSamples[toneEmotion]
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 bg-[#0B0F17] text-slate-200 hover:border-amber-500/60 hover:text-amber-300 transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>{ui.sampleBtn}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => handleDialectAdapt("adapt")}
                disabled={adaptingAction !== null || isSynthesizing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 bg-[#0B0F17] text-slate-200 hover:border-amber-500/60 hover:text-amber-300 disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
              >
                {adaptingAction === "adapt" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Languages className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{ui.adaptBtn(dialect)}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => handleDialectAdapt("diacritize")}
                disabled={adaptingAction !== null || isSynthesizing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 bg-[#0B0F17] text-slate-200 hover:border-amber-500/60 hover:text-amber-300 disabled:opacity-40 transition-colors whitespace-nowrap cursor-pointer"
              >
                {adaptingAction === "diacritize" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{ui.tashkeelBtn}</span>
              </motion.button>

              <button
                type="button"
                onClick={() => setTargetText("")}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-300 transition-colors whitespace-nowrap cursor-pointer"
              >
                {ui.clearBtn}
              </button>
            </div>
          </div>

          <textarea
            id="target-text-input"
            dir={activeDialectConfig.dir}
            rows={4}
            value={targetText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={
              activeDialectConfig.dir === "rtl"
                ? "أدخل النص هنا ليتم نطقه مباشرة باللهجة والنبرة المختارة..."
                : dialect === "Français"
                ? "Saisissez votre texte ici pour générer et écouter la voix directement..."
                : "Enter target text here to generate and speak the audio output directly..."
            }
            className="w-full rounded-xl bg-[#0B0F17] border border-slate-800/90 p-4 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/70 transition-colors leading-relaxed resize-y"
          />

          {/* Bottom Bar: Interactive Clip Duration Icon Module + Generate & Speak CTA */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0B0F17] border border-slate-800"
              >
                <motion.div
                  animate={
                    isSynthesizing
                      ? { rotate: 360 }
                      : { scale: [1, 1.08, 1] }
                  }
                  transition={
                    isSynthesizing
                      ? { duration: 2, repeat: Infinity, ease: "linear" }
                      : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
                  }
                  className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400"
                >
                  <Timer className="w-3.5 h-3.5" />
                </motion.div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 leading-none mb-0.5">
                    {currentTake
                      ? ui.actualDurationLabel
                      : ui.estDurationLabel}
                  </span>
                  <span
                    dir="ltr"
                    className="text-xs font-mono-tabular font-bold text-amber-400 leading-none"
                  >
                    {currentTake
                      ? formatClipDuration(currentTake.durationSeconds)
                      : `~${formatClipDuration(estimatedDurationSec)}`}
                  </span>
                </div>
              </motion.div>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono-tabular">
                <span>
                  {targetText.length} {ui.charsLabel}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {wordCount} {ui.wordsLabel}
                </span>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => handleSynthesizeSpeech()}
              disabled={isSynthesizing || !targetText.trim()}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap cursor-pointer shadow-sm"
            >
              {isSynthesizing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{ui.synthesizingBtn}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span>{ui.speakBtn}</span>
                </>
              )}
            </motion.button>
          </div>
        </section>

        {/* Bottom Section: Instant Audio Player & Waveform Deck */}
        <WaveformPlayer
          take={currentTake}
          isSynthesizing={isSynthesizing}
          autoPlayTrigger={autoPlayTrigger}
          uiLang={uiLang}
        />

        {/* Compact Inline Recent Takes with Upgraded Duration Icon */}
        {takesHistory.length > 0 && (
          <section className="border border-slate-800/90 bg-[#111827] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200">
                {ui.recentTakesTitle} ({takesHistory.length})
              </h3>
              <button
                type="button"
                onClick={() => setTakesHistory([])}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{ui.clearHistory}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {takesHistory.slice(0, 6).map((item) => {
                const isCurrent = currentTake?.id === item.id;
                return (
                  <motion.div
                    whileHover={{ y: -1 }}
                    key={item.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                      isCurrent
                        ? "bg-amber-500/10 border-amber-500/60"
                        : "bg-[#0B0F17] border-slate-800/90"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-amber-400">
                          {item.dialect}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-300">
                          {item.voicePersona}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span
                          dir="ltr"
                          className="inline-flex items-center gap-1 font-mono-tabular text-amber-300 font-semibold"
                        >
                          <Timer className="w-3 h-3 text-amber-400" />
                          {formatClipDuration(item.durationSeconds)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 truncate mt-1">
                        {item.text}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.92 }}
                        type="button"
                        onClick={() => {
                          setCurrentTake(item);
                          setAutoPlayTrigger((prev) => prev + 1);
                        }}
                        className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.92 }}
                        type="button"
                        onClick={() => {
                          const binary = atob(item.audioBase64);
                          const bytes = new Uint8Array(binary.length);
                          for (let i = 0; i < binary.length; i++) {
                            bytes[i] = binary.charCodeAt(i);
                          }
                          const blob = new Blob([bytes], { type: "audio/wav" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `VoiceCraft_${item.dialect}_${item.voicePersona}.wav`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="w-7 h-7 rounded-lg border border-slate-700 text-slate-300 hover:text-amber-400 flex items-center justify-center cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Luxury Studio Footer with App Owner Signature (طارق محجوب محمد) */}
      <footer className="mt-8 border-t border-slate-800/90 bg-[#080B11] py-6 px-6">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-slate-400">
            <span className="font-bold text-slate-200">VoiceCraft AI</span>
            <span aria-hidden="true">·</span>
            <span>Multilingual Neural Audio Synthesis Engine</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs text-slate-400">
              {ui.ownerRoleLabel}:
            </span>
            <span className="text-sm font-bold text-amber-400 tracking-wide">
              {ui.ownerName}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
