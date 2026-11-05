"""
Gera data/catena/{Mt,Mc,Lc,Jo}/{capitulo}.json a partir do Commentaries-Database
(HistoricalChristianFaith, domínio público), filtrando os trechos da Catena Aurea
(tradução inglesa de J. H. Newman, 1841).

Preparação (uma vez): baixar em tools/.cache/commentaries.sqlite o arquivo da release
    https://github.com/HistoricalChristianFaith/Commentaries-Database/releases/latest

Uso, a partir da raiz do projeto (só biblioteca padrão do Python):
    python tools/build_catena.py
"""

import json
import re
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BANCO = RAIZ / "tools" / ".cache" / "commentaries.sqlite"
SAIDA = RAIZ / "data" / "catena"

LIVROS = {"matthew": "Mt", "mark": "Mc", "luke": "Lc", "john": "Jo"}

AUTORES = {
    "Augustine of Hippo": "Santo Agostinho",
    "Bede": "São Beda",
    "Theophylact of Ohrid": "Teofilacto",
    "John Chrysostom": "São João Crisóstomo",
    "Jerome": "São Jerônimo",
    "Origen of Alexandria": "Orígenes",
    "Gregory the Dialogist": "São Gregório Magno",
    "Ambrose of Milan": "Santo Ambrósio",
    "Oecumenius": "Ecumênio",
    "Hilary of Poitiers": "Santo Hilário de Poitiers",
    "Pseudo-Chrysostom": "Pseudo-Crisóstomo",
    "Cyril of Alexandria": "São Cirilo de Alexandria",
    "Glossa Ordinaria": "Glosa Ordinária",
    "Remigius of Rheims": "São Remígio",
    "Rabanus Maurus": "Rábano Mauro",
    "Pseudo-Jerome": "Pseudo-Jerônimo",
    "Alcuin of York": "Alcuíno de York",
    "Andreas of Caesarea": "André de Cesareia",
    "Basil of Caesarea": "São Basílio Magno",
    "Ancient Greek Expositor": "Antigo expositor grego",
    "Titus of Bostra": "Tito de Bostra",
    "Eusebius of Caesarea": "Eusébio de Cesareia",
    "Gregory of Nyssa": "São Gregório de Nissa",
    "Ammonius of Alexandria": "Amônio de Alexandria",
    "Athanasius of Alexandria": "Santo Atanásio",
    "Didymus the Blind": "Dídimo, o Cego",
    "Pseudo-Augustine": "Pseudo-Agostinho",
    "Peter Chrysologus": "São Pedro Crisólogo",
    "Leo the Great": "São Leão Magno",
    "Severus of Antioch": "Severo de Antioquia",
    "Gregory of Nazianzus": "São Gregório Nazianzeno",
    "Maximus the Confessor": "São Máximo, o Confessor",
    "John Damascene": "São João Damasceno",
    "Pseudo-Origen": "Pseudo-Orígenes",
    "Isidore of Pelusium": "Santo Isidoro de Pelúsio",
    "Cyprian": "São Cipriano",
    "Haymo of Halberstadt": "Haimo de Halberstadt",
    "Hesychius of Jerusalem": "Hesíquio de Jerusalém",
    "Theodoret of Cyrus": "Teodoreto de Ciro",
    "Pseudo-Dionysius the Areopagite": "Pseudo-Dionísio Areopagita",
    "Ambrosiaster": "Ambrosiaster",
    "Anselm of Canterbury": "Santo Anselmo",
    "Clement of Alexandria": "Clemente de Alexandria",
    "Council of Ephesus": "Concílio de Éfeso",
    "Cyril of Jerusalem": "São Cirilo de Jerusalém",
    "Dionysius of Alexandria": "São Dionísio de Alexandria",
    "Epiphanius of Salamis": "Santo Epifânio de Salamina",
    "Gennadius of Massilia": "Genádio de Marselha",
    "Isidore of Seville": "Santo Isidoro de Sevilha",
    "John Cassian": "São João Cassiano",
    "Josephus": "Flávio Josefo",
    "Lanfranc of Canterbury": "Lanfranco de Cantuária",
    "Maximus of Turin": "São Máximo de Turim",
    "Nemesius of Emesa": "Nemésio de Emesa",
    "Papias of Hierapolis": "Pápias de Hierápolis",
    "Paschasius Radbertus": "São Pascásio Radberto",
    "Petrus Alphonsi": "Pedro Afonso",
    "Pseudo-Basil": "Pseudo-Basílio",
    "Second Council of Constantinople": "II Concílio de Constantinopla",
    "Theodotus of Ancyra": "Teódoto de Ancira",
    "Vigilius of Thapsus": "Vigílio de Tapso",
}

# Citação inicial da fonte, ex.: "(in Esai. 2.)", "(App. Serm. 84.)", "(ubi sup.)"
RE_CITACAO = re.compile(r"^\s*\(([^()]{1,80})\)\s*")


def main():
    if not BANCO.exists():
        sys.exit(f"Banco não encontrado: {BANCO} (veja as instruções no topo do script)")

    con = sqlite3.connect(BANCO)
    linhas = con.execute(f"""
        select father_name, book, location_start, location_end, txt, source_url
        from commentary
        where source_title like '%Catena%' and book in ({",".join("?" * len(LIVROS))})
        order by book, location_start, location_end, rowid
    """, list(LIVROS)).fetchall()

    por_capitulo = defaultdict(list)
    sem_mapa = set()
    for autor, livro, ini, fim, txt, url in linhas:
        cap, v_ini = divmod(ini, 1_000_000)
        cap_fim, v_fim = divmod(fim, 1_000_000)
        if cap_fim != cap:
            v_fim = 999  # trecho que atravessa o capítulo
        txt = re.sub(r"\s+", " ", txt or "").strip()
        citacao = None
        m = RE_CITACAO.match(txt)
        if m:
            citacao, txt = m.group(1).strip(), txt[m.end():]
        if not txt:
            continue
        if autor not in AUTORES:
            sem_mapa.add(autor)
        por_capitulo[(LIVROS[livro], cap)].append({
            "vIni": v_ini, "vFim": max(v_fim, v_ini),
            "autor": AUTORES.get(autor, autor), "autorOriginal": autor,
            "citacao": citacao, "texto": txt, "url": url,
        })

    if sem_mapa:
        print("Autores sem nome em português (mantidos em inglês):", ", ".join(sorted(sem_mapa)))

    fonte = ("Catena Aurea de São Tomás de Aquino — trad. inglesa de J. H. Newman (1841), "
             "via HistoricalChristianFaith/Commentaries-Database (domínio público)")
    indice = defaultdict(list)
    for (livro, cap), trechos in sorted(por_capitulo.items()):
        pasta = SAIDA / livro
        pasta.mkdir(parents=True, exist_ok=True)
        dados = {"livro": livro, "capitulo": cap, "idioma": "en", "fonte": fonte, "trechos": trechos}
        (pasta / f"{cap}.json").write_text(json.dumps(dados, ensure_ascii=False, separators=(",", ":")), "utf-8")
        indice[livro].append(cap)
    (SAIDA / "indice.json").write_text(json.dumps(indice, ensure_ascii=False), "utf-8")

    total = sum(len(t) for t in por_capitulo.values())
    print(f"{total} trechos em {len(por_capitulo)} arquivos -> {SAIDA}")


if __name__ == "__main__":
    main()
