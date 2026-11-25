/* Telas e navegação do Cadastro de Máquinas */
(function () {
  const CFG = window.APP_CONFIG, D = window.Data;
  const $app = document.getElementById('app');
  const STATUS = [['Normal', 'var(--ok)'], ['Atenção', 'var(--warn)'], ['Crítico', 'var(--crit)']];
  const COLORS = ['#0E1270', '#0A78C8', '#2F7D58', '#5B4FB5', '#B5532F', '#1F7A8C', '#7A3E9D'];
  let stack = [{ v: 'clientes' }];
  let syncState = {};
  let form = null; // estado do formulário em edição

  // ---------- utilidades ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = n => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const colorOf = s => COLORS[[...(s || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  const fmtDate = d => d ? d.slice(0, 10).split('-').reverse().join('/') : '';
  const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const safe = s => (s || 'sem-nome').replace(/[\\/:*?"<>|#%]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80);
  const slug = s => safe(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const pill = st => st ? `<span class="pill s-${esc(st.split(' ')[0])}">${esc(st)}</span>` : '<span class="pill s-none">Sem coleta</span>';
  const byDateDesc = (a, b) => (b.data || '').localeCompare(a.data || '') || (b.numero || '').localeCompare(a.numero || '');
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2600); }
  function go(view) { stack.push(view); history.pushState({ d: stack.length }, ''); render(); window.scrollTo(0, 0); }
  function back() { if (stack.length > 1) { history.back(); } }
  window.addEventListener('popstate', () => { if (stack.length > 1) { stack.pop(); form = null; render(); } });
  const cur = () => stack[stack.length - 1];

  // ---------- cabeçalho e barra de sincronização ----------
  function header(title, sub, opts) {
    opts = opts || {};
    const left = stack.length > 1 ? '<button class="ib" data-act="back" aria-label="Voltar">‹</button>' : '<img class="logo-h" src="icons/logo-h.png" alt="Triple R">';
    const right = opts.edit ? `<button class="ib" data-act="${opts.edit}" aria-label="Editar">✎</button>` :
      (stack.length === 1 ? `<button class="ib" data-act="perfil" aria-label="Conta">${esc(initials(D.user() && D.user().name))}</button>` : '');
    return `<header class="top"><div class="r">${left}<h1>${esc(title)}</h1>${right}</div>
      ${sub ? `<div class="sub">${sub}</div>` : ''}
      ${opts.nosync ? '' : `<div class="sync" id="syncbar"></div>`}
      ${D.DEMO && stack.length === 1 ? '<div class="demo">Modo demonstração: dados de exemplo, salvos só neste navegador.</div>' : ''}</header>`;
  }
  function paintSync() {
    const el = document.getElementById('syncbar'); if (!el) return;
    const s = syncState; const off = !navigator.onLine;
    el.className = 'sync' + (off ? ' off' : '') + (s.error && !off ? ' err' : '');
    let txt;
    if (s.syncing) txt = 'Sincronizando…';
    else if (off) txt = 'Offline' + (s.pending ? ` · ${s.pending} alteração(ões) pendente(s)` : ' · dados salvos no aparelho');
    else if (s.error) txt = 'Erro ao sincronizar. Toque para tentar de novo.';
    else if (s.pending) txt = `Online · ${s.pending} pendente(s)`;
    else txt = 'Online · sincronizado' + (s.last ? ' ' + new Date(s.last).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
    el.innerHTML = `<i class="dot"></i><span class="txt">${esc(txt)}</span><button data-act="sync" ${s.syncing ? 'disabled' : ''}>Sincronizar</button>`;
  }
  D.onStatus(s => { const prevErr = syncState.error; syncState = s; paintSync(); if (s.error && s.error !== prevErr && !s.syncing) toast(s.error); });

  // ---------- telas ----------
  async function vClientes() {
    const [cli, maq, col] = await Promise.all([D.all('clientes'), D.all('maquinas'), D.all('coletas')]);
    const q = (cur().q || '').toLowerCase();
    const last = latestByMachine(col);
    const rows = cli.filter(c => !q || (c.nome + ' ' + c.cidade).toLowerCase().includes(q)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(c => {
      const ms = maq.filter(m => m.clienteAppId === c.appId);
      const crit = ms.filter(m => last[m.appId] && last[m.appId].status === 'Crítico').length;
      return `<button class="card" data-go="cliente" data-id="${esc(c.appId)}"><div class="av" style="background:${colorOf(c.nome)}">${esc(initials(c.nome))}</div>
        <div class="t"><b>${esc(c.nome)}</b><span>${esc([c.cidade, c.uf].filter(Boolean).join(' – '))} · ${ms.length} máquina(s)</span></div>
        ${crit ? `<span class="pill s-Crítico">${crit} crítica(s)</span>` : ''}<span class="chev">›</span></button>`;
    }).join('');
    return header('Clientes') + `<main class="body"><input class="search" id="q" type="search" placeholder="Buscar cliente" value="${esc(cur().q || '')}">
      ${rows || `<div class="empty"><b>${q ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}</b>${q ? 'Tente outro nome ou cidade.' : 'Toque em “+ Cliente” para cadastrar o primeiro.'}</div>`}</main>
      <button class="fab" data-go="clienteForm">+ Cliente</button>`;
  }
  function latestByMachine(col) { const m = {}; col.slice().sort(byDateDesc).forEach(c => { if (!m[c.maquinaAppId]) m[c.maquinaAppId] = c; }); return m; }

  async function vCliente() {
    const c = await D.get('clientes', cur().id); if (!c) return vGone();
    const [maq, col] = await Promise.all([D.all('maquinas'), D.all('coletas')]);
    const last = latestByMachine(col);
    const rows = maq.filter(m => m.clienteAppId === c.appId).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(m => {
      const l = last[m.appId];
      return `<button class="card" data-go="maquina" data-id="${esc(m.appId)}"><div class="t"><b>${esc(m.nome)}</b>
        <span>${esc([m.modelo, m.fabricante].filter(Boolean).join(' · ') || 'Sem modelo')}</span>
        <span class="mono">${l ? esc(fmtDate(l.data) + ' · ' + (l.tecnico || '')) : 'Nenhuma coleta ainda'}</span></div>${pill(l && l.status)}</button>`;
    }).join('');
    const sub = esc([[c.cidade, c.uf].filter(Boolean).join(' – '), c.contato, c.telefone].filter(Boolean).join(' · '));
    return header(c.nome, sub, { edit: 'editCliente' }) + `<main class="body">${rows || '<div class="empty"><b>Nenhuma máquina cadastrada</b>Toque em “+ Máquina”.</div>'}</main>
      <button class="fab" data-go="maquinaForm" data-cli="${esc(c.appId)}">+ Máquina</button>`;
  }

  async function vMaquina() {
    const m = await D.get('maquinas', cur().id); if (!m) return vGone();
    const col = (await D.all('coletas')).filter(k => k.maquinaAppId === m.appId).sort(byDateDesc);
    const items = col.map(k => {
      const nf = (k.fotos || []).length; const hasPdf = (k.relatorio || []).length || k._pdfLocal;
      return `<div class="tli"><i style="background:${statusColor(k.status)}"></i><button class="card" data-go="coleta" data-id="${esc(k.appId)}">
        <div class="h"><b>Coleta nº ${esc(k.numero)}</b>${pill(k.status)}</div>
        <span class="mono" style="color:var(--muted)">${esc(fmtDate(k.data))} · ${esc(k.tecnico)}</span>
        <div class="mono">${esc(['ISO ' + (k.iso || '—'), k.contaminante, k.temperatura && k.temperatura + ' °C'].filter(Boolean).join(' · '))}</div>
        <div class="row"><span class="chip">${hasPdf ? 'Relatório PDF' : 'Relatório pendente'}</span>${nf ? `<span class="chip">${nf} foto(s)</span>` : ''}</div></button></div>`;
    }).join('');
    const sub = esc([m.modelo && 'Modelo ' + m.modelo, m.fabricante && 'Fabricante ' + m.fabricante].filter(Boolean).join(' · '));
    return header(m.nome, sub, { edit: 'editMaquina' }) + `<main class="body">
      ${col.length > 1 ? `<div class="sec">Evolução do ISO 4406 (1º código)</div><div class="chart">${chart(col)}</div>` : ''}
      <div class="sec">Coletas</div>${items ? `<div class="tl">${items}</div>` : '<div class="empty"><b>Nenhuma coleta ainda</b>Toque em “+ Nova coleta”.</div>'}</main>
      <button class="fab" data-go="coletaForm" data-maq="${esc(m.appId)}">+ Nova coleta</button>`;
  }
  const statusColor = s => (STATUS.find(x => x[0] === s) || [0, 'var(--pend)'])[1];
  function chart(col) {
    const pts = col.slice().reverse().map(k => ({ d: k.data, v: parseInt((k.iso || '').split('/')[0], 10), s: k.status })).filter(p => !isNaN(p.v));
    if (pts.length < 2) return '<div class="empty" style="padding:14px">ISO 4406 insuficiente para o gráfico.</div>';
    const W = 320, H = 130, L = 30, R = 12, T = 14, B = 26;
    let lo = Math.min(...pts.map(p => p.v)) - 1, hi = Math.max(...pts.map(p => p.v)) + 1;
    const x = i => L + i * (W - L - R) / (pts.length - 1), y = v => T + (hi - v) * (H - T - B) / (hi - lo);
    const ticks = [hi, Math.round((hi + lo) / 2), lo];
    const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução do ISO 4406">
      ${ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)"/><text x="4" y="${y(t) + 4}" font-size="10" fill="var(--muted)">${t}</text>`).join('')}
      <polygon points="${L},${H - B} ${line} ${x(pts.length - 1)},${H - B}" fill="var(--brand-2)" opacity=".08"/>
      <polyline points="${line}" fill="none" stroke="var(--brand-2)" stroke-width="2.5" stroke-linejoin="round"/>
      ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="${i === pts.length - 1 ? 5 : 3.5}" fill="${statusColor(p.s)}"/>
        <text x="${x(i)}" y="${H - 8}" font-size="9" fill="var(--muted)" text-anchor="middle">${esc(fmtDate(p.d).slice(0, 5))}</text>`).join('')}
      <text x="${x(pts.length - 1)}" y="${y(pts[pts.length - 1].v) - 9}" font-size="11" font-weight="700" fill="${statusColor(pts[pts.length - 1].s)}" text-anchor="end">${pts[pts.length - 1].v}</text></svg>`;
  }

  async function vColeta() {
    const k = await D.get('coletas', cur().id); if (!k) return vGone();
    const files = await D.filesOf(k.appId);
    const fotos = mergeFiles(k.fotos, files.filter(f => f.kind === 'fotos'));
    const anexos = mergeFiles(k.anexos, files.filter(f => f.kind === 'anexos'));
    const rel = mergeFiles(k.relatorio, files.filter(f => f.kind === 'relatorio'));
    const kv = [['Data', fmtDate(k.data)], ['Usuário', k.tecnico], ['Temperatura', k.temperatura && k.temperatura + ' °C'], ['Pressão', k.pressao && k.pressao + ' bar'],
      ['Contaminantes', k.contaminante], ['ISO 4406', k.iso], ['Volume de óleo', k.volume && k.volume + ' L'], ['Tipo de óleo', k.tipoOleo],
      ['Conexão de pressão', k.conexaoPressao], ['Conexão de retorno', k.conexaoRetorno], ['Tensão', k.tensao], ['Status', k.status]]
      .map(([a, b]) => `<div><small>${a}</small><b>${esc(b || '—')}</b></div>`).join('');
    const confirmDel = cur().confirm;
    cur().files = { fotos, anexos, rel };
    return header('Coleta nº ' + (k.numero || ''), esc(fmtDate(k.data) + ' · ' + (k.tecnico || '')), { edit: 'editColeta' }) + `<main class="body">
      <div style="display:flex;gap:8px;align-items:center">${pill(k.status)}<span class="mono" style="color:var(--muted)">${esc(k.pasta || '')}</span></div>
      <button class="btn g" data-act="verPdf" ${rel.length ? '' : 'disabled'}>${rel.length ? 'Ver relatório PDF' : 'Relatório ainda não gerado'}</button>
      <div class="kv">${kv}</div>
      ${k.observacoes ? `<div class="sec">Observações</div><div class="card" style="cursor:default;display:block">${esc(k.observacoes).replace(/\n/g, '<br>')}</div>` : ''}
      <div class="sec">Fotos (${fotos.length})</div>
      ${fotos.length ? `<div class="photos">${fotos.map((f, i) => `<div class="ph"><img data-thumb="${i}" alt="${esc(f.name)}"></div>`).join('')}</div>` : '<span style="color:var(--muted)">Sem fotos.</span>'}
      <div class="sec">Anexos (${anexos.length})</div>
      <div class="files">${anexos.map((f, i) => `<div class="file"><span>${esc(f.name)}</span><button data-act="verAnexo" data-i="${i}" style="color:var(--brand)">Abrir</button></div>`).join('') || '<span style="color:var(--muted)">Sem anexos.</span>'}</div>
      <div class="actions">
        <button class="btn out" data-act="regerarPdf">Gerar relatório novamente</button>
        ${confirmDel ? `<div class="card" style="display:block;cursor:default"><b>Excluir esta coleta?</b><br><span style="color:var(--muted)">Os dados saem da lista. Fotos e PDF continuam na pasta do SharePoint.</span>
          <div class="two" style="margin-top:10px"><button class="btn out" data-act="cancelDel">Cancelar</button><button class="btn danger" data-act="doDel">Excluir</button></div></div>`
        : '<button class="btn danger" data-act="askDel">Excluir coleta</button>'}
      </div></main>`;
  }
  function mergeFiles(remote, local) {
    const out = (remote || []).map(r => Object.assign({}, r));
    local.forEach(l => { if (!out.some(o => o.key === l.key || o.path === l.path)) out.push({ name: l.name, path: l.path, key: l.key }); });
    return out;
  }
  async function paintThumbs() {
    const v = cur(); if (v.v !== 'coleta' || !v.files) return;
    for (const img of document.querySelectorAll('img[data-thumb]')) {
      const f = v.files.fotos[+img.dataset.thumb];
      try { const b = await D.fileBlob(f); if (b) img.src = URL.createObjectURL(b); else img.alt = 'Disponível online'; } catch (e) { img.alt = 'Erro ao carregar'; }
      img.onclick = () => img.src && viewer(f.name, img.src, 'img');
    }
  }

  // ---------- formulários ----------
  async function vClienteForm() {
    const c = cur().id ? await D.get('clientes', cur().id) : {};
    form = form || Object.assign({}, c);
    const fld = (k, l, t) => `<div class="f"><label for="f_${k}">${l}</label><input class="in" id="f_${k}" data-k="${k}" type="${t || 'text'}" value="${esc(form[k] || '')}"></div>`;
    return header(c.appId ? 'Editar cliente' : 'Novo cliente', '', { nosync: true }) + `<main class="body"><div class="form">
      ${fld('nome', 'Nome do cliente *')}${fld('cnpj', 'CNPJ')}
      <div class="two">${fld('cidade', 'Cidade')}${fld('uf', 'UF')}</div>
      ${fld('contato', 'Contato')}<div class="two">${fld('telefone', 'Telefone', 'tel')}${fld('email', 'E-mail', 'email')}</div>
      <div class="actions"><button class="btn g" data-act="saveCliente">Salvar cliente</button>
      ${c.appId ? (cur().confirm ? `<div class="card" style="display:block;cursor:default"><b>Excluir o cliente e todas as máquinas e coletas dele?</b><div class="two" style="margin-top:10px"><button class="btn out" data-act="cancelDel">Cancelar</button><button class="btn danger" data-act="delCliente">Excluir</button></div></div>` : '<button class="btn danger" data-act="askDel">Excluir cliente</button>') : ''}</div></div></main>`;
  }
  async function vMaquinaForm() {
    const m = cur().id ? await D.get('maquinas', cur().id) : { clienteAppId: cur().cli };
    form = form || Object.assign({}, m);
    const fld = (k, l) => `<div class="f"><label for="f_${k}">${l}</label><input class="in" id="f_${k}" data-k="${k}" value="${esc(form[k] || '')}"></div>`;
    return header(m.appId ? 'Editar máquina' : 'Nova máquina', '', { nosync: true }) + `<main class="body"><div class="form">
      ${fld('nome', 'Nome da máquina *')}${fld('modelo', 'Modelo')}${fld('fabricante', 'Fabricante')}
      <div class="actions"><button class="btn g" data-act="saveMaquina">Salvar máquina</button>
      ${m.appId ? (cur().confirm ? `<div class="card" style="display:block;cursor:default"><b>Excluir a máquina e todas as coletas dela?</b><div class="two" style="margin-top:10px"><button class="btn out" data-act="cancelDel">Cancelar</button><button class="btn danger" data-act="delMaquina">Excluir</button></div></div>` : '<button class="btn danger" data-act="askDel">Excluir máquina</button>') : ''}</div></div></main>`;
  }
  async function vColetaForm() {
    const v = cur();
    const k = v.id ? await D.get('coletas', v.id) : null;
    const maq = await D.get('maquinas', k ? k.maquinaAppId : v.maq);
    if (!form) form = Object.assign({ data: today(), status: '', newFotos: [], newAnexos: [] }, k || { maquinaAppId: maq.appId, clienteAppId: maq.clienteAppId },
      { tecnico: k ? k.tecnico : D.user().name, tecnicoEmail: k ? k.tecnicoEmail : D.user().username, newFotos: [], newAnexos: [] });
    const col = await D.all('coletas');
    const sugg = key => [...new Set(col.map(c => (c[key] || '').trim()).filter(Boolean))].sort().map(s => `<option value="${esc(s)}">`).join('');
    const fld = (key, label, attrs) => `<div class="f"><label for="f_${key}">${label}</label><input class="in" id="f_${key}" data-k="${key}" value="${esc(form[key] || '')}" ${attrs || ''}></div>`;
    const sfld = (key, label) => fld(key, label, `list="dl_${key}" autocomplete="off"`) + `<datalist id="dl_${key}">${sugg(key)}</datalist>`;
    const oldFotos = k ? (k.fotos || []).length : 0;
    return header(k ? 'Editar coleta' : 'Nova coleta', esc(maq.nome) + (navigator.onLine ? '' : ' · salva no aparelho até sincronizar'), { nosync: true }) + `<main class="body"><div class="form">
      <div class="two">${fld('numero', 'Nº da coleta *')}${fld('data', 'Data *', 'type="date"')}</div>
      <div class="f"><label>Usuário</label><div class="in" style="color:var(--muted)">${esc(form.tecnico)}</div></div>
      <div class="two">${fld('temperatura', 'Temperatura (°C)', 'inputmode="decimal"')}${fld('pressao', 'Pressão (bar)', 'inputmode="decimal"')}</div>
      <div class="f"><label for="f_contNovo">Contaminantes</label>
        ${contList(form.contaminante).length ? `<div class="chips">${contList(form.contaminante).map((c, i) => `<span class="chip">${esc(c)}<button type="button" data-delcont="${i}" aria-label="Remover ${esc(c)}">✕</button></span>`).join('')}</div>` : ''}
        <div class="addrow"><input class="in" id="f_contNovo" list="dl_cont" autocomplete="off" placeholder="Escolha ou digite e toque em +"><button type="button" class="btn out" data-act="addCont" aria-label="Adicionar contaminante">＋</button></div>
        <datalist id="dl_cont">${[...new Set(col.flatMap(c => contList(c.contaminante)))].sort().map(s => `<option value="${esc(s)}">`).join('')}</datalist></div>
      ${fld('iso', 'ISO 4406', 'placeholder="18/16/13"')}
      <div class="two">${fld('volume', 'Volume de óleo (L)', 'inputmode="decimal"')}<div>${sfld('tipoOleo', 'Tipo de óleo')}</div></div>
      <div class="two"><div>${sfld('conexaoPressao', 'Conexão de pressão')}</div><div>${sfld('conexaoRetorno', 'Conexão de retorno')}</div></div>
      <div>${sfld('tensao', 'Tensão')}</div>
      <div class="f"><label>Status</label><div class="seg">${STATUS.map(([s, c]) => `<button type="button" data-status="${s}" aria-pressed="${form.status === s}"><i style="background:${c}"></i>${s}</button>`).join('')}</div></div>
      <div class="f"><label for="f_observacoes">Observações</label><textarea class="in" id="f_observacoes" data-k="observacoes" rows="3">${esc(form.observacoes || '')}</textarea></div>
      <div class="f"><label>Fotos ${oldFotos ? `(${oldFotos} já salva(s) + novas)` : ''} · até ${CFG.maxPhotos}</label><div class="photos">
        ${form.newFotos.map((p, i) => `<div class="ph"><img src="${p.url}" alt="Foto ${i + 1}"><button type="button" data-delfoto="${i}" aria-label="Remover foto">✕</button></div>`).join('')}
        ${oldFotos + form.newFotos.length < CFG.maxPhotos ? `<label class="add" for="inFoto">＋</label><input id="inFoto" type="file" accept="image/*" multiple hidden>` : ''}</div></div>
      <div class="f"><label>Arquivos anexos (laudo, planilhas…)</label><div class="files">
        ${form.newAnexos.map((a, i) => `<div class="file"><span>${esc(a.name)}</span><button type="button" data-delanexo="${i}">Remover</button></div>`).join('')}
        <label class="btn out" for="inAnexo" style="text-align:center">+ Anexar arquivo</label><input id="inAnexo" type="file" multiple hidden></div></div>
      <div class="actions"><button class="btn g" data-act="saveColeta">Salvar e gerar relatório</button></div></div></main>`;
  }
  function readForm() { document.querySelectorAll('[data-k]').forEach(el => { form[el.dataset.k] = el.value.trim(); }); }
  // Vários contaminantes ficam num só campo de texto, separados por vírgula.
  function contList(s) { return (s || '').split(/[,;]/).map(x => x.trim()).filter(Boolean); }
  function addCont() {
    const el = document.getElementById('f_contNovo'); const v = el && el.value.trim(); if (!v) return false;
    const list = contList(form.contaminante);
    v.split(/[,;]/).map(x => x.trim()).filter(Boolean).forEach(x => { if (!list.some(y => y.toLowerCase() === x.toLowerCase())) list.push(x); });
    form.contaminante = list.join(', '); el.value = ''; return true;
  }

  // Reduz a foto para no máximo photoMaxPx no maior lado (JPEG).
  function shrink(file) {
    return new Promise((res, rej) => {
      const img = new Image(); const u = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, CFG.photoMaxPx / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob(b => b ? res(b) : rej(new Error('Falha ao processar a foto')), 'image/jpeg', CFG.photoQuality);
      };
      img.onerror = () => rej(new Error('Formato de imagem não suportado')); img.src = u;
    });
  }

  async function saveColeta() {
    readForm(); addCont();
    if (!form.numero) return toast('Informe o nº da coleta.');
    if (!form.data) return toast('Informe a data.');
    if (!form.status) return toast('Escolha o status: Normal, Atenção ou Crítico.');
    const maq = await D.get('maquinas', form.maquinaAppId); const cli = await D.get('clientes', form.clienteAppId);
    const btn = document.querySelector('[data-act="saveColeta"]'); if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
    const pasta = `${safe(cli && cli.nome)}/${safe(maq.nome)}/${form.data}_coleta-${safe(form.numero)}`;
    const rec = Object.assign({}, form, { pasta }); delete rec.newFotos; delete rec.newAnexos;
    rec.fotos = rec.fotos || []; rec.anexos = rec.anexos || []; rec.relatorio = rec.relatorio || [];
    const saved = await D.save('coletas', rec);
    const base = slug(maq.nome);
    const existing = (await D.filesOf(saved.appId)).filter(f => f.kind === 'fotos').length;
    let n = Math.max(saved.fotos.length, existing);
    for (const p of form.newFotos) { n++; const name = `${base}_${form.data}_${String(n).padStart(2, '0')}.jpg`; await D.addFile(saved.appId, 'fotos', name, `${pasta}/${name}`, p.blob); }
    for (const a of form.newAnexos) await D.addFile(saved.appId, 'anexos', a.name, `${pasta}/anexos/${safe(a.name)}`, a.blob);
    await makePdf(saved.appId);
    form = null; toast('Coleta salva'); D.sync().catch(() => {});
    stack[stack.length - 1] = { v: 'coleta', id: saved.appId }; await render(); window.scrollTo(0, 0);
  }
  async function makePdf(coletaId) {
    const k = await D.get('coletas', coletaId); const maq = await D.get('maquinas', k.maquinaAppId); const cli = await D.get('clientes', k.clienteAppId);
    const files = await D.filesOf(k.appId);
    const fotos = mergeFiles(k.fotos, files.filter(f => f.kind === 'fotos'));
    const blobs = []; for (const f of fotos) { try { const b = await D.fileBlob(f); if (b) blobs.push(b); } catch (e) { } }
    const pdf = await window.Relatorio.build({ coleta: k, maquina: maq, cliente: cli, fotos: blobs });
    const name = `relatorio_coleta-${slug(k.numero)}.pdf`;
    await D.addFile(k.appId, 'relatorio', name, `${k.pasta}/${name}`, pdf);
  }

  // ---------- visualizador ----------
  function viewer(title, url, kind) {
    const v = document.createElement('div'); v.className = 'viewer';
    v.innerHTML = `<div class="vt"><b>${esc(title)}</b><a class="chip" href="${url}" target="_blank" rel="noopener">Abrir</a><button class="ib" aria-label="Fechar">✕</button></div>` +
      (kind === 'img' ? `<img src="${url}" alt="${esc(title)}">` : `<iframe src="${url}" title="${esc(title)}"></iframe>`);
    v.querySelector('button').onclick = () => v.remove(); document.body.appendChild(v);
  }
  async function openFile(f, kind) {
    if (!f) return;
    try { const b = await D.fileBlob(f); if (b) return viewer(f.name, URL.createObjectURL(b), kind); } catch (e) { }
    if (f.url && navigator.onLine) window.open(f.url, '_blank'); else toast('Arquivo disponível quando houver conexão.');
  }

  // ---------- login ----------
  function vLogin() {
    return `<div class="login"><div><img src="icons/logo-v.png" alt="Triple R · PROativa"><h2>Cadastro de Máquinas</h2><p>Clientes, máquinas e histórico de coletas de óleo.</p></div>
      <div style="display:flex;flex-direction:column;gap:10px"><button class="ms" data-act="login"><span class="msq"><b style="background:#F25022"></b><b style="background:#7FBA00"></b><b style="background:#00A4EF"></b><b style="background:#FFB900"></b></span>Entrar com a conta Microsoft</button>
      <p style="font-size:12.5px">Acesso restrito a contas @${esc(CFG.allowedDomain)}</p></div></div>`;
  }
  function vGone() { return header('Registro não encontrado', '', { nosync: true }) + '<main class="body"><div class="empty"><b>Este registro foi excluído.</b></div></main>'; }

  // ---------- render ----------
  const VIEWS = { clientes: vClientes, cliente: vCliente, maquina: vMaquina, coleta: vColeta, clienteForm: vClienteForm, maquinaForm: vMaquinaForm, coletaForm: vColetaForm };
  let renderSeq = 0;
  async function render() {
    const my = ++renderSeq;
    if (!D.user()) { $app.innerHTML = vLogin(); return; }
    const html = await VIEWS[cur().v]();
    if (my !== renderSeq) return;
    const focus = document.activeElement && document.activeElement.id; const pos = document.activeElement && document.activeElement.selectionStart;
    $app.innerHTML = html; paintSync(); paintThumbs();
    if (focus) { const el = document.getElementById(focus); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) { } } }
  }

  // ---------- eventos ----------
  $app.addEventListener('input', e => {
    if (e.target.id === 'q') { cur().q = e.target.value; render(); }
    else if (e.target.dataset.k && form) form[e.target.dataset.k] = e.target.value;
  });
  $app.addEventListener('keydown', async e => {
    if (e.target.id === 'f_contNovo' && e.key === 'Enter') { e.preventDefault(); readForm(); if (addCont()) { await render(); document.getElementById('f_contNovo')?.focus(); } }
  });
  $app.addEventListener('change', async e => {
    if (e.target.id === 'inFoto') {
      const files = [...e.target.files]; const k = cur().id ? await D.get('coletas', cur().id) : null;
      const room = CFG.maxPhotos - (k ? (k.fotos || []).length : 0) - form.newFotos.length;
      for (const f of files.slice(0, room)) { try { const b = await shrink(f); form.newFotos.push({ blob: b, url: URL.createObjectURL(b) }); } catch (er) { toast(er.message); } }
      if (files.length > room) toast(`Limite de ${CFG.maxPhotos} fotos.`);
      readForm(); render();
    }
    if (e.target.id === 'inAnexo') { [...e.target.files].forEach(f => form.newAnexos.push({ name: f.name, blob: f })); readForm(); render(); }
  });
  $app.addEventListener('click', async e => {
    const t = e.target.closest('[data-go],[data-act],[data-status],[data-delfoto],[data-delanexo],[data-delcont]'); if (!t) return;
    const d = t.dataset;
    if (d.act === 'addCont') { readForm(); if (addCont()) { await render(); document.getElementById('f_contNovo')?.focus(); } return; }
    if (d.delcont) { readForm(); const l = contList(form.contaminante); l.splice(+d.delcont, 1); form.contaminante = l.join(', '); return render(); }
    if (d.go) { form = null; return go({ v: d.go, id: d.id, cli: d.cli, maq: d.maq }); }
    if (d.status) { readForm(); form.status = d.status; return render(); }
    if (d.delfoto) { readForm(); form.newFotos.splice(+d.delfoto, 1); return render(); }
    if (d.delanexo) { readForm(); form.newAnexos.splice(+d.delanexo, 1); return render(); }
    const v = cur();
    switch (d.act) {
      case 'back': return back();
      case 'login': return D.login();
      case 'perfil': { if (D.DEMO) return toast('Modo demonstração'); if (confirmLogout()) return D.logout(); return; }
      case 'sync': return D.sync().then(() => { toast('Sincronizado'); render(); }).catch(() => {});
      case 'editCliente': form = null; return go({ v: 'clienteForm', id: v.id });
      case 'editMaquina': form = null; return go({ v: 'maquinaForm', id: v.id });
      case 'editColeta': form = null; return go({ v: 'coletaForm', id: v.id });
      case 'askDel': v.confirm = true; readFormSafe(); return render();
      case 'cancelDel': v.confirm = false; return render();
      case 'saveCliente': { readForm(); if (!form.nome) return toast('Informe o nome do cliente.'); const r = await D.save('clientes', form); form = null; toast('Cliente salvo'); stack[stack.length - 1] = { v: 'cliente', id: r.appId }; if (v.id) { history.back(); } else render(); return; }
      case 'saveMaquina': { readForm(); if (!form.nome) return toast('Informe o nome da máquina.'); const r = await D.save('maquinas', form); form = null; toast('Máquina salva'); stack[stack.length - 1] = { v: 'maquina', id: r.appId }; if (v.id) { history.back(); } else render(); return; }
      case 'saveColeta': return saveColeta();
      case 'delCliente': await D.remove('clientes', v.id); form = null; stack = [{ v: 'clientes' }]; toast('Cliente excluído'); return render();
      case 'delMaquina': { const m = await D.get('maquinas', v.id); await D.remove('maquinas', v.id); form = null; stack = [{ v: 'clientes' }, { v: 'cliente', id: m.clienteAppId }]; toast('Máquina excluída'); return render(); }
      case 'doDel': await D.remove('coletas', v.id); toast('Coleta excluída'); return back();
      case 'verPdf': return openFile(v.files && v.files.rel[v.files.rel.length - 1], 'pdf');
      case 'verAnexo': return openFile(v.files.anexos[+d.i], 'pdf');
      case 'regerarPdf': t.disabled = true; await makePdf(v.id); toast('Relatório gerado'); D.sync().catch(() => {}); return render();
    }
  });
  function readFormSafe() { if (form) readForm(); }
  // Sair da conta: pede confirmação na própria tela (toast + segundo toque)
  let logoutArm = 0;
  function confirmLogout() { const now = Date.now(); if (now - logoutArm < 3000) return true; logoutArm = now; const u = D.user(); toast(u.name + ' · toque de novo para sair'); return false; }

  // ---------- início ----------
  (async function start() {
    await D.initAuth();
    await D.seedDemo();
    await D.refreshPending();
    history.replaceState({ d: 1 }, '');
    await render();
    if (D.user() && navigator.onLine) D.sync().then(render).catch(() => {});
    setInterval(() => { if (D.user() && navigator.onLine && document.visibilityState === 'visible' && !form) D.sync().then(render).catch(() => {}); }, 120000);
    window.addEventListener('online', () => { paintSync(); });
    window.addEventListener('offline', () => { paintSync(); });
  })();
})();
