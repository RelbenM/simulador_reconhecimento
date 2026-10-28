"""Camada de dados (SQLite) do Simulador de Reconhecimento.

Contém o esquema, a carga inicial fictícia (idempotente) e as consultas
usadas pelas duas páginas.
"""
import os
import random
import sqlite3
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "simulador.db")

CICLO = "2026"

# Percentual de reconhecimento: fixo em 5% para todos os setores (somente informação textual).
PERCENTUAL_FIXO = 0.05

STATUS = {
    "nao_iniciado": "Não iniciado",
    "em_preenchimento": "Em preenchimento",
    "pronto_envio": "Pronto para envio",
    "enviado": "Enviado para aprovação",
}

# Única lista fechada: Elegível. Maturidade, conduta e zona salarial são campos de
# texto livre até que as informações para padronização sejam definidas.
OPCOES = {
    "elegivel": ["Sim", "Não"],
}

# Textos usados apenas na carga fictícia inicial.
SEED_TEXTOS = {
    "maturidade": ["Baixa", "Média", "Alta"],
    "conduta": ["Exemplar", "Adequada", "Em desenvolvimento"],
    "zona": ["Zona 1", "Zona 2", "Zona 3", "Zona 4"],
}

SCHEMA = """
CREATE TABLE IF NOT EXISTS setores (
    id          INTEGER PRIMARY KEY,
    nome        TEXT NOT NULL UNIQUE,
    gerente     TEXT NOT NULL,
    email       TEXT NOT NULL,
    orcamento   REAL NOT NULL CHECK (orcamento >= 0),
    percentual  REAL NOT NULL CHECK (percentual >= 0 AND percentual <= 1),
    status      TEXT NOT NULL DEFAULT 'nao_iniciado'
);
CREATE TABLE IF NOT EXISTS colaboradores (
    id           INTEGER PRIMARY KEY,
    setor_id     INTEGER NOT NULL REFERENCES setores(id),
    nome         TEXT NOT NULL,
    tempo_cargo  INTEGER NOT NULL,          -- em meses
    maturidade   TEXT,
    conduta      TEXT,
    salario      REAL CHECK (salario IS NULL OR salario >= 0),
    zona         TEXT,
    elegivel     TEXT
);
CREATE INDEX IF NOT EXISTS idx_colab_setor ON colaboradores(setor_id);
CREATE TABLE IF NOT EXISTS logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    acao        TEXT NOT NULL,
    gerente     TEXT NOT NULL,
    orcamento   REAL NOT NULL,
    percentual  REAL NOT NULL,
    data_hora   TEXT NOT NULL
);
"""

# id, nome, gerente, e-mail, orçamento, percentual, nº colaboradores, status, % já preenchido
SETORES_SEED = [
    (1, "Ciclo de Crédito", "Marcos Ferreira", "marcos.ferreira@exemplo.com.br", 450000, 0.50, 5, "em_preenchimento", 0.6),
    (2, "Operações", "Patrícia Lima", "patricia.lima@exemplo.com.br", 320000, 0.40, 3, "nao_iniciado", 0.0),
    (3, "Desenvolvimento de Negócios", "Rogério Alves", "rogerio.alves@exemplo.com.br", 280000, 0.45, 4, "enviado", 1.0),
    (4, "Administrativo", "Cláudia Moreira", "claudia.moreira@exemplo.com.br", 180000, 0.35, 3, "nao_iniciado", 0.0),
    (5, "Tecnologia", "Eduardo Santana", "eduardo.santana@exemplo.com.br", 260000, 0.40, 4, "nao_iniciado", 0.0),
]

NOMES = ["Ana", "Bruno", "Carla", "Daniel", "Elisa", "Felipe", "Gabriela", "Henrique", "Isabela",
         "João", "Karina", "Lucas", "Marina", "Nicolas", "Olívia", "Paulo", "Queila", "Rafael",
         "Sofia", "Thiago", "Ursula", "Vitor", "Wesley", "Yasmin", "Zeca", "Aline", "Caio", "Débora"]
SOBRENOMES = ["Almeida", "Barbosa", "Cardoso", "Dias", "Esteves", "Farias", "Gomes", "Henriques",
              "Ibrahim", "Junqueira", "Klein", "Lopes", "Machado", "Nogueira", "Oliveira", "Pereira",
              "Queiroz", "Ribeiro", "Souza", "Teixeira", "Uchoa", "Vasconcelos", "Xavier", "Zanetti"]


