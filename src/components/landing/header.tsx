"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandIcon } from "@/components/ui";
import { Cta } from "./cta";

/**
 * Topo da página de vendas: começa solto (sem fundo); ao rolar, encolhe e vira um bloco de vidro (estilo Apple).
 */
export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`lp-head ${scrolled ? "scrolled" : ""}`} data-testid="landing-header">
      <div className="lp-head-in">
        <Link className="logo lp-disp" href="/" aria-label="HoraBoa — início">
          <BrandIcon className="h-8 w-8" />
          <span>
            <b>Hora</b>
            <span>Boa</span>
          </span>
        </Link>
        <nav>
          <a className="lk lp-hide-m" href="#como">Como funciona</a>
          <a className="lk lp-hide-m" href="#precos">Preços</a>
          <Link className="lk" href="/entrar">Entrar</Link>
          <Cta href="/cadastro" size="sm">Testar grátis</Cta>
        </nav>
      </div>
    </header>
  );
}
