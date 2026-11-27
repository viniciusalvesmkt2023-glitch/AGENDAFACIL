"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { saveService } from "@/app/painel/actions";
import { FormMessage } from "@/components/ui";
import { ModalFoot, useFormModal } from "@/components/form-modal";
import { SubmitButton } from "@/components/submit-button";
import { resizeImage } from "@/lib/resize-image";

type Service = { id: string; name: string; description: string | null; durationMinutes: number; priceCents: number; imageId?: string | null };

export function ServiceForm({ service }: { service?: Service }) {
  const [state, action] = useActionState(saveService, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const initialPhoto = service?.imageId ? `/i/${service.imageId}` : null;
  const [photo, setPhoto] = useState<string | null>(initialPhoto);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  // Foto escolhida (já reduzida). Vai junto no envio; fica guardada se o formulário der erro.
  const pending = useRef<File | null>(null);
  const submit = (formData: FormData) => {
    if (pending.current) formData.set("image", pending.current);
    return action(formData);
  };

  const { done } = useFormModal();
  // Salvou: fecha a janela e mostra o aviso
  useEffect(() => {
    if (state?.success) {
      pending.current = null;
      done(state.success);
    }
    if (state?.error) formRef.current?.querySelector(".fm-body")?.scrollTo({ top: 0, behavior: "smooth" });
  }, [state, done]);

  async function pick(file: File) {
    setBusy(true);
    setPhotoError(null);
    try {
      // Reduz no navegador antes de enviar
      const blob = await resizeImage(file, { width: 480, aspect: 1 });
      pending.current = new File([blob], `servico.${blob.type.split("/")[1]}`, { type: blob.type });
      setPhoto(URL.createObjectURL(blob));
      setRemoved(false);
    } catch {
      setPhotoError("Não foi possível usar esta foto. Tente outra.");
    } finally {
      setBusy(false);
      if (pickerRef.current) pickerRef.current.value = "";
    }
  }

  function removePhoto() {
    pending.current = null;
    setPhoto(null);
    setRemoved(!!initialPhoto);
  }

  return (
    <form ref={formRef} action={submit} className="fm-form">
      {service && <input type="hidden" name="id" value={service.id} />}
      <input type="hidden" name="removeImage" value={removed ? "1" : ""} />
      <div className="fm-body">
      <FormMessage error={state?.error} />

      <div>
        <label className="label" htmlFor="name">Nome</label>
        <input className="input" id="name" name="name" defaultValue={service?.name} required placeholder="Ex.: Corte masculino" autoFocus={!service} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="durationMinutes">Duração (min)</label>
          <input className="input" id="durationMinutes" name="durationMinutes" type="number" min={5} step={5} defaultValue={service?.durationMinutes ?? 30} required />
        </div>
        <div>
          <label className="label" htmlFor="price">Preço (R$)</label>
          <input
            className="input"
            id="price"
            name="price"
            inputMode="decimal"
            defaultValue={service ? (service.priceCents / 100).toFixed(2).replace(".", ",") : ""}
            placeholder="40,00"
            required
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">Descrição (opcional)</label>
        <textarea className="input" id="description" name="description" rows={2} defaultValue={service?.description ?? ""} />
      </div>

      <div>
        <span className="label">Foto (opcional)</span>
        <div className="flex items-center gap-3">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Foto do serviço" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-6 w-6 text-zinc-300" />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => pickerRef.current?.click()} disabled={busy} className="btn-secondary btn-sm">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              {photo ? "Trocar" : "Escolher foto"}
            </button>
            {photo && (
              <button type="button" onClick={removePhoto} className="btn-sm btn border border-zinc-200 bg-white text-red-600" aria-label="Remover foto">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-xs text-zinc-500">Aparece ao lado do serviço na sua página. Sem foto, fica só o nome.</p>
        {photoError && <p className="mt-1 text-sm text-red-600">{photoError}</p>}
        <input
          ref={pickerRef}
          type="file"
          accept="image/*"
          className="hidden"
          data-testid="service-photo"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pick(f);
          }}
        />
      </div>

      </div>
      <ModalFoot>
        <SubmitButton className="btn-primary">{service ? "Salvar alterações" : "Adicionar serviço"}</SubmitButton>
      </ModalFoot>
    </form>
  );
}
