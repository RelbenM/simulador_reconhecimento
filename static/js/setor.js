/* Página do setor: edição, cálculo (via backend), pendências em tempo real, salvar, enviar e Excel. */
(() => {
  const form = document.getElementById("formSetor");
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const orc = $("#orcamento"), pct = $("#percentual"), disp = $("#disponivel");
  const btnSalvar = $("#btnSalvar"), btnEnviar = $("#btnEnviar"), btnExcel = $("#btnExcel");
  const msgParam = $("#msgParametros"), pendInfo = $("#pendInfo");

  let dirty = false, ocupado = false, pendente = false;
  App.guardNavigation(() => dirty);
  form.addEventListener("input", () => { dirty = true; atualizarPendencias(); });
  form.addEventListener("change", () => { dirty = true; atualizarPendencias(); });

  /* ---------- pendências (campos vazios) em tempo real ---------- */
  function atualizarBotoes() {
    btnSalvar.disabled = ocupado;
    btnEnviar.disabled = ocupado || pendente;
    btnExcel.disabled = ocupado || pendente;
  }
  function atualizarPendencias() {
    let n = 0;
    $$("[data-field]", form).forEach((el) => {
      const vazio = el.value.trim() === "";
      el.classList.toggle("is-pending", vazio);
      if (vazio) n++;
    });
    [orc, pct].forEach((el) => { if (el.value.trim() === "") n++; });
    pendente = n > 0;
    pendInfo.innerHTML = pendente
      ? `<i class="bi bi-exclamation-triangle text-warning me-1"></i>${n} campo(s) pendente(s). Preencha todos para poder enviar ao gerente ou gerar o Excel.`
      : `<i class="bi bi-check-circle text-success me-1"></i>Todos os campos preenchidos.`;
    atualizarBotoes();
  }

  /* ---------- erros de validação ---------- */
  function limparErros() {
    $$(".is-invalid", form).forEach((el) => el.classList.remove("is-invalid"));
    msgParam.textContent = "";
  }
  function marcarErros(lista) {
    let primeiro = null;
    lista.forEach(({ campo, mensagem }) => {
      const el = $(`[data-key="${campo}"]`, form);
      if (!el) return;
      el.classList.add("is-invalid");
      primeiro = primeiro || el;
      if (campo === "orcamento" || campo === "percentual")
        msgParam.textContent = (msgParam.textContent ? msgParam.textContent + " " : "") + mensagem;
    });
    return primeiro;
  }

  /* ---------- formatação ao sair do campo ---------- */
  orc.addEventListener("blur", () => App.formatarCampo(orc, "moeda"));
  pct.addEventListener("blur", () => App.formatarCampo(pct, "pct"));
  $$('[data-field="salario"]', form).forEach((el) => el.addEventListener("blur", () => App.formatarCampo(el, "moeda")));

  /* ---------- valor disponível (cálculo feito no backend) ---------- */
  let timer = null, seq = 0;
  async function recalcular() {
    const meu = ++seq;
    try {
      const r = await fetch(form.dataset.urlCalcular, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orcamento: orc.value, percentual: pct.value }),
      });
      const j = await r.json();
      if (meu !== seq) return;
      orc.classList.toggle("is-invalid", !!(j.erros && j.erros.orcamento));
      pct.classList.toggle("is-invalid", !!(j.erros && j.erros.percentual));
      msgParam.textContent = j.erros ? Object.values(j.erros).join(" ") : "";
      if (j.ok) disp.textContent = j.disponivel;
    } catch (_) { /* mantém o último valor exibido */ }
  }
  [orc, pct].forEach((el) => el.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(recalcular, 250); }));

  /* ---------- coleta e envio ---------- */
  function coletar() {
    return {
      orcamento: orc.value,
      percentual: pct.value,
      colaboradores: $$("tbody tr[data-colab-id]", form).map((tr) => {
        const o = { id: Number(tr.dataset.colabId) };
        $$("[data-field]", tr).forEach((el) => (o[el.dataset.field] = el.value));
        return o;
      }),
    };
  }
  function atualizarStatus(j) {
    const b = $("#statusBadge");
    b.className = `status-badge status-${j.status}`;
    b.textContent = j.status_label;
  }

  // Retorna true quando o servidor aceitou os dados.
  async function enviarDados(url, ehEnvio, silencioso = false) {
    limparErros();
    ocupado = true; atualizarBotoes();
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(coletar()) });
      const j = await r.json();
      if (!j.ok) {
        const el = marcarErros(j.erros || []);
        App.showAlert("danger", j.mensagem || "Não foi possível salvar.", (j.erros || []).map((e) => e.mensagem));
        el?.focus();
        return false;
      }
      dirty = false;
      atualizarStatus(j);
      disp.textContent = j.disponivel;
      if (!silencioso) {
        App.showAlert(j.pendencias.length ? "warning" : "success", j.mensagem);
        App.showToast(ehEnvio ? "Envio registrado em Logs." : `Orçamento atualizado: disponível ${j.disponivel}`);
      }
      return true;
    } catch (_) {
      App.showAlert("danger", "Erro de comunicação com o servidor. Seus dados continuam na tela.");
      return false;
    } finally {
      ocupado = false; atualizarPendencias();
    }
  }

  btnSalvar.addEventListener("click", () => enviarDados(form.dataset.urlSalvar, false));
  btnEnviar.addEventListener("click", () => {
    if (pendente) return;
    if (confirm("Validar e salvar os dados e enviar para o gerente? (Nenhum e-mail é enviado nesta versão; o envio fica registrado em Logs.)"))
      enviarDados(form.dataset.urlEnviar, true);
  });

  /* ---------- Excel (só com tudo preenchido; usa dados salvos) ---------- */
  btnExcel.addEventListener("click", async () => {
    if (pendente) return;
    if (dirty && !(await enviarDados(form.dataset.urlSalvar, false, true))) return;
    ocupado = true; atualizarBotoes();
    try {
      const r = await fetch(form.dataset.urlExcel);
      if (!r.ok) {
        const j = await r.json();
        App.showAlert("warning", j.mensagem, (j.erros || []).map((e) => e.mensagem));
        return;
      }
      const nome = /filename="?([^";]+)"?/.exec(r.headers.get("Content-Disposition") || "")?.[1] || "Simulacao_Reconhecimento.xlsx";
      const url = URL.createObjectURL(await r.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: nome });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      App.showAlert("success", "Excel gerado com sucesso! Confira na sua pasta de Downloads.");
    } catch (_) {
      App.showAlert("danger", "Não foi possível gerar o Excel.");
    } finally {
      ocupado = false; atualizarPendencias();
    }
  });

  atualizarPendencias();
})();