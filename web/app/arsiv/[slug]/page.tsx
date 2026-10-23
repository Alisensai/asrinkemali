import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/ContentPage";
import { archiveRecords } from "@/lib/site-data";

export function generateStaticParams() { return archiveRecords.filter((record) => record.verificationStatus === "doğrulandı").map((record) => ({ slug: record.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const { slug } = await params; const record = archiveRecords.find((item) => item.slug === slug && item.verificationStatus === "doğrulandı"); return record ? { title: record.title, description: record.description, alternates: { canonical: `/arsiv/${record.slug}` } } : { title: "Kayıt bulunamadı", robots: { index: false, follow: false } }; }
export default async function ArchiveDetailPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const record = archiveRecords.find((item) => item.slug === slug && item.verificationStatus === "doğrulandı"); if (!record) notFound(); return <ContentPage eyebrow={record.type.toLocaleUpperCase("tr-TR")} title={record.title}><article className="record-detail"><p>{record.description}</p><dl><dt>Tarih</dt><dd>{record.date}</dd><dt>Kaynak</dt><dd>{record.source}</dd><dt>Lisans</dt><dd>{record.license}</dd></dl></article></ContentPage>; }
