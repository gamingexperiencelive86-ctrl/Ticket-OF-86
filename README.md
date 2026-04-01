# Discord Ticket Bot configurabile

Bot Discord sviluppato in **Node.js + discord.js v14** con:

- pannello ticket configurabile da Discord
- canale dove spawnare il pannello configurabile
- canale log configurabile
- categoria ticket configurabile
- ruolo staff configurabile
- grafica pannello configurabile
- testo del bottone ticket configurabile
- messaggio dentro al ticket configurabile
- pulsante **Prendi in carico**
- pulsante **Chiudi Ticket**
- transcript automatico del ticket in `.txt`
- compatibile con hosting web 24/7

---

## 1. File del progetto

- `index.js` → bot principale
- `package.json` → dipendenze e avvio
- `.env.example` → esempio variabili ambiente
- `data/configs.json` → configurazioni server
- `data/tickets.json` → ticket aperti
- `transcripts/` → transcript salvati localmente
- `.gitignore` → esclude file inutili da GitHub

---

## 2. Requisiti

Prima di iniziare ti servono:

- un account Discord
- un account GitHub
- Node.js 18 o superiore
- un hosting online tipo **Railway** o **Render**
- un'applicazione bot creata nel **Discord Developer Portal**

Discord richiede di attivare gli intent necessari dal Developer Portal quando il bot li usa. Gli intent privilegiati si gestiscono nella sezione **Bot** del portale sviluppatori. citeturn741754search2turn741754search6

---

## 3. Creare il bot su Discord

### 3.1 Crea l'applicazione

1. Vai nel **Discord Developer Portal**.
2. Crea una **New Application**.
3. Apri la scheda **Bot**.
4. Clicca su **Add Bot**.
5. Copia il **Token** del bot.
6. Copia anche il **Application ID**: ti servirà come `CLIENT_ID`.

### 3.2 Abilita gli intent

Nel tab **Bot** abilita gli intent che servono:

- **Message Content Intent**
- altri intent privilegiati solo se ti servono davvero

Discord specifica che gli intent privilegiati si attivano nel Developer Portal, nella pagina del bot. citeturn741754search2turn741754search18

### 3.3 Invita il bot nel server

Usa l'URL OAuth2 del tuo bot con gli scope:

- `bot`
- `applications.commands`

Permessi consigliati:

- View Channels
- Send Messages
- Manage Channels
- Manage Messages
- Read Message History
- Attach Files
- Use Slash Commands

---

## 4. Installazione locale

### 4.1 Scarica il progetto

Estratto lo ZIP, apri il terminale nella cartella del progetto.

### 4.2 Installa le dipendenze

```bash
npm install
```

### 4.3 Crea il file `.env`

Rinomina `.env.example` in `.env` e inserisci:

```env
TOKEN=IL_TOKEN_DEL_TUO_BOT
CLIENT_ID=IL_CLIENT_ID_DEL_BOT
```

### 4.4 Avvio locale

```bash
npm start
```

Se il bot parte correttamente vedrai un messaggio tipo:

```bash
Bot online come NomeBot#0000
```

---

## 5. Comandi disponibili nel server

### Configurazione base

```text
/ticket-settings canali
/ticket-settings staff
/ticket-settings nome-ticket
/ticket-settings mostra
```

### Grafica pannello

```text
/ticket-grafica testi
/ticket-grafica bottone
/ticket-grafica colore
```

### Messaggi ticket

```text
/ticket-messaggi benvenuto
/ticket-messaggi presa-carico
/ticket-messaggi chiusura
```

### Log e pannello

```text
/ticket-log canale
/ticket-panel
```

### Comandi interni ticket

```text
/ticket-add
/ticket-remove
/ticket-close
```

---

## 6. Configurazione completa da Discord

### 6.1 Impostare il canale dove spawnare il pannello, il log e la categoria ticket

Esempio:

