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

## AI Reflectie 
**Week 1**
Nog geen AI gebruikt.
Oefeningen uit de les herbekeken.

**Week 2**
Claude Haiku 4.5:
Ik ga je project uitbreiden met WebRTC, geïnspireerd op de les-voorbeelden. WebRTC zal gebruikt worden voor directere peer-to-peer communicatie (bijv. voor video/audio), terwijl WebSockets blijven voor signaling.

# WebRTC Integration Changes

## Overview
Toegevoegd WebRTC peer-to-peer connectie via Socket.io signaling.

## Server (index.js)

### WebRTC Signaling Handlers
- `offer` - Doorsturen van WebRTC offer naar peer
- `answer` - Doorsturen van WebRTC answer naar peer
- `ice-candidate` - Doorsturen van ICE candidates voor NAT traversal
- `peer-disconnected` - Notificatie bij disconnect

```javascript
socket.on('offer', (targetSocketId, offer) => {
  io.to(targetSocketId).emit('offer', { from: socket.id, offer });
});
```

## Desktop (index.html)

### Nieuwe Features
- RTCPeerConnection setup met STUN servers
- Automatisch antwoord geven op WebRTC offer
- ICE candidate handling
- Connection state monitoring (Connected/Disconnected status)

### RTCPeerConnection Handlers
```javascript
peerConnection.onicecandidate = (event) => {
  if (event.candidate) socket.emit('ice-candidate', ...);
};

peerConnection.onconnectionstatechange = () => {
  // Update status based on connection state
};
```

## Controller (controller.html)

### Nieuwe Features
- Initieert WebRTC offer naar desktop
- Ontvangt answer van desktop
- Verwerkt ICE candidates
- Connection state monitoring
- Cursor tracking blijft via Socket.io

### WebRTC Flow
1. Controller connects via Socket.io
2. Controller cre&eert en stuurt offer
3. Desktop ontvangt offer en stuurt answer
4. ICE candidates worden uitgewisseld
5. P2P connectie wordt opgezet

## Configuration
```javascript
const rtcConfig = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    { urls: ['stun:stun1.l.google.com:19302'] }
  ]
};
```

## Status Indicators
Beide clients tonen:
- ✅ Socket Connection status
- ✅ WebRTC Connection status
- ✅ Device ID

## Notes
- WebRTC signaling gaat via Socket.io
- Cursor updates gaan nog via Socket.io (lightweight)
- Geen media streams (geen camera/audio nodig)
- P2P ready voor toekomstige uitbreidingen


## consult
- simple peer (mss van scratch met een button enkel)
- agenda blokken maken : beter plannen
AI:
account regelen AI in vsc 
vragen -> claude sonnet 4.6
schrijven -> agent mode (opus)

