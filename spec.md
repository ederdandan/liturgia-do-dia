# Especificação Técnica (PRD) — Plataforma Liturgia & Tradição Católica

> **Revisão 2 (04/11/2026):** fontes de dados validadas com chamadas reais. Corrigido o formato da API de liturgia, adicionadas fontes para *Homilia/Reflexão*, *Santo do Dia* e *Catena Aurea*, e definida uma cadeia de redundância (fallback) para cada bloco de conteúdo.

## 1. Visão Geral & Objetivos do Sistema

### 1.1. Propósito
Desenvolver uma aplicação web estática, minimalista e responsiva para leitura devocional diária da Liturgia Católica, estudo dos Santos do Dia, Homilias e referências de comentários da Patrística e da *Catena Aurea* (São Tomás de Aquino).

### 1.2. Princípios de Design & UX
* **Visual Minimalista:** Foco absoluto na leitura sem distrações (tipografia legível, espaçamento amplo, paleta sépia/monocromática com acento sutil na cor litúrgica do dia).
* **Zero Custo de Servidor:** Deploy direto no **GitHub Pages**.
* **Sem Dependências de Build Complexas:** A aplicação roda diretamente no navegador, sem Node.js/bundlers. Scripts de *preparação de dados* (ver §6.2) são executados uma única vez, fora do runtime, e seu resultado (JSON) é versionado no repositório.
* **Uso:** Estritamente pessoal e não comercial. Todas as fontes de terceiros devem ser creditadas no rodapé de cada bloco.

---

## 2. Arquitetura & Stack Tecnológica

| Camada | Tecnologia / Recurso | Detalhes |
| :--- | :--- | :--- |
| **Frontend** | Single Page Application (SPA) | HTML5, TailwindCSS (CDN), Vanilla JavaScript (ES6+ modules) |
| **Hospedagem** | GitHub Pages | Servidor estático |
| **Estilização** | Tailwind CSS + Google Fonts | `Merriweather` (corpo) e `Cinzel` (títulos) |
| **Persistência Local** | `localStorage` | Preferências (tema, fonte), leituras salvas e **cache de respostas por data** |
| **Dados Patrísticos** | `data/catena/{Mt,Mc,Lc,Jo}.json` (local) | Gerados a partir do *Commentaries-Database* (domínio público) |

### 2.1. Matriz de Fontes de Dados (todas testadas, CORS liberado `*`)

| Conteúdo | Primária | Redundância 1 | Redundância 2 / Último recurso |
| :--- | :--- | :--- | :--- |
| **Leituras do dia** | Liturgia Diária API v2 (PT-BR, tradução CNBB) | Evangelizo JSON `/readings` (PT, tradução de Portugal) | Cache local da data → mensagem amigável |
| **Título litúrgico & cor** | Liturgia Diária API v2 (`liturgia`, `cor`) | Evangelizo `liturgic_title` (sem cor) → cor inferida pelo tempo litúrgico | LitCal API (instável, só cor/grau) |
| **Orações (coleta, oferendas, comunhão)** | Liturgia Diária API v2 (`oracoes`) | — | Ocultar seção |
| **Santo do Dia** | Evangelizo `/saints` (nome, imagem, biografia, oração) | Wikipedia REST `page/summary` (resumo + imagem) | Texto de `liturgia` + `assets/default-saint.jpg` |
| **Homilia & Reflexão** | Evangelizo `/commentary` (comentário diário de Padres, santos e papas) | Antífonas + orações do dia (Liturgia API) como meditação | Link externo para o comentário |
| **Catena Aurea** | `data/catena/*.json` local | Comentário patrístico da Evangelizo (quando o autor é Padre da Igreja) | Mensagem "sem comentário para esta perícope" |

**Endpoints:**

| Serviço | URL base | Observações |
| :--- | :--- | :--- |
| Liturgia Diária API (v2) | `https://liturgia.up.railway.app/v2/?dia=D&mes=M&ano=AAAA` | Projeto comunitário (hospedagem gratuita Railway): pode ter *cold start* lento ou cair → timeout de 8s |
| Evangelizo (JSON) | `https://publication.evangelizo.ws/PT/days/AAAA-MM-DD[/readings\|/saints\|/commentary\|/liturgy]` | Termos de uso não localizados publicamente: uso pessoal, com crédito "Fonte: Evangelizo.org" |
| Evangelizo (feed legado) | `https://feed.evangelizo.org/v2/reader.php?date=AAAAMMDD&lang=PT&type=…` | Alternativa caso a API JSON mude (retorna HTML simples) |
| Wikipedia REST | `https://pt.wikipedia.org/api/rest_v1/page/summary/{Titulo}` | Buscar **sem** prefixo "São/Santa/S." (ex.: `Carlos_Borromeu`) |
| Wikipedia Busca | `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=…&format=json&origin=*` | Usada quando o `summary` retornar 404 |
| LitCal (opcional) | `https://litcal.johnromanodorazio.com/api/v5/calendar?year=AAAA` | Instável nos testes (503); sem calendário do Brasil; usar só para cor |

