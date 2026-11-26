import React, { useCallback, useEffect, useState } from "react";
import { useLanguage } from "../lib/i18n";
import type { GalleryPhoto } from "../lib/gallery";

/** Large photo with thumbnails and a full-screen viewer (keyboard and buttons). */
export default function CabinGallery({ photos }: { photos: GalleryPhoto[] }) {
  const { t, lang } = useLanguage();
  const g = t.gallery;
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const count = photos.length;
  const step = useCallback((delta: number) => setActive((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      else if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, step]);

  if (!count) return null;
  const photo = photos[active];
  const label = (n: number) => g.openPhoto.replace("{n}", String(n)).replace("{total}", String(count));
  return <section aria-label={g.heading} className="mt-6">
    <button type="button" onClick={() => setOpen(true)} aria-label={label(active + 1)} className="card-photo relative block h-[320px] w-full bg-cover bg-center sm:h-[440px]" style={{ backgroundImage: `url('${photo.url}')` }} data-testid="gallery-main">
      <span role="img" aria-label={photo.alt[lang]} className="absolute inset-0" />
      {photo.isPlaceholder && <span className="absolute right-[10px] top-[10px] z-[1] bg-[rgba(36,18,9,.65)] px-2 py-[6px] font-sans text-[10px] text-white">{t.detail.tempPhoto}</span>}
      <span className="absolute bottom-3 left-3 z-[1] bg-[rgba(36,18,9,.65)] px-2 py-[6px] font-sans text-[11px] text-white">{g.counter.replace("{n}", String(active + 1)).replace("{total}", String(count))}</span>
    </button>
    {count > 1 && <ul className="m-0 mt-3 flex list-none gap-2 overflow-x-auto p-0">
      {photos.map((p, i) => <li key={`${p.url}-${i}`} className="shrink-0"><button type="button" onClick={() => setActive(i)} aria-label={label(i + 1)} aria-current={i === active} className={`block h-[64px] w-[96px] border-2 bg-cover bg-center sm:h-[72px] sm:w-[112px] ${i === active ? "border-terra" : "border-transparent opacity-80"}`} style={{ backgroundImage: `url('${p.url}')` }} /></li>)}
    </ul>}
    {open && <div role="dialog" aria-modal="true" aria-label={g.heading} className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,10,5,.94)] p-4" onClick={() => setOpen(false)}>
      <button type="button" onClick={() => setOpen(false)} aria-label={g.close} className="absolute right-4 top-4 h-11 w-11 bg-white/10 text-2xl text-white">×</button>
      {count > 1 && <button type="button" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label={g.previous} className="absolute left-3 top-1/2 h-12 w-12 -translate-y-1/2 bg-white/10 text-3xl text-white">‹</button>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt={photo.alt[lang]} onClick={(e) => e.stopPropagation()} className="max-h-[86vh] max-w-full object-contain" />
      {count > 1 && <button type="button" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label={g.next} className="absolute right-3 top-1/2 h-12 w-12 -translate-y-1/2 bg-white/10 text-3xl text-white">›</button>}
      <p className="absolute bottom-4 left-0 right-0 m-0 text-center font-sans text-xs text-white">{g.counter.replace("{n}", String(active + 1)).replace("{total}", String(count))}{photo.isPlaceholder ? ` · ${t.detail.tempPhoto}` : ""}</p>
    </div>}
  </section>;
}
