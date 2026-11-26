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
  const [loading, setLoading] = useState(false);

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
      .then((data) => setSlots(data.slots ?? []))
      .catch((e) => {
        if (e.name !== "AbortError") setSlots([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug, serviceId, professionalId, date, painel, token, appointmentId]);

  return { slots, loading };
}