---

## 3. Requisitos Funcionais & Mapeamento de Telas

### 3.1. Cabeçalho / Navegação
* **Indicador Litúrgico:** Data atual, título litúrgico (ex.: "Quarta-feira da 31ª semana do Tempo Comum" ou a memória do santo) e indicador de cor litúrgica (Verde, Branco, Vermelho, Roxo ou Rosa).
* **Seletor de Datas:** Botões dia anterior/próximo + date picker discreto. A data fica na URL (`#2026-11-04`) para permitir favoritos e o botão Voltar.
* **Controles de Leitura:**
  * Alternador de Tema (Claro / Escuro / Sépia).
  * Ajuste de Tamanho de Fonte ($A^-$ / $A^+$).
  * Modo leitura sem distrações (ocultar menus).

### 3.2. Abas de Conteúdo
1. **Liturgia do Dia:**
   * Antífona de entrada (quando houver).
   * Primeira Leitura (Título + Referência + Texto, com números de versículo em sobrescrito).
   * Salmo Responsorial (Refrão destacado + Versículos).
   * Segunda Leitura (somente quando houver — ver §5.1.A).
   * Evangelho (Título + Referência + Texto).
   * Orações: Coleta, Sobre as Oferendas, Depois da Comunhão.
2. **Santo do Dia:**
   * Nome e descrição curta (ex.: "bispo, +1584"); outros santos do dia listados abaixo.
   * Imagem (Evangelizo `image_links.large`; se ausente, `thumbnail`/`originalimage` da Wikipedia).
   * Biografia (Evangelizo `bio`) + "Saiba mais" com resumo e link da Wikipedia.
   * Oração (Evangelizo `prayer` ou coleta do dia).
3. **Homilia & Reflexão:**
   * Comentário do dia (Evangelizo `/commentary`): título, texto, autor, descrição do autor e obra de origem.
4. **Patrística & Catena Aurea:**
   * Trechos da *Catena Aurea* cujos versículos **se sobrepõem** à perícope do Evangelho do dia.
   * Agrupados por versículo e identificados por autor (ex.: *São João Crisóstomo*, *Santo Agostinho*).
   * Texto em inglês (tradução de J. H. Newman, 1841), com aviso na tela; nomes dos autores em português.

---

## 4. Requisitos Não-Funcionais & Resiliência

1. **Cadeia de Fallback:** Cada bloco da matriz §2.1 é carregado de forma independente (`Promise.allSettled`). A falha de um bloco nunca impede a exibição dos outros.
2. **Timeouts:** Toda chamada `fetch` usa `AbortController` (8s para a Liturgia API, 5s para as demais) antes de tentar a próxima fonte.
3. **Cache:** Respostas normalizadas ficam no `localStorage` por data (`cache:v1:AAAA-MM-DD:{bloco}`). Datas passadas nunca expiram; a data atual expira em 6h; resultados vindos de fonte **reserva** expiram em 30 min (para a primária ser tentada de novo). Limite de ~60 datas, removendo as mais antigas. O cache é obrigatório: a Evangelizo responde **HTTP 429** com muitas requisições seguidas.
4. **Normalização:** Cada fonte é convertida para o **modelo interno** (§5.3) num *adapter*. A interface só conhece o modelo interno.
5. **Sanitização:** Conteúdo HTML de terceiros (bio do santo, feed Evangelizo) passa por sanitização (lista de tags permitidas: `p, br, em, strong, i, b`) antes de ser inserido no DOM.
6. **Responsividade:** Mobile-First, otimizado para smartphones e para computadores/tablets.
7. **Velocidade:** Carregamento inicial alvo $< 1.5s$ com cache quente. *Skeletons* em todos os blocos durante o `fetch`. Arquivos da Catena carregados sob demanda (só o Evangelho do dia).
8. **Execução local:** Abrir `index.html` via `file://` bloqueia o `fetch` dos JSON locais. Para desenvolvimento use um servidor estático (`python -m http.server`).

---

## 5. Modelos de Dados & APIs

### 5.1. Respostas Reais das APIs (verificadas em 04/11/2026)

