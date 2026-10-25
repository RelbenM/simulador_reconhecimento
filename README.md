# Simulador de Reconhecimento — Gestão de Pessoas (v1, dados fictícios)

Aplicação web local (Flask + SQLite + Bootstrap 5) com duas páginas:

1. **Homepage da GP** — KPIs consolidados e tabela de setores.
2. **Página do setor** — parâmetros orçamentários e tabela editável de colaboradores, com geração de Excel.

## Como executar (Windows)

```bash
pip install -r requirements.txt
python app.py
```

O terminal mostra o endereço (`http://127.0.0.1:5000`) e o navegador é aberto automaticamente.
Na primeira execução o banco `data/simulador.db` é criado com 5 setores e 154 colaboradores fictícios;
reiniciar **não** duplica registros. Para voltar aos dados iniciais, feche a aplicação e apague `data/simulador.db`.

> Bootstrap 5 e Bootstrap Icons são carregados por CDN; o primeiro acesso precisa de internet.
> Para uso 100% offline, baixe os arquivos para `static/` e ajuste os `<link>`/`<script>` em `templates/base.html`.

## Estrutura

```text
app.py            rotas, validação, cálculo e geração do Excel
database.py       esquema SQLite, carga fictícia, consultas, logs e OPCOES (lista de "Elegível")
templates/        base.html (layout comum), home.html, setor.html, logs.html
static/           css/style.css, js/app.js (utilitários), js/home.js, js/setor.js
data/             simulador.db (criado automaticamente)
output/           cópias dos Excel gerados
```

## Regras implementadas

- **Homepage**: valor orçado da folha e percentual de reconhecimento são campos editáveis em cada setor. O valor disponível e os cards (total orçado da folha e total disponível) são recalculados no backend enquanto se digita e gravados em `Salvar alterações`.
- **Valor disponível = orçamento da folha × percentual** (percentual guardado como fração, ex.: `0.50`, e exibido como `50%`).
- **Página do setor**: maturidade, conduta e zona salarial são **texto livre** (até 100 caracteres) até que as listas sejam definidas. Só "Elegível" tem opções (Sim/Não). Nome e tempo de cargo são automáticos.
- **Pendências**: campos vazios ficam em amarelo em tempo real. Enquanto houver pendência, os botões `Enviar para o gerente` e `Gerar Excel` ficam desativados; o backend também recusa as duas ações.
- **Salvar** aceita rascunho com campos vazios; erros de formato (negativos, percentual fora de 0–100, texto muito longo, elegível inválido) bloqueiam e não apagam o que foi digitado.
- **Status**: *Não iniciado* → *Em preenchimento* → *Pronto para envio* → *Enviado*.
- **Enviar para o gerente**: valida, salva, marca como *Enviado* e registra em Logs. **Não envia e-mail.**
- **Excel**: um arquivo por setor, com os dados salvos (se houver alterações não salvas, elas são salvas antes). Cada geração é registrada em Logs; uma cópia fica em `output/`.
- **Logs** (menu lateral): ação executada, gerente, valor orçado da folha, percentual e data/hora, do mais recente para o mais antigo.
- Aviso ao sair da Homepage ou do setor com alterações não salvas.

## Fora do escopo desta versão

Login, controle de acesso, SMTP, telas de gerente/diretoria, aprovação e empacotamento `.exe` (a estrutura de pastas é simples e compatível com PyInstaller).
