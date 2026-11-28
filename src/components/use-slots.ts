"use client";

import { useEffect, useState } from "react";

export type Slot = { time: number; label: string };

/** Busca os horários disponíveis sempre que serviço, profissional ou data mudam. */
export function useSlots(params: {
  slug: string;
  serviceId?: string;
  professionalId?: string;
  date?: string;
  painel?: boolean;
  /** Remarcação: ignora o próprio agendamento ao calcular os horários */
  token?: string;
  appointmentId?: string;
}) {
  const { slug, serviceId, professionalId, date, painel, token, appointmentId } = params;
  const [slots, setSlots] = useState<Slot[]>([]);
  // Motivo quando não há horários e períodos fechados no meio do dia (ex.: "11:00 às 13:00")
  const [message, setMessage] = useState<string | null>(null);
  const [closed, setClosed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  // data a que os horários carregados se referem (para saber que a busca terminou)
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([]);
      return;
    }
    const controller = new AbortController();
    const qs = new URLSearchParams({ slug, serviceId, date });
    if (professionalId) qs.set("professionalId", professionalId);
    if (painel) qs.set("painel", "1");
    if (token) qs.set("token", token);
    if (appointmentId) qs.set("appointmentId", appointmentId);
    setLoading(true);
    fetch(`/api/disponibilidade?${qs}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots ?? []);
        setMessage(data.message ?? null);
        setClosed(data.closed ?? []);
        setLoadedFor(date);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setSlots([]);
          setMessage("Não foi possível carregar os horários. Tente de novo.");
          setClosed([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug, serviceId, professionalId, date, painel, token, appointmentId]);

  return { slots, loading, message, closed, loadedFor };
}
