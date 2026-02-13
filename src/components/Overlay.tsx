'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  scrollProgress: number;
}

/* ─────────────────────────────────────────────
   File-type icon SVGs (inline for zero deps)
   ───────────────────────────────────────────── */
const FileIcon = ({ ext, color }: { ext: string; color: string }) => (
  <div className="flex flex-col items-center gap-2 group">
    <div
      className="w-14 h-16 sm:w-16 sm:h-20 rounded-lg border border-black/10 flex flex-col items-center justify-center
        bg-black/[0.02] group-hover:border-[#002bff]/40 group-hover:bg-[#002bff]/[0.06] transition-all duration-500"
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-70 group-hover:opacity-100 transition-opacity"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    </div>
    <span
      className="text-[10px] sm:text-xs font-light tracking-widest uppercase"
      style={{ color }}
    >
      .{ext}
    </span>
  </div>
);

const FILE_TYPES = [
  { ext: 'pdf', color: '#ff4444' },
  { ext: 'csv', color: '#00d95a' },
  { ext: 'jpg', color: '#ff9900' },
  { ext: 'mp4', color: '#aa44ff' },
  { ext: 'xlsx', color: '#00bb77' },
  { ext: 'docx', color: '#4488ff' },
  { ext: 'json', color: '#ffcc00' },
  { ext: 'sql', color: '#002bff' },
];

/* ─────────────────────────────────────────────
   LLM Chat simulation
   ───────────────────────────────────────────── */
const CHAT_MESSAGES = [
  {
    role: 'user' as const,
    text: 'Quel est le chiffre d\'affaires du dernier trimestre ?',
  },
  {
    role: 'assistant' as const,
    text: 'Le CA du Q4 2025 s\'élève à 2.4M CHF, en hausse de 12% par rapport au Q3.',
  },
  {
    role: 'user' as const,
    text: 'Quels produits ont le taux de retour le plus élevé ?',
  },
  {
    role: 'assistant' as const,
    text: 'Les références SKU-4821 et SKU-7733 présentent un taux de retour de 8.2%, principalement lié à un défaut d\'emballage identifié en semaine 48.',
  },
  {
    role: 'user' as const,
    text: 'Prévisions de stock pour mars 2026 ?',
  },
  {
    role: 'assistant' as const,
    text: 'Basé sur la vélocité actuelle, rupture probable sur 3 références critiques d\'ici le 15 mars. Recommandation : commande anticipée de 1200 unités.',
  },
];

function ChatSimulation({ visible }: { visible: number }) {
  const [displayedMessages, setDisplayedMessages] = useState<number>(0);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible < 0.3) {
      setDisplayedMessages(0);
      setTypingText('');
      setIsTyping(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    if (displayedMessages >= CHAT_MESSAGES.length) return;

    const currentMsg = CHAT_MESSAGES[displayedMessages];

    if (currentMsg.role === 'user') {
      // User messages appear instantly after a short delay
      timeoutRef.current = setTimeout(() => {
        setDisplayedMessages((d) => d + 1);
      }, 800);
    } else {
      // Assistant messages are "typed" char by char
      setIsTyping(true);
      let charIdx = 0;
      intervalRef.current = setInterval(() => {
        charIdx++;
        setTypingText(currentMsg.text.slice(0, charIdx));
        if (charIdx >= currentMsg.text.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsTyping(false);
          timeoutRef.current = setTimeout(() => {
            setTypingText('');
            setDisplayedMessages((d) => d + 1);
          }, 1200);
        }
      }, 18);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [visible, displayedMessages]);

  const shown = CHAT_MESSAGES.slice(0, displayedMessages);

  return (
    <div className="w-full max-w-md sm:max-w-lg mx-auto">
      {/* Terminal header */}
      <div className="flex items-center gap-2 mb-4 px-1">
        <div className="w-2 h-2 rounded-full bg-[#002bff]/60" />
        <span className="text-[10px] text-black/25 font-light tracking-[0.2em] uppercase">
          21brain Terminal
        </span>
      </div>

      <div
        className="border border-black/[0.08] rounded-xl bg-black/[0.02] backdrop-blur-sm p-4 sm:p-6 space-y-4
          max-h-[300px] sm:max-h-[340px] overflow-hidden"
      >
        {shown.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-xl text-xs sm:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#002bff]/10 text-black/70 font-light rounded-br-sm'
                  : 'bg-black/[0.04] text-black/50 font-light rounded-bl-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Currently typing assistant message */}
        {isTyping && typingText && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-4 py-2.5 rounded-xl rounded-bl-sm bg-black/[0.04] text-black/50 text-xs sm:text-sm font-light leading-relaxed">
              {typingText}
              <span className="inline-block w-[2px] h-3 bg-[#002bff] ml-0.5 animate-pulse" />
            </div>
          </div>
        )}

        {/* Typing indicator dots */}
        {visible > 0.3 &&
          displayedMessages < CHAT_MESSAGES.length &&
          !isTyping && (
            <div className="flex justify-start">
              <div className="px-4 py-2.5 rounded-xl bg-black/[0.04] flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-black/20 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-black/20 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-black/20 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Security shield SVG
   ───────────────────────────────────────────── */
const ShieldIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#002bff"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="opacity-60"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

/* ─────────────────────────────────────────────
   Main Overlay
   ───────────────────────────────────────────── */
export default function Overlay({ scrollProgress: sp }: Props) {
  const [flashing, setFlashing] = useState(false);

  const handleCTA = () => {
    setFlashing(true);
    setTimeout(() => {
      window.location.href = 'https://demo.21datas.ch';
    }, 800);
  };

  /* ── Visibility helpers ───────────────────── */
  const fadeRange = (center: number, halfHold: number, fadeW: number) => {
    const fadeStart = center - halfHold - fadeW;
    const fadeEnd = center + halfHold + fadeW;
    if (sp < fadeStart || sp > fadeEnd) return 0;
    if (sp < center - halfHold) return (sp - fadeStart) / fadeW;
    if (sp <= center + halfHold) return 1;
    return (fadeEnd - sp) / fadeW;
  };

  // Hero: fully visible at start, fades out
  const heroOp = sp < 0.06 ? 1 : Math.max(0, 1 - (sp - 0.06) / 0.08);
  // Section 2 – File types: centered ~20%
  const filesOp = fadeRange(0.20, 0.06, 0.06);
  // Section 3 – Security: centered ~40%
  const securityOp = fadeRange(0.40, 0.06, 0.06);
  // Section 4 – LLM Chat: centered ~60%
  const chatOp = fadeRange(0.58, 0.06, 0.06);
  // CTA: fades in at 75% and stays visible through end
  const ctaOp = sp > 0.74 ? Math.min(1, (sp - 0.74) / 0.08) : 0;

  return (
    <>
      {/* Flash-to-white overlay for CTA redirect */}
      {flashing && (
        <div className="fixed inset-0 z-[100] bg-black animate-flash" />
      )}

      <div className="fixed inset-0 z-10 pointer-events-none">
        {/* ── Section 1 : Hero ─────────────────── */}
        <section
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 sm:px-12"
          style={{ opacity: heroOp }}
        >
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold text-black tracking-tighter mb-8 leading-none">
            21BRAIN
          </h1>
          <p className="text-sm sm:text-lg md:text-xl text-black/45 font-light max-w-lg leading-relaxed">
            L&apos;architecture neuronale de vos données.
          </p>

          {/* Scroll indicator */}
          <div className="absolute bottom-14 flex flex-col items-center gap-2">
            <span className="text-[10px] text-black/20 font-light tracking-[0.3em] uppercase">
              Scroll
            </span>
            <div className="w-px h-12 bg-gradient-to-b from-black/30 to-transparent animate-pulse-line" />
          </div>
        </section>

        {/* ── Section 2 : File Types / Le modèle apprend ── */}
        <section
          className="absolute inset-0 flex items-center justify-center px-8 sm:px-16 md:px-24"
          style={{
            opacity: filesOp,
            transform: `translateY(${(1 - filesOp) * 30}px)`,
          }}
        >
          <div className="max-w-2xl w-full">
            <p className="text-[10px] sm:text-xs text-[#002bff] font-light tracking-[0.3em] mb-5 uppercase text-center">
              Ingestion Multi-Format
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-semibold text-black mb-10 tracking-tight leading-tight text-center">
              LE MODÈLE APPREND<br />DE VOS DONNÉES
            </h2>

            {/* File type grid */}
            <div className="flex flex-wrap justify-center gap-5 sm:gap-7">
              {FILE_TYPES.map((ft) => (
                <FileIcon key={ft.ext} ext={ft.ext} color={ft.color} />
              ))}
            </div>

            <p className="text-xs sm:text-sm text-black/30 font-light text-center mt-8 max-w-md mx-auto leading-relaxed">
              PDF, tableurs, images, vidéos, bases SQL — tous vos formats
              sont ingérés et vectorisés automatiquement.
            </p>
          </div>
        </section>

        {/* ── Section 3 : Sécurité ─────────────── */}
        <section
          className="absolute inset-0 flex items-center justify-end px-8 sm:px-16 md:px-24"
          style={{
            opacity: securityOp,
            transform: `translateX(${(1 - securityOp) * 40}px)`,
          }}
        >
          <div className="max-w-lg text-right">
            <p className="text-[10px] sm:text-xs text-[#002bff] font-light tracking-[0.3em] mb-5 uppercase">
              Infrastructure Sécurisée
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-semibold text-black mb-8 tracking-tight leading-tight">
              VOS DONNÉES<br />RESTENT LES VÔTRES
            </h2>

            <div className="space-y-5">
              {[
                {
                  title: 'Hébergement Suisse',
                  desc: 'Vos données sont traitées et stockées en Suisse, conformément aux normes de protection les plus strictes.',
                },
                {
                  title: 'Chiffrement de bout en bout',
                  desc: 'Chaque requête et chaque réponse transitent via des canaux chiffrés AES-256.',
                },
                {
                  title: 'Isolation complète',
                  desc: 'Aucun partage entre clients. Votre modèle est un environnement dédié et cloisonné.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 justify-end"
                >
                  <div className="text-right">
                    <p className="text-sm sm:text-base text-black/65 font-medium mb-1">
                      {item.title}
                    </p>
                    <p className="text-xs sm:text-sm text-black/35 font-light leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  <div className="flex-shrink-0 mt-0.5">
                    <ShieldIcon />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 4 : LLM Chat Simulation ──── */}
        <section
          className="absolute inset-0 flex flex-col items-center justify-center px-8 sm:px-16 md:px-24"
          style={{
            opacity: chatOp,
            transform: `translateY(${(1 - chatOp) * 25}px)`,
          }}
        >
          <p className="text-[10px] sm:text-xs text-[#002bff] font-light tracking-[0.3em] mb-5 uppercase text-center">
            Intelligence Conversationnelle
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-black mb-10 tracking-tight leading-tight text-center">
            INTERROGEZ VOS DONNÉES<br />EN LANGAGE NATUREL
          </h2>
          <ChatSimulation visible={chatOp} />
        </section>

        {/* ── Section 5 : CTA ──────────────────── */}
        <section
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 sm:px-12"
          style={{ opacity: ctaOp, pointerEvents: ctaOp > 0.2 ? 'auto' : 'none' }}
        >
          <h2 className="text-xl sm:text-2xl md:text-4xl font-semibold text-black mb-12 tracking-tight leading-snug">
            PRÊT À INTERROGER<br />VOS DONNÉES ?
          </h2>
          <a
            href="https://demo.21datas.ch"
            onClick={(e) => {
              e.preventDefault();
              handleCTA();
            }}
            className="relative group inline-flex items-center justify-center
              px-12 sm:px-16 py-5 sm:py-6
              text-sm sm:text-base tracking-[0.25em] font-semibold uppercase
              text-white bg-[#002bff] rounded-full
              shadow-[0_0_30px_rgba(0,43,255,0.3),0_0_0_1px_rgba(0,43,255,0.5)]
              hover:shadow-[0_0_80px_rgba(0,43,255,0.6),0_0_0_2px_rgba(0,43,255,0.9)]
              hover:scale-[1.05] hover:bg-[#0033ff]
              active:scale-[0.97]
              transition-all duration-500 cursor-pointer
              no-underline"
          >
            <span className="relative z-10">Initialiser la Démo</span>
            <div className="absolute inset-0 rounded-full bg-[#002bff] opacity-20 group-hover:opacity-40 blur-2xl transition-opacity duration-500" />
          </a>
          <p className="mt-8 text-[10px] sm:text-xs text-black/25 font-light tracking-wider">
            demo.21datas.ch
          </p>
        </section>
      </div>
    </>
  );
}
