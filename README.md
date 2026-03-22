# WebRTC - Development Diary
## Variabel Font Controller

Een WebRTC project waarbij een smartphone via QR-code verbindt met een desktop en een variable font live aanstuurt via gyroscoop, touchpad en spraakherkenning.

![variabel font](assets/images/var-font.png)

**Desktop:** een groot canvas met een  woord/zin (ingegeven door user).
Zwarte tekst op witte achtergrond met focus op typografische variaties.

**Smartphone:** 
User kan een woord/zin ingeven → komt op de desktop. 
Fonts worden dynamisch door font, font weight, font size, letterspacing ,etc aan te passen.


**Bewegingen:**
- x-position: font-weight 
- tilt: Normal font naar cursief
- schudden: font-size groter/ width axis breder

**Variabele fonts research**
- Archivo: width + weight
- Roboto Serif: width + weight + grade + italic
- **Fraunces**

## Planning
 
>[Bekijk mijn kanban bord op  
![Notion](https://img.shields.io/badge/Notion-000000?style=for-the-badge&logo=notion&logoColor=white)](https://www.notion.so/3210414f112a809abd19c0ff0ba34867?v=3210414f112a81abb37b000c1cc8dfbc&source=copy_link)


| Week | Doel | Status |
|------|------|--------|
| 1 | Github repo, concept uitwerken, font kiezen, mapping bepalen | complete |
| 2 | WebRTC connectie opzetten, HTTPS lokaal, QR-code | complete |
| 3 | Variable font canvas, gyroscoop, touchpad, datachannel protocol | complete |
| 4 | Spraak, italic toggle, feedback, disconnect, UX & onboarding | complete |




## Development Proces

### Week 1 — Concept

Het idee: de smartphone als fysieke controller voor een variable font op een groot scherm. Door de gsm te kantelen, aan te raken of er tegen te spreken reageert het font live.

**Font:** Fraunces (Google Fonts) — variabele assen: `wght`, `wdth`, `opsz`, `WONK` en italic.

**De mapping:**
- Gyroscoop voor/achter kantelen (beta) → `wght`
- Gyroscoop links/rechts kantelen (gamma) → `wdth`
- Touchpad X-as → `wght`, Y-as → `slant`
- Schudden → italic
- Spraak → woord verschijnt op scherm

---

### Week 2 & 3 — WebRTC Connectie


***1-op-1 via QR-sessie + websockets?***

    heb ik gedaan door [oef 7](https://github.com/devinekask/creative-code-4-s26/tree/main/websockets/projects/p07-one-on-one-qr) 
   

Projectstructuur opgezet met Express en Socket.io conform de cursus. Eerst de basis signalling geïmplementeerd met `peerOffer`, `peerAnswer` en `peerIce`, daarna omgezet naar SimplePeer:

```javascript
// server — signalling layer (eigen implementatie o.b.v. cursus)
socket.on('signal', (peerId, signal) => {
  io.to(peerId).emit('signal', peerId, signal, socket.id);
});
```

HTTPS opgezet via openssl omdat `DeviceOrientationEvent` dit vereist:

```bash
openssl req -x509 -out localhost.crt -keyout localhost.key \
  -newkey rsa:2048 -nodes -sha256 \
  -subj '/CN=localhost' -extensions EXT -config <( \
   printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
```

`.env` aangemaakt met `NODE_ENV=development`, dotenv@16 geïnstalleerd (v17+ voegt promotional tips toe aan de terminal output, dus heb ik dat terug uninstalled).

**iOS gyroscoop permission** — ondervonden dat iOS 13+ een expliciete permission request vereist:

```javascript
if (typeof DeviceOrientationEvent.requestPermission === 'function') {
  const perm = await DeviceOrientationEvent.requestPermission();
  if (perm !== 'granted') return;
}
```

---

### Week 3 & 4 — De Experience

Eigen message protocol ontworpen voor de datachannel — websockets worden enkel voor signalling gebruikt:

```javascript
// Zelf ontworpen protocol
{ type: 'font',   axes: { wght, wdth, opsz, slnt, wonk } }
{ type: 'italic', value: true }
{ type: 'color',  mode: 'hot' }
{ type: 'word',   word: 'Hallo' }
{ type: 'feedback', italic: true } // desktop → controller
```

Variable font CSS zelf geschreven:

```css
.word {
  font-variation-settings:
    'wght' var(--wght),
    'wdth' var(--wdth),
    'opsz' var(--opsz),
    'WONK' var(--wonk);
  font-style: oblique calc(var(--slnt) * 1deg);
}
```

Schuddetectie via `devicemotion` zelf geïmplementeerd met cooldown:

```javascript
const shake = Math.abs(acc.x - lastAcc.x)
            + Math.abs(acc.y - lastAcc.y)
            + Math.abs(acc.z - lastAcc.z);
if (shake > 30 && !italicLocked) {
  axes.italic = !axes.italic;
  italicLocked = true;
  setTimeout(() => { italicLocked = false; }, 800);
}
```

---

### Week 4 — UX & Afwerking

- Onboarding flow geschreven: 3 stappen (verbinden → gyro → uitleg)
- Wachtscherm met QR-code op desktop, idle animatie tot eerste verbinding
- Tab-layout op controller (Touch / Gyro / Instellingen)
- Touchpad-overlay als gyro actief is
- Disconnect functie: volledig system reset met nieuwe QR
- Google Material Icons toegevoegd i.p.v. emojis

---

## AI-gebruik

> De volgende secties documenteren waar ik Claude (AI) heb gebruikt, met de exacte prompts en de code die daaruit voortkwam. De rest van het project heb ik zelf geschreven op basis van de leerstof.

---

### AI 1 — Gyroscoop smoothing & mapping

**Probleem:** De gyroscoop gaf ruwe, schokkerige waarden. Ik wist dat ik een smoothing-functie nodig had maar kende de exacte lerp-implementatie niet uit het hoofd.

**Prompt:**
> *"beta doet de weight axis, gamma doet de width axis"*

**Code die uit AI kwam:** 

```javascript
// AI — lerp smoothing + axis mapping
gyroSmooth.beta  = lerp(gyroSmooth.beta,  axes.beta,  0.12);
gyroSmooth.gamma = lerp(gyroSmooth.gamma, axes.gamma, 0.12);

axes.wght = clamp(100 + ((gyroSmooth.beta + 90) / 180) * 800, 100, 900);
axes.wdth = clamp(75  + ((gyroSmooth.gamma + 90) / 180) * 50, 75, 125);
```

**Bijsturing:** De smoothing factor (0.12) heb ik zelf getest en aangepast — te hoog voelde traag, te laag was te schokkerig.

---

### AI 2 — iOS Speech Recognition bug

**Probleem:** De spraakherkenning crashte op Safari iOS na de eerste gebruik. Geen duidelijke error in de console.

**Prompt:**
> *"het heeft me nog een http het moet een https zijn!"* *(later)* *"kan het dat de gyroscoop niet werkt"* *(later)* *"het werkt precies niet?"*

**Gevonden oorzaken door AI:**
1. iOS vereist een nieuwe `SpeechRecognition` instantie per gebruik
2. Een actieve `AudioContext` conflicteert met de microfoon op iOS

**Code die uit AI kwam:** 

```javascript
// AI — nieuwe instantie per gebruik (iOS fix)
function buildRecognition() {
  const r = new SpeechRecognition();
  r.lang = speechLang;
  r.interimResults = true;
  r.continuous = false;
  return r;
}

// AI — suspend AudioContext voor microfoon start
$('speech-btn').addEventListener('click', () => {
  if (audioCtx && audioCtx.state === 'running') {
    audioCtx.suspend().catch(() => {});
  }
  recognition = buildRecognition();
  recognition.start();
});
```

**Bijsturing:** De taal-toggle (NL/EN knop) heb ik zelf toegevoegd na eigen testen, de automatische taaldetectie werkte onbetrouwbaar.

---

### AI 3 — iOS feedback via Web Audio API

**Probleem:** `navigator.vibrate()` werkt niet op iOS. Ik had een alternatieve feedback nodig.

**Prompt:**
> *"voeg een trilfunctie toe bij de gsm (controller) wanneer het font cursief wordt bij het schudden en zorg ook voor een fallback geluidje voor Iphone waar de trilfunctie niet werkt"*

**Code die uit AI kwam:** 

```javascript
// AI — Web Audio fallback voor iOS (vibrate werkt niet)
function triggerFeedback(italic) {
  if (navigator.vibrate) navigator.vibrate(italic ? [80, 40, 80] : [40]);
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = italic ? 880 : 440;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.15);
  } catch(e) {}
}
```

**Bijsturing:** De frequenties (880Hz / 440Hz) heb ik zelf gekozen — hoog voor italic aan, laag voor italic uit.

---

### AI 4 — Woorden doorschuif-animatie

**Prompt:**
> *"Voeg een Audio functie toe waarbij je een woord tegen de gsm kan zeggen en dat dat woord dan op het scherm komt, de vorige gezegde woorden zijn dan zo oplopend woord 2 → woord 3 → woord 4"*

**Code die uit AI kwam:** 

```javascript
// AI — woorden doorschuiven met fade animatie
function pushWord(newWord) {
  wordEls.forEach(el => {
    el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateX(-30px)';
  });
  setTimeout(() => {
    wordEls[3].textContent = wordEls[2].textContent;
    wordEls[2].textContent = wordEls[1].textContent;
    wordEls[1].textContent = wordEls[0].textContent;
    wordEls[0].textContent = newWord;
    // fade in van rechts
    wordEls.forEach(el => {
      el.style.transform = 'translateX(20px)';
      el.style.opacity = '0';
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      wordEls.forEach(el => {
        el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        el.style.opacity = '';
        el.style.transform = '';
      });
    }));
  }, 300);
}
```

---

### AI 5 — Volledige disconnect & system reset

**Prompt:**
> *"ik wil een disconnect van het volledig systeem zodat de gebruiker de qr code opnieuw zou moeten scannen"*

**Code die uit AI kwam:**

```javascript
// AI — full system reset
function fullReset() {
  if (socket && remoteSocketId) {
    socket.emit('force-disconnect', remoteSocketId);
  }
  closeSimplePeer();
  if (socket) socket.disconnect();
  connected = false;
  remoteSocketId = null;
  stopIdle();

  // Reset UI naar wachtscherm
  const waiting = document.getElementById('waiting');
  waiting.classList.remove('fade-out', 'gone');
  document.getElementById('canvas').classList.remove('visible');
  document.getElementById('sidebar').classList.remove('visible');
  document.getElementById('statusbar').classList.remove('visible');

  // Nieuwe socket → nieuw ID → nieuwe QR
  socket = io.connect('/');
  initSocketEvents();
}
```

**Bijsturing:** De bevestigingsmodal (custom UI in plaats van browser `confirm()`) heb ik zelf als vereiste gesteld na eigen beoordeling van de UX.

---

## Kritische Reflectie

Ik heb AI bewust ingezet voor specifieke technische obstakels, niet als schrijver van het volledige project.

**Wat ik zelf deed:**
De WebRTC en Socket.io structuur is gebaseerd op de cursusleerstof en heb ik zelf geïmplementeerd. Het signal protocol, de SimplePeer setup en de basisstructuur van server en clients zijn eigen werk. Het message protocol voor de datachannel heb ik zelf ontworpen. De UX-beslissingen (tab-layout, onboarding stappen, touchpad blokkeren als gyro aanstaat) kwamen van mij Ik heb gemerkt dat AI geen vragen stelt over begrijpelijkheid voor eindgebruikers.

Testen op zowel android als ios gsm's deed ik allebei. Veel bugs zijn alleen zichtbaar op een fysiek toestel: de HTTPS-vereiste voor de gyroscoop, het scroll-probleem, de speech crash op iOS.

**Waar AI nuttig was:**
AI heb ik gebruikt voor 2 soorten problemen: platform-specifieke workarounds (Web Audio als vibrate-alternatief, de iOS Speech Recognition) en wiskundige mappings (lerp-smoothing). Dit zijn zaken waar ik zelf de oplossing uiteindelijk ook had gevonden, maar AI verkortte die zoektijd significant. Ook voor de css is AI een grote hulp geweest.

**Waar ik moest bijsturen:**
AI genereerde initieel een socket fallback voor fontdata. Ik heb dit zelf opgemerkt en laten verwijderen. Ook de `confirm()` popup voor de disconnect was een AI-keuze die ik vervangen heb door een custom modal.

**Conclusie:**
AI is sterk voor specifieke technische kennis die tijdrovend is om zelf op te zoeken. Het is geen vervanger voor het begrip van de leerstof, want zonder dat begrip zou ik de output van Claude niet  kunnen beoordelen, bijsturen of integreren in het project.