import React from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { isSafeHref, safeHref } from "@/lib/security/safe-url";
import styles from "./design-system.module.css";

export interface TextLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  quiet?: boolean;
  showExternalIcon?: boolean;
}

/**
 * Güvenli bağlantı kontrolü FORTRESS `lib/security/safe-url.ts` izin listesine devredilir.
 * Önceki şema yasak listesi, şema içine sekme/satır sonu veya başa kontrol karakteri
 * eklenerek atlatılabiliyordu; tarayıcılar bu karakterleri yok sayar.
 */
export function isSafeUrl(url: string): boolean {
  return isSafeHref(url);
}

export const TextLink = React.forwardRef<HTMLAnchorElement, TextLinkProps>(
  ({ children, href, quiet = false, showExternalIcon = true, className = "", ...props }, ref) => {
    const linkClass = `${styles.textLink} ${quiet ? styles.textLinkQuiet : ""} ${className}`.trim();
    const cleanHref = safeHref(href);

    // Güvensiz adres işlevsiz "#" bağlantısına dönüştürülmez; düz metin olarak gösterilir.
    if (cleanHref === null) {
      return (
        <span className={linkClass} data-unsafe-href="true">
          {children}
        </span>
      );
    }

    const isExternal = cleanHref.startsWith("http://") || cleanHref.startsWith("https://");

    if (isExternal) {
      return (
        <a
          ref={ref}
          href={cleanHref}
          className={linkClass}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          <span>{children}</span>
          {showExternalIcon && <Icon name="external" size={13} />}
        </a>
      );
    }

    return (
      <Link ref={ref} href={cleanHref} className={linkClass} {...props}>
        <span>{children}</span>
      </Link>
    );
  }
);

TextLink.displayName = "TextLink";
