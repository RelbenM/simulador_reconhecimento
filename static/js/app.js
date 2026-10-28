/* Utilitários compartilhados: menu responsivo, alertas e toasts. */
const App = (() => {
  const nf = (min, max) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: min, maximumFractionDigits: max });

  function parseNum(texto) {
    // null = vazio; NaN = inválido
    let s = String(texto ?? "").replace(/R\$|%|\s/g, "");
    if (s === "") return null;
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
  }
  const formatMoeda = (n) => nf(2, 2).format(n);
  const formatPct = (n) => nf(0, 2).format(n);

  function esc(t) {
    const d = document.createElement("div");
    d.textContent = t;
    return d.innerHTML;
  }

  function showAlert(tipo, titulo, itens = [], extraHtml = "") {
    const box = document.getElementById("alertas");
    const max = 8;
    const lista = itens.slice(0, max).map((i) => `<li>${esc(i)}</li>`).join("");
    const mais = itens.length > max ? `<li>… e mais ${itens.length - max} pendência(s).</li>` : "";
    box.innerHTML = `
      <div class="alert alert-${tipo} alert-dismissible fade show shadow-sm" role="alert">
        <strong>${esc(titulo)}</strong>${extraHtml}
        ${itens.length ? `<ul class="mb-0 mt-1">${lista}${mais}</ul>` : ""}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
      </div>`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showToast(msg, tipo = "success") {
    const el = document.createElement("div");
    el.className = `toast align-items-center text-bg-${tipo} border-0`;
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(msg)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
    document.getElementById("toasts").appendChild(el);
    const t = new bootstrap.Toast(el, { delay: 3500 });
    el.addEventListener("hidden.bs.toast", () => el.remove());
    t.show();
  }

  // Menu lateral em telas pequenas
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("backdrop");
  const toggle = (open) => {
    sidebar.classList.toggle("open", open);
    backdrop.classList.toggle("show", open);
  };
  const desktop = window.matchMedia("(min-width: 992px)");
  const raiz = document.documentElement;
  const recolher = (valor) => {
    raiz.classList.toggle("sidebar-collapsed", valor);
    try { localStorage.setItem("sidebarRecolhida", valor ? "1" : "0"); } catch (_) {}
  };
  // Desktop: expande/recolhe (só ícones). Celular/tablet: abre/fecha o menu sobre a página.
  document.getElementById("btnMenu")?.addEventListener("click", () => {
    if (desktop.matches) recolher(!raiz.classList.contains("sidebar-collapsed"));
    else toggle(!sidebar.classList.contains("open"));
  });
  // Menu recolhido: clicar no ícone de Setores expande o menu para mostrar a lista.
  document.addEventListener("click", (e) => {
    if (desktop.matches && raiz.classList.contains("sidebar-collapsed") && e.target.closest(".side-toggle")) {
      e.stopPropagation();
      recolher(false);
    }
  }, true);
  backdrop?.addEventListener("click", () => toggle(false));

  // Formata o campo ao sair dele; marca inválido se for texto ou negativo.
  function formatarCampo(el, tipo) {
    const n = parseNum(el.value);
    if (n === null) return;
    if (Number.isNaN(n) || n < 0) { el.classList.add("is-invalid"); return; }
    el.classList.remove("is-invalid");
    el.value = tipo === "pct" ? formatPct(n) : formatMoeda(n);
  }

  // Avisa antes de sair da página quando há alterações não salvas.
  function guardNavigation(isDirty) {
    const aviso = "Há alterações não salvas. Deseja sair mesmo assim?";
    let saindo = false;
    window.addEventListener("beforeunload", (e) => {
      if (isDirty() && !saindo) { e.preventDefault(); e.returnValue = ""; }
    });
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.getAttribute("href").startsWith("#")) return;
      if (!isDirty()) return;
      if (confirm(aviso)) saindo = true; else e.preventDefault();
    });
  }

  // Atualiza a linha do tempo com os estados devolvidos pelo servidor.
  function atualizarTimeline(passos) {
    (passos || []).forEach((p, i) => {
      const el = document.querySelector(`.tl-step[data-idx="${i}"]`);
      if (!el) return;
      el.className = `tl-step tl-${p.estado}`;
    });
  }

  return { parseNum, formatMoeda, formatPct, formatarCampo, guardNavigation, showAlert, showToast, esc, atualizarTimeline };
})();