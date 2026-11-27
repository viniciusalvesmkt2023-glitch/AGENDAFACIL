import { ExternalLink, Video } from "lucide-react";
import { getSetting } from "@/lib/site-settings";
import { VideoForm } from "./video-form";

export default async function AdminSettingsPage() {
  const video = await getSetting("howItWorksVideo");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="pn-h1">Configurações</h1>
        <p className="pn-hello">Ajustes gerais do site do HoraBoa.</p>
      </div>
      <section className="card rounded-3xl p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="pn-g-brand grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"><Video className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold">Vídeo do “Ver como funciona”</h2>
            <p className="text-sm text-zinc-500">Abre no popup do botão “Ver como funciona”, no topo da página de vendas.</p>
          </div>
          <a href="/" target="_blank" className="btn-secondary btn-sm shrink-0"><ExternalLink className="h-4 w-4" /> Ver página</a>
        </div>
        <VideoForm current={video} />
      </section>
    </div>
  );
}
