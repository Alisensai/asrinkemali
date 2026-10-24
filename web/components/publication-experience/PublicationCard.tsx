import React from "react";
import Link from "next/link";
import styles from "@/app/publishing.module.css";
import { publicationKindLabel } from "@/lib/publishing/model";
import type { PublicationRecord } from "../../../schemas/publication-record.types";

export interface PublicationCardProps {
  publication: PublicationRecord;
}

export function PublicationCard({ publication }: PublicationCardProps) {
  const publishedDate = publication.publishedAt
    ? new Date(publication.publishedAt).toLocaleDateString("tr-TR")
    : "";

  return (
    <li>
      <Link href={`/yayinlar/${publication.slug}`} className={styles.card}>
        <span>
          {publicationKindLabel(publication.kind)} · {publication.category}
        </span>
        <h2>{publication.title}</h2>
        <p>{publication.summary}</p>
        <small>
          {publication.authors.join(", ")}
          {publishedDate && ` · ${publishedDate}`}
        </small>
      </Link>
    </li>
  );
}
