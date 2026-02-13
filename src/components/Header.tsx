'use client';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 z-50 px-5 py-4 flex items-center gap-3 select-none">
      <span className="text-sm font-semibold tracking-wider text-white">
        21BRAIN
      </span>
      <span className="text-[10px] font-light tracking-[0.2em] text-white/25">
        [SYSTEM STATUS:{' '}
        <span className="text-green-400/80">ONLINE</span>]
      </span>
    </header>
  );
}
