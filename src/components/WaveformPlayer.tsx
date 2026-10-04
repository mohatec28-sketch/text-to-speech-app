import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Download,
  RotateCcw,
  Volume2,
  VolumeX,
  Repeat,
  AudioWaveform,
  Sparkles,
  Timer,
} from "lucide-react";
import { motion } from "motion/react";

export interface AudioTake {
  id: string;
  createdAt: string;
  dialect: string;
  voicePersona: string;
  toneEmotion: string;
  mode: "single" | "dialogue";
  secondaryVoicePersona?: string;
  text: string;
  audioBase64: string;
  mimeType: string;
  durationSeconds: number;
  sampleRate: number;
  bitDepth: number;
  byteLength: number;
}

export type UILang = "ar" | "en" | "fr";

interface WaveformPlayerProps {
  take: AudioTake | null;
  isSynthesizing: boolean;
  autoPlayTrigger: number;
  uiLang: UILang;
}

const PLAYER_LABELS: Record<
  UILang,
  {
    title: string;
    readyDesc: string;
    synthesizing: string;
    emptyHint: string;
    play: string;
    pause: string;
    restart: string;
    loop: string;
    mute: string;
    download: string;
    durationLabel: string;
    elapsedLabel: string;
  }
> = {
  ar: {
    title: "مشغّل الصوت والموجات الصوتية",
    readyDesc: "جاهز لتوليد وتشغيل الصوت بجودة استوديو 24,000 Hz · WAV",
    synthesizing: "جاري توليد الصوت وضبط مخارج الحروف والنبرة...",
    emptyHint:
      "اختر اللغة أو اللهجة والشخصية الصوتية ثم اضغط «توليد ونطق الصوت» للاستماع فوراً",
    play: "تشغيل الصوت",
    pause: "إيقاف مؤقت",
    restart: "إعادة من البداية",
    loop: "تكرار التشغيل",
    mute: "كتم / تشغيل الصوت",
    download: "تحميل WAV",
    durationLabel: "مدة المقطع",
    elapsedLabel: "الوقت الحالي",
  },
  en: {
    title: "Master Audio & Waveform Output",
    readyDesc: "Ready to synthesize 24,000 Hz · 16-bit Studio WAV audio",
    synthesizing: "Synthesizing neural voice & dialect prosody...",
    emptyHint:
      "Choose your language/dialect, voice persona, and tone, then click Generate & Speak",
    play: "Play Audio",
    pause: "Pause",
    restart: "Restart",
    loop: "Loop",
    mute: "Mute / Unmute",
    download: "Download WAV",
    durationLabel: "Clip Duration",
    elapsedLabel: "Elapsed",
  },
  fr: {
    title: "Lecteur Audio Studio & Forme d'Onde",
    readyDesc: "Prêt à synthétiser l'audio WAV Studio 24 000 Hz · 16 bits",
    synthesizing: "Synthèse vocale neuronale et prosodie en cours...",
    emptyHint:
      "Choisissez la langue, la voix et le ton, puis cliquez sur Générer et Écouter",
    play: "Écouter",
    pause: "Pause",
    restart: "Recommencer",
    loop: "Boucle",
    mute: "Muet / Son",
    download: "Télécharger WAV",
    durationLabel: "Durée du Clip",
    elapsedLabel: "Écoulé",
  },
};