#### A. Liturgia Diária API v2
```javascript
// GET https://liturgia.up.railway.app/v2/?dia=4&mes=11&ano=2026
{
  "data": "04/11/2026",
  "liturgia": "São Carlos Borromeu, bispo, Memória",   // título litúrgico; contém o santo quando há memória
  "cor": "Branco",
  "oracoes": { "coleta": "...", "oferendas": "...", "comunhao": "...", "extras": [] },
  "leituras": {
    "primeiraLeitura": [{ "referencia": "Fl 2,12-18", "titulo": "Leitura da carta de São Paulo aos Filipenses", "texto": "12Meus queridos, ..." }],
    "salmo":           [{ "referencia": "Sl 26", "refrao": "...", "texto": "..." }],
    "segundaLeitura":  [],                                // vazio em dias de semana
    "evangelho":       [{ "referencia": "Lc 14,25-33", "titulo": "Proclamação do Evangelho...", "texto": "Naquele tempo, 25grandes multidões..." }],
    "extras": []
  },
  "antifonas": { "entrada": "...", "comunhao": "..." }
}
```
> ⚠️ **Particularidades do texto (verificadas em ~265 leituras de 2026):** o primeiro versículo frequentemente vem sem número; números aparecem colados a pontuação ou letras (`contigo!”29Maria`, `escolhestes25para`, `procede?,3Pois`); mudança de capítulo como `28,1Quem`; erros de digitação (`3Naquele` em Lc 24,13-35); referências com espaços ou lixo (`Fl 2, 5-11`, `Ecl, 3,1-11`, `Lc 14,1.7-11¬¬`) e indicação de forma (`(mais longo)`/`(mais breve)`). Alguns dias têm **mais de um Evangelho** (ex.: Domingo de Páscoa: Jo 20,1-9 e Lc 24,13-35); a interface deve exibir todos.
>
> ⚠️ **Diferenças em relação à v1** (`/` sem `v2`): na v1 o campo `dia` contém a **coleta**, as leituras ficam na raiz e `segundaLeitura` vem como **string** ("Não há segunda leitura hoje!") quando não existe. Não há campo `santo` em nenhuma versão. Os números de versículo vêm colados ao texto (`"12Meus"`) e devem ser convertidos com regex para `<sup>`. O *adapter* deve aceitar leituras como objeto **ou** array.

#### B. Evangelizo (JSON)
```javascript
// GET https://publication.evangelizo.ws/PT/days/2026-11-04
{ "data": { "date": "2026-11-04", "liturgic_title": "Quarta-feira da 31ª semana do Tempo Comum", "links": [ /* readings, liturgy, special-liturgy, commentary, saints */ ] } }

// GET .../readings → data[]
{ "reading_code": "Ph 2,12-18", "type": "reading", "book": { "code": "Ph", "full_title": "Carta aos Filipenses" },
  "chorus": null, "text": "[[Ph 2,12]]Caríssimos: ... \n[[Ph 2,13]]Na verdade, ..." }   // marcadores [[Livro c,v]] por versículo

// GET .../saints → data[]
{ "name": "S. Carlos Borromeu", "short_description": "bispo, +1584",
  "image_links": { "large": "https://files.evangelizo.org/images/santibeati/.../San_Carlo_Borromeo_AA.jpg" },
  "bio": "<p>São Carlos Borromeu, nascido a 2 de outubro de 1538...</p>", "bio_source": "...", "prayer": "..." }

// GET .../commentary → data
{ "title": "«Se alguém quiser seguir-Me...» (Mt 16,24)", "description": "Queridos irmãos, ...",
  "source": "Sermão 12", "author": { "name": "Isaac da Estrela (?-c. 1171)", "short_description": "monge cisterciense" } }
```
> As abreviaturas de livros da Evangelizo estão em latim/inglês (`Ph`, `Lk`, `Mt`) e precisam de uma tabela de mapeamento para PT (`Fl`, `Lc`, `Mt`).

#### C. Wikipedia REST API
```javascript
// GET https://pt.wikipedia.org/api/rest_v1/page/summary/Carlos_Borromeu
{ "title": "Carlos Borromeu", "extract": "Carlos Borromeu foi um cardeal italiano...",
  "thumbnail": { "source": "https://.../330px-Carlo_Borromeo.jpg" },
  "originalimage": { "source": "https://.../Carlo_Borromeo.jpg" },
  "content_urls": { "desktop": { "page": "https://pt.wikipedia.org/wiki/Carlos_Borromeu" } } }
```
> Normalização do nome: remover prefixos (`São`, `Santo`, `Santa`, `S.`, `Sto.`, `Sta.`, `Bem-aventurado`) e sufixos após vírgula (`, bispo, Memória`). Em caso de 404, usar a API de busca e aceitar o primeiro resultado que contenha o sobrenome.

### 5.2. Estrutura dos Arquivos Locais da Catena Aurea

Um arquivo **por capítulo** (`data/catena/{Mt,Mc,Lc,Jo}/{capitulo}.json`, 89 arquivos, maior ~180 KB), com **faixa de versículos** para busca por sobreposição. O texto fica **em inglês** (tradução de Newman); só os nomes dos autores são traduzidos.

