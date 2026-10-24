import type { Metadata } from 'next';
import { AnyCoderAuditView } from '@/components/exhibitions/experiment';

export const metadata: Metadata = {
  title: 'AnyCoder Sergi Prototipi Denetim Merkezi | Asrın Kemali',
  description: 'AnyCoder dijital sergi prototipi denetim matrisi, kaynak yokluğu tespiti ve seçici aktarım kararları.',
  robots: {
    index: false,
    follow: false
  }
};

export default function AnyCoderAuditPage(): React.JSX.Element {
  return (
    <main style={{ minHeight: '80vh', backgroundColor: 'var(--black, #080606)' }}>
      <AnyCoderAuditView />
    </main>
  );
}
