import React from "react";
import styles from "./design-system.module.css";

export type SurfaceElevation = 0 | 1 | 2 | 3;

export interface SurfaceProps extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article" | "aside" | "header" | "footer";
  elevation?: SurfaceElevation;
  goldBorder?: boolean;
  withGlow?: boolean;
  children: React.ReactNode;
}

export const Surface: React.FC<SurfaceProps> = ({
  as: Component = "div",
  elevation = 1,
  goldBorder = false,
  withGlow = false,
  children,
  className = "",
  ...props
}) => {
  const elevationClass =
    elevation === 0
      ? styles.elevation0
      : elevation === 2
      ? styles.elevation2
      : elevation === 3
      ? styles.elevation3
      : styles.elevation1;

  const combinedClass = [
    styles.surface,
    elevationClass,
    goldBorder ? styles.goldBorder : "",
    withGlow ? styles.withGlow : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component className={combinedClass} {...props}>
      {children}
    </Component>
  );
};
