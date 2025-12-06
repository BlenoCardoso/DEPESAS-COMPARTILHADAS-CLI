import { useMemo } from "react";

const OrbitGlyph = () => (
  <svg
    width="72"
    height="72"
    viewBox="0 0 72 72"
    role="img"
    aria-hidden="true"
    className="drop-shadow-xl"
  >
    <defs>
      <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7C5DFA" />
        <stop offset="50%" stopColor="#FF8F70" />
        <stop offset="100%" stopColor="#42C5C0" />
      </linearGradient>
    </defs>
    <rect
      x="6"
      y="10"
      width="60"
      height="44"
      rx="14"
      fill="url(#orbitGradient)"
      opacity="0.25"
    />
    <path
      d="M20 39C20 29.0589 28.0589 21 38 21C47.9411 21 56 29.0589 56 39"
      stroke="url(#orbitGradient)"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M28 39C28 33.4772 32.4772 29 38 29C43.5228 29 48 33.4772 48 39"
      stroke="url(#orbitGradient)"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <circle cx="38" cy="43" r="4" fill="#ffffff" />
  </svg>
);

export default function SplashScreen() {
  const bootMessage = useMemo(() => {
    const messages = [
      "Sincronizando suas despesas",
      "Preparando sugestões inteligentes",
      "Carregando grupos compartilhados",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-[radial-gradient(circle_at_top,_rgba(124,93,250,0.18),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(66,197,192,0.18),_transparent_55%),_var(--background)] text-foreground">
      <div className="page-transition flex flex-col items-center gap-6 px-8 text-center">
        <div className="relative flex items-center justify-center rounded-[32px] bg-card/80 p-6 shadow-2xl backdrop-blur-xl">
          <OrbitGlyph />
          <div className="absolute -right-2 -top-2 h-8 w-8 rounded-full border border-white/40 bg-white/70 text-lg font-semibold text-primary shadow-lg">
            +
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-gradient text-3xl font-semibold tracking-tight">Compartilha</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Controle coletivo com cara de aplicativo nativo.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground/90">
          <span className="h-2 w-2 rounded-full bg-primary/80 animate-ping" aria-hidden="true" />
          {bootMessage}
        </div>
      </div>
    </div>
  );
}
