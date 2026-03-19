# WebRTC - Development Diary
## Variabel Font Controller

**Desktop:** een groot canvas met een  woord/zin (ingegeven door user).
Zwarte tekst op witte achtergrond met focus op typografische variaties.
![variabel font](assets/images/var-font.png)

**Smartphone:** 
User kan een woord/zin ingeven → komt op de desktop. 
Fonts worden dynamisch door font, font weight, font size, letterspacing ,etc aan te passen.


**Bewegingen:**
- x-position: font-weight 
- tilt: Normal font naar cursief
- schudden: font-size groter/ width axis breder

**Variabele fonts**
- Archivo: width + weight
- Roboto Serif: width + weight + grade + italic

## Planning
**Week 1**:
- **GitHub repo** aangemaakt + ingediend
- initialized
- **concept** bedenken

**Week 2**:  
- **WebRTC datachannel**
 → 1-op-1 via QR-sessie + websockets?
  
    → heb ik gedaan door [oef 7](https://github.com/devinekask/creative-code-4-s26/tree/main/websockets/projects/p07-one-on-one-qr) 
    → Hoe webrtc toevoegen? door simple-peer?

- **Test tekst op scherm** → Ervoor zorgen dat de input op de desktop belandt. 
    → later deze week

**Week 3**
- tekst inspreken 
- font inladen en testen
- animaties?
-> test test test

**Week 4**

- finishing touches

## AI Reflectie 
**Week 1**
Nog geen AI gebruikt.
Oefeningen uit de les herbekeken.

**Week 2**
Ik heb AI gebruikt om mijn WebRTC project te converteren naar Simple-Peer. Het prompt was:

"Implementeer Simple-Peer in alle drie bestanden met debug logging via console.log."

De AI heeft de volgende changes gemaakt:
- Server (index.js): Vervangen van offer/answer/ice-candidate handlers naar één 'signal' event
- Desktop (index.html): Responder (initiator: false) met SimplePeer
- Controller (controller.html): Initiator (initiator: true) met SimplePeer

Dit heeft de WebRTC logica sterk vereenvoudigd en werkt perfect.

**Week 3**
/
**Week 4**
/ 


van desktop naar mobile iets sturen
 → tril (=haptic feedback) werkt enkel bij android, dus een geluid (of iets anders) optie voor iphone toevoegen.


**Consult w4**
peer id check bij connection -> als je met 2 de qr code scant
- flow checken -> dat moet goed zitten
- alles apart zetten modules
- code opkuisen
- notion afwerken
- fallback haptic feedback
- update gedeelte weghalen van socket check consult w2
- styles en js afzonderlijk zetten