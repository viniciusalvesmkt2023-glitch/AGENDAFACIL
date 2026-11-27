import { ExternalLink, Video } from "lucide-react";
import { getSetting } from "@/lib/site-settings";
import { VideoForm } from "./video-form";

export default async function AdminSettingsPage() {
  const video = await getSetting("howItWorksVideo");
  return (
    <section className="ad-view on">
      <div className="ad-top">
        <div><h1>Configurações</h1><p>Ajustes gerais do site do HoraBoa</p></div>
      </div>
      <div className="ad-card ad-set">
        <div className="ad-set-hd">
          <span className="ad-ic ad-g-brand"><Video /></span>
          <div className="min-w-0" style={{ flex: 1 }}>
            <h3>Vídeo do “Ver como funciona”</h3>
            <p>Abre no popup do botão “Ver como funciona”, no topo da página de vendas.</p>
          </div>
          <a href="/" target="_blank" className="ad-mini ad-soft" style={{ height: 36 }}><ExternalLink /> Ver página</a>
        </div>
        <VideoForm current={video} />
      </div>
    </section>
  );
}
