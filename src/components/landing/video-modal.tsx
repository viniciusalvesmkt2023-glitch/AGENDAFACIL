"use client";

import "./video-modal.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CirclePlay, CreditCard, Gift, LockOpen, X } from "lucide-react";
import { Cta } from "./cta";

/* eslint-disable @typescript-eslint/no-explicit-any -- API do YouTube (script externo, sem tipos) */
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytReady: Promise<any> | null = null;
/** Carrega a API de vídeo do YouTube uma vez só. */
function loadYouTube(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytReady) {
    ytReady = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve(window.YT);
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    });
  }
  return ytReady;
}

/**
 * Botão "Ver como funciona" + popup com o vídeo (VSL): começa sozinho sem som,
 * com o aviso "Clique aqui para ativar o som", barra de progresso, pausa ao tocar no vídeo
 * e o botão "Testar grátis agora".
 */
export function VideoModal({ videoId, trialDays }: { videoId: string; trialDays: number }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => setHost(document.querySelector(".lp") ?? document.body), []);

  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);

  return (
    <>
      <button ref={trigger} type="button" className="lp-btn ghost lp-shape" onClick={() => setOpen(true)} data-testid="ver-como-funciona">
        <CirclePlay className="i" /> Ver como funciona
      </button>
      {open && host && createPortal(<Modal videoId={videoId} trialDays={trialDays} onClose={close} />, host)}
    </>
  );
}

function Modal({ videoId, trialDays, onClose }: { videoId: string; trialDays: number; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const player = useRef<any>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);

  // Fecha com Esc, trava a rolagem da página e foca o botão de fechar
  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  // Cria o player do YouTube: começa sozinho, sem som e sem os controles do YouTube
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    loadYouTube().then((YT) => {
      if (!alive || !box.current) return;
      player.current = new YT.Player(box.current, {
        videoId,
        playerVars: { autoplay: 1, controls: 0, mute: 1, rel: 0, modestbranding: 1, fs: 0, playsinline: 1, iv_load_policy: 3, disablekb: 1 },
        events: {
          onReady: (e: any) => {
            e.target.mute();
            e.target.playVideo();
            setReady(true);
            timer = setInterval(() => {
              const p = player.current;
              const d = p?.getDuration?.() ?? 0;
              if (d > 0) setProgress(Math.min(100, ((p.getCurrentTime?.() ?? 0) / d) * 100));
            }, 500);
          },
          onStateChange: (e: any) => setPaused(e.data === YT.PlayerState.PAUSED),
        },
      });
    });
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
      player.current?.destroy?.();
      player.current = null;
    };
  }, [videoId]);

  function unmute() {
    const p = player.current;
    if (!p) return;
    p.unMute();
    p.setVolume?.(100);
    p.seekTo(0, true);
    p.playVideo();
    setMuted(false);
  }
  function toggle() {
    const p = player.current;
    if (!p) return;
    if (muted) return unmute();
    if (p.getPlayerState?.() === 1) p.pauseVideo();
    else p.playVideo();
  }

  return (
    <div className="vm-shade" onClick={(e) => e.target === e.currentTarget && onClose()} data-testid="video-modal">
      <div className="vm-modal" role="dialog" aria-modal="true" aria-labelledby="vm-title">
        <button ref={closeBtn} type="button" className="vm-x" onClick={onClose} aria-label="Fechar vídeo">
          <X />
        </button>
        <span className="vm-eyebrow">Entenda em 1 minuto</span>
        <h2 id="vm-title" className="lp-disp">
          Como o HoraBoa <em>funciona</em>
        </h2>
        <p className="vm-sub">
          Você cadastra seus serviços, compartilha seu link e o cliente agenda sozinho. A confirmação e o lembrete saem no seu WhatsApp — e você
          acompanha tudo pelo painel, no celular ou no computador.
        </p>

        <div className="vm-video">
          {!ready && <span className="vm-loading">Carregando o vídeo…</span>}
          <div className="vm-player"><div ref={box} /></div>
          <div className="vm-blocker" onClick={toggle} onContextMenu={(e) => e.preventDefault()} aria-hidden="true" />
          {ready && muted && (
            <div className="vm-layer">
              <button type="button" className="vm-sound" onClick={unmute} data-testid="ativar-som">
                Clique aqui
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" fillOpacity=".2" />
                  <path className="w1" d="M15.5 8.5a5 5 0 0 1 0 7" />
                  <path className="w2" d="M19 5a10 10 0 0 1 0 14" />
                </svg>
                para ativar o som
              </button>
            </div>
          )}
          {ready && !muted && paused && (
            <div className="vm-layer">
              <button type="button" className="vm-play" onClick={() => player.current?.playVideo()} aria-label="Continuar o vídeo">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>
              </button>
            </div>
          )}
          <span className="vm-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="vm-cta">
          <Cta href="/cadastro">Testar grátis agora</Cta>
        </div>
        <div className="lp-perks">
          <span><Gift className="i" /> {trialDays} dias grátis</span>
          <span><CreditCard className="i" /> Sem cartão</span>
          <span><LockOpen className="i" /> Sem fidelidade</span>
        </div>
      </div>
    </div>
  );
}
