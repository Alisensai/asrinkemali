"use client";

import { useRef, useState } from "react";

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const close = () => setOpen(false);
  return <><button type="button" onClick={() => { setOpen(true); queueMicrotask(() => input.current?.focus()); }}>Arşivde ara</button>{open && <div role="dialog" aria-modal="true" aria-label="Arşivde ara"><button type="button" onClick={close}>Kapat</button><label>Arama terimi<input ref={input} type="search" name="archive-query" /></label><p>Arama endeksi bir sonraki aşamada eklenecek.</p></div>}</>;
}
