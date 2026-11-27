# ⚡ Clipador: cortes automáticos de lives

Você cola o canal e ele faz o resto: grava a live em blocos de 10 minutos, acha os lances, corta em pé com legenda, dá uma nota para cada corte e posta sozinho no TikTok, Reels e Shorts quando a nota passa da sua nota mínima.

```
 Monitor ──► Detector ──► Corte ──► Nota ──► Post
 grava a      cruza        9:16 com   0 a 10   passou da sua
 live em      volume,      legenda    (+ IA)   nota, posta
 blocos de    movimento    palavra             sozinho
 10 min       e fala       a palavra
```

## O que ele faz

| Etapa | Como funciona |
|---|---|
| **Canais** | YouTube: vídeo novo é conferido a cada 15 min, e as lives do YouTube também são gravadas. Twitch e Kick: a live é gravada e cortada em blocos de 10 min, com ela ainda no ar. |
| **Link avulso** | Cola o link de um vídeo ou VOD e ele é cortado uma vez. VOD da Twitch/Kick é baixado em fluxo, então os primeiros blocos já são cortados enquanto o resto baixa. Também dá para enviar um arquivo de vídeo. |
| **Monitor** | Confere se o canal entrou ao vivo (a cada 2 min) e grava a live em blocos. Cada bloco entra na fila assim que fecha. Reprise (RERUN) da Twitch é ignorada. |
| **Detector** | Cruza **volume** (grito, explosão), **movimento** (ação na tela) e **fala** (transcrição com Whisper e palavras de empolgação como "caraca", "não acredito" e "kkkk"). Trecho parado é marcado e pulado. Começo e fim do corte são ajustados para não cortar frase no meio. |
| **Corte** | Sai em pé, 1080×1920, com legenda grande palavra a palavra (a palavra falada fica em destaque), título no topo e áudio normalizado. Quatro formatos: fundo desfocado, cortar no centro, facecam em cima + jogo embaixo (você marca a facecam na tela) e inteiro. |
| **Nota** | Todo corte ganha uma nota de 0 a 10. Com uma chave da Anthropic, o Claude lê a transcrição, dá a nota dele e escreve título, legenda e hashtags. |
| **Post** | Passou da nota mínima: posta sozinho nas redes ligadas (TikTok, Instagram Reels, YouTube Shorts), com limite de posts por dia. Se preferir, deixe no modo "só aprova" e poste com um clique. |

### O que tem além do vídeo
- **Gráfico do detector** para cada bloco (volume, movimento, fala, empolgação, trecho parado e onde saiu cada corte). Clicar no trecho do gráfico abre o corte.
- **Ajuste fino**: mude o começo e o fim, ou troque o formato, e refaça o corte sem reprocessar a live.
- **Editar título, legenda e hashtags** antes de postar.
- **Configuração por canal**: nota mínima, formato e postagem automática.
- **Aviso no Discord** quando um corte fica pronto ou é postado.
- **Limpeza automática** dos blocos brutos depois de X horas, para não lotar o disco. Os cortes ficam.
- **Login com conta própria**: no primeiro acesso aparece "Criar minha conta".
- Painel em português que também funciona no celular.

---

## Como rodar

### Docker (mais fácil)
```bash
cd clipador
cp .env.example .env        # opcional: coloque ANTHROPIC_API_KEY etc.
docker compose up -d --build
```
Abra **http://localhost:8000**, crie sua conta e cole um canal.

### Sem Docker
Precisa de **Python 3.10+** e **ffmpeg** (com libass, que é o padrão nas distribuições).
```bash
cd clipador
pip install -r requirements.txt
python run.py               # painel em http://localhost:8000
```
Os dados (banco, gravações e cortes) ficam em `clipador/data/`. Para mudar a pasta, use `CLIPADOR_DATA=/outro/lugar`.

> **Dica de máquina:** a transcrição (Whisper `small`) roda bem em CPU. Um bloco de 10 min leva de 1 a 3 min para ser analisado. Com GPU NVIDIA dá para usar `medium` ou `large-v3`. Para monitorar várias lives ao mesmo tempo, aumente "Blocos processados em paralelo".

---

## Conectando as redes

Tudo é configurado em **Configurações › Postagem**. Sem nenhuma rede ligada, os cortes que passam da nota ficam como "Aprovado" para você baixar e postar.

