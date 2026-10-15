"use client";

import { useEffect } from "react";

/**
 * Couche d'interactions globale de l'app :
 *  - halo qui suit la souris sur tout l'écran ;
 *  - projecteur + légère inclinaison 3D sur chaque carte (.term-panel, .prism-surface) ;
 *  - apparition en fondu des cartes au scroll.
 * Désactivé sur écran tactile et si l'utilisateur demande moins d'animations.
 */
const CARD_SELECTOR = ".term-panel, .prism-surface";

export default function InteractiveFX() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    // Apparition au scroll (aussi sur mobile, c'est léger).
    const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("fx-in"); reveal.unobserve(entry.target); }
    }), { rootMargin: "0px 0px -6% 0px" });
    const watch = () => document.querySelectorAll(`${CARD_SELECTOR}:not(.fx-seen)`).forEach((element) => {
      element.classList.add("fx-seen");
      if (reduce) element.classList.add("fx-in"); else reveal.observe(element);
    });
    watch();
    const mutations = new MutationObserver(watch);
    mutations.observe(document.body, { childList: true, subtree: true });

    if (reduce || !finePointer) return () => { reveal.disconnect(); mutations.disconnect(); };
    root.classList.add("fx-pointer");

    let frame = 0;
    let last = null;
    let current = null;
    const onMove = (event) => {
      last = event;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        root.style.setProperty("--mx", `${last.clientX}px`);
        root.style.setProperty("--my", `${last.clientY}px`);
        const card = last.target.closest?.(CARD_SELECTOR);
        if (current && current !== card) { current.style.removeProperty("--rx"); current.style.removeProperty("--ry"); }
        current = card;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = (last.clientX - rect.left) / rect.width;
        const y = (last.clientY - rect.top) / rect.height;
        card.style.setProperty("--sx", `${x * 100}%`);
        card.style.setProperty("--sy", `${y * 100}%`);
        // Inclinaison plafonnée et réduite sur les grandes cartes pour rester pro.
        const strength = rect.width > 700 ? 0.6 : 1.6;
        card.style.setProperty("--rx", `${(0.5 - y) * strength}deg`);
        card.style.setProperty("--ry", `${(x - 0.5) * strength}deg`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      reveal.disconnect();
      mutations.disconnect();
      root.classList.remove("fx-pointer");
    };
  }, []);

  return <div aria-hidden="true" className="fx-cursor-glow" />;
}
