"use client";

import { useEffect } from "react";

/** Faz os blocos marcados com .lp-rv aparecerem suavemente ao rolar (sem JS, tudo já aparece normal). */
export function RevealOnScroll() {
  useEffect(() => {
    const root = document.querySelector(".lp");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items = Array.from(root.querySelectorAll(".lp-rv"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("on");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    // O que já está na tela aparece direto; o resto anima ao chegar
    items.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("on");
      else io.observe(el);
    });
    root.classList.add("lp-anim");
    return () => io.disconnect();
  }, []);
  return null;
}
