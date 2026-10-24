import React from "react";
import { Icon } from "@/components/Icon";
import styles from "./design-system.module.css";

export type StatusNoteVariant = "info" | "warning" | "provenance" | "ai";

export interface StatusNoteProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: StatusNoteVariant;
  title?: string;
  children: React.ReactNode;
}

export const StatusNote: React.FC<StatusNoteProps> = ({
  variant = "info",
  title,
  children,
  className = "",
  ...props
}) => {
  const variantClass =
    variant === "warning"
      ? styles.statusNoteWarning
      : variant === "provenance"
      ? styles.statusNoteProvenance
      : variant === "ai"
      ? styles.statusNoteAi
      : styles.statusNoteInfo;

  const defaultIcon =
    variant === "warning" ? (
      <Icon name="contrast" size={18} />
    ) : variant === "ai" ? (
      <Icon name="image" size={18} />
    ) : variant === "provenance" ? (
      <Icon name="document" size={18} />
    ) : (
      <Icon name="document" size={18} />
    );

  return (
    <div
      role="note"
      className={`${styles.statusNote} ${variantClass} ${className}`.trim()}
      {...props}
    >
      <div className={styles.statusNoteIcon} aria-hidden="true">
        {defaultIcon}
      </div>
      <div className={styles.statusNoteBody}>
        {title && <div className={styles.statusNoteTitle}>{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
};
