"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { HeroSlide } from "@/lib/site-types";
import { Icon } from "./Icon";

export function Hero({ slides }: { slides: HeroSlide[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  if (!slides || slides.length === 0) return null;
  const slide = slides[currentIndex] || slides[0];
  const select = (index: number) => setCurrentIndex((index + slides.length) % slides.length);

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Asrın Kemali tanıtım alanı"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") select(currentIndex - 1);
        if (event.key === "ArrowRight") select(currentIndex + 1);
      }}
    >
      <div className="hero-art" style={{ pointerEvents: "none" }}>
        <Image
          className="hero-art-image"
          src={slide.image.src}
          alt={slide.image.alt || "Mustafa Kemal Atatürk temsili görseli"}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 64vw"
        />
      </div>
      <div className="hero-vignette" style={{ pointerEvents: "none" }} />
      <div className="container hero-inner">
        <div className="hero-copy" aria-live="polite">
          <span className="eyebrow">{slide.eyebrow}</span>
          <h1>
            <span className="hero-pretitle">{slide.pretitle}</span>
            <strong className="hero-title">{slide.title}</strong>
          </h1>
          <p className="hero-description">{slide.summary}</p>

          <div className="hero-actions">
            <Link href={slide.primaryAction.href} className="button button-red">
              <Icon name="document" size={16} />
              <span>{slide.primaryAction.label.toLocaleUpperCase("tr-TR")}</span>
              <span className="btn-arrow" aria-hidden="true">→</span>
            </Link>
            <Link href={slide.secondaryAction.href} className="button button-outline">
              <span>{slide.secondaryAction.label.toLocaleUpperCase("tr-TR")}</span>
              <span className="btn-arrow" aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="hero-pagination" aria-label="Tanıtım slaytları">
            <span className="current-slide">{String(currentIndex + 1).padStart(2, "0")}</span>
            <span className="pagination-line" />
            <div className="slide-dots">
              {slides.map((item, index) => {
                const number = String(index + 1).padStart(2, "0");
                return (
                  <button
                    key={item.id}
                    className={`slide-dot${index === currentIndex ? " selected" : ""}`}
                    type="button"
                    aria-label={`${number} — ${index + 1}. tanıtımı göster`}
                    aria-current={index === currentIndex ? "true" : undefined}
                    onClick={() => select(index)}
                  >
                    {number}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="hero-quote-side" aria-label="Yayın ilkesi">
          <p className="hero-quote-p">İçerikler, kaynak ve kullanım hakkı denetiminden sonra yayımlanır.</p>
          <span className="hero-quote-author">ASRIN KEMALİ YAYIN İLKESİ</span>
          <span className="hero-monogram" aria-hidden="true">MKA</span>
        </aside>
      </div>

      <button
        className="hero-arrow hero-prev"
        type="button"
        aria-label="Önceki tanıtım"
        onClick={() => select(currentIndex - 1)}
      >
        <Icon name="arrow-left" />
      </button>
      <button
        className="hero-arrow hero-next"
        type="button"
        aria-label="Sonraki tanıtım"
        onClick={() => select(currentIndex + 1)}
      >
        <Icon name="arrow-right" />
      </button>
      <span className="hero-art-disclosure">Kapak görseli: Yapay zekâ ile hazırlanmış temsili canlandırma.</span>
    </section>
  );
}