### YouTube Shorts
1. No [Google Cloud Console](https://console.cloud.google.com/), crie um projeto e ative a **YouTube Data API v3**.
2. Crie uma credencial **OAuth client ID** e anote o *client id* e o *client secret*.
3. No [OAuth Playground](https://developers.google.com/oauthplayground/), clique na engrenagem, marque "Use your own OAuth credentials" e cole o client id e o client secret. Autorize o escopo `https://www.googleapis.com/auth/youtube.upload` e troque o código pelo token. Copie o **refresh token**.
4. Cole os três campos no painel e ligue o YouTube.

> Projetos novos do Google que ainda não passaram pela auditoria da API só conseguem publicar como **privado**. Para publicar como público, peça a auditoria do app no Google.

### TikTok
1. Crie um app em [developers.tiktok.com](https://developers.tiktok.com/) com o produto **Content Posting API** e o escopo `video.publish`.
2. Faça o login OAuth com a sua conta e pegue o **refresh token**.
3. Cole o *client key*, o *client secret* e o *refresh token* no painel. O acesso é renovado sozinho.

> Enquanto o app não for auditado pelo TikTok, os posts só podem sair como **"Só eu"** (SELF_ONLY).

### Instagram Reels
1. A conta precisa ser **Profissional** (Criador ou Empresa).
2. Crie um app na [Meta for Developers](https://developers.facebook.com/) com acesso à Instagram API e à permissão `instagram_content_publish`.
3. Gere um **token de longa duração** e pegue o **ID da conta do Instagram** (IG user id).
4. Cole os dois no painel e ligue o Instagram. O envio usa upload direto, então não precisa de URL pública.

### Nota com IA (Claude)
Crie uma chave em [console.anthropic.com](https://console.anthropic.com/) e cole em **Configurações › Nota e IA**, ou defina `ANTHROPIC_API_KEY` no `.env`. O modelo padrão é `claude-opus-5-5` e dá para trocar no painel. O peso da IA na nota final também é configurável (padrão de 50%).

### YouTube pedindo "confirme que você não é um robô"
Em servidores, o YouTube às vezes bloqueia downloads. Exporte o `cookies.txt` do navegador em que você está logado no YouTube (com uma extensão do tipo "Get cookies.txt") e envie em **Configurações › Monitor**.

---

## Como o detector decide

Para cada meio segundo do bloco ele mede:
- **volume**: energia do áudio em dB;
- **movimento**: diferença entre quadros seguidos;
- **fala**: palavras por segundo na transcrição, com bônus para as palavras de empolgação. Sem transcrição, usa a energia na faixa de voz.

Cada curva é normalizada dentro do bloco, as três são somadas com os pesos que você escolher, e o trecho ganha um bônus quando dois ou mais sinais sobem juntos. Os picos que mais se destacam viram cortes, com uns 4 segundos de contexto antes do lance. A nota do detector junta o quanto o pico se destaca, a empolgação média, a cobertura de fala, as palavras de hype e a concordância entre os sinais. Tela parada e silêncio contam como "trecho parado" e são pulados.

## Estrutura

```
clipador/
├── run.py              # inicia o servidor
├── app/
│   ├── server.py       # API + login
│   ├── engine.py       # monitor de canais, gravador de lives, downloads, fila
│   ├── sources.py      # YouTube / Twitch / Kick (yt-dlp + streamlink)
│   ├── transcribe.py   # Whisper (faster-whisper) com tempo por palavra
│   ├── detector.py     # volume × movimento × fala → lances
│   ├── editor.py       # corte 9:16 + legenda ASS + título (ffmpeg)
│   ├── scorer.py       # nota heurística + Claude (nota, título, legenda)
│   ├── publisher.py    # TikTok, Instagram, YouTube, Discord
│   ├── pipeline.py     # bloco → cortes → nota → post
│   ├── db.py, config.py, util.py
└── web/                # painel (HTML/CSS/JS, sem build)
```

## Avisos
- Só corte e poste conteúdo que você tem permissão para usar (o seu canal, ou de streamers que autorizam cortes).
- As APIs do TikTok, do Instagram e do YouTube exigem apps aprovados para postar publicamente. Leia as observações de cada rede acima.
