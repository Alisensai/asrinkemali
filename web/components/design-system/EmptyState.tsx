import React from "react";
import { Icon, type IconName } from "@/components/Icon";
import { Button } from "./Button";
import styles from "./design-system.module.css";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: IconName;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * EmptyState: Honest empty state for unpopulated collections or search results.
 * Avoids inventing synthetic records and provides clear recovery actions.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = "document",
  actionLabel,
  actionHref,
  onAction,
  className = "",
}) => {
  return (
    <div className={`${styles.emptyState} ${className}`.trim()} role="status" aria-live="polite">
      <div className={styles.emptyStateIcon} aria-hidden="true">
        <Icon name={icon} size={32} />
      </div>

      <h3 className={styles.emptyStateTitle}>{title}</h3>
      <p className={styles.emptyStateDescription}>{description}</p>

      {(actionLabel && (actionHref || onAction)) && (
        <div className={styles.emptyStateActions}>
          {actionHref ? (
            <Button variant="secondary" size="md" href={actionHref} aria-label={actionLabel}>
              {actionLabel}
            </Button>
          ) : (
            <Button variant="secondary" size="md" onClick={onAction} aria-label={actionLabel}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
