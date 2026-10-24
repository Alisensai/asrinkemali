import React from "react";
import styles from "@/app/publishing.module.css";
import type { PublicationRecord } from "../../../schemas/publication-record.types";

export interface SourceCitationProps {
  source: PublicationRecord["bibliography"][number];
}

export function SourceCitation({ source }: SourceCitationProps) {
  const isHttps = source.url && source.url.startsWith("https://");

  return (
    <li>
      {isHttps ? (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer external"
          className={styles.citationLink}
        >
          {source.title}
        </a>
      ) : (
        <span className={styles.citationTitle}>{source.title}</span>
      )}
      <span>
        {source.institution}
        {source.accessedAt && ` · Erişim: ${source.accessedAt}`}
      </span>
    </li>
  );
}