```json
{
  "livro": "Lc", "capitulo": 14, "idioma": "en",
  "fonte": "Catena Aurea de São Tomás de Aquino — trad. inglesa de J. H. Newman (1841), via HistoricalChristianFaith/Commentaries-Database (domínio público)",
  "trechos": [
    { "vIni": 25, "vFim": 25, "autor": "Teofilacto", "autorOriginal": "Theophylact of Ohrid",
      "citacao": null, "texto": "For because many of those that accompanied Him...", "url": "https://historicalchristian.faith/..." }
  ]
}
```

**Regra de correspondência:** dada a referência `Lc 14,25-33`, carregar `Lc/14.json` e selecionar os trechos onde `vIni <= 33 && vFim >= 25`. Referências com múltiplos trechos (`Lc 14,25-27.33`) ou capítulos (`Mt 5,43-6,4`) devem ser divididas antes. Referências com forma alternativa (`1Ts 4,13-18 ou 13-14`, comum aos domingos) usam a forma longa (antes do "ou").

### 5.3. Modelo Interno (normalizado pelos adapters)
```javascript
{
  data: "2026-11-04",
  titulo: "São Carlos Borromeu, bispo, Memória",
  cor: "branco",                                      // verde | branco | vermelho | roxo | rosa
  leituras: [ { tipo: "primeira|salmo|segunda|evangelho", titulo, referencia, refrao, versiculos: [{ n, texto }] } ],
  oracoes: { coleta, oferendas, comunhao },
  antifonas: { entrada, comunhao },
  santo: { nome, descricao, imagem, bio, oracao, wikiUrl, outros: [] },
  reflexao: { titulo, texto, autor, autorDescricao, obra },
  catena: [ { vIni, vFim, autor, texto, textoEn, traducao } ],
  fontes: { leituras: "liturgia-api|evangelizo|cache", santo: "...", ... }
}
```

---

## 6. Estrutura de Arquivos do Repositório

### 6.1. Aplicação (publicada no GitHub Pages)
```text
/
├── index.html                  # Interface SPA (HTML + Tailwind CDN)
├── css/
│   └── styles.css              # Temas (variáveis CSS), tipografia, skeletons
├── js/
│   ├── app.js                  # Inicialização, estado da data, roteamento por hash
│   ├── apiService.js           # fetch com timeout, cadeia de fallback, cache
│   ├── adapters/
│   │   ├── liturgiaApi.js      # Liturgia API v1/v2 → modelo interno
│   │   ├── evangelizo.js       # Evangelizo → modelo interno
│   │   └── wikipedia.js        # Wikipedia → santo
│   ├── catenaService.js        # Parser de referências bíblicas + busca por sobreposição
│   ├── uiService.js            # Temas, abas, preferências, skeletons, erros
│   └── utils/
│       ├── sanitize.js         # Sanitização de HTML de terceiros
│       └── books.js            # Mapeamento de abreviaturas (PT ↔ EN/latim)
├── data/
│   └── catena/                 # {Mt,Mc,Lc,Jo}/{capitulo}.json + indice.json
└── assets/
    └── default-saint.jpg       # Imagem clássica genérica (domínio público)
```

### 6.2. Preparação de Dados (executada uma única vez, fora do runtime)
```text
tools/
└── build_catena.py             # Gera data/catena/*.json
```
Etapas do script (só biblioteca padrão do Python):
1. Ler `tools/.cache/commentaries.sqlite`, baixado da release `latest` de `github.com/HistoricalChristianFaith/Commentaries-Database` (~163 MB, **não versionado**).
2. Filtrar `source_title` contendo "Catena" e livros Matthew/Mark/Luke/John (9.273 trechos).
3. Mapear nomes de autores para a forma portuguesa e separar a citação inicial (ex.: `(in Hom. 37. in Ev)`).
4. Gravar um JSON por capítulo no formato §5.2 e `data/catena/indice.json`.

---

## 7. Instruções de Implementação para a IA de Codificação

1. A aplicação deve rodar publicando a raiz da branch `main` no GitHub Pages (localmente, via servidor estático simples).
2. Usar Tailwind CSS via CDN e ES modules nativos (sem bundler).
3. Toda chamada `fetch` deve ter timeout, tratar exceções e cair para a próxima fonte da matriz §2.1; esgotadas as fontes, exibir uma mensagem elegante no bloco afetado.
4. Exibir em cada bloco um pequeno crédito da fonte usada (Liturgia API, Evangelizo, Wikipedia, Commentaries-Database).
5. Manter o design sóbrio, limpo e com excelente contraste (WCAG AA nos três temas) para leitura prolongada.
6. Ordem sugerida de entrega: (0) estrutura base → (1) apiService + adapters + cache → (2) uiService/temas → (3) abas Liturgia e Santo → (4) Reflexão → (5) `build_catena.py` + aba Catena → (6) leituras salvas / offline (opcional).
