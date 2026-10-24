import React from "react";
import styles from "./design-system.module.css";

export type BadgeVariant =
  | "published"
  | "reviewed"
  | "unverified"
  | "ai"
  | "category"
  | "neutral"
  | "type";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

/**
 * Standard honest status badge.
 * IMPORTANT: Technical status (such as published) is never misrepresented as human historian approval.
 */
export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  children,
  className = "",
  ...props
}) => {
  const variantClass =
    variant === "published"
      ? styles.badgePublished
      : variant === "reviewed"
      ? styles.badgeReviewed
      : variant === "unverified"
      ? styles.badgeUnverified
      : variant === "ai"
      ? styles.badgeAi
      : variant === "type"
      ? styles.badgeType
      : styles.badgeNeutral;

  return (
    <span className={`${styles.badge} ${variantClass} ${className}`.trim()} {...props}>
      {children}
    </span>
  );
};

/**
 * Utility helper returning the honest editorial verification label for archive items.
 */
export function getArchivalVerificationBadge(status: string): { variant: BadgeVariant; text: string } {
  switch (status) {
    case "published":
      return { variant: "published", text: "Kaynak denetimli · uzman onayı bekliyor" };
    case "reviewed":
      return { variant: "reviewed", text: "Teknik inceleme yapıldı" };
    case "draft":
      return { variant: "unverified", text: "Taslak · doğrulanmadı" };
    case "unverified":
    case "claim_unverified":
      return { variant: "unverified", text: "Doğrulanmamış bildirim" };
    case "ai_representative":
      return { variant: "ai", text: "Temsili canlandırma (AI)" };
    default:
      return { variant: "neutral", text: status };
  }
}
