const CPG_FOLDER_ID = '1d45coKuP4yPARIXTcP9QZJndjroGtwPk';
const CPG_VERSION = 'cpg-convoy-google-v1';

function doGet(e) {
  const p = (e && e.parameter) || {};
  const callback = safeCallback_(p.callback);
  try {
    const action = String(p.action || 'health');
    if (action === 'health') return output_({ ok: true, version: CPG_VERSION }, callback);
    if (action === 'meta') {
      const stored = readConvoy_(p.date, p.token);
      return output_({
        ok: true,
        date: stored.payload.convoy && stored.payload.convoy.date,
        status: stored.payload.convoy && stored.payload.convoy.status,
        updatedAt: stored.payload.convoy && stored.payload.convoy.updatedAt,
        modifiedAt: stored.file.getLastUpdated().toISOString()
      }, callback);
    }
    if (action === 'load') {
      const stored = readConvoy_(p.date, p.token);
      return output_({
        ok: true,
        payload: stored.payload,
        meta: { modifiedAt: stored.file.getLastUpdated().toISOString() }
      }, callback);
    }
    throw new Error('Nieznana operacja.');
  } catch (err) {
    return output_({ ok: false, error: String(err && err.message || err) }, callback);
  }
}

function doPost(e) {
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = String(req.action || '');
    if (action === 'publish') {
      verifyPlannerPin_(req.plannerPin);
      validateDate_(req.date);
      validateToken_(req.token);
      if (!req.payload || !Array.isArray(req.payload.route)) throw new Error('Brak prawidłowej trasy.');
      const payload = normalizePayload_(req.payload, req.date, req.token, true);
      writeConvoy_(req.date, req.token, payload, true);
      return output_({ ok: true });
    }
    if (action === 'save') {
      validateDate_(req.date);
      validateToken_(req.token);
      if (!req.payload || !Array.isArray(req.payload.route)) throw new Error('Brak prawidłowej trasy.');
      readConvoy_(req.date, req.token); // weryfikuje istnienie i token
      const payload = normalizePayload_(req.payload, req.date, req.token, false);
      writeConvoy_(req.date, req.token, payload, false);
      return output_({ ok: true });
    }
    throw new Error('Nieznana operacja.');
  } catch (err) {
    return output_({ ok: false, error: String(err && err.message || err) });
  }
}

function normalizePayload_(payload, date, token, publishing) {
  const copy = JSON.parse(JSON.stringify(payload));
  copy.schema = copy.schema || 'cpg-inkasacja-v5';
  copy.exportedAt = new Date().toISOString();
  copy.convoy = copy.convoy || {};
  copy.convoy.date = date;
  copy.convoy.shareToken = token;
  copy.convoy.cloudProvider = 'google';
  copy.convoy.cloudItemId = 'google:' + date + ':' + token;
  if (publishing) {
    copy.convoy.status = 'published';
    copy.convoy.publishedAt = copy.convoy.publishedAt || new Date().toISOString();
  }
  copy.convoy.updatedAt = copy.convoy.updatedAt || new Date().toISOString();
  return copy;
}

function writeConvoy_(date, token, payload, replaceOlderForDate) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const folder = DriveApp.getFolderById(CPG_FOLDER_ID);
    const name = fileName_(date, token);
    if (replaceOlderForDate) trashOlderForDate_(folder, date, name);
    const existing = folder.getFilesByName(name);
    const text = JSON.stringify(payload, null, 2);
    if (existing.hasNext()) {
      const file = existing.next();
      file.setContent(text);
      return file;
    }
    return folder.createFile(name, text, MimeType.PLAIN_TEXT);
  } finally {
    lock.releaseLock();
  }
}

function readConvoy_(date, token) {
  validateDate_(date);
  validateToken_(token);
  const folder = DriveApp.getFolderById(CPG_FOLDER_ID);
  const files = folder.getFilesByName(fileName_(date, token));
  if (!files.hasNext()) throw new Error('Nie znaleziono konwoju albo kod dostępu jest nieprawidłowy.');
  const file = files.next();
  const payload = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  if (String(payload && payload.convoy && payload.convoy.shareToken || '') !== String(token)) throw new Error('Nieprawidłowy kod dostępu.');
  return { file, payload };
}

function trashOlderForDate_(folder, date, keepName) {
  const it = folder.getFiles();
  const prefix = 'Konwoj_' + date + '_';
  while (it.hasNext()) {
    const f = it.next();
    const n = f.getName();
    if (n.indexOf(prefix) === 0 && n !== keepName && /\.json$/i.test(n)) f.setTrashed(true);
  }
}

function fileName_(date, token) {
  return 'Konwoj_' + date + '_' + token + '.json';
}

function verifyPlannerPin_(pin) {
  const expected = String(PropertiesService.getScriptProperties().getProperty('PLANNER_PIN') || '');
  if (!expected) throw new Error('Administrator musi ustawić właściwość skryptu PLANNER_PIN.');
  if (String(pin || '') !== expected) throw new Error('Nieprawidłowy PIN planisty.');
}

function validateDate_(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) throw new Error('Nieprawidłowa data konwoju.');
}

function validateToken_(token) {
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(String(token || ''))) throw new Error('Nieprawidłowy kod konwoju.');
}

function safeCallback_(name) {
  const v = String(name || '');
  return /^[A-Za-z_$][0-9A-Za-z_$\.]{0,120}$/.test(v) ? v : '';
}

function output_(obj, callback) {
  const json = JSON.stringify(obj);
  const out = ContentService.createTextOutput(callback ? callback + '(' + json + ');' : json);
  out.setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
  return out;
}