export const WaveformPlayer: React.FC<WaveformPlayerProps> = ({
  take,
  isSynthesizing,
  autoPlayTrigger,
  uiLang,
}) => {
  const t = PLAYER_LABELS[uiLang];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!take?.audioBase64) {
      setAudioUrl(null);
      setPeaks([]);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      return;
    }

    const binary = atob(take.audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: take.mimeType || "audio/wav" });
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setDuration(take.durationSeconds || 0);
    setCurrentTime(0);

    let isCancelled = false;
    const decodePeaks = async () => {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new AudioCtx();
        const arrayBuffer = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        );
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (isCancelled) {
          await ctx.close();
          return;
        }
        setDuration(audioBuffer.duration);
        const channelData = audioBuffer.getChannelData(0);
        const barCount = 88;
        const blockSize = Math.max(
          1,
          Math.floor(channelData.length / barCount)
        );
        const extracted: number[] = [];
        let maxPeak = 0.01;

        for (let i = 0; i < barCount; i++) {
          const start = i * blockSize;
          let sum = 0;
          for (
            let j = 0;
            j < blockSize && start + j < channelData.length;
            j++
          ) {
            const sample = Math.abs(channelData[start + j]);
            if (sample > sum) sum = sample;
          }
          extracted.push(sum);
          if (sum > maxPeak) maxPeak = sum;
        }

        const normalized = extracted.map((v) =>
          Math.max(0.1, Math.min(1, v / maxPeak))
        );
        setPeaks(normalized);
        await ctx.close();
      } catch {
        const fallback = Array.from({ length: 88 }, (_, i) => {
          const v =
            Math.sin(i * 0.25) * 0.35 + Math.cos(i * 0.7) * 0.25 + 0.45;
          return Math.max(0.12, Math.min(0.95, v));
        });
        if (!isCancelled) setPeaks(fallback);
      }
    };

    decodePeaks();

    return () => {
      isCancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [take]);

  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;
    const audio = audioRef.current;
    audio.src = audioUrl;
    audio.playbackRate = playbackRate;
    audio.loop = isLooping;
    audio.muted = isMuted;

    if (autoPlayTrigger > 0) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [audioUrl, autoPlayTrigger]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = isLooping;
  }, [isLooping]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  const progressRatio =
    duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "rgba(148, 163, 184, 0.1)";
    ctx.fillRect(0, Math.floor(height / 2), width, 1);

    if (peaks.length === 0) return;

    const barCount = peaks.length;
    const gap = 3;
    const totalGap = gap * (barCount - 1);
    const barWidth = Math.max(2.5, (width - totalGap) / barCount);

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap);
      const amplitude = peaks[i];
      const barHeight = Math.max(5, amplitude * (height * 0.82));
      const y = (height - barHeight) / 2;
      const barRatio = i / barCount;

      if (barRatio <= progressRatio && duration > 0) {
        ctx.fillStyle = "#F59E0B";
      } else {
        ctx.fillStyle = "rgba(148, 163, 184, 0.3)";
      }

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }

    if (duration > 0) {
      const playheadX = Math.min(
        width - 1,
        Math.max(1, progressRatio * width)
      );
      ctx.fillStyle = "#FBBF24";
      ctx.fillRect(playheadX - 1, 2, 2, height - 4);
    }
  }, [peaks, progressRatio, duration]);

  useEffect(() => {
    drawWaveform();
    window.addEventListener("resize", drawWaveform);
    return () => window.removeEventListener("resize", drawWaveform);
  }, [drawWaveform]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  };

  const handleCanvasSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || !duration) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleDownloadWav = () => {
    if (!audioUrl || !take) return;
    const link = document.createElement("a");
    link.href = audioUrl;
    const safeDialect = take.dialect.replace(/\s+/g, "_");
    link.download = `VoiceCraft_${safeDialect}_${take.voicePersona}_${take.id.slice(0, 6)}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return "00:00.0";
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const tenths = Math.floor((sec % 1) * 10);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}`;
  };

  // SVG Ring math for the interactive Audio Duration Icon
  const ringRadius = 15;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = ringCircumference * (1 - progressRatio);

  return (
    <div className="border border-slate-800/90 bg-[#111827] rounded-xl p-5">
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && audioRef.current.duration) {
            setDuration(audioRef.current.duration);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (!isLooping) setCurrentTime(duration);
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Header Row with Modern Interactive Audio Clip Duration Icon Widget */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <motion.div
            animate={
              isPlaying
                ? { scale: [1, 1.08, 1], rotate: [0, 3, -3, 0] }
                : { scale: 1, rotate: 0 }
            }
            transition={{
              duration: 1.4,
              repeat: isPlaying ? Infinity : 0,
              ease: "easeInOut",
            }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
              isPlaying
                ? "bg-amber-500/20 border-amber-500/60 text-amber-400"
                : "bg-slate-800/70 border-slate-700/70 text-slate-300"
            }`}
          >
            <AudioWaveform className="w-5 h-5" />
          </motion.div>

          <div>
            <h2 className="text-sm font-semibold text-slate-100">{t.title}</h2>
            {take ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono-tabular">
                <span className="text-amber-400 font-sans font-medium">
                  {take.dialect}
                </span>
                <span aria-hidden="true">·</span>
                <span>{take.voicePersona}</span>
                <span aria-hidden="true">·</span>
                <span className="font-sans">{take.toneEmotion}</span>
                <span aria-hidden="true">·</span>
                <span>24,000 Hz WAV</span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">{t.readyDesc}</p>
            )}
          </div>
        </div>

        {/* Upgraded Interactive Audio Clip Duration & Radial Timer Module */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={togglePlay}
          title={isPlaying ? t.pause : t.play}
          className={`flex items-center gap-3 px-3.5 py-2 rounded-xl border transition-all cursor-pointer select-none ${
            isPlaying
              ? "bg-amber-500/10 border-amber-500/50"
              : "bg-[#0B0F17] border-slate-800 hover:border-slate-700"
          }`}
        >
          {/* Radial Progress Ring + Animated Timer Icon */}
          <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
            <svg
              className="w-9 h-9 -rotate-90 transform"
              viewBox="0 0 36 36"
            >
              <circle
                cx="18"
                cy="18"
                r={ringRadius}
                fill="none"
                stroke="rgba(148, 163, 184, 0.16)"
                strokeWidth="2.5"
              />
              <circle
                cx="18"
                cy="18"
                r={ringRadius}
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-150"
              />
            </svg>
            <motion.div
              animate={
                isPlaying
                  ? { scale: [1, 1.16, 1] }
                  : { scale: 1 }
              }
              transition={{
                duration: 1,
                repeat: isPlaying ? Infinity : 0,
              }}
              className={`absolute inset-0 flex items-center justify-center ${
                isPlaying ? "text-amber-400" : "text-slate-400"
              }`}
            >
              <Timer className="w-4 h-4" />
            </motion.div>
          </div>

          {/* Elapsed & Total Clip Duration Readout */}
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-medium leading-none mb-1">
              {t.durationLabel}
            </span>
            <div
              dir="ltr"
              className="flex items-baseline gap-1.5 font-mono-tabular text-xs leading-none"
            >
              <span className="text-amber-400 font-bold text-sm">
                {formatTime(currentTime)}
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-200 font-semibold">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Waveform Canvas */}
      <div
        dir="ltr"
        className="relative my-4 h-24 w-full bg-[#0B0F17] border border-slate-800/90 rounded-lg overflow-hidden flex items-center justify-center"
      >
        {isSynthesizing ? (
          <div className="flex flex-col items-center gap-2 text-xs text-amber-400">
            <div className="flex items-end gap-1.5 h-8">
              {[0.35, 0.9, 0.55, 1.0, 0.45, 0.85, 0.65, 0.4, 0.8].map(
                (h, idx) => (
                  <motion.span
                    key={idx}
                    animate={{
                      scaleY: [0.4, 1, 0.5],
                      opacity: [0.6, 1, 0.6],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: idx * 0.08,
                    }}
                    className="w-1.5 bg-amber-400 rounded-full origin-bottom"
                    style={{ height: `${Math.round(h * 28)}px` }}
                  />
                )
              )}
            </div>
            <span className="font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {t.synthesizing}
            </span>
          </div>
        ) : take ? (
          <canvas
            ref={canvasRef}
            onClick={handleCanvasSeek}
            className="w-full h-full cursor-pointer block"
          />
        ) : (
          <div className="text-xs text-slate-400 text-center px-4">
            {t.emptyHint}
          </div>
        )}
      </div>

      {/* Interactive Transport Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={togglePlay}
            disabled={!take || isSynthesizing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>{t.pause}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{t.play}</span>
              </>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.06, rotate: -15 }}
            whileTap={{ scale: 0.94 }}
            type="button"
            onClick={handleRestart}
            disabled={!take || isSynthesizing}
            title={t.restart}
            className="p-2 rounded-lg border border-slate-800 bg-[#0B0F17] text-slate-300 hover:text-amber-400 hover:border-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            type="button"
            onClick={() => setIsLooping((prev) => !prev)}
            disabled={!take || isSynthesizing}
            title={t.loop}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isLooping
                ? "border-amber-500/70 bg-amber-500/15 text-amber-400"
                : "border-slate-800 bg-[#0B0F17] text-slate-400 hover:text-slate-200 hover:border-slate-700"
            } disabled:opacity-40 disabled:pointer-events-none`}
          >
            <Repeat className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            disabled={!take || isSynthesizing}
            title={t.mute}
            className="p-2 rounded-lg border border-slate-800 bg-[#0B0F17] text-slate-400 hover:text-slate-200 hover:border-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </motion.button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Speed Selector */}
          <div
            dir="ltr"
            className="flex items-center gap-1 bg-[#0B0F17] p-1 rounded-lg border border-slate-800"
          >
            {[0.85, 1.0, 1.15, 1.25].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setPlaybackRate(rate)}
                className={`px-2 py-1 text-xs font-mono-tabular rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  playbackRate === rate
                    ? "bg-slate-800 text-amber-400 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {rate.toFixed(2).replace(/\.00$/, ".0")}x
              </button>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={handleDownloadWav}
            disabled={!take || isSynthesizing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-700 bg-[#0B0F17] text-slate-200 hover:bg-slate-800 hover:border-slate-600 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>{t.download}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};
