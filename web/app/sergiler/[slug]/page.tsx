import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getExhibitionBySlug, getExhibitions } from "@/lib/exhibitions/repository";
import { ExhibitionView } from "@/components/exhibitions/ExhibitionView";

interface ExhibitionSlugPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const list = getExhibitions({ includeStaging: true });
  return list.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: ExhibitionSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const exhibition = getExhibitionBySlug(slug);

  if (!exhibition) {
    return {
      title: "Sergi Bulunamadı",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${exhibition.title} | Dijital Sergi`,
    description: exhibition.summary,
    alternates: { canonical: `/sergiler/${slug}` },
    openGraph: {
      title: `${exhibition.title} | Asrın Kemali Dijital Müze`,
      description: exhibition.summary,
      images: [
        {
          url: exhibition.coverImage.src,
          alt: exhibition.coverImage.alt || exhibition.title,
        },
      ],
    },
  };
}

export default async function ExhibitionSlugPage({ params }: ExhibitionSlugPageProps) {
  const { slug } = await params;
  const exhibition = getExhibitionBySlug(slug);

  if (!exhibition) {
    notFound();
  }

  return (
    <main id="icerik">
      <ExhibitionView exhibition={exhibition} />
    </main>
  );
}
