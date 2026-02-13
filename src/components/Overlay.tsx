'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Props {
  scrollProgress: number;
}

/* ─────────────────────────────────────────────
   Pulsing node dot — a neuron in the UI layer
   ───────────────────────────────────────────── */
const Neuron = ({
  size = 6,
  delay = 0,
  className = '',
}: {
  size?: number;
  delay?: number;
  className?: string;
}) => (
  <span
    className={`inline-block rounded-full bg-[#002bff] ${className}`}
    style={{
      width: size,
      height: size,
      animation: `neuronBreathe 3s ease-in-out ${delay}s infinite`,
      boxShadow: `0 0 ${size * 2}px rgba(0,43,255,0.5), 0 0 ${size * 4}px rgba(0,43,255,0.15)`,
    }}
  />
);

/* ─────────────────────────────────────────────
   Fog — large soft white radial vignette behind
   content areas. Not a card: no edges, just an
   atmospheric dimming of the 3D scene.
   ───────────────────────────────────────────── */
const Fog = ({ size = 600, className = '' }: { size?: number; className?: string }) => (
  <div
    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none ${className}`}
    style={{
      width: size,
      height: size,
      background: 'radial-gradient(circle, rgba(250,250,250,0.92) 0%, rgba(250,250,250,0.75) 25%, rgba(250,250,250,0.4) 50%, rgba(250,250,250,0) 70%)',
      filter: 'blur(10px)',
    }}
  />
);

/* ─────────────────────────────────────────────
   Synapse — an animated SVG line between two
   points on the page, drawn like a neural
   connection
   ───────────────────────────────────────────── */
const Synapse = ({
  x1,
  y1,
  x2,
  y2,
  delay = 0,
  active = 1,
}: {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  delay?: number;
  active?: number;
}) => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    style={{ opacity: active * 0.35 }}
  >
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="#002bff"
      strokeWidth="1"
      strokeDasharray="4 6"
      style={{
        animation: `synapseFlow 2s linear ${delay}s infinite`,
      }}
    />
  </svg>
);

/* ─────────────────────────────────────────────
   File node — a single data format shown as a
   floating neuron-style element
   ───────────────────────────────────────────── */
const FileNode = ({
  ext,
  color,
  x,
  y,
  delay,
}: {
  ext: string;
  color: string;
  x: string;
  y: string;
  delay: number;
}) => (
  <div
    className="absolute flex flex-col items-center gap-1"
    style={{
      left: x,
      top: y,
      transform: 'translate(-50%, -50%)',
      animation: `nodeFloat 6s ease-in-out ${delay}s infinite`,
    }}
  >
    <div
      className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center"
      style={{
        background: `radial-gradient(circle, rgba(250,250,250,0.85) 0%, rgba(250,250,250,0.5) 50%, transparent 70%)`,
        border: `1.5px solid ${color}50`,
      }}
    >
      <span
        className="text-xs sm:text-sm font-bold tracking-wider uppercase"
        style={{ color, textShadow: '0 0 8px rgba(255,255,255,1)' }}
      >
        {ext}
      </span>
    </div>
  </div>
);

const FILE_NODES = [
  { ext: 'PDF', color: '#ff4444', x: '15%', y: '25%', delay: 0 },
  { ext: 'CSV', color: '#00d95a', x: '38%', y: '15%', delay: 0.4 },
  { ext: 'JPG', color: '#ff9900', x: '62%', y: '12%', delay: 0.8 },
  { ext: 'MP4', color: '#aa44ff', x: '85%', y: '22%', delay: 1.2 },
  { ext: 'XLSX', color: '#00bb77', x: '22%', y: '72%', delay: 0.3 },
  { ext: 'DOCX', color: '#4488ff', x: '45%', y: '80%', delay: 0.7 },
  { ext: 'JSON', color: '#ddaa00', x: '68%', y: '78%', delay: 1.1 },
  { ext: 'SQL', color: '#002bff', x: '82%', y: '68%', delay: 0.5 },
];

/* ─────────────────────────────────────────────
   Chat simulation — floating bubbles, no box
   ───────────────────────────────────────────── */
const CHAT_MESSAGES = [
  { role: 'user' as const, text: 'Quel est le chiffre d\'affaires du dernier trimestre ?' },
  { role: 'ai' as const, text: 'Le CA du Q4 2025 s\'élève à 2.4M CHF, en hausse de 12% par rapport au Q3.' },
  { role: 'user' as const, text: 'Quels produits ont le taux de retour le plus élevé ?' },
  { role: 'ai' as const, text: 'SKU-4821 et SKU-7733 : taux de retour de 8.2%, lié à un défaut d\'emballage identifié semaine 48.' },
  { role: 'user' as const, text: 'Prévisions de stock pour mars ?' },
  { role: 'ai' as const, text: 'Rupture probable sur 3 références d\'ici le 15 mars. Commande anticipée recommandée : 1200 unités.' },
];

function FloatingChat({ visible }: { visible: number }) {
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
    const msg = CHAT_MESSAGES[displayedMessages];
    if (msg.role === 'user') {
      timeoutRef.current = setTimeout(() => setDisplayedMessages((d) => d + 1), 800);
    } else {
      setIsTyping(true);
      let idx = 0;
      intervalRef.current = setInterval(() => {
        idx++;
        setTypingText(msg.text.slice(0, idx));
        if (idx >= msg.text.length) {
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
    <div className="flex flex-col gap-3 max-w-lg w-full">
      {shown.map((m, i) => (
        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className="flex items-start gap-2 max-w-[85%]">
            {m.role === 'ai' && <Neuron size={6} delay={i * 0.3} className="mt-2 flex-shrink-0" />}
            <p
              className={`text-xs sm:text-sm leading-relaxed ${
                m.role === 'user' ? 'text-black/80 font-normal' : 'text-black/70 font-light'
              }`}
              style={{
                textShadow: '0 0 30px rgba(250,250,250,1), 0 0 60px rgba(250,250,250,0.8)',
              }}
            >
              {m.text}
            </p>
            {m.role === 'user' && <Neuron size={5} delay={i * 0.3} className="mt-2 flex-shrink-0" />}
          </div>
        </div>
      ))}
      {isTyping && typingText && (
        <div className="flex justify-start">
          <div className="flex items-start gap-2 max-w-[85%]">
            <Neuron size={6} className="mt-2 flex-shrink-0" />
            <p
              className="text-xs sm:text-sm text-black/70 font-light leading-relaxed"
              style={{ textShadow: '0 0 30px rgba(250,250,250,1), 0 0 60px rgba(250,250,250,0.8)' }}
            >
              {typingText}
              <span className="inline-block w-[2px] h-3 bg-[#002bff] ml-0.5 animate-pulse" />
            </p>
          </div>
        </div>
      )}
      {visible > 0.3 && displayedMessages < CHAT_MESSAGES.length && !isTyping && (
        <div className="flex justify-start">
          <div className="flex items-center gap-1.5 ml-4">
            <Neuron size={3} delay={0} />
            <Neuron size={3} delay={0.15} />
            <Neuron size={3} delay={0.3} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Security items — floating with neuron markers
   ───────────────────────────────────────────── */
const SECURITY_ITEMS = [
  { title: 'Hébergement Suisse', desc: 'Données traitées et stockées en Suisse, normes de protection maximales.' },
  { title: 'Chiffrement AES-256', desc: 'Requêtes et réponses transitent via des canaux chiffrés de bout en bout.' },
  { title: 'Isolation complète', desc: 'Aucun partage entre clients. Environnement dédié et cloisonné.' },
];

/* ─────────────────────────────────────────────
   Main Overlay — no cards, no containers
   ───────────────────────────────────────────── */
export default function Overlay({ scrollProgress: sp }: Props) {
  const [flashing, setFlashing] = useState(false);

  const handleCTA = useCallback(() => {
    setFlashing(true);
    setTimeout(() => {
      window.location.href = 'https://demo.21datas.ch';
    }, 800);
  }, []);

  /* Visibility ranges */
  const fadeRange = (center: number, halfHold: number, fadeW: number) => {
    const fadeStart = center - halfHold - fadeW;
    const fadeEnd = center + halfHold + fadeW;
    if (sp < fadeStart || sp > fadeEnd) return 0;
    if (sp < center - halfHold) return (sp - fadeStart) / fadeW;
    if (sp <= center + halfHold) return 1;
    return (fadeEnd - sp) / fadeW;
  };

  const heroOp = sp < 0.06 ? 1 : Math.max(0, 1 - (sp - 0.06) / 0.08);
  const filesOp = fadeRange(0.17, 0.05, 0.05);
  const securityOp = fadeRange(0.33, 0.05, 0.05);
  const chatOp = fadeRange(0.48, 0.05, 0.05);
  const chartsOp = fadeRange(0.63, 0.05, 0.05);
  const ctaOp = sp > 0.78 ? Math.min(1, (sp - 0.78) / 0.08) : 0;

  /* Shared text shadow for readability over 3D */
  const ts = '0 0 30px rgba(250,250,250,1), 0 0 60px rgba(250,250,250,0.8), 0 0 90px rgba(250,250,250,0.4)';

  return (
    <>
      {flashing && <div className="fixed inset-0 z-[100] bg-[#002bff] animate-flash" />}

      {/* ── Nav button ──────────────────────── */}
      <div className="fixed top-6 right-6 sm:top-8 sm:right-8 z-20">
        <a
          href="https://demo.21datas.ch"
          className="inline-flex items-center gap-3 px-5 py-2.5
            text-xs tracking-[0.2em] font-medium uppercase
            text-[#002bff]
            hover:text-white hover:bg-[#002bff]
            active:scale-[0.97]
            transition-all duration-300 cursor-pointer no-underline
            pointer-events-auto"
          style={{
            background: 'rgba(250,250,250,0.4)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,43,255,0.12)',
          }}
        >
          <Neuron size={5} />
          Tester
        </a>
      </div>

      <div className="fixed inset-0 z-10 pointer-events-none">

        {/* ━━━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-8"
          style={{ opacity: heroOp }}
        >
          <div className="relative">
            <Fog size={800} />
            <h1
              className="relative text-6xl sm:text-7xl md:text-9xl font-bold tracking-tighter leading-none mb-6"
              style={{ color: '#0a0a0a', textShadow: ts }}
            >
              21BRAIN
            </h1>
            <p
              className="relative text-base sm:text-xl text-black/70 font-light max-w-md leading-relaxed mx-auto"
              style={{ textShadow: ts }}
            >
              Un LLM connecté à <span className="font-semibold text-[#002bff]">vos</span> données
            </p>
          </div>

          {/* Scroll — just a neuron with a pulsing trail */}
          <div className="absolute bottom-12 flex flex-col items-center gap-2">
            <div className="w-px h-16 bg-gradient-to-b from-[#002bff]/30 to-transparent animate-pulse-line" />
            <Neuron size={5} />
          </div>
        </section>

        {/* ━━━━ FILES — constellation of format nodes ━━ */}
        <section
          className="absolute inset-0 flex flex-col items-center justify-center px-8"
          style={{
            opacity: filesOp,
            transform: `scale(${0.92 + filesOp * 0.08})`,
          }}
        >
          <div className="relative">
            <Fog size={700} />
            <h2
              className="relative text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-center mb-4 leading-tight"
              style={{ color: '#0a0a0a', textShadow: ts }}
            >
              Le modèle apprend
            </h2>
            <p
              className="relative text-sm sm:text-base text-black/60 font-light text-center mb-2 max-w-sm mx-auto"
              style={{ textShadow: ts }}
            >
              de vos données, quel que soit le format
            </p>
          </div>

          {/* File nodes floating in a constellation */}
          <div className="relative w-full max-w-xl aspect-[16/9] mt-10">
            {/* Synapses connecting file nodes to center */}
            <Synapse x1="50%" y1="50%" x2="15%" y2="25%" delay={0} active={filesOp} />
            <Synapse x1="50%" y1="50%" x2="38%" y2="15%" delay={0.3} active={filesOp} />
            <Synapse x1="50%" y1="50%" x2="62%" y2="12%" delay={0.6} active={filesOp} />
            <Synapse x1="50%" y1="50%" x2="85%" y2="22%" delay={0.9} active={filesOp} />
            <Synapse x1="50%" y1="50%" x2="22%" y2="72%" delay={0.2} active={filesOp} />
            <Synapse x1="50%" y1="50%" x2="45%" y2="80%" delay={0.5} active={filesOp} />
            <Synapse x1="50%" y1="50%" x2="68%" y2="78%" delay={0.8} active={filesOp} />
            <Synapse x1="50%" y1="50%" x2="82%" y2="68%" delay={1.1} active={filesOp} />

            {/* Central hub neuron */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <Neuron size={12} />
            </div>

            {/* File format nodes */}
            {FILE_NODES.map((f) => (
              <FileNode key={f.ext} {...f} />
            ))}
          </div>
        </section>

        {/* ━━━━ SECURITY — floating list ━━━━━━━ */}
        <section
          className="absolute inset-0 flex items-center justify-end px-8 sm:px-16 md:px-28"
          style={{
            opacity: securityOp,
            transform: `translateX(${(1 - securityOp) * 50}px)`,
          }}
        >
          <div className="relative max-w-md">
            <Fog size={700} className="!left-[60%]" />
            <h2
              className="relative text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-right mb-10 leading-tight"
              style={{ color: '#0a0a0a', textShadow: ts }}
            >
              Vos données
              <br />
              restent les vôtres
            </h2>

            <div className="relative space-y-8">
              {SECURITY_ITEMS.map((item, i) => (
                <div key={item.title} className="flex items-start gap-4 justify-end">
                  <div className="text-right">
                    <p
                      className="text-sm sm:text-base text-black/90 font-semibold mb-1"
                      style={{ textShadow: ts }}
                    >
                      {item.title}
                    </p>
                    <p
                      className="text-xs sm:text-sm text-black/60 font-light leading-relaxed"
                      style={{ textShadow: ts }}
                    >
                      {item.desc}
                    </p>
                  </div>
                  <div className="flex-shrink-0 mt-1.5">
                    <Neuron size={8} delay={i * 0.6} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ━━━━ CHAT — floating conversation ━━━ */}
        <section
          className="absolute inset-0 flex flex-col items-center justify-center px-8 sm:px-16"
          style={{
            opacity: chatOp,
            transform: `translateY(${(1 - chatOp) * 25}px)`,
          }}
        >
          <div className="relative w-full max-w-lg flex flex-col items-center">
            <Fog size={750} />
            <h2
              className="relative text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-center mb-10 leading-tight"
              style={{ color: '#0a0a0a', textShadow: ts }}
            >
              Interrogez en
              <br />
              langage naturel
            </h2>
            <div className="relative w-full">
              <FloatingChat visible={chatOp} />
            </div>
          </div>
        </section>

        {/* ━━━━ CHARTS — floating bar chart ━━━━ */}
        <section
          className="absolute inset-0 flex flex-col items-center justify-center px-8 sm:px-16"
          style={{
            opacity: chartsOp,
            transform: `translateY(${(1 - chartsOp) * 25}px)`,
          }}
        >
          <div className="relative w-full max-w-md flex flex-col items-center">
            <Fog size={700} />
            <h2
              className="relative text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-center mb-10 leading-tight"
              style={{ color: '#0a0a0a', textShadow: ts }}
            >
              Réponses visuelles
              <br />
              en temps réel
            </h2>

          {/* Floating chart — no container, bars are neural pillars */}
          <div className="relative w-full">
            {/* Question bubble */}
            <div className="flex items-center gap-2 justify-end mb-6">
              <p
                className="text-xs sm:text-sm text-black/60 font-light"
                style={{ textShadow: ts }}
              >
                Montre-moi l&apos;évolution du CA par trimestre
              </p>
              <Neuron size={5} />
            </div>

            {/* Bars */}
            <div className="flex items-end gap-6 sm:gap-8 justify-center mb-3 px-4" style={{ height: 180 }}>
              {[
                { label: 'Q1', value: 58, amount: '1.4M' },
                { label: 'Q2', value: 72, amount: '1.7M' },
                { label: 'Q3', value: 85, amount: '2.1M' },
                { label: 'Q4', value: 100, amount: '2.4M' },
              ].map((bar, i) => {
                const barH = Math.round((bar.value / 100) * 160);
                return (
                  <div key={bar.label} className="flex flex-col items-center gap-2" style={{ width: 56 }}>
                    <span
                      className="text-[10px] sm:text-xs text-black/70 font-semibold"
                      style={{ textShadow: ts }}
                    >
                      {bar.amount}
                    </span>
                    {/* Bar — glowing neural pillar */}
                    <div className="relative" style={{ width: 32, height: barH }}>
                      <div
                        className="absolute inset-0 rounded-t-sm"
                        style={{
                          background: 'linear-gradient(to top, #002bff, rgba(0,43,255,0.25))',
                          boxShadow: '0 0 18px rgba(0,43,255,0.35), 0 0 40px rgba(0,43,255,0.12)',
                        }}
                      />
                      {/* Node at top of bar */}
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2">
                        <Neuron size={6} delay={i * 0.4} />
                      </div>
                    </div>
                    <span
                      className="text-[10px] sm:text-xs text-black/60 font-medium"
                      style={{ textShadow: ts }}
                    >
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* AI response — no box */}
            <div className="flex items-start gap-3 mt-4">
              <Neuron size={6} className="mt-1 flex-shrink-0" />
              <p
                className="text-xs sm:text-sm text-black/60 font-light leading-relaxed"
                style={{ textShadow: ts }}
              >
                Croissance continue de <span className="text-[#002bff] font-medium">+71%</span> sur l&apos;année.
                Accélération marquée au Q4 (<span className="text-[#002bff] font-medium">+14.3%</span>).
                Objectif <span className="text-[#002bff] font-medium">2.8M CHF</span> atteignable Q1 2026.
              </p>
            </div>
          </div>
          </div>
        </section>

        {/* ━━━━ CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-8"
          style={{ opacity: ctaOp, pointerEvents: ctaOp > 0.2 ? 'auto' : 'none' }}
        >
          <div className="relative flex flex-col items-center">
            <Fog size={700} />
            <h2
              className="relative text-2xl sm:text-3xl md:text-5xl font-semibold tracking-tight mb-12 leading-snug"
              style={{ color: '#0a0a0a', textShadow: ts }}
            >
            Prêt à interroger
            <br />
              <span className="text-[#002bff]">vos données ?</span>
            </h2>

          {/* CTA button — just text + neuron, minimal */}
          <a
            href="https://demo.21datas.ch"
            onClick={(e) => { e.preventDefault(); handleCTA(); }}
            className="group inline-flex items-center gap-3
              px-10 sm:px-14 py-5 sm:py-6
              text-sm sm:text-base tracking-[0.25em] font-semibold uppercase
              text-white bg-[#002bff]
              hover:scale-[1.03]
              active:scale-[0.97]
              transition-all duration-500 cursor-pointer no-underline"
            style={{
              boxShadow: '0 0 40px rgba(0,43,255,0.35), 0 0 80px rgba(0,43,255,0.15)',
            }}
          >
            Tester l&apos;outil
            <Neuron size={6} className="group-hover:scale-150 transition-transform" />
          </a>

              <p
              className="relative mt-8 text-[10px] sm:text-xs text-black/40 font-light tracking-wider"
              style={{ textShadow: ts }}
            >
              demo.21datas.ch
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
