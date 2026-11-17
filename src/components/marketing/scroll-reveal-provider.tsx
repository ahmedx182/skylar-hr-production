"use client";

import { useEffect } from "react";

export function ScrollRevealProvider() {
  useEffect(() => {
    const revealAll = () => {
      document.querySelectorAll(".reveal-on-scroll").forEach((el) => {
        el.classList.add("is-visible");
      });
    };

    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      revealAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.02,
        rootMargin: "250px 0px 100px 0px",
      }
    );

    const elements = document.querySelectorAll(".reveal-on-scroll");
    elements.forEach((el) => observer.observe(el));

    // Fallback: guarantee all sections are visible within 1.2s even if offscreen
    const fallbackTimer = setTimeout(revealAll, 1200);

    return () => {
      clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, []);

  return null;
}
