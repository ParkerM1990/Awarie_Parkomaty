(() => {
  const cfg = window.CPG_M365_CONFIG || {};
  let pca = null;
  let initPromise = null;

  const clean = v => String(v || '').trim();
  const encodedPath = path => clean(path).split('/').filter(Boolean).map(encodeURIComponent).join('/');
  const graphRoot = () => clean(cfg.driveId) ? `/drives/${encodeURIComponent(cfg.driveId)}` : '/me/drive';
  const graphUrl = path => `https://graph.microsoft.com/v1.0${path}`;

  function isConfigured() {
    return !!(clean(cfg.clientId) && clean(cfg.tenantId) && clean(cfg.driveId));
  }

  async function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (!isConfigured()) {
        window.dispatchEvent(new Event('cpg-m365-ready'));
        return null;
      }
      if (!window.msal) throw new Error('Nie zaladowano biblioteki Microsoft MSAL.');
      pca = new msal.PublicClientApplication({
        auth: {
          clientId: clean(cfg.clientId),
          authority: `https://login.microsoftonline.com/${clean(cfg.tenantId)}`,
          redirectUri: window.location.href.split('#')[0].split('?')[0]
        },
        cache: { cacheLocation: 'localStorage' }
      });
      await pca.initialize();
      const result = await pca.handleRedirectPromise();
      if (result?.account) pca.setActiveAccount(result.account);
      if (!pca.getActiveAccount()) {
        const accounts = pca.getAllAccounts();
        if (accounts.length) pca.setActiveAccount(accounts[0]);
      }
      window.dispatchEvent(new Event('cpg-m365-ready'));
      return pca;
    })().catch(err => {
      console.error('M365 init:', err);
      window.dispatchEvent(new Event('cpg-m365-ready'));
      throw err;
    });
    return initPromise;
  }

  async function getAccount() {
    if (!isConfigured()) return null;
    await init();
    return pca?.getActiveAccount() || null;
  }

  async function signIn() {
    if (!isConfigured()) throw new Error('Brak konfiguracji Microsoft 365.');
    await init();
    const account = pca.getActiveAccount();
    if (account) return account;
    await pca.loginRedirect({ scopes: cfg.scopes || ['User.Read', 'Files.ReadWrite.All'] });
    return null;
  }

  async function getToken() {
    await init();
    let account = pca?.getActiveAccount();
    if (!account) {
      await signIn();
      throw new Error('Trwa logowanie do Microsoft 365. Po powrocie ponow akcje.');
    }
    const request = { account, scopes: cfg.scopes || ['User.Read', 'Files.ReadWrite.All'] };
    try {
      const r = await pca.acquireTokenSilent(request);
      return r.accessToken;
    } catch (e) {
      console.warn('Silent token failed:', e);
      await pca.acquireTokenRedirect(request);
      throw new Error('Wymagane ponowne logowanie do Microsoft 365.');
    }
  }

  async function graphFetch(path, options = {}, allow404 = false) {
    const token = await getToken();
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(graphUrl(path), { ...options, headers });
    if (allow404 && response.status === 404) return null;
    if (!response.ok) {
      let detail = '';
      try { const j = await response.json(); detail = j?.error?.message || ''; } catch {}
      throw new Error(`Microsoft Graph: ${response.status}${detail ? ' - ' + detail : ''}`);
    }
    return response;
  }

  async function getItemByPath(path, allow404 = false) {
    const ep = encodedPath(path);
    const r = await graphFetch(`${graphRoot()}/root:/${ep}`, {}, allow404);
    return r ? r.json() : null;
  }

  async function ensureFolderPath(path) {
    const parts = clean(path).split('/').filter(Boolean);
    let parent = await (await graphFetch(`${graphRoot()}/root`)).json();
    let currentPath = '';
    for (const name of parts) {
      currentPath = currentPath ? `${currentPath}/${name}` : name;
      let item = await getItemByPath(currentPath, true);
      if (!item) {
        const r = await graphFetch(`${graphRoot()}/items/${encodeURIComponent(parent.id)}/children`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' })
        });
        item = await r.json();
      }
      if (!item.folder) throw new Error(`Sciezka ${currentPath} nie jest folderem.`);
      parent = item;
    }
    return parent;
  }

  async function listFolder(path, top = 200) {
    const ep = encodedPath(path);
    const select = '$select=id,name,lastModifiedDateTime,size,file,folder,webUrl,eTag';
    const r = await graphFetch(`${graphRoot()}/root:/${ep}:/children?${select}&$top=${Math.min(999, top)}`);
    const data = await r.json();
    return data.value || [];
  }

  async function getLatestBalanceFile() {
    const items = await listFolder(cfg.balanceFolder, 999);
    const needle = clean(cfg.balanceNameContains).toLowerCase();
    const files = items.filter(x => x.file && /\.(xlsx|xls|csv)$/i.test(x.name || '') && (!needle || String(x.name).toLowerCase().includes(needle)));
    files.sort((a, b) => new Date(b.lastModifiedDateTime || 0) - new Date(a.lastModifiedDateTime || 0));
    if (!files.length) throw new Error(`Nie znaleziono pliku Terminal Balance w folderze „${cfg.balanceFolder}”.`);
    return files[0];
  }

  async function downloadItem(itemId) {
    const r = await graphFetch(`${graphRoot()}/items/${encodeURIComponent(itemId)}/content`);
    return r.arrayBuffer();
  }

  async function saveConvoy(filename, payload) {
    await ensureFolderPath(cfg.plansFolder);
    const path = `${encodedPath(cfg.plansFolder)}/${encodeURIComponent(filename)}`;
    const r = await graphFetch(`${graphRoot()}/root:/${path}:/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload, null, 2)
    });
    return r.json();
  }

  async function getConvoy(filename) {
    const path = `${clean(cfg.plansFolder)}/${filename}`;
    const item = await getItemByPath(path, true);
    if (!item) throw new Error(`Brak opublikowanego konwoju „${filename}”.`);
    const buf = await downloadItem(item.id);
    const data = JSON.parse(new TextDecoder('utf-8').decode(buf));
    return { item, data };
  }

  async function listConvoys() {
    await ensureFolderPath(cfg.plansFolder);
    const items = await listFolder(cfg.plansFolder, 200);
    return items.filter(x => x.file && /^Konwoj_\d{4}-\d{2}-\d{2}\.json$/i.test(x.name || ''))
      .sort((a, b) => String(b.name).localeCompare(String(a.name)));
  }

  window.CPG_M365 = { isConfigured, init, getAccount, signIn, getLatestBalanceFile, downloadItem, saveConvoy, getConvoy, listConvoys };
  init().catch(() => {});
})();