def get_conn():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Cria o esquema e carrega os dados fictícios apenas se o banco estiver vazio."""
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        # Percentual é fixo: também corrige bancos criados em versões anteriores.
        conn.execute("UPDATE setores SET percentual = ?", (PERCENTUAL_FIXO,))
        if conn.execute("SELECT COUNT(*) FROM setores").fetchone()[0] > 0:
            return
        for sid, nome, gerente, email, orc, pct, qtd, status, preenchido in SETORES_SEED:
            conn.execute(
                "INSERT INTO setores (id, nome, gerente, email, orcamento, percentual, status) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (sid, nome, gerente, email, orc, PERCENTUAL_FIXO, status),
            )
            rng = random.Random(sid * 97)
            nomes = set()
            while len(nomes) < qtd:
                nomes.add(f"{rng.choice(NOMES)} {rng.choice(SOBRENOMES)}")
            for i, nome_colab in enumerate(sorted(nomes)):
                preencher = i < round(qtd * preenchido)
                conn.execute(
                    "INSERT INTO colaboradores (setor_id, nome, tempo_cargo, maturidade, conduta, "
                    "salario, zona, elegivel) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        sid, nome_colab, rng.choice([6, 9, 15, 24, 30, 36, 48, 60, 84, 120]),
                        rng.choice(SEED_TEXTOS["maturidade"]) if preencher else None,
                        rng.choice(SEED_TEXTOS["conduta"]) if preencher else None,
                        float(rng.randrange(3200, 13200, 10)),
                        rng.choice(SEED_TEXTOS["zona"]) if preencher else None,
                        rng.choice(["Sim", "Sim", "Não"]) if preencher else None,
                    ),
                )


def _setor_dict(row):
    d = dict(row)
    d["disponivel"] = round(d["orcamento"] * d["percentual"], 2)
    d["status_label"] = STATUS.get(d["status"], d["status"])
    return d


def listar_setores_menu():
    with get_conn() as conn:
        return [dict(r) for r in conn.execute("SELECT id, nome FROM setores ORDER BY id")]


def listar_setores():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT s.*, "
            "(SELECT COUNT(*) FROM colaboradores c WHERE c.setor_id = s.id) AS qtd_colaboradores, "
            "(SELECT COALESCE(SUM(c.salario), 0) FROM colaboradores c WHERE c.setor_id = s.id) AS folha_salarial "
            "FROM setores s ORDER BY s.id"
        ).fetchall()
    return [_setor_dict(r) for r in rows]


def obter_setor(setor_id):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT s.*, "
            "(SELECT COUNT(*) FROM colaboradores c WHERE c.setor_id = s.id) AS qtd_colaboradores "
            "FROM setores s WHERE s.id = ?", (setor_id,)
        ).fetchone()
    return _setor_dict(row) if row else None


def listar_colaboradores(setor_id):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM colaboradores WHERE setor_id = ? ORDER BY nome", (setor_id,)
        ).fetchall()
    return [dict(r) for r in rows]


def totais():
    setores = listar_setores()
    return {
        "colaboradores": sum(s["qtd_colaboradores"] for s in setores),
        "folha": round(sum(s["orcamento"] for s in setores), 2),
        "disponivel": round(sum(s["disponivel"] for s in setores), 2),
    }


def salvar_setor(setor_id, colaboradores, status):
    """Grava os dados dos colaboradores e o status do setor em uma única transação."""
    with get_conn() as conn:
        conn.execute("UPDATE setores SET status = ? WHERE id = ?", (status, setor_id))
        for c in colaboradores:
            conn.execute(
                "UPDATE colaboradores SET maturidade = ?, conduta = ?, salario = ?, zona = ?, "
                "elegivel = ? WHERE id = ? AND setor_id = ?",
                (c["maturidade"], c["conduta"], c["salario"], c["zona"], c["elegivel"], c["id"], setor_id),
            )


def salvar_parametros(linhas):
    """Grava o orçamento de folha de vários setores (Homepage) em uma transação."""
    with get_conn() as conn:
        for l in linhas:
            conn.execute("UPDATE setores SET orcamento = ? WHERE id = ?", (l["orcamento"], l["id"]))


def registrar_log(acao, gerente, orcamento, percentual):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO logs (acao, gerente, orcamento, percentual, data_hora) VALUES (?, ?, ?, ?, ?)",
            (acao, gerente, orcamento, percentual, datetime.now().isoformat(timespec="seconds")),
        )


def listar_logs():
    with get_conn() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM logs ORDER BY id DESC")]
