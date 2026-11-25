/* Camada de dados: banco local (IndexedDB), login Microsoft (MSAL), Microsoft Graph e sincronização.
   Regra: tudo é gravado primeiro no aparelho; uma fila (outbox) envia ao SharePoint quando houver conexão. */
(function () {
  const CFG = window.APP_CONFIG;
  const DEMO = !CFG.clientId;
  const GRAPH = 'https://graph.microsoft.com/v1.0';
  const SCOPES = ['User.Read', 'Sites.ReadWrite.All'];

  // ---------- Campos de cada lista: [chave local, coluna no SharePoint, tipo] ----------
  const FIELDS = {
    clientes: [['nome', 'Title', 'text'], ['appId', 'AppId', 'text'], ['cnpj', 'CNPJ', 'text'], ['cidade', 'Cidade', 'text'],
      ['uf', 'UF', 'text'], ['contato', 'Contato', 'text'], ['telefone', 'Telefone', 'text'], ['email', 'Email', 'text']],
    maquinas: [['nome', 'Title', 'text'], ['appId', 'AppId', 'text'], ['clienteAppId', 'ClienteAppId', 'text'],
      ['modelo', 'Modelo', 'text'], ['fabricante', 'Fabricante', 'text']],
    coletas: [['numero', 'Title', 'text'], ['appId', 'AppId', 'text'], ['maquinaAppId', 'MaquinaAppId', 'text'],
      ['clienteAppId', 'ClienteAppId', 'text'], ['data', 'DataColeta', 'text'], ['tecnico', 'Tecnico', 'text'],
      ['tecnicoEmail', 'TecnicoEmail', 'text'], ['temperatura', 'Temperatura', 'text'], ['pressao', 'Pressao', 'text'],
      ['contaminante', 'Contaminante', 'text'], ['iso', 'ISO', 'text'], ['volume', 'VolumeOleo', 'text'],
      ['tipoOleo', 'TipoOleo', 'text'], ['conexaoPressao', 'ConexaoPressao', 'text'], ['conexaoRetorno', 'ConexaoRetorno', 'text'],
      ['tensao', 'Tensao', 'text'], ['status', 'Status', 'text'], ['observacoes', 'Observacoes', 'note'],
      ['pasta', 'Pasta', 'note'], ['fotos', 'Fotos', 'json'], ['anexos', 'Anexos', 'json'], ['relatorio', 'Relatorio', 'json']]
  };
  const ENTITIES = Object.keys(FIELDS);

  // ---------- IndexedDB ----------
  let dbp;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open('cadastro-maquinas', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        ENTITIES.forEach(e => d.createObjectStore(e, { keyPath: 'appId' }));
        d.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
        d.createObjectStore('files', { keyPath: 'key' });
        d.createObjectStore('meta', { keyPath: 'k' });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  function tx(store, mode, fn) {
    return db().then(d => new Promise((res, rej) => {
      const t = d.transaction(store, mode); const s = t.objectStore(store); let out;
      Promise.resolve(fn(s)).then(v => { out = v; });
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    }));
  }
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const all = store => tx(store, 'readonly', s => req(s.getAll()));
  const get = (store, key) => tx(store, 'readonly', s => req(s.get(key)));
  const put = (store, obj) => tx(store, 'readwrite', s => req(s.put(obj)));
  const del = (store, key) => tx(store, 'readwrite', s => req(s.delete(key)));
  const meta = { get: k => get('meta', k).then(r => r ? r.v : undefined), set: (k, v) => put('meta', { k, v }) };

  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const nowIso = () => new Date().toISOString();

  // ---------- Status para a interface ----------
  const listeners = new Set();
  let status = { state: navigator.onLine ? 'online' : 'offline', pending: 0, last: null, error: null, syncing: false };
  function emit(patch) { status = Object.assign({}, status, patch); listeners.forEach(f => f(status)); }
  async function refreshPending() { const ob = await all('outbox'); emit({ pending: ob.length }); }
  window.addEventListener('online', () => { emit({ state: 'online' }); });
  window.addEventListener('offline', () => { emit({ state: 'offline' }); });

  // ---------- Login (MSAL) ----------
  let msalApp = null, account = null;
  async function initAuth() {
    if (DEMO) { account = { name: 'Usuário demonstração', username: 'demo@' + CFG.allowedDomain }; return account; }
    msalApp = new msal.PublicClientApplication({
      auth: { clientId: CFG.clientId, authority: 'https://login.microsoftonline.com/' + CFG.tenantId, redirectUri: new URL('./', location.href).href },
      cache: { cacheLocation: 'localStorage' }
    });
    try { const r = await msalApp.handleRedirectPromise(); if (r && r.account) msalApp.setActiveAccount(r.account); } catch (e) { console.warn(e); }
    account = msalApp.getActiveAccount() || msalApp.getAllAccounts()[0] || null;
    if (account && !account.username.toLowerCase().endsWith('@' + CFG.allowedDomain)) {
      await msalApp.logoutRedirect({ account }); return null;
    }
    if (account) msalApp.setActiveAccount(account);
    return account;
  }
  function login() { if (DEMO) return; msalApp.loginRedirect({ scopes: SCOPES, prompt: 'select_account', domainHint: 'organizations' }); }
  function logout() { if (DEMO) return; msalApp.logoutRedirect({ account }); }
  async function token(scopes) {
    scopes = scopes || SCOPES;
    try { return (await msalApp.acquireTokenSilent({ scopes, account })).accessToken; }
    catch (e) { await msalApp.acquireTokenRedirect({ scopes, account }); throw e; }
  }

  // ---------- Microsoft Graph ----------
  async function graph(method, path, body, opts) {
    opts = opts || {};
    const t = await token(opts.scopes);
    const headers = { Authorization: 'Bearer ' + t };
    let payload = body;
    if (body && !(body instanceof Blob)) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    if (body instanceof Blob) headers['Content-Type'] = body.type || 'application/octet-stream';
    const r = await fetch(path.startsWith('http') ? path : GRAPH + path, { method, headers, body: payload });
    if (r.status === 404 && opts.allow404) return null;
    if (!r.ok) { const txt = await r.text(); throw new Error('Graph ' + r.status + ': ' + txt.slice(0, 300)); }
    if (opts.blob) return r.blob();
    return r.status === 204 ? null : r.json();
  }
  function shareToken(url) {
    const b64 = btoa(unescape(encodeURIComponent(url))).replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-');
    return 'u!' + b64;
  }

  const SETUP_V = 2; // aumente para forçar nova conferência das listas/colunas
  // Descobre site, biblioteca e pasta a partir do link; cria as listas se não existirem.
  async function ensureSetup() {
    let s = await meta.get('setup');
    if (s && s.lists && s.lists.coletas && s.v === SETUP_V) return s;
    const tk = shareToken(CFG.folderShareUrl);
    const item = await graph('GET', '/shares/' + tk + '/driveItem?$select=id,name,webUrl,parentReference');
    const site = await graph('GET', '/shares/' + tk + '/site?$select=id,webUrl');
    s = { siteId: site.id, driveId: item.parentReference.driveId, folderId: item.id, folderName: item.name, folderUrl: item.webUrl, lists: {} };
    const existing = await graph('GET', '/sites/' + s.siteId + '/lists?$select=id,displayName&$top=999');
    for (const ent of ENTITIES) {
      const name = CFG.lists[ent];
      const found = existing.value.find(l => l.displayName === name);
      if (found) { s.lists[ent] = found.id; continue; }
      const columns = FIELDS[ent].filter(f => f[1] !== 'Title').map(f => ({
        name: f[1], text: f[2] === 'text' ? {} : { allowMultipleLines: true, linesForEditing: 6, textType: 'plain' }
      }));
      const created = await graph('POST', '/sites/' + s.siteId + '/lists',
        { displayName: name, columns, list: { template: 'genericList' } }, { scopes: ['Sites.Manage.All'] });
      s.lists[ent] = created.id;
    }
    // Garante que todas as colunas existem (lista criada antes ou coluna recusada).
    for (const ent of ENTITIES) {
      const cols = await graph('GET', '/sites/' + s.siteId + '/lists/' + s.lists[ent] + '/columns?$select=name&$top=999');
      const have = new Set(cols.value.map(c => c.name));
      for (const f of FIELDS[ent]) {
        if (have.has(f[1])) continue;
        await graph('POST', '/sites/' + s.siteId + '/lists/' + s.lists[ent] + '/columns',
          { name: f[1], text: f[2] === 'text' ? {} : { allowMultipleLines: true, linesForEditing: 6, textType: 'plain' } }, { scopes: ['Sites.Manage.All'] });
      }
    }
    s.v = SETUP_V;
    await meta.set('setup', s);
    return s;
  }

  // ---------- Conversão local <-> SharePoint ----------
  function toFields(ent, rec) {
    const f = {};
    FIELDS[ent].forEach(([k, col, type]) => {
      let v = rec[k];
      if (type === 'json') v = JSON.stringify(v || []);
      f[col] = v == null ? '' : String(v);
    });
    return f;
  }
  function fromItem(ent, it) {
    const f = it.fields || {}; const rec = { spId: it.id };
    FIELDS[ent].forEach(([k, col, type]) => {
      let v = f[col];
      if (type === 'json') { try { v = v ? JSON.parse(v) : []; } catch (e) { v = []; } }
      rec[k] = v == null ? '' : v;
    });
    if (!rec.appId) rec.appId = 'sp-' + ent + '-' + it.id;
    rec.criadoPor = (it.createdBy && it.createdBy.user && it.createdBy.user.displayName) || '';
    rec.alteradoPor = (it.lastModifiedBy && it.lastModifiedBy.user && it.lastModifiedBy.user.displayName) || '';
    rec.updatedAt = it.lastModifiedDateTime || '';
    return rec;
  }

  // ---------- Operações públicas (gravam local + fila) ----------
  async function enqueue(op) {
    const ob = await all('outbox');
    if (op.op === 'save' && ob.some(o => o.op === 'save' && o.entity === op.entity && o.appId === op.appId)) { await refreshPending(); return; }
    await put('outbox', op); await refreshPending();
  }
  async function save(ent, rec) {
    const old = rec.appId ? await get(ent, rec.appId) : null;
    const r = Object.assign({}, old || {}, rec);
    if (!r.appId) { r.appId = uid(); r.criadoPor = account ? account.name : ''; }
    r.alteradoPor = account ? account.name : ''; r.updatedAt = nowIso(); r._dirty = true;
    await put(ent, r);
    await enqueue({ op: 'save', entity: ent, appId: r.appId });
    autoSync();
    return r;
  }
  async function remove(ent, appId) {
    const r = await get(ent, appId); if (!r) return;
    await del(ent, appId);
    const ob = await all('outbox');
    for (const o of ob) if (o.entity === ent && o.appId === appId) await del('outbox', o.seq);
    if (r.spId) await enqueue({ op: 'delete', entity: ent, appId, spId: r.spId });
    // apagar em cascata
    if (ent === 'clientes') { for (const m of (await all('maquinas')).filter(m => m.clienteAppId === appId)) await remove('maquinas', m.appId); }
    if (ent === 'maquinas') { for (const c of (await all('coletas')).filter(c => c.maquinaAppId === appId)) await remove('coletas', c.appId); }
    await refreshPending(); autoSync();
  }
  // Arquivo: guardado no aparelho e enviado na sincronização. kind: fotos | anexos | relatorio
  async function addFile(coletaAppId, kind, name, path, blob) {
    const key = uid();
    await put('files', { key, coletaAppId, kind, name, path, blob, uploaded: false, createdAt: nowIso() });
    await enqueue({ op: 'file', key });
    return key;
  }
  async function fileBlob(entry) {
    // entry: {name, path, key?}. Primeiro procura no aparelho; se não tiver, baixa do SharePoint e guarda.
    const files = await all('files');
    const local = files.find(f => (entry.key && f.key === entry.key) || (f.path === entry.path && f.blob));
    if (local && local.blob) return local.blob;
    if (DEMO || !navigator.onLine) return null;
    const s = await ensureSetup();
    const blob = await graph('GET', '/drives/' + s.driveId + '/items/' + s.folderId + ':/' + encPath(entry.path) + ':/content', null, { blob: true });
    await put('files', { key: uid(), coletaAppId: '', kind: 'cache', name: entry.name, path: entry.path, blob, uploaded: true });
    return blob;
  }
  // Exclui uma foto/anexo: some do aparelho e é apagada do SharePoint na sincronização.
  async function removeFile(coletaAppId, entry) {
    for (const f of await all('files')) {
      if ((entry.key && f.key === entry.key) || (f.path === entry.path && (f.coletaAppId === coletaAppId || f.kind === 'cache'))) await del('files', f.key);
    }
    if (!DEMO && entry.path) await enqueue({ op: 'delfile', path: entry.path });
  }
  const encPath = p => p.split('/').map(encodeURIComponent).join('/');

  // ---------- Sincronização ----------
  let syncing = null;
  function autoSync() { if (navigator.onLine) sync().catch(() => {}); }
  function sync() {
    if (syncing) return syncing;
    syncing = (async () => {
      emit({ syncing: true, error: null });
      try {
        if (!navigator.onLine) throw new Error('Sem conexão. As alterações ficam salvas no aparelho.');
        if (DEMO) { await demoPush(); }
        else { const s = await ensureSetup(); await push(s); await pull(s); }
        emit({ state: 'online', last: nowIso() });
      } catch (e) {
        emit({ error: e.message || String(e), state: navigator.onLine ? 'online' : 'offline' });
        throw e;
      } finally { syncing = null; await refreshPending(); emit({ syncing: false }); }
    })();
    return syncing;
  }
  async function demoPush() {
    await new Promise(r => setTimeout(r, 600));
    for (const o of await all('outbox')) {
      if (o.op === 'save') { const r = await get(o.entity, o.appId); if (r) { r._dirty = false; r.spId = r.spId || 'demo'; await put(o.entity, r); } }
      if (o.op === 'file') { const f = await get('files', o.key); if (f) { f.uploaded = true; await put('files', f); } }
      await del('outbox', o.seq);
    }
  }
  async function push(s) {
    let ob = await all('outbox');
    while (ob.length) {
      const o = ob[0];
      if (o.op === 'save') {
        const r = await get(o.entity, o.appId);
        if (r) {
          const fields = toFields(o.entity, r);
          const base = '/sites/' + s.siteId + '/lists/' + s.lists[o.entity] + '/items';
          if (r.spId) await graph('PATCH', base + '/' + r.spId + '/fields', fields);
          else { const it = await graph('POST', base, { fields }); r.spId = it.id; }
          const later = (await all('outbox')).some(x => x.seq !== o.seq && x.entity === o.entity && x.appId === o.appId);
          r._dirty = later; await put(o.entity, r);
        }
      } else if (o.op === 'delfile') {
        await graph('DELETE', '/drives/' + s.driveId + '/items/' + s.folderId + ':/' + encPath(o.path), null, { allow404: true });
      } else if (o.op === 'delete') {
        await graph('DELETE', '/sites/' + s.siteId + '/lists/' + s.lists[o.entity] + '/items/' + o.spId, null, { allow404: true });
      } else if (o.op === 'file') {
        const f = await get('files', o.key);
        if (f && !f.uploaded) {
          const up = await graph('PUT', '/drives/' + s.driveId + '/items/' + s.folderId + ':/' + encPath(f.path) + ':/content', f.blob);
          f.uploaded = true; f.webUrl = up.webUrl; await put('files', f);
          const c = await get('coletas', f.coletaAppId);
          if (c) {
            const entry = { name: f.name, path: f.path, url: up.webUrl, key: f.key };
            if (f.kind === 'relatorio') c.relatorio = [entry];
            else { c[f.kind] = (c[f.kind] || []).filter(x => x.key !== f.key && x.path !== f.path).concat([entry]); }
            await put('coletas', c);
            await del('outbox', o.seq);
            await enqueue({ op: 'save', entity: 'coletas', appId: c.appId });
            ob = await all('outbox'); continue;
          }
        }
      }
      await del('outbox', o.seq);
      ob = await all('outbox');
      await refreshPending();
    }
  }
  async function pull(s) {
    for (const ent of ENTITIES) {
      let url = '/sites/' + s.siteId + '/lists/' + s.lists[ent] + '/items?$expand=fields&$top=500';
      const remote = [];
      while (url) { const page = await graph('GET', url); remote.push(...page.value); url = page['@odata.nextLink'] || null; }
      const locals = await all(ent);
      const byId = new Map(locals.map(l => [l.appId, l]));
      const seen = new Set();
      for (const it of remote) {
        const rec = fromItem(ent, it); seen.add(rec.appId);
        const loc = byId.get(rec.appId);
        if (loc && loc._dirty) continue;           // alteração local ainda não enviada vence
        await put(ent, Object.assign({}, rec, { _dirty: false }));
      }
      for (const l of locals) if (l.spId && l.spId !== 'demo' && !seen.has(l.appId) && !l._dirty) await del(ent, l.appId);
    }
  }

  // ---------- Dados de demonstração ----------
  async function seedDemo() {
    if (!DEMO || await meta.get('seeded')) return;
    const c1 = { appId: 'c1', nome: 'Metalúrgica Andrade', cidade: 'Suzano', uf: 'SP', contato: 'Carlos Mendes', telefone: '(11) 4747-0000', email: 'manutencao@exemplo.com', criadoPor: 'João Dantas' };
    const c2 = { appId: 'c2', nome: 'Usina Serra Verde', cidade: 'Piracicaba', uf: 'SP', contato: 'Ana Ribeiro', telefone: '(19) 3400-0000', criadoPor: 'João Dantas' };
    const m1 = { appId: 'm1', clienteAppId: 'c1', nome: 'Prensa hidráulica 01', modelo: 'PH-200', fabricante: 'Bosch Rexroth' };
    const m2 = { appId: 'm2', clienteAppId: 'c1', nome: 'Injetora 03', modelo: 'HX-450', fabricante: 'Haitian' };
    const base = { maquinaAppId: 'm1', clienteAppId: 'c1', tecnico: 'João Dantas', tipoOleo: 'ISO VG 46 mineral', volume: '320', conexaoPressao: '1/2" BSP', conexaoRetorno: '3/4" BSP', tensao: '380 V tri', pressao: '180', fotos: [], anexos: [], relatorio: [] };
    const cols = [
      Object.assign({}, base, { appId: 'k1', numero: '2026-0067', data: '2026-06-12', temperatura: '48', contaminante: 'Partículas', iso: '18/16/13', status: 'Normal', observacoes: 'Óleo dentro do padrão.' }),
      Object.assign({}, base, { appId: 'k2', numero: '2026-0112', data: '2026-09-04', temperatura: '55', contaminante: 'Partículas', iso: '20/18/15', status: 'Atenção', observacoes: 'Recomendada filtragem.' }),
      Object.assign({}, base, { appId: 'k3', numero: '2026-0148', data: '2026-11-18', temperatura: '62', contaminante: 'Água', iso: '21/19/16', status: 'Crítico', observacoes: 'Óleo turvo. Recomendada troca e filtragem.' }),
      Object.assign({}, base, { appId: 'k4', maquinaAppId: 'm2', numero: '2026-0101', data: '2026-10-02', temperatura: '45', contaminante: '', iso: '17/15/12', status: 'Normal', tipoOleo: 'ISO VG 68 mineral' })
    ];
    for (const r of [c1, c2]) await put('clientes', Object.assign({ spId: 'demo' }, r));
    for (const r of [m1, m2]) await put('maquinas', Object.assign({ spId: 'demo' }, r));
    for (const r of cols) await put('coletas', Object.assign({ spId: 'demo' }, r));
    await meta.set('seeded', true);
  }

  window.Data = {
    DEMO, FIELDS, initAuth, login, logout, user: () => account,
    all, get, save, remove, addFile, removeFile, fileBlob, sync, seedDemo, ensureSetup,
    onStatus: f => { listeners.add(f); f(status); return () => listeners.delete(f); },
    refreshPending, filesOf: async coletaAppId => (await all('files')).filter(f => f.coletaAppId === coletaAppId)
  };
})();
