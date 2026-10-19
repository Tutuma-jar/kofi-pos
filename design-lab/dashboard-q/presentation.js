/* Fotografía y movimiento exclusivos de Q. Los datos siguen en el renderizador compartido. */
(() => {
  "use strict";
  const body = document.body;
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const toggle = document.querySelector("[data-motion-toggle]");
  const state = document.querySelector("[data-motion-state]");
  const chart = document.querySelector("[data-chart]");
  const chartSection = document.querySelector(".q-chart");
  let enabled = true;
  let chartAnimation;
  const moving = () => enabled && !preference.matches;

  function syncMotion() {
    const active = moving();
    body.dataset.motion = active ? "on" : "off";
    toggle.hidden = false;
    toggle.disabled = preference.matches;
    toggle.setAttribute("aria-pressed", String(active));
    toggle.title = preference.matches ? "Se respeta la preferencia de movimiento reducido de tu sistema." : "Activar o desactivar las animaciones de este experimento.";
    state.textContent = preference.matches ? "reducidas" : active ? "sí" : "no";
    if (!active) {
      chartAnimation?.cancel();
      document.getAnimations().forEach((animation) => animation.cancel());
    }
  }
  toggle.addEventListener("click", () => { enabled = !enabled; syncMotion(); });
  preference.addEventListener("change", syncMotion);
  syncMotion();

  const photos = ["cappuccino.jpg", "latte.jpg", "croissant.jpg", "espresso.jpg"];
  const products = document.querySelector("[data-products]");
  function decorateProducts() {
    [...products.children].forEach((item, index) => {
      if (item.querySelector(".product-photo") || !photos[index]) return;
      const information = document.createElement("div");
      information.className = "product-information";
      information.append(...item.childNodes);
      const frame = document.createElement("div");
      frame.className = "product-photo";
      const photo = document.createElement("img");
      photo.src = `./assets/${photos[index]}`;
      // Las referencias no identifican la receta ni el producto real del negocio.
      photo.alt = "";
      photo.width = 640;
      photo.height = index === 1 ? 919 : index === 2 ? 482 : index === 3 ? 427 : 360;
      photo.loading = "lazy";
      photo.decoding = "async";
      frame.append(photo);
      item.append(frame, information);
    });
  }
  decorateProducts();
  new MutationObserver(decorateProducts).observe(products, { childList: true });

  function traceChart() {
    chartAnimation?.cancel();
    if (!moving() || chartSection.dataset.seen !== "true") return;
    const line = chart.querySelector("path");
    if (!line || typeof line.animate !== "function") return;
    const length = line.getTotalLength();
    line.style.strokeDasharray = String(length);
    const animation = line.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], {
      duration: 650, easing: "cubic-bezier(.16, 1, .3, 1)"
    });
    const cleanup = () => {
      // Una cancelación anterior no debe borrar el trazo de su sustituta.
      if (chartAnimation === animation) line.style.removeProperty("stroke-dasharray");
    };
    animation.onfinish = cleanup;
    animation.oncancel = cleanup;
    chartAnimation = animation;
  }
  new MutationObserver(traceChart).observe(chart, { childList: true });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.dataset.seen = "true";
        entry.target.classList.add("is-seen");
        if (entry.target === chartSection) traceChart();
        observer.unobserve(entry.target);
      });
    }, { threshold: .08 });
    document.querySelectorAll("[data-reveal]").forEach((section) => observer.observe(section));
  }

  // Los saltos mueven también el foco, no solo la posición visual del documento.
  document.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener("click", () => {
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    target.tabIndex = -1;
    if (target.matches("details")) target.open = true;
    target.focus({ preventScroll: true });
  }));
})();
