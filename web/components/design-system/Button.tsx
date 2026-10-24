import React from "react";
import Link from "next/link";
import styles from "./design-system.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  href?: string;
  external?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      fullWidth = false,
      isLoading = false,
      disabled = false,
      type = "button",
      className = "",
      href,
      external = false,
      icon,
      ...props
    },
    ref
  ) => {
    const variantClass =
      variant === "primary"
        ? styles.buttonPrimary
        : variant === "secondary"
        ? styles.buttonSecondary
        : variant === "ghost"
        ? styles.buttonGhost
        : styles.buttonOutline;

    const sizeClass =
      size === "sm" ? styles.buttonSm : size === "lg" ? styles.buttonLg : styles.buttonMd;

    const fullWidthClass = fullWidth ? styles.buttonFullWidth : "";
    const combinedClassName = `${styles.button} ${variantClass} ${sizeClass} ${fullWidthClass} ${className}`.trim();

    const content = (
      <>
        {isLoading && <span className={styles.spinner} aria-hidden="true" />}
        {!isLoading && icon && <span aria-hidden="true">{icon}</span>}
        <span>{children}</span>
      </>
    );

    if (href && !disabled) {
      if (external || href.startsWith("http")) {
        return (
          <a
            ref={ref as React.Ref<HTMLAnchorElement>}
            href={href}
            className={combinedClassName}
            target="_blank"
            rel="noopener noreferrer"
            {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
          >
            {content}
          </a>
        );
      }
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={combinedClassName}
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        className={combinedClassName}
        disabled={disabled || isLoading}
        aria-busy={isLoading ? "true" : undefined}
        aria-disabled={disabled || isLoading ? "true" : undefined}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";
