"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Consulta o status do Pix a cada 5 segundos e redireciona quando for pago. */
export function PixStatus({ id, initialStatus }: { id: string; initialStatus: string }) {
  const [status, setStatus] = useState(initialStatus);
  const router = useRouter();

  useEffect(() => {
    if (status !== "PENDING") return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/pagamentos/${id}`, { cache: "no-store" });
        const data = await res.json();
        if (data.status && data.status !== "PENDING") {
          setStatus(data.status);
          if (data.status === "PAID") router.push("/painel/assinatura?sucesso=1");
        }
      } catch {
        // tenta de novo no próximo ciclo
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [id, status, router]);

  if (status === "PAID") return <p className="font-medium text-emerald-700">Pagamento confirmado! Redirecionando...</p>;
  if (status === "EXPIRED") return <p className="font-medium text-red-700">Este Pix expirou. Volte e gere um novo.</p>;
  if (status === "FAILED") return <p className="font-medium text-red-700">Houve um problema com este Pix. Gere um novo.</p>;
  return (
    <p className="flex items-center justify-center gap-2 text-sm text-zinc-500">
      <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" /> Aguardando pagamento...
    </p>
  );
}
