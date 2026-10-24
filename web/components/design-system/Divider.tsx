import React from "react";
import styles from "./design-system.module.css";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  ornamental?: boolean;
}

export const Divider: React.FC<DividerProps> = ({ ornamental = false, className = "", ...props }) => {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={`${styles.divider} ${className}`.trim()}
      {...props}
    >
      <div className={styles.dividerLine} />
      {ornamental && <div className={styles.dividerOrnament} aria-hidden="true">✦</div>}
      <div className={styles.dividerLine} />
    </div>
  );
};
