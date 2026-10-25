/* Homepage: orçamento da folha e percentual editáveis por setor; totais calculados no backend. */
(() => {
  const form = document.getElementById("formHome");
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const btn = $("#btnSalvarHome");
  let dirty = false, timer = null, seq = 0;

  App.guardNavigation(() => dirty);

  $$('[data-key^="orcamento-"]', form).forEach((el) => el.addEventListener("blur", () => App.formatarCampo(el, "moeda")));
  $$('[data-key^="percentual-"]', form).forEach((el) => el.addEventListener("blur", () => App.formatarCampo(el, "pct")));

  function coletar(salvar) {
    return {
      salvar,
      setores: $$("tr[data-setor-id]", form).map((tr) => ({
        id: Number(tr.dataset.setorId),
        orcamento: $('[data-key^="orcamento-"]', tr).value,
        percentual: $('[data-key^="percentual-"]', tr).value,
      })),
    };
  }

  function aplicar(j) {
    Object.entries(j.linhas || {}).forEach(([id, v]) => { const c = $(`#disp-${id}`); if (c) c.textContent = v; });
    if (j.totais) {
      $("#kpiColab").textContent = j.totais.colaboradores;
      $("#kpiFolha").textContent = j.totais.folha;
      $("#kpiDisp").textContent = j.totais.disponivel;
    }
  }
  function marcar(erros) {
    $$(".is-invalid", form).forEach((el) => el.classList.remove("is-invalid"));
    let primeiro = null;
    (erros || []).forEach(({ campo }) => {
      const el = $(`[data-key="${campo}"]`, form);
      if (el) { el.classList.add("is-invalid"); primeiro = primeiro || el; }
    });
    return primeiro;
  }

  async function chamar(salvar) {
    const r = await fetch(form.dataset.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(coletar(salvar)) });
    return [r, await r.json()];
  }

  async function preview() {
    const meu = ++seq;
    try {
      const [, j] = await chamar(false);
      if (meu !== seq) return;
      aplicar(j);
      marcar(j.erros);
    } catch (_) { /* mantém valores exibidos */ }
  }
  form.addEventListener("input", () => { dirty = true; clearTimeout(timer); timer = setTimeout(preview, 250); });

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      const [r, j] = await chamar(true);
      if (!j.ok) {
        const el = marcar(j.erros);
        App.showAlert("danger", j.mensagem, (j.erros || []).map((e) => e.mensagem));
        el?.focus();
        return;
      }
      dirty = false;
      marcar([]);
      aplicar(j);
      App.showAlert("success", j.mensagem);
    } catch (_) {
      App.showAlert("danger", "Erro de comunicação com o servidor. Seus dados continuam na tela.");
    } finally {
      btn.disabled = false;
    }
  });
})();
