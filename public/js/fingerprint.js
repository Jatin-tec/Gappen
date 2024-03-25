async function getFingerprint() {
    const fingerprintData = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screen: {
            width: screen.width,
            height: screen.height,
            colorDepth: screen.colorDepth,
        },
        timezoneOffset: new Date().getTimezoneOffset(),
        sessionStorage: !!window.sessionStorage,
        localStorage: !!window.localStorage,
        indexedDB: !!window.indexedDB,
        cookiesEnabled: navigator.cookieEnabled,
        canvasFingerprint: await getCanvasFingerprint(),
        webGLFingerprint: getWebGLFingerprint(),
        audioFingerprint: await getAudioFingerprint(),
        fonts: await getFonts(),
    };

    // TODO: Implement a hashing function to hash the fingerprint data
    const fingerprint = JSON.stringify(fingerprintData);
    return fingerprint;
}

function getCanvasFingerprint() {
    return new Promise(resolve => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('Hello, world!', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Hello, world!', 4, 17);

        resolve(canvas.toDataURL());
    });
}

function getWebGLFingerprint() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
}

async function getAudioFingerprint() {
    const context = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100);
    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, context.currentTime);

    const compressor = context.createDynamicsCompressor();
    for (let field in compressor) {
        if (typeof compressor[field] === 'number' || typeof compressor[field] === 'boolean') {
            try {
                compressor[field].setValueAtTime(compressor[field], context.currentTime);
            } catch (e) {}
        }
    }

    oscillator.connect(compressor);
    compressor.connect(context.destination);
    oscillator.start(0);

    // Only call startRendering once, and wait for it to complete.
    const buffer = await context.startRendering();
    const data = buffer.getChannelData(0);
    let fingerprint = 0;
    for (let i = 0; i < data.length; ++i) {
        fingerprint += data[i];
    }
    return fingerprint;
}

async function getFonts() {
    // Use CSS Font Loading API, fallback to other methods if necessary
    const fontList = ['Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New', 'Comic Sans MS', 'Impact'];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const h = document.getElementsByTagName('body')[0];
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const widths = {};
    const results = {};

    baseFonts.forEach(baseFont => {
        const s = document.createElement('span');
        s.style.fontSize = testSize;
        s.innerHTML = testString;
        s.style.fontFamily = baseFont;
        h.appendChild(s);
        widths[baseFont] = s.offsetWidth;
        h.removeChild(s);
    });

    for (let i = 0; i < fontList.length; i++) {
        const font = fontList[i];
        results[font] = false;
        for (let j = 0; j < baseFonts.length; j++) {
            const s = document.createElement('span');
            s.style.fontSize = testSize;
            s.innerHTML = testString;
            s.style.fontFamily = font + ',' + baseFonts[j]; // Try font first, then fallback.
            h.appendChild(s);
            if (s.offsetWidth !== widths[baseFonts[j]]) {
                results[font] = true; // The width is different, font is active.
            }
            h.removeChild(s);
        }
    }
    return results; // Returns an object with fonts as keys and boolean values indicating presence.
}

async function hashFingerprint(fingerprint) {
    const msgUint8 = new TextEncoder().encode(fingerprint); // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); // hash
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // buffer to byte array
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // bytes to hex string
    return hashHex;
}
