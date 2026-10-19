/* Datos exclusivamente sintéticos, compartidos por las exploraciones. */
(() => {
  "use strict";
  const icons = {
    hamburger: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    cup: '<path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z"/><path d="M16 10h2a3 3 0 1 1 0 6h-2M3 23h17M7 2v3m4-4v4m4-3v3"/>',
    dashboard: '<rect x="3" y="3" width="7" height="8" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/>',
    menu: '<path d="M4 4h16v17H4zM8 4V2m8 2V2M8 9h8m-8 4h8m-8 4h5"/>',
    orders: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6m-6 4h6m-6 4h3"/>',
    history: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6m3-4v6l4 2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    trend: '<path d="m4 16 6-6 4 4 6-9m-6 0h6v6"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    money: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M5 9v6m14-6v6"/>',
    qr: '<path d="M3 3h6v6H3zm12 0h6v6h-6zM3 15h6v6H3zm12 0v3h3v3h3v-6m-9-3h3m6 0h-3m-6 6v3"/>',
    down: '<path d="m7 10 5 5 5-5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 5h3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01"/>'
  };
  document.body.insertAdjacentHTML("afterbegin", `<svg class="icon-definitions" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>${Object.entries(icons).map(([name, paths]) => `<symbol id="icon-${name}" viewBox="0 0 24 26">${paths}</symbol>`).join("")}</defs></svg>`);
  const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
  document.querySelectorAll("[data-exploration-links]").forEach((node) => {
    let variants = ["g", "h"].includes(document.body.dataset.variant)
      ? [["d", "Base"], ["g", "Bruma"], ["h", "Pizarra"]]
      : [["d", "Bosque"], ["e", "Terracota"], ["f", "Espresso"]];
    if (document.body.dataset.variant === "i") variants = [["i", "Casa"], ["d", "Base D"], ["h", "Pizarra"]];
    if (document.body.dataset.variant === "j") variants = [["j", "Bruma"], ["i", "Casa I"], ["d", "Base D"]];
    if (["k", "l"].includes(document.body.dataset.variant)) variants = [["k", "Día"], ["l", "Noche"], ["i", "Base I"]];
    if (["m", "n", "o"].includes(document.body.dataset.variant)) variants = [["m", "Lino"], ["n", "Café"], ["o", "Noche"]];
    if (document.body.dataset.variant === "p") variants = [["p", "Orden"], ["m", "Base M"]];
    if (document.body.dataset.variant === "q") variants = [["q", "Foto"], ["p", "Base P"]];
    node.innerHTML = variants.map(([id, name]) => `<a href="../dashboard-${id}/index.html"${document.body.dataset.variant === id ? ' aria-current="page"' : ""}>${id.toUpperCase()} · ${name}</a>`).join("");
  });
  document.querySelectorAll("[data-exploration-nav]").forEach((node) => {
    node.innerHTML = `<a href="./index.html" aria-current="page">${icon("dashboard")}Dashboard</a><button type="button" data-demo>${icon("menu")}Mi menú</button><button type="button" data-demo>${icon("orders")}Pedidos y ventas</button><button type="button" data-demo>${icon("history")}Historial y reportes</button>`;
  });
  const format = new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (value) => `Bs ${format.format(value)}`;
  const periods = {
    today: { label: "Hoy, 18 de octubre", short: "Hoy", labels: ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18"], income: [48, 96.5, 143, 112, 186.5, 132, 92, 114.5, 168, 121, 71], orders: [2, 3, 5, 4, 6, 4, 3, 4, 5, 4, 2], counts: [18, 14, 11, 9] },
    week: { label: "Del 12 al 18 de octubre", short: "Esta semana", labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"], income: [861.5, 946, 1032.5, 1104, 1172.5, 1456, 1284.5], orders: [31, 34, 35, 39, 40, 48, 42], counts: [111, 94, 79, 62] }
  };
  const products = [
    { name: "Capuchino", category: "Café con leche" },
    { name: "Latte de vainilla", category: "Café de especialidad" },
    { name: "Croissant", category: "Panadería" },
    { name: "Americano", category: "Café negro" }
  ];
  const sales = [
    { id: "KF-1042", time: "18:12", detail: "2 capuchinos", payment: "QR", total: 48 },
    { id: "KF-1041", time: "17:56", detail: "1 latte de vainilla", payment: "Efectivo", total: 28 },
    { id: "KF-1040", time: "17:48", detail: "2 americanos", payment: "QR", total: 36 },
    { id: "KF-1039", time: "17:45", detail: "Capuchino y croissant", payment: "QR", total: 52 },
    { id: "KF-1038", time: "16:38", detail: "1 capuchino", payment: "Efectivo", total: 24 },
    { id: "KF-1037", time: "16:25", detail: "Latte y americano", payment: "Efectivo", total: 46 }
  ];
  let period = "today";
  let series = "income";
  let sort = "recent";
  let query = "";
  const sum = (list) => list.reduce((total, value) => total + value, 0);
  const updateText = (selector, text) => document.querySelectorAll(selector).forEach((node) => { node.textContent = text; });

  function renderChart() {
    const data = periods[period];
    const values = data[series];
    const peakNote = document.querySelector("[data-chart-peak]");
    if (peakNote) {
      const peak = Math.max(...values);
      const peakLabels = data.labels.filter((_, index) => values[index] === peak)
        .map((label) => period === "today" ? `${label}:00` : label);
      const peakValue = series === "income" ? money(peak) : `${peak} ${peak === 1 ? "pedido" : "pedidos"}`;
      const peakText = `${peakLabels.length === 1 ? "Pico" : "Picos"}: ${peakLabels.join(", ")} · ${peakValue}`;
      if (peakNote.textContent !== peakText) peakNote.textContent = peakText;
    }
    const ceiling = Math.ceil(Math.max(...values) / (series === "income" ? 50 : 2)) * (series === "income" ? 50 : 2);
    document.querySelectorAll("[data-chart]").forEach((node) => {
      const chartHeight = node.dataset.chartSize === "compact" ? 190 : 248;
      const baseline = chartHeight - 44;
      const plotHeight = chartHeight - 80;
      const chartWidth = Math.max(290, Math.round(node.clientWidth));
      const plotWidth = chartWidth - 75;
      const barWidth = Math.min(24, plotWidth / values.length * .65);
      const points = values.map((value, index) => [55 + index * (plotWidth / (values.length - 1)), baseline - (value / ceiling) * plotHeight]);
      const line = points.map(([x, y], i) => {
        if (!i) return `M${x},${y}`;
        const [previousX, previousY] = points[i - 1];
        const midpoint = (previousX + x) / 2;
        return `C${midpoint},${previousY} ${midpoint},${y} ${x},${y}`;
      }).join(" ");
      const kind = node.dataset.chart;
      const grid = [0, .5, 1].map((ratio) => `<line x1="46" x2="${chartWidth - 10}" y1="${baseline - ratio * plotHeight}" y2="${baseline - ratio * plotHeight}" stroke="var(--line)" stroke-dasharray="3 5"/><text x="32" y="${baseline + 4 - ratio * plotHeight}" text-anchor="end">${ceiling * ratio}</text>`).join("");
      const labels = points.map(([x], i) => (values.length > 8 && i % 2 !== 0 ? "" : `<text x="${x}" y="${chartHeight - 15}" text-anchor="middle">${data.labels[i]}${period === "today" ? ":00" : ""}</text>`)).join("");
      const bars = points.map(([x, y], i) => `<rect x="${x - barWidth / 2}" y="${y}" width="${barWidth}" height="${baseline - y}" rx="4" fill="${i === 4 ? "var(--sand)" : "var(--wine)"}" stroke="var(--wine)" stroke-width="1" tabindex="0" role="img" aria-label="${data.labels[i]}: ${series === "income" ? money(values[i]) : `${values[i]} pedidos`}"><title>${data.labels[i]}: ${series === "income" ? money(values[i]) : `${values[i]} pedidos`}</title></rect>`).join("");
      const path = `${kind === "area" ? `<path d="${line} L${chartWidth - 20},${baseline} L55,${baseline} Z" fill="var(--wine)" fill-opacity=".08"/>` : ""}<path d="${line}" fill="none" stroke="var(--wine)" stroke-width="3" stroke-linecap="round"/>${points.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === 4 ? 5 : 3}" fill="var(--paper)" stroke="var(--wine)" stroke-width="2" tabindex="0" role="img" aria-label="${data.labels[i]}: ${series === "income" ? money(values[i]) : `${values[i]} pedidos`}"><title>${data.labels[i]}: ${series === "income" ? money(values[i]) : `${values[i]} pedidos`}</title></circle>`).join("")}`;
      node.innerHTML = `<svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="${series === "income" ? "Ingresos en bolivianos" : "Cantidad de pedidos"}, ${data.label.toLowerCase()}">${grid}${kind === "bars" ? bars : path}${labels}</svg>`;
    });
    updateText("[data-chart-caption]", `${series === "income" ? `Ingresos en bolivianos · ${money(sum(data.income))}` : `${sum(data.orders)} pedidos registrados`} · ${data.short.toLowerCase()}`);
  }

  function renderSales() {
    const filtered = sales.filter((sale) => `${sale.id} ${sale.detail} ${sale.payment} ${sale.time}`.toLocaleLowerCase("es").includes(query));
    if (sort !== "recent") filtered.sort((a, b) => sort === "ascending" ? a.total - b.total : b.total - a.total);
    document.querySelectorAll("[data-sales]").forEach((node) => {
      node.innerHTML = filtered.map((sale) => `<tr><td><span class="sale-id">${sale.id}</span><span class="sale-detail">${sale.detail}</span></td><td>${sale.time}</td><td><span class="payment-pill">${icon(sale.payment === "QR" ? "qr" : "money")}${sale.payment}</span></td><td><strong>${money(sale.total)}</strong></td></tr>`).join("");
    });
    document.querySelectorAll("[data-empty]").forEach((node) => { node.hidden = filtered.length !== 0; });
    document.querySelectorAll("[data-sales-table]").forEach((node) => { node.hidden = filtered.length === 0; });
    updateText("[data-sales-status]", `${filtered.length} de 6 ventas de muestra${query ? " coinciden con tu búsqueda" : " · todas pagadas"}.`);
    document.querySelectorAll("[data-sort-heading]").forEach((node) => node.setAttribute("aria-sort", sort === "recent" ? "none" : sort));
  }

  function render() {
    const data = periods[period];
    const total = sum(data.income);
    updateText("[data-income]", money(total));
    updateText("[data-order-count]", sum(data.orders));
    updateText("[data-period-label]", data.label);
    updateText("[data-qr-total]", money(total * .58));
    updateText("[data-cash-total]", money(total * .42));
    document.querySelectorAll("[data-products]").forEach((node) => {
      node.innerHTML = products.map((product, index) => `<li><div class="product-top"><span class="product-name">${product.name}</span><strong>${data.counts[index]} <span class="muted">u.</span></strong></div><p class="product-category">${product.category}</p><div class="product-bar" aria-hidden="true"><span style="width:${(data.counts[index] / data.counts[0]) * 100}%"></span></div></li>`).join("");
    });
    renderChart();
    renderSales();
  }

  document.querySelectorAll("[data-period]").forEach((select) => select.addEventListener("change", () => { period = select.value; render(); }));
  document.querySelectorAll("[data-series]").forEach((button) => button.addEventListener("click", () => {
    series = button.dataset.series;
    document.querySelectorAll("[data-series]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    renderChart();
  }));
  document.querySelectorAll("[data-search]").forEach((input) => input.addEventListener("input", () => { query = input.value.trim().toLocaleLowerCase("es"); renderSales(); }));
  document.querySelectorAll("[data-clear]").forEach((button) => button.addEventListener("click", () => {
    query = "";
    document.querySelectorAll("[data-search]").forEach((input) => { input.value = ""; input.focus(); });
    renderSales();
  }));
  document.querySelectorAll("[data-sort]").forEach((button) => button.addEventListener("click", () => {
    sort = sort === "ascending" ? "descending" : "ascending";
    renderSales();
  }));
  let toastTimeout;
  document.querySelectorAll("[data-demo]").forEach((button) => button.addEventListener("click", () => {
    const toast = document.querySelector("[data-toast]");
    toast.textContent = button.dataset.demo === "sale" ? "Solo es una demostración visual. No se ha registrado ninguna venta." : "Este laboratorio muestra únicamente el dashboard. Esta función no está implementada.";
    toast.hidden = false;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { toast.hidden = true; }, 6500);
  }));
  const sidebar = document.querySelector("[data-sidebar]");
  if (sidebar) {
    const mobile = window.matchMedia("(max-width: 800px)");
    const toggles = [...document.querySelectorAll("[data-sidebar-toggle]")];
    const opener = document.querySelector("[data-sidebar-opener]");
    const backdrop = document.querySelector("[data-sidebar-backdrop]");
    const workspace = document.querySelector("[data-workspace]");
    let open = !mobile.matches;
    const setMenu = (next, moveFocus = false) => {
      const focusWasInside = sidebar.contains(document.activeElement);
      open = next;
      document.body.dataset.navigation = open ? "open" : "closed";
      document.body.classList.toggle("menu-open", open && mobile.matches);
      sidebar.hidden = !open;
      sidebar.inert = !open;
      backdrop.hidden = !(open && mobile.matches);
      workspace.inert = open && mobile.matches;
      toggles.forEach((button) => {
        button.setAttribute("aria-expanded", String(open));
        button.setAttribute("aria-label", open ? "Ocultar menú principal" : "Mostrar menú principal");
      });
      if (open && mobile.matches) {
        sidebar.setAttribute("role", "dialog");
        sidebar.setAttribute("aria-modal", "true");
        if (moveFocus) sidebar.querySelector("[data-sidebar-toggle]").focus();
      } else {
        sidebar.removeAttribute("role");
        sidebar.removeAttribute("aria-modal");
        if ((!open && (moveFocus || focusWasInside)) || document.activeElement.classList.contains("sidebar-close")) opener.focus();
      }
    };
    toggles.forEach((button) => button.addEventListener("click", () => setMenu(!open, true)));
    backdrop.addEventListener("click", () => setMenu(false, true));
    mobile.addEventListener("change", () => {
      const wasModal = sidebar.getAttribute("aria-modal") === "true";
      setMenu(!mobile.matches);
      // El botón de cierre deja de ser visible antes de que se notifique el breakpoint.
      if (wasModal) opener.focus();
    });
    document.addEventListener("keydown", (event) => {
      if (!open || !mobile.matches) return;
      if (event.key === "Escape") { event.preventDefault(); setMenu(false, true); }
      if (event.key === "Tab") {
        const items = [...sidebar.querySelectorAll('button:not([disabled]), a[href]')];
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    setMenu(open);
  }
  render();
  const chartObserver = new ResizeObserver(() => renderChart());
  document.querySelectorAll("[data-chart]").forEach((node) => chartObserver.observe(node));
})();
