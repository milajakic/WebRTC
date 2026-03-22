{
    const root = document.documentElement;
    const canvas = document.querySelector('#canvas');
    const words = document.querySelectorAll('.word');

    // ── State ────────────────────────────────────────────────────
    const state = {
    wght: 400, wdth: 100, opsz: 36, slnt: 0, wonk: 0,
    x: 0.5, y: 0.5, beta: 0, gamma: 0, italic: false
    };

    // ── Flow ──────────────────────────────────────────────────────
    let connected = false;

    const transitionToConnected = () => {
    if (connected) return;
    connected = true;

    const waiting = document.querySelector('#waiting');
    waiting.classList.add('fade-out');
    setTimeout(() => waiting.classList.add('gone'), 900);

    canvas.classList.add('visible');
    document.querySelector('#sidebar').classList.add('visible');
    document.querySelector('#statusbar').classList.add('visible');
    }

    const setWaitingStatus = (text, active) => {
    document.querySelector('#wstatus-text').textContent = text;
    document.querySelector('#wdot').classList.toggle('on', active);
    };

    // ── Msg counter ──────────────────────────────────────────────
    let msgCount = 0;
    setInterval(() => {
    document.querySelector('#fps-val').textContent = msgCount;
    msgCount = 0;
    }, 1000);

    // ── Color modes ───────────────────────────────────────────────
    const COLOR_MODES = {
    default: { bg: '#0a0a0a', fg: '#f0ece4' },
    inverted: { bg: '#f0ece4', fg: '#0a0a0a' },
    accent: { bg: '#0a1a00', fg: '#c8ff00' },
    hot: { bg: '#1a0000', fg: '#ff6644' },
    cold: { bg: '#00061a', fg: '#88ccff' }
    };

    // ── Apply state ───────────────────────────────────────────────
    const applyState = () => {
    root.style.setProperty('--wght', state.wght);
    root.style.setProperty('--wdth', state.wdth);
    root.style.setProperty('--opsz', state.opsz);
    root.style.setProperty('--slnt', state.slnt);
    root.style.setProperty('--wonk', state.wonk);
    root.style.setProperty('--cursor-x', (state.x * 100) + '%');
    root.style.setProperty('--cursor-y', (state.y * 100) + '%');
    words.forEach(w => w.classList.toggle('italic', state.italic));

    document.querySelector('#val-wght').textContent = Math.round(state.wght);
    document.querySelector('#val-wdth').textContent = Math.round(state.wdth);
    document.querySelector('#val-opsz').textContent = Math.round(state.opsz);
    document.querySelector('#val-slnt').textContent = Math.round(state.slnt * 10) / 10;
    document.querySelector('#val-wonk').textContent = Math.round(state.wonk * 10) / 10;
    document.querySelector('#bar-wght').style.width = ((state.wght - 100) / 800 * 100) + '%';
    document.querySelector('#bar-wdth').style.width = ((state.wdth - 75) / 50 * 100) + '%';
    document.querySelector('#bar-opsz').style.width = ((state.opsz - 9) / 135 * 100) + '%';
    document.querySelector('#bar-slnt').style.width = ((state.slnt + 90) / 180 * 100) + '%';
    document.querySelector('#bar-wonk').style.width = (state.wonk * 100) + '%';
    document.querySelector('#s-beta').textContent = Math.round(state.beta) + '°';
    document.querySelector('#s-gamma').textContent = Math.round(state.gamma) + '°';
    document.querySelector('#s-italic').textContent = state.italic ? 'aan' : 'uit';
    }

    // ── Handle incoming message ───────────────────────────────────
    const handleMessage = (raw) => {
    msgCount++;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'font') {
        stopIdle();
        const a = msg.axes;
        if (a.wght !== undefined) state.wght = Math.min(900, Math.max(100, a.wght));
        if (a.wdth !== undefined) state.wdth = Math.min(125, Math.max(75, a.wdth));
        if (a.opsz !== undefined) state.opsz = Math.min(144, Math.max(9, a.opsz));
        if (a.slnt !== undefined) state.slnt = Math.min(90, Math.max(-90, a.slnt));
        if (a.wonk !== undefined) state.wonk = Math.min(1, Math.max(0, a.wonk));
        if (a.x !== undefined) state.x = a.x;
        if (a.y !== undefined) state.y = a.y;
        if (a.beta !== undefined) state.beta = a.beta;
        if (a.gamma !== undefined) state.gamma = a.gamma;
        applyState();
    }

    if (msg.type === 'italic') {
        state.italic = msg.value;
        applyState();
        if (simplePeer && simplePeer.connected) {
        try { simplePeer.send(JSON.stringify({ type: 'feedback', italic: msg.value })); } catch (e) { }
        }
    }

    if (msg.type === 'color') {
        const m = COLOR_MODES[msg.mode] || COLOR_MODES.default;
        document.body.style.background = m.bg;
        root.style.setProperty('--fg', m.fg);
        root.style.setProperty('--bg', m.bg);
    }

    if (msg.type === 'word') {
        pushWord(msg.word);
    }
    }

    // ── Idle animation ────────────────────────────────────────────
    let idleRAF, idleT = 0;
    const idleAnimate = () => {
    idleT += 0.008;
    state.wght = 100 + (Math.sin(idleT) * 0.5 + 0.5) * 800;
    state.slnt = Math.sin(idleT * 0.7) * 12;
    state.opsz = 9 + (Math.sin(idleT * 0.4) * 0.5 + 0.5) * 135;
    state.wonk = Math.sin(idleT * 1.3) * 0.5 + 0.5;
    applyState();
    idleRAF = requestAnimationFrame(idleAnimate);
    }

    const stopIdle = () => {
    if (idleRAF) cancelAnimationFrame(idleRAF);
    idleRAF = null;
    };

    // ── Woorden doorschuiven ──────────────────────────────────────
    // Rij: word1 (groot) ← word2 ← word3 ← word4 (klein)
    // Nieuw woord komt op word1, de rest schuift op
    const wordEls = [
    document.querySelector('#word1'),
    document.querySelector('#word2'),
    document.querySelector('#word3'),
    document.querySelector('#word4'),
    ];

    const pushWord = (newWord) => {
    // Animeer uit naar links
    wordEls.forEach((el, i) => {
        el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        el.style.opacity = '0';
        el.style.transform = 'translateX(-30px)';
    });

    setTimeout(() => {
        // Schuif woorden op: word4 = word3, word3 = word2, word2 = word1
        wordEls[3].textContent = wordEls[2].textContent;
        wordEls[2].textContent = wordEls[1].textContent;
        wordEls[1].textContent = wordEls[0].textContent;
        // Nieuw woord op word1
        wordEls[0].textContent = newWord;

        // Reset transform, animeer in
        wordEls.forEach(el => {
        el.style.transform = 'translateX(20px)';
        el.style.opacity = '0';
        });

        requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            wordEls.forEach(el => {
            el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            el.style.opacity = '';
            el.style.transform = '';
            });
            // Reset inline opacity zodat CSS klassen weer werken
            setTimeout(() => {
            wordEls.forEach(el => {
                el.style.transition = '';
                el.style.opacity = '';
                el.style.transform = '';
            });
            }, 450);
        });
        });
    }, 300);
    }

    // ── QR helper ─────────────────────────────────────────────────
    const makeQR = (el, size) => {
    const q = qrcode(4, 'L');
    q.addData(el._url);
    q.make();
    el.innerHTML = q.createImgTag(size);
    }

    // ── Socket + SimplePeer ───────────────────────────────────────
    let socket, simplePeer, remoteSocketId;

    const setDot = (id, cls) => {
    document.querySelector('#' + id).className = 'dot ' + cls;
    };

    const setupSimplePeer = () => {
    simplePeer = new SimplePeer({
        initiator: false,
        trickle: true,
        config: {
        iceServers: [
            { urls: ['stun:stun.l.google.com:19302'] },
            { urls: ['stun:stun1.l.google.com:19302'] }
        ]
        }
    });

    simplePeer.on('signal', signal => socket.emit('signal', remoteSocketId, signal));

    simplePeer.on('connect', () => {
        setDot('dot-webrtc', 'connected');
        if (!connected) {
        transitionToConnected();
        } else {
        hideDisconnect();
        stopIdle();
        }
        idleAnimate();
    });

    simplePeer.on('data', data => {
        handleMessage(typeof data === 'string' ? data : new TextDecoder().decode(data));
    });

    simplePeer.on('error', err => console.error('[DESKTOP]', err));

    simplePeer.on('close', () => {
        setDot('dot-webrtc', 'disconnected');
        simplePeer = null;
        if (connected) showDisconnect('phone');
    });
    }

    const closeSimplePeer = () => {
    if (simplePeer) { simplePeer.destroy(); simplePeer = null; }
    setDot('dot-webrtc', 'disconnected');
    };

    // ── Full system reset ─────────────────────────────────────────
    const fullReset = () => {
    // 1. Stuur force-disconnect naar de verbonden telefoon
    if (socket && remoteSocketId) {
        socket.emit('force-disconnect', remoteSocketId);
    }

    // 2. Verbreek alles
    closeSimplePeer();
    if (socket) { socket.disconnect(); }

    // 3. Reset state
    connected = false;
    remoteSocketId = null;
    stopIdle();

    // 4. Verberg canvas, sidebar, statusbar
    document.querySelector('#canvas').classList.remove('visible');
    document.querySelector('#sidebar').classList.remove('visible');
    document.querySelector('#statusbar').classList.remove('visible');
    document.querySelector('#disconnect-overlay').classList.remove('visible');

    // 5. Reset wacht-scherm en toon het opnieuw
    const waiting = document.querySelector('#waiting');
    waiting.classList.remove('fade-out', 'gone');
    document.querySelector('#wdot').classList.remove('on');
    document.querySelector('#wstatus-text').textContent = 'Verbinden met server…';
    document.querySelector('#waiting-url').textContent = '…';
    document.querySelector('#qr-waiting').innerHTML = '';

    // 6. Nieuwe socket → nieuw ID → nieuwe QR
    socket = io.connect('/');
    initSocketEvents();
    }

    document.querySelector('#reset-btn').addEventListener('click', () => {
    document.querySelector('#confirm-modal').classList.add('visible');
    });

    document.querySelector('#confirm-cancel').addEventListener('click', () => {
    document.querySelector('#confirm-modal').classList.remove('visible');
    });

    document.querySelector('#confirm-ok').addEventListener('click', () => {
    document.querySelector('#confirm-modal').classList.remove('visible');
    fullReset();
    });

    // Klik buiten modal sluit hem
    document.querySelector('#confirm-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('visible');
    });

    // ── Disconnect overlay ────────────────────────────────────────
    const showDisconnect = (reason) => {
    const overlay = document.querySelector('#disconnect-overlay');
    document.querySelector('#dc-title').textContent = reason === 'socket' ? 'Server verbroken' : 'Telefoon verbroken';
    document.querySelector('#dc-body').textContent = reason === 'socket'
        ? 'De server is niet bereikbaar. Herstart de server en ververs de pagina.'
        : 'De telefoon heeft de verbinding verloren. Scan de QR-code opnieuw.';

    // Toon QR opnieuw bij telefoon-disconnect
    const qrWrap = document.querySelector('#dc-qr-wrap');
    if (reason === 'phone') {
        const url = document.querySelector('#qr-url-text').textContent;
        if (url) {
        const q = qrcode(4, 'L'); q.addData(url); q.make();
        document.querySelector('#dc-qr').innerHTML = q.createImgTag(4);
        qrWrap.classList.add('visible');
        }
    } else {
        qrWrap.classList.remove('visible');
    }

    document.querySelector('#dc-dot').className = 'dc-dot';
    document.querySelector('#dc-status-text').textContent = 'Wacht op herverbinding…';
    overlay.classList.add('visible');
    idleAnimate();
    }

    const hideDisconnect = () => {
    const overlay = document.querySelector('#disconnect-overlay');
    const dot = document.querySelector('#dc-dot');
    dot.className = 'dc-dot ok';
    document.querySelector('#dc-status-text').textContent = 'Verbonden!';
    setTimeout(() => overlay.classList.remove('visible'), 900);
    }

    const initSocketEvents = () => {
    socket.on('connect', () => {
        setDot('dot-socket', 'connected');
        setWaitingStatus('Socket verbonden — scan de QR-code', true);

        const url = new URL(`/controller.html?id=${socket.id}`, window.location).href.replace('http://', 'https://');

        document.querySelector('#waiting-url').textContent = url;
        document.querySelector('#url-short').textContent = socket.id.substring(0, 8) + '…';
        document.querySelector('#qr-url-text').textContent = url;

        const qw = document.querySelector('#qr-waiting');
        const qs = document.querySelector('#qr-small');
        const qb = document.querySelector('#qr-big');

        const qWait = qrcode(4, 'L'); qWait.addData(url); qWait.make();
        qw.innerHTML = qWait.createImgTag(5);

        const qSmall = qrcode(4, 'L'); qSmall.addData(url); qSmall.make();
        qs.innerHTML = qSmall.createImgTag(1);

        const qBig = qrcode(4, 'L'); qBig.addData(url); qBig.make();
        qb.innerHTML = qBig.createImgTag(6);
    });

    socket.on('signal', (peerId, signal, fromId) => {
        remoteSocketId = fromId;
        setWaitingStatus('Telefoon gevonden — verbinden…', true);
        if (connected) {
        document.querySelector('#dc-dot').className = 'dc-dot reconnecting';
        document.querySelector('#dc-status-text').textContent = 'Herverbinden…';
        }
        if (!simplePeer) setupSimplePeer();
        try { simplePeer.signal(signal); } catch (e) { console.error(e); }
    });

    socket.on('update', data => { state.x = data.x; state.y = data.y; applyState(); });

    socket.on('client-disconnect', client => {
        if (client && client.id === remoteSocketId) {
        closeSimplePeer();
        if (connected) showDisconnect('phone');
        }
    });

    socket.on('disconnect', () => {
        setDot('dot-socket', 'disconnected');
        closeSimplePeer();
        if (connected) showDisconnect('socket');
    });

    socket.on('reconnect', () => {
        setDot('dot-socket', 'connected');
        hideDisconnect();
    });
    }

    socket = io.connect('/');
    initSocketEvents();
}
