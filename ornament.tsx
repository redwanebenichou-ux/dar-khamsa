// زخرفة جزائرية خفيفة (SVG) — فاصل زخرفي بسيط

export function Ornament({ className = "text-gold" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 12" className={`h-3 w-28 ${className}`} fill="currentColor" aria-hidden="true">
      <path d="M0 6 L12 0 L24 6 L12 12 Z" />
      <path d="M30 6 L42 0 L54 6 L42 12 Z" opacity=".7" />
      <path d="M60 6 L72 0 L84 6 L72 12 Z" />
      <path d="M90 6 L102 0 L114 6 L102 12 Z" opacity=".7" />
      <circle cx="27" cy="6" r="1.6" />
      <circle cx="87" cy="6" r="1.6" />
      <circle cx="117" cy="6" r="1.6" />
    </svg>
  );
}

export function SectionTitle({ title, sub, dark }: { title: string; sub?: string; dark?: boolean }) {
  return (
    <div className="text-center mb-8 md:mb-12 px-4">
      <Ornament className={dark ? "text-lightgold mx-auto" : "text-gold mx-auto"} />
      <h2 className={`mt-3 text-2xl md:text-4xl font-black ${dark ? "text-cream" : "text-brown"}`}>{title}</h2>
      {sub && <p className={`mt-2 text-sm md:text-base ${dark ? "text-cream/60" : "text-brown/55"}`}>{sub}</p>}
    </div>
  );
}
