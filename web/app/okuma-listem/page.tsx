import type { Metadata } from 'next';
import { getPublishedArchiveRecords } from '@/lib/archive';
import { toArchiveRecordRef } from '@/lib/reading-lists/archive-adapter';
import { OkumaListemClientView } from './OkumaListemClientView';

export const metadata: Metadata = {
  title: 'Okuma Listem & Kişisel Koleksiyonlar | Asrın Kemali',
  description:
    'Atatürk ve Cumhuriyet tarihi arşivinden seçtiğiniz belgeleri düzenleyin, notlar ekleyin ve kişisel koleksiyonlarınızı oluşturun. Verileriniz yalnızca tarayıcınızda saklanır.',
  alternates: {
    canonical: '/okuma-listem',
  },
};

export default function OkumaListemPage() {
  const publishedRecords = getPublishedArchiveRecords().map(toArchiveRecordRef);

  return (
    <main>
      <OkumaListemClientView publishedRecords={publishedRecords} />
    </main>
  );
}
