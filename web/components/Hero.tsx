import type { HeroSlide } from "@/lib/site-types";

export function Hero({ slide }: { slide: HeroSlide }) {
  return <section aria-labelledby="hero-title"><p>{slide.eyebrow}</p><h2 id="hero-title">{slide.title}</h2><p>{slide.summary}</p><a href={slide.primaryAction.href}>{slide.primaryAction.label}</a><a href={slide.secondaryAction.href}>{slide.secondaryAction.label}</a>{slide.image?.isIllustrative && <p>Görsel temsili/AI üretimidir.</p>}</section>;
}
