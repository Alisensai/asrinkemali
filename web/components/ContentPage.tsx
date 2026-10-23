import type { ReactNode } from "react";

export function ContentPage({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <main id="icerik" className="inner-page"><header className="inner-page-hero"><div className="container"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div></header><div className="container inner-page-content">{children}</div></main>;
}
