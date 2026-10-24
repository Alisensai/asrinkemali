import React from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import styles from "./design-system.module.css";

export interface TextLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  quiet?: boolean;
  showExternalIcon?: boolean;
}

export function isSafeUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  // Block dangerous schemes
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:") || trimmed.startsWith("vbscript:")) {
    return false;
  }
  return true;
}

export const TextLink = React.forwardRef<HTMLAnchorElement, TextLinkProps>(
  ({ children, href, quiet = false, showExternalIcon = true, className = "", ...props }, ref) => {
    const isSafe = isSafeUrl(href);
    const safeHref = isSafe ? href : "#";

    const isExternal =
      safeHref.startsWith("http://") ||
      safeHref.startsWith("https://") ||
      safeHref.startsWith("//");

    const linkClass = `${styles.textLink} ${quiet ? styles.textLinkQuiet : ""} ${className}`.trim();

    if (isExternal) {
      return (
        <a
          ref={ref}
          href={safeHref}
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
      <Link ref={ref} href={safeHref} className={linkClass} {...props}>
        <span>{children}</span>
      </Link>
    );
  }
);

TextLink.displayName = "TextLink";
