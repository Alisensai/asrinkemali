export type IconName = "calendar" | "contrast" | "search" | "museum" | "home" | "menu" | "document" | "image" | "book" | "map" | "arrow-left" | "arrow-right" | "speech" | "quote" | "check";

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true } as const;
  if (name === "home") return <svg {...common} fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>;
  if (name === "menu") return <svg {...common} fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>;
  if (name === "search") return <svg {...common} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-5.35-5.35" /></svg>;
  if (name === "calendar") return <svg {...common} fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M8 2v4M16 2v4M3 10h18" /></svg>;
  if (name === "contrast") return <svg {...common} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 3v18a9 9 0 0 0 0-18Z" fill="currentColor" /></svg>;
  if (name === "museum") return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 2l9 6H3l9-6Z" /></svg>;
  if (name === "document") return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></svg>;
  if (name === "image") return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>;
  if (name === "book") return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></svg>;
  if (name === "map") return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4Z" /><path d="M8 2v16M16 6v16" /></svg>;
  if (name === "speech") return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9h8M8 13h5" /></svg>;
  if (name === "quote") return <svg {...common} fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" /></svg>;
  if (name === "check") return <svg {...common} fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>;
  const points = name === "arrow-left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6";
  return <svg {...common} fill="none" stroke="currentColor" strokeWidth="2"><polyline points={points} /></svg>;
}
