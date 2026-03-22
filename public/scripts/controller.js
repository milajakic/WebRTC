{
    const $ = id => document.querySelector('#' + id);
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;

    // ── Tabs ──────────────────────────────────────────────────────
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.querySelector(`#panel-${btn.dataset.tab}`).classList.add('active');
        });
    });

    // ── Onboarding ────────────────────────────────────────────────
    let currentStep = 1;

    const goToStep = (n) => {
        const prev = $(`step-${currentStep}`);
        prev.classList.remove('active');
        prev.classList.add('exit');
        setTimeout(() => prev.classList.remove('exit'), 450);
        currentStep = n;
        $(`step-${n}`).classList.add('active');
        document.querySelectorAll('.sdot').forEach((d, i) => d.classList.toggle('active', i + 1 === n));
    };

    const finishOnboarding = () => {
        const ob = $('onboarding');
        ob.classList.add('fade-out');
        setTimeout(() => ob.classList.add('gone'), 650);
        $('app').classList.add('visible');
    }

    const onWebRTCConnected = () => {
        $('conn-dot-1').classList.add('on');
        $('conn-text-1').textContent = 'Verbonden!';
        setTimeout(() => goToStep(2), 800);
    };

    $('gyro-onboard-btn').addEventListener('click', async () => { await enableGyro(); goToStep(3); });
    $('gyro-skip-btn').addEventListener('click', () => goToStep(3));
    $('start-btn').addEventListener('click', finishOnboarding);

    const onSocketConnected = () => {
        $('conn-dot-1').style.background = '#F44611';
        $('conn-dot-1').style.boxShadow = '0 0 8px #F44611';
        $('conn-text-1').textContent = 'Socket verbonden — wacht op WebRTC…';
    };

    // ── State ────────────────────────────────────────────────────
    const axes = { wght: 400, wdth: 100, opsz: 36, slnt: 0, wonk: 0, x: 0.5, y: 0.5, beta: 0, gamma: 0, italic: false };
    let gyroEnabled = false;
    let gyroSmooth = { beta: 0, gamma: 0 };

    // ── Schud detectie ────────────────────────────────────────────
    let lastAcc = { x: 0, y: 0, z: 0 };
    let italicLocked = false;

    window.addEventListener('devicemotion', e => {
        if (!gyroEnabled) return;
        const acc = e.accelerationIncludingGravity;
        if (!acc) return;
        const shake = Math.abs(acc.x - lastAcc.x) + Math.abs(acc.y - lastAcc.y) + Math.abs(acc.z - lastAcc.z);
        lastAcc = { x: acc.x, y: acc.y, z: acc.z };
        if (shake > 30 && !italicLocked) {
            axes.italic = !axes.italic;
            italicLocked = true;
            updateItalicIndicator();
            // Flash shake indicator
            const si = $('shake-indicator');
            si.classList.add('shook');
            setTimeout(() => si.classList.remove('shook'), 600);
            setTimeout(() => { italicLocked = false; }, 800);
            send({ type: 'italic', value: axes.italic });
        }
    });

    const updateItalicIndicator = () => {
        $('italic-val').textContent = axes.italic ? 'aan' : 'uit';
        $('italic-indicator').classList.toggle('on', axes.italic);
    };

    // ── RAF loop ──────────────────────────────────────────────────
    let rafRunning = false;
    const startRAF = () => {
        if (rafRunning) return;
        rafRunning = true;
        loop();
    }

    const loop = () => {
        if (gyroEnabled) {
            gyroSmooth.beta = lerp(gyroSmooth.beta, axes.beta, 0.12);
            gyroSmooth.gamma = lerp(gyroSmooth.gamma, axes.gamma, 0.12);

            axes.wght = clamp(100 + ((gyroSmooth.beta + 90) / 180) * 800, 100, 900);
            axes.wdth = clamp(75 + ((gyroSmooth.gamma + 90) / 180) * 50, 75, 125);

            // Update grote gyro viz
            const viz = $('gyro-viz-big');
            const ball = $('gyro-ball-big');
            const bx = clamp((gyroSmooth.gamma + 90) / 180, 0, 1) * viz.clientWidth;
            const by = clamp((gyroSmooth.beta + 90) / 180, 0, 1) * viz.clientHeight;
            ball.style.left = bx + 'px';
            ball.style.top = by + 'px';

            // Update readings
            $('gr-wght').textContent = Math.round(axes.wght);
            $('gr-wdth').textContent = Math.round(axes.wdth);
        }

        sendFontMessage();
        requestAnimationFrame(loop);
    }

    // ── Send helpers ──────────────────────────────────────────────
    const SEND_INTERVAL = 16;
    let lastSent = 0;

    const send = (obj) => {
        const msg = JSON.stringify(obj);
        if (simplePeer && simplePeer.connected) {
            try { simplePeer.send(msg); } catch (e) { }
        }
    };

    const sendFontMessage = () => {
        const now = performance.now();
        if (now - lastSent < SEND_INTERVAL) return;
        lastSent = now;
        send({ type: 'font', axes: { ...axes } });
    }

    // ── Touchpad ──────────────────────────────────────────────────
    const touchpad = $('touchpad');
    const cursor = $('touch-cursor');

    const updateFromTouch = (cx, cy) => {
        const rect = touchpad.getBoundingClientRect();
        const nx = clamp((cx - rect.left) / rect.width, 0, 1);
        const ny = clamp((cy - rect.top) / rect.height, 0, 1);
        axes.x = nx; axes.y = ny;
        axes.wght = clamp(100 + nx * 800, 100, 900);
        axes.slnt = clamp((ny - 0.5) * -24, -12, 12);
        cursor.style.left = (nx * 100) + '%';
        cursor.style.top = (ny * 100) + '%';
        $('touch-cursor').querySelector('.tp-hint') && ($('touch-cursor').querySelector('.tp-hint').style.display = 'none');
    };

    touchpad.addEventListener('touchstart', e => { e.preventDefault(); updateFromTouch(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    touchpad.addEventListener('touchmove', e => { e.preventDefault(); updateFromTouch(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    touchpad.addEventListener('mousedown', e => updateFromTouch(e.clientX, e.clientY));
    touchpad.addEventListener('mousemove', e => { if (e.buttons) updateFromTouch(e.clientX, e.clientY); });

    // ── Sliders ───────────────────────────────────────────────────
    const setupSlider = (id, key, labelId) => {
        const el = $(id), lb = $(labelId);
        el.addEventListener('input', () => {
            axes[key] = parseFloat(el.value);
            lb.textContent = Math.round(parseFloat(el.value) * 100) / 100;
        });
    };
    setupSlider('slider-opsz', 'opsz', 'label-opsz');
    setupSlider('slider-wonk', 'wonk', 'label-wonk');

    // ── Gyro ──────────────────────────────────────────────────────
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    const enableGyro = async () => {
        if (!isSecure) return;
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const perm = await DeviceOrientationEvent.requestPermission();
                if (perm !== 'granted') return;
            } catch (e) { return; }
        }
        window.addEventListener('deviceorientation', onOrientation);
        gyroEnabled = true;
        $('gyro-toggle-big').textContent = 'Gyro uitschakelen';
        $('gyro-toggle-big').classList.add('active');
        $('touchpad-blocked').classList.add('visible');
    }

    const disableGyro = async () => {
        window.removeEventListener('deviceorientation', onOrientation);
        gyroEnabled = false;
        $('gyro-toggle-big').textContent = 'Gyro inschakelen';
        $('gyro-toggle-big').classList.remove('active');
        $('touchpad-blocked').classList.remove('visible');
    };

    $('gyro-toggle-big').addEventListener('click', async () => {
        if (gyroEnabled) disableGyro(); else await enableGyro();
    });

    // "Gyro uitschakelen" knop op touchpad overlay
    $('tp-disable-gyro-btn').addEventListener('click', () => {
        disableGyro();
        // Spring naar touch tab
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelector('[data-tab="touch"]').classList.add('active');
        $('panel-touch').classList.add('active');
    });

    const onOrientation = (e) => {
        axes.beta = e.beta != null ? e.beta : 0;
        axes.gamma = e.gamma != null ? e.gamma : 0;
    };

    // ── Color buttons ─────────────────────────────────────────────
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            send({ type: 'color', mode: btn.dataset.mode });
        });
    });

    // ── Speech ────────────────────────────────────────────────────
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition || window.msSpeechRecognition;
    const isiOS = /iP(hone|od|ad)/.test(navigator.platform) || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
    let recognition = null;
    let speechListening = false;
    let speechLang = 'nl-NL';

    const buildRecognition = () => {
        if (!SpeechRecognition) return null;
        const r = new SpeechRecognition();
        r.lang = speechLang;
        r.interimResults = true;
        r.continuous = false;
        r.maxAlternatives = 1;

        r.onstart = () => {
            speechListening = true;
            $('speech-btn').classList.add('listening');
            $('speech-label').textContent = 'Luisteren…';
            $('speech-result').textContent = '…';
        };

        r.onresult = (e) => {
            let transcript = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                transcript = e.results[i][0].transcript.trim();
                if (e.results[i].isFinal) {
                    const word = transcript.split(' ')[0];
                    $('speech-result').textContent = `✓ "${word}"`;
                    send({ type: 'word', word });
                    return;
                }
            }
            $('speech-result').textContent = `"${transcript}"`;
        };

        r.onerror = (e) => {
            const msgs = { 'not-allowed': '⚠ Geen microfoon toegang', 'no-speech': '⚠ Geen spraak', 'network': '⚠ Netwerk fout' };
            $('speech-result').textContent = msgs[e.error] || `⚠ ${e.error}`;
            resetSpeechBtn();
        };

        r.onend = () => resetSpeechBtn();
        return r;
    }

    if (!SpeechRecognition) {
        $('speech-btn').disabled = true;
        $('speech-btn').style.opacity = '0.35';
        $('speech-label').textContent = 'Spraak niet ondersteund in deze browser';
    } else if (isiOS && !window.webkitSpeechRecognition) {
        $('speech-btn').disabled = true;
        $('speech-btn').style.opacity = '0.35';
        $('speech-label').textContent = 'iOS ondersteunt geen Web Speech API in deze browser';
    }

    const resetSpeechBtn = () => {
        speechListening = false; recognition = null;
        $('speech-btn').classList.remove('listening');
        $('speech-label').textContent = 'Spreek een woord';
    };

    $('speech-btn').addEventListener('click', () => {
        if (!SpeechRecognition || (isiOS && !window.webkitSpeechRecognition)) return;
        if (speechListening && recognition) { recognition.stop(); return; }
        if (audioCtx && audioCtx.state === 'running') audioCtx.suspend().catch(() => { });
        recognition = buildRecognition();
        if (!recognition) {
            $('speech-result').textContent = '⚠ Spraakherkenning niet beschikbaar';
            return;
        }
        try { recognition.start(); } catch (e) {
            $('speech-result').textContent = '⚠ ' + e.message;
            resetSpeechBtn();
        }
    });

    $('speech-lang-btn').addEventListener('click', () => {
        speechLang = speechLang === 'nl-NL' ? 'en-US' : 'nl-NL';
        $('speech-lang-btn').textContent = speechLang === 'nl-NL' ? 'NL' : 'EN';
    });

    // ── Feedback ──────────────────────────────────────────────────
    let audioCtx = null;

    document.addEventListener('touchstart', () => {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }, { once: true });

    const triggerFeedback = (italic) => {
        if (navigator.vibrate) navigator.vibrate(italic ? [80, 40, 80] : [40]);
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.frequency.value = italic ? 880 : 440;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.15);
        } catch (e) { }
    }

    // ── Disconnect ────────────────────────────────────────────────
    const showDCBanner = (title, body, type) => {
        $('dc-banner-title').textContent = title;
        $('dc-banner-body').textContent = body;
        $('dc-banner-dot').className = 'dc-banner-dot' + (type === 'reconnecting' ? ' reconnecting' : '');
        $('dc-banner').classList.add('visible');
    };

    const hideDCBanner = () => { $('dc-banner').classList.remove('visible'); };

    // ── Socket + SimplePeer ───────────────────────────────────────
    let socket, simplePeer, targetSocketId;

    const setPill = (id, on) => { $(id).classList.toggle('connected', on); };

    const setupSimplePeer = () => {
        simplePeer = new SimplePeer({
            initiator: true, trickle: true,
            config: {
                iceServers: [
                    { urls: ['stun:stun.l.google.com:19302'] },
                    { urls: ['stun:stun1.l.google.com:19302'] }
                ]
            }
        });

        simplePeer.on('signal', signal => socket.emit('signal', targetSocketId, signal));

        simplePeer.on('connect', () => {
            setPill('pill-webrtc', true);
            hideDCBanner();
            onWebRTCConnected();
            startRAF();
        });

        simplePeer.on('data', data => {
            const raw = typeof data === 'string' ? data : new TextDecoder().decode(data);
            try {
                const msg = JSON.parse(raw);
                if (msg.type === 'feedback') triggerFeedback(msg.italic);
            } catch (e) { }
        });

        simplePeer.on('error', err => console.error('[CTRL]', err));
        simplePeer.on('close', () => {
            setPill('pill-webrtc', false);
            simplePeer = null;
            showDCBanner('Verbinding verbroken', 'Herverbinden met desktop…', 'reconnecting');
        });
    }

    const getParam = (name) => {
        const r = new RegExp('[\\?&]' + name.replace(/[\[\]]/g, '\\$&') + '=([^&#]*)');
        const m = r.exec(location.search);
        return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : false;
    };

    targetSocketId = getParam('id');
    if (!targetSocketId) {
        document.body.innerHTML = '<div style="padding:2rem;color:#ff4444;font-family:monospace;">Missing ?id= parameter</div>';
    } else {
        socket = io.connect('/');

        socket.on('connect', () => {
            setPill('pill-socket', true);
            onSocketConnected();
            setupSimplePeer();
        });

        socket.on('signal', (peerId, signal) => {
            if (!simplePeer) setupSimplePeer();
            try { simplePeer.signal(signal); } catch (e) { console.error(e); }
        });

        socket.on('force-disconnect', () => {
            if (simplePeer) { simplePeer.destroy(); simplePeer = null; }
            setPill('pill-webrtc', false);
            hideDCBanner();
            $('app').classList.remove('visible');
            $('force-dc').classList.add('visible');
        });

        socket.on('disconnect', () => {
            setPill('pill-socket', false);
            setPill('pill-webrtc', false);
            showDCBanner('Server verbroken', 'Ververs de pagina als dit aanhoudt.', '');
        });

        socket.on('reconnect', () => {
            setPill('pill-socket', true);
            hideDCBanner();
        });
    }
}
