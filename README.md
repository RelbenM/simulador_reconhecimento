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

## Fluxo e regras implementadas

- **Linha do tempo** (topo da Homepage e da página do setor): três etapas em bolinhas — **GPC** (lançamento de folha), **Gestor** (preenchimento dos dados) e **Diretoria** (aprovação). GPC fica concluída quando todos os setores têm orçamento de folha lançado; Gestor, quando todos foram enviados para aprovação; a Diretoria fica em andamento a partir daí. Na página do setor a linha do tempo mostra só aquele setor.
- **Homepage (GP)**: usada apenas para definir o **orçamento de folha** de cada setor. Os cards (colaboradores, total orçado e total disponível) são recalculados no backend enquanto se digita e gravados em `Salvar alterações`.
- **Percentual de reconhecimento fixo em 5%** (`PERCENTUAL_FIXO` em `database.py`), exibido apenas como texto. **Valor disponível = orçamento de folha × 5%.**
- **Página do setor (gestor)**: orçamento, percentual e valor disponível são somente leitura. O gestor preenche os dados dos colaboradores (maturidade, conduta e zona salarial em texto livre; salário; elegível Sim/Não) e usa `Enviar para aprovação` ao finalizar.
- **Pendências**: campos vazios ficam em amarelo em tempo real; enquanto houver pendência, `Enviar para aprovação` e `Gerar Excel` ficam desativados (o backend também recusa).
- **Enviar para aprovação**: salva, marca o setor como *Enviado para aprovação* e avança a linha do tempo para a Diretoria. É uma simulação: **nenhum e-mail é enviado**. Nenhuma validação nova de gestor (como limite de distribuição) foi implementada.
- **Excel** (`/setores/<id>/excel`): um arquivo por setor, com os dados salvos. Cada geração é registrada em Logs; cópia em `output/`.
- **Logs** (menu lateral): ação executada, gerente, valor orçado da folha, percentual e data/hora.
- Aviso ao sair da página com alterações não salvas.

## Fora do escopo desta versão

Login, controle de acesso, SMTP, telas de gerente/diretoria, aprovação e empacotamento `.exe` (a estrutura de pastas é simples e compatível com PyInstaller).
