"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

/** Busca por nome ou código (atualiza a lista enquanto digita). */
export function ProductSearch({ value }: { value: string }) {
  const router = useRouter();
  const [q, setQ] = useState(value);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => router.replace(q.trim() ? `/painel/produtos?q=${encodeURIComponent(q.trim())}` : "/painel/produtos"), 300);
    return () => clearTimeout(t);
  }, [q, router]);
  return (
    <label className="am-search pd-search">
      <Search />
      <input className="am-in" placeholder="Nome ou código de barras" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar produto" data-testid="pd-q" />
    </label>
  );
}
