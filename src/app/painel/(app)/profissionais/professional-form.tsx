"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { saveProfessional } from "@/app/painel/actions";
import { resizeImage } from "@/lib/resize-image";
import { FormMessage } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type Professional = { id: string; name: string; phone: string | null; serviceIds: string[]; imageId?: string | null };

export function ProfessionalForm({
  professional,
  services,
}: {
  professional?: Professional;
  services: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(saveProfessional, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const initialPhoto = professional?.imageId ? `/i/${professional.imageId}` : null;
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

  useEffect(() => {
    if (state?.success && !professional) {
      formRef.current?.reset();
      setPhoto(null);
      setRemoved(false);
    }
    if (state?.success) pending.current = null;
  }, [state, professional]);

  async function pick(file: File) {
    setBusy(true);
    setPhotoError(null);
    try {
      // Reduz e corta quadrada no navegador antes de enviar
      const blob = await resizeImage(file, { width: 400, aspect: 1 });
      pending.current = new File([blob], `profissional.${blob.type.split("/")[1]}`, { type: blob.type });
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
    <form ref={formRef} action={submit} className="space-y-4">
      {professional && <input type="hidden" name="id" value={professional.id} />}
      <input type="hidden" name="removeImage" value={removed ? "1" : ""} />
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => pickerRef.current?.click()}
          disabled={busy}
          className="relative h-20 w-20 shrink-0 rounded-full"
          aria-label={photo ? "Trocar foto" : "Escolher foto"}
        >
          <span
            className={`grid h-full w-full place-items-center overflow-hidden rounded-full ${
              photo ? "shadow-md ring-2 ring-brand-500 ring-offset-2 ring-offset-[var(--ui-solid,#fff)]" : "border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-400"
            }`}
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="Foto do profissional" className="h-full w-full object-cover" />
            ) : busy ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Camera className="h-7 w-7" />
            )}
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 grid h-7 w-7 place-items-center rounded-full border-[3px] border-[var(--ui-solid,#fff)] bg-gradient-to-br from-brand-300 to-brand-500 text-sm font-bold leading-none text-white">
            +
          </span>
        </button>
        <div className="min-w-0">
          <p className="font-semibold">Foto <span className="text-xs font-normal text-zinc-500">(opcional)</span></p>
          <p className="text-xs text-zinc-500">Aparece redonda na sua página. Sem foto, fica a inicial do nome.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => pickerRef.current?.click()} disabled={busy} className="btn-secondary btn-sm">
              {photo ? "Trocar foto" : "Escolher foto"}
            </button>
            {photo && (
              <button type="button" onClick={removePhoto} className="btn-sm btn border border-zinc-200 bg-white text-red-600" aria-label="Remover foto">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <input
          ref={pickerRef}
          type="file"
          accept="image/*"
          className="hidden"
          data-testid="professional-photo"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pick(f);
          }}
        />
      </div>
      {photoError && <p className="-mt-2 text-sm text-red-600">{photoError}</p>}
      <div>
        <label className="label" htmlFor="name">Nome</label>
        <input className="input" id="name" name="name" defaultValue={professional?.name} required />
      </div>
      <div>
        <label className="label" htmlFor="phone">WhatsApp (opcional)</label>
        <input className="input" id="phone" name="phone" defaultValue={professional?.phone ?? ""} placeholder="(11) 99999-9999" />
      </div>
      <fieldset>
        <legend className="label">Serviços que realiza</legend>
        {services.length === 0 ? (
          <p className="text-sm text-zinc-500">Cadastre serviços primeiro.</p>
        ) : (
          <div className="space-y-2">
            {services.map((s) => (
              <label key={s.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50">
                <input
                  type="checkbox"
                  name="serviceIds"
                  value={s.id}
                  defaultChecked={professional ? professional.serviceIds.includes(s.id) : true}
                  className="h-5 w-5 accent-brand-600"
                />
                {s.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <FormMessage error={state?.error} success={state?.success} />
      <SubmitButton className="btn-primary w-full">{professional ? "Salvar alterações" : "Adicionar profissional"}</SubmitButton>
    </form>
  );
}
