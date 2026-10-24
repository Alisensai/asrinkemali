import React from "react";
import styles from "./design-system.module.css";

export interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  helpText?: string;
  errorText?: string;
  children?: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  required = false,
  helpText,
  errorText,
  children,
  className = "",
}) => {
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = errorText ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`${styles.formField} ${className}`.trim()}>
      <label htmlFor={id} className={styles.label}>
        <span>{label}</span>
        {required && (
          <span className={styles.requiredAsterisk} aria-hidden="true">
            *
          </span>
        )}
      </label>

      {/* Render children or inject aria props if single valid React element */}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
            id,
            "aria-describedby": describedBy,
            "aria-invalid": Boolean(errorText) ? "true" : undefined,
            "aria-required": required ? "true" : undefined,
          })
        : children}

      {helpText && (
        <span id={helpId} className={styles.helpText}>
          {helpText}
        </span>
      )}

      {errorText && (
        <span id={errorId} className={styles.errorText} role="alert">
          {errorText}
        </span>
      )}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ hasError = false, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`${styles.input} ${hasError ? styles.inputError : ""} ${className}`.trim()}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ hasError = false, className = "", children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`${styles.select} ${hasError ? styles.selectError : ""} ${className}`.trim()}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";
