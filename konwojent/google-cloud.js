(() => {
  const cfg = window.CPG_GOOGLE_CONFIG || {};
  const endpoint = () => String(cfg.endpoint || '').trim().replace(/\/+$/, '');
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function isConfigured() {
    return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/i.test(endpoint());
  }

  function createToken() {
    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    let s = '';
    bytes.forEach(b => { s += String.fromCharCode(b); });
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  async function postNoCors(action, data = {}) {
    if (!isConfigured()) throw new Error('Google Apps Script nie jest skonfigurowany.');
    await fetch(endpoint(), {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-store',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ action, ...data })
    });
  }

  function jsonp(params = {}, timeoutMs = 15000) {
    if (!isConfigured()) return Promise.reject(new Error('Google Apps Script nie jest skonfigurowany.'));
    return new Promise((resolve, reject) => {
      const callback = `__cpgGoogleCb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      const timer = setTimeout(() => cleanup(new Error('Brak odpowiedzi z Google.')), timeoutMs);
      function cleanup(err, value) {
        clearTimeout(timer);
        try { delete window[callback]; } catch {}
        script.remove();
        err ? reject(err) : resolve(value);
      }
      window[callback] = data => cleanup(null, data);
      const qs = new URLSearchParams({ ...params, callback, _: String(Date.now()) });
      script.src = `${endpoint()}?${qs.toString()}`;
      script.async = true;
      script.onerror = () => cleanup(new Error('Nie udało się połączyć z Google Apps Script.'));
      document.head.appendChild(script);
    });
  }

  async function health() {
    const r = await jsonp({ action: 'health' }, 10000);
    if (!r?.ok) throw new Error(r?.error || 'Usługa Google nie odpowiada.');
    return r;
  }

  async function getMeta(date, token) {
    const r = await jsonp({ action: 'meta', date, token }, 12000);
    if (!r?.ok) throw new Error(r?.error || 'Nie znaleziono konwoju.');
    return r;
  }

  async function publishConvoy(payload, plannerPin, token = createToken(), onProgress = null) {
    const date = payload?.convoy?.date;
    if (!date) throw new Error('Brak daty konwoju.');
    if (!plannerPin) throw new Error('Podaj PIN planisty.');
    const progress = (stage, extra = {}) => {
      try { onProgress?.({ stage, ...extra }); } catch {}
    };
    progress('sending');
    await postNoCors('publish', { date, token, plannerPin, payload });
    progress('sent');
    let lastError = null;
    for (let i = 0; i < 5; i++) {
      progress('verifying', { attempt: i + 1, total: 5 });
      await sleep(700 + i * 500);
      try {
        const meta = await getMeta(date, token);
        progress('verified', { attempt: i + 1, total: 5 });
        return { token, meta };
      } catch (e) { lastError = e; }
    }
    progress('failed');
    throw lastError || new Error('Nie udało się potwierdzić publikacji w Google.');
  }

  async function getConvoy(date, token) {
    const r = await jsonp({ action: 'load', date, token }, 15000);
    if (!r?.ok) throw new Error(r?.error || 'Nie znaleziono planu.');
    return { data: r.payload, meta: r.meta || null };
  }

  async function claimConvoy(date, token, deviceId) {
    const r = await jsonp({ action: 'claim', date, token, deviceId }, 12000);
    if (!r?.ok) throw new Error(r?.error || 'Nie udało się zarezerwować konwoju.');
    return r;
  }

  async function releaseConvoy(date, token, deviceId) {
    try {
      const r = await jsonp({ action: 'release', date, token, deviceId }, 8000);
      return !!r?.ok;
    } catch { return false; }
  }

  async function saveConvoy(date, token, payload, options = {}) {
    if (!date || !token) throw new Error('Brak identyfikatora konwoju.');
    const deviceId = String(options.deviceId || '');
    const baseRevision = Number(options.baseRevision || payload?.convoy?.revision || 1);
    const expectedRevision = baseRevision + 1;
    await postNoCors('save', { date, token, payload, deviceId, baseRevision });
    let last = null;
    for (let i = 0; i < 5; i++) {
      await sleep(550 + i * 450);
      try {
        last = await getMeta(date, token);
        const revision = Number(last?.revision || 1);
        const writer = String(last?.lastWriterDeviceId || '');
        if (revision === expectedRevision && (!deviceId || writer === deviceId)) return last;
        if (revision > baseRevision && deviceId && writer && writer !== deviceId) {
          const err = new Error('Konwój został zmieniony na innym urządzeniu. Wczytaj najnowszą wersję przed dalszą pracą.');
          err.code = 'CONFLICT';
          err.meta = last;
          throw err;
        }
      } catch (e) {
        if (e?.code === 'CONFLICT') throw e;
      }
    }
    if (last) {
      const revision = Number(last?.revision || 1);
      const writer = String(last?.lastWriterDeviceId || '');
      if (revision > baseRevision && deviceId && writer && writer !== deviceId) {
        const err = new Error('Konwój został zmieniony na innym urządzeniu. Wczytaj najnowszą wersję przed dalszą pracą.');
        err.code = 'CONFLICT';
        err.meta = last;
        throw err;
      }
    }
    throw new Error('Zmiana została wysłana, ale nie udało się potwierdzić zapisu.');
  }

  async function sha256Hex(text) {
    if (!crypto?.subtle) throw new Error('Ta przeglądarka nie obsługuje bezpiecznego logowania planisty.');
    const bytes = new TextEncoder().encode(String(text));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function plannerLogin(pin) {
    if (!pin) throw new Error('Podaj PIN planisty.');
    const challenge = await jsonp({ action: 'adminChallenge' }, 10000);
    if (!challenge?.ok || !challenge?.nonce) throw new Error(challenge?.error || 'Nie udało się rozpocząć logowania.');
    const proof = await sha256Hex(`${pin}:${challenge.nonce}`);
    const login = await jsonp({ action: 'adminLogin', nonce: challenge.nonce, proof }, 10000);
    if (!login?.ok || !login?.adminToken) throw new Error(login?.error || 'Nieprawidłowy PIN planisty.');
    return login;
  }

  async function listConvoys(adminToken) {
    const r = await jsonp({ action: 'list', adminToken }, 20000);
    if (!r?.ok) throw new Error(r?.error || 'Nie udało się pobrać listy konwojów.');
    return Array.isArray(r.items) ? r.items : [];
  }

  window.CPG_GOOGLE = {
    isConfigured, createToken, health, publishConvoy, getConvoy, saveConvoy, getMeta,
    claimConvoy, releaseConvoy, plannerLogin, listConvoys
  };
  window.dispatchEvent(new Event('cpg-google-ready'));
})();