```text
/ticket-settings canali canale_pannello:#ticket canale_log:#ticket-log categoria_ticket:Tickets
```

Con questo comando decidi:

- dove mandare il pannello ticket
- dove mandare i log
- in quale categoria creare i ticket

### 6.2 Impostare il ruolo staff

```text
/ticket-settings staff ruolo:@Staff
```

### 6.3 Impostare il nome dei ticket

```text
/ticket-settings nome-ticket formato:ticket-{user}-{number}
```

Placeholder supportati:

- `{user}` = nome utente
- `{number}` = numero progressivo ticket

### 6.4 Cambiare grafica del pannello

Titolo, descrizione e footer:

```text
/ticket-grafica testi
```

Bottone ticket:

```text
/ticket-grafica bottone testo:Apri Supporto emoji:🎫
```

Colore embed:

```text
/ticket-grafica colore hex:#5865F2
```

### 6.5 Cambiare i messaggi del ticket

Messaggio di benvenuto:

```text
/ticket-messaggi benvenuto testo:Ciao {user}, descrivi qui il tuo problema
```

Messaggio presa in carico:

```text
/ticket-messaggi presa-carico testo:✅ Ticket preso da {staff}
```

Messaggio di chiusura:

```text
/ticket-messaggi chiusura testo:🔒 Ticket in chiusura...
```

### 6.6 Inviare il pannello ticket

```text
/ticket-panel
```

Questo comando invia il pannello nel canale configurato.

---

## 7. Come funziona il sistema ticket

### Apertura

L'utente clicca sul pulsante del pannello.
Il bot:

- controlla se ha già un ticket aperto
- crea un nuovo canale nella categoria scelta
- imposta i permessi per utente, staff e bot
- manda il messaggio iniziale configurato
- invia il log nel canale log

### Presa in carico

Lo staff clicca **Prendi in carico**.
Il bot:

- salva chi ha preso il ticket
- aggiorna il bottone
- manda il messaggio di presa in carico
- manda il log nel canale log

### Chiusura

Lo staff clicca **Chiudi Ticket** oppure usa `/ticket-close`.
Il bot:

- genera il transcript `.txt`
- lo invia nel canale log
- manda il log di chiusura
- elimina il canale dopo pochi secondi

---

## 8. Dove vengono salvati i log

Hai due tipi di log:

### 8.1 Log Discord

Li scegli tu con:

```text
/ticket-log canale canale:#ticket-log
```

oppure con:

```text
/ticket-settings canali
```

### 8.2 Transcript locali

I transcript vengono salvati nella cartella:

```text
/transcripts
```

Questa cartella è sul server dove hosti il bot.
Su Discord puoi scegliere il **canale log**, ma la **cartella locale** dipende dall'hosting.

---

## 9. Caricare il progetto su GitHub

GitHub permette di creare un repository e caricare un progetto sia dal sito sia dalla riga di comando. Puoi creare un nuovo repository dal menu **New repository** e puoi anche caricare un progetto locale già esistente. citeturn741754search7turn741754search11turn741754search15

### Metodo sito web

1. Accedi a GitHub.
2. Clicca **New repository**.
3. Dai un nome al repository, per esempio `discord-ticket-bot`.
4. Clicca **Create repository**.
5. Carica i file del progetto.

### Metodo terminale

Dentro la cartella del progetto:

```bash
git init
git add .
git commit -m "Prima versione bot ticket"
git branch -M main
git remote add origin https://github.com/TUO-NOME/discord-ticket-bot.git
git push -u origin main
```

Se usi GitHub CLI, la documentazione ufficiale mostra anche il flusso per creare un repository e fare push di un progetto locale esistente. citeturn741754search3

---

## 10. Hosting online 24/7

Per tenerlo attivo h24 hai bisogno di un hosting online.
Le opzioni più semplici sono:

- **Railway**
- **Render**
- **VPS**

### Importante

