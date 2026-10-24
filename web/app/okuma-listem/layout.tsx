import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Okuma Listem | Asrın Kemali',
  description: 'Tarihî arşiv belgeleri için hesap gerektirmeyen kişisel okuma listesi ve koleksiyon arayüzü.',
};

export default function OkumaListemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