I bot Discord non devono stare sul tuo PC se li vuoi online sempre.
Devono stare su un servizio che rimane acceso continuamente.

---

## 11. Deploy su Railway

Railway supporta il deploy di app Node.js, anche direttamente da repository GitHub, e supporta deploy automatici quando fai push. citeturn741754search4turn741754search8turn741754search12

### Passaggi

1. Carica il progetto su GitHub.
2. Crea un account su Railway.
3. Clicca **New Project**.
4. Seleziona **Deploy from GitHub Repo**.
5. Collega GitHub a Railway.
6. Seleziona il repository del bot.
7. Nelle variabili ambiente aggiungi:

```text
TOKEN=tuo_token
CLIENT_ID=tuo_client_id
```

8. Railway eseguirà build e deploy.
9. Dopo il deploy il bot resterà online finché il servizio è attivo nel tuo piano.

### Start command

Railway in genere usa il comando del progetto Node automaticamente dal `package.json`.
In questo progetto è:

```bash
npm start
```

---

## 12. Deploy su Render

Render consente di creare **Web Services**, collegare GitHub e fare deploy automatici a ogni push. Render documenta anche un percorso iniziale gratuito per alcuni servizi. citeturn741754search1turn741754search9turn741754search13turn741754search17turn741754search21

### Passaggi

1. Carica il progetto su GitHub.
2. Crea un account su Render.
3. Clicca **New +** → **Web Service**.
4. Collega il repository GitHub.
5. Seleziona il repository del bot.
6. Imposta:

```text
Build Command: npm install
Start Command: npm start
```

7. Nelle Environment Variables aggiungi:

```text
TOKEN=tuo_token
CLIENT_ID=tuo_client_id
```

8. Avvia il deploy.

### Nota su Render

In questo progetto c'è anche un piccolo server HTTP che risponde se Render assegna una variabile `PORT`, così il servizio può avviarsi anche come web service.

---

## 13. Consigli per tenerlo davvero stabile

Per evitare problemi:

- non caricare mai `.env` su GitHub
- lascia `.env` solo nelle variabili ambiente dell'hosting
- usa Node.js 18+
- controlla che il bot abbia i permessi giusti nel server
- controlla che il ruolo del bot sia sopra ai ruoli che deve gestire
- se cambi token, aggiorna subito anche l'hosting

---

## 14. Problemi comuni

### Il bot è online ma non risponde ai comandi

Controlla:

- `TOKEN` corretto
- `CLIENT_ID` corretto
- bot invitato con scope `applications.commands`
- permessi del bot
- slash command registrati correttamente

### Il ticket non si crea

Controlla:

- categoria ticket impostata bene
- bot con permesso **Manage Channels**
- ruolo bot abbastanza alto

### I log non arrivano

Controlla:

- canale log impostato
- bot con permesso di scrivere nel canale log

### Il bot non resta online h24

Controlla:

- che il deploy sia stato fatto su un hosting online
- che il servizio non sia sospeso per limiti del piano
- che le variabili ambiente siano corrette

---

## 15. Avvio rapido completo

### Locale

```bash
npm install
cp .env.example .env
npm start
```

### GitHub

```bash
git init
git add .
git commit -m "discord ticket bot"
git branch -M main
git remote add origin https://github.com/TUO-NOME/discord-ticket-bot.git
git push -u origin main
```

### Render / Railway

1. collega GitHub
2. seleziona repository
3. inserisci `TOKEN` e `CLIENT_ID`
4. avvia deploy
5. controlla i log

---

## 16. Personalizzazioni future

Puoi aggiungere facilmente:

- select menu con più reparti
- transcript HTML
- database MySQL o MongoDB
- blacklist ticket
- limite ticket per utente o ruolo
- form iniziale con domande quando si apre il ticket
- assegnazione automatica staff
- salvataggio su database cloud

---

## 17. Licenza

Usalo e modificalo liberamente per il tuo server.
