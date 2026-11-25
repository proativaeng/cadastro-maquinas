/* Relatório PDF da coleta (A4), gerado no aparelho com jsPDF — funciona offline. */
(function () {
  const NAVY = [14, 18, 112], GREEN = [93, 178, 135], GREY = [93, 100, 130], LINE = [223, 227, 238];
  const STATUS = { 'Normal': [46, 155, 98], 'Atenção': [217, 139, 18], 'Crítico': [201, 54, 43] };
  const toDataUrl = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
  const imgSize = url => new Promise(res => { const i = new Image(); i.onload = () => res({ w: i.width, h: i.height }); i.onerror = () => res({ w: 4, h: 3 }); i.src = url; });
  let logoCache;
  async function logo() {
    if (logoCache) return logoCache;
    // Se falhar, não guarda a falha: tenta de novo no próximo relatório.
    try {
      const r = await fetch('icons/logo-h.png'); if (!r.ok) throw new Error('logo ' + r.status);
      const u = await toDataUrl(await r.blob()); logoCache = { u, s: await imgSize(u) };
    } catch (e) { console.warn('Logo do relatório indisponível', e); return null; }
    return logoCache;
  }
  const fmt = d => d ? d.slice(0, 10).split('-').reverse().join('/') : '—';

  async function build({ coleta: k, maquina: m, cliente: c, fotos }) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, M = 15; let y = 14;
    const lg = await logo();
    if (lg) { const h = 12; doc.addImage(lg.u, 'PNG', M, y, h * lg.s.w / lg.s.h, h); }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...GREY);
    doc.text('Coleta nº ' + (k.numero || ''), W - M, y + 5, { align: 'right' });
    doc.text('Gerado em ' + new Date().toLocaleString('pt-BR'), W - M, y + 10, { align: 'right' });
    y += 17; doc.setDrawColor(...NAVY); doc.setLineWidth(0.8); doc.line(M, y, W - M, y); y += 9;
    doc.setTextColor(...NAVY); doc.setFontSize(16); doc.text('Relatório de coleta de óleo', M, y);
    const st = k.status; const sc = STATUS[st];
    if (sc) {
      doc.setFontSize(9); const tw = doc.getTextWidth(st) + 8;
      doc.setFillColor(...sc); doc.roundedRect(W - M - tw, y - 5, tw, 7, 3.5, 3.5, 'F'); doc.setTextColor(255, 255, 255); doc.text(st, W - M - tw / 2, y - 0.4, { align: 'center' });
    }
    y += 7;

    const rows = [
      ['Cliente', c ? c.nome : ''], ['Máquina', m ? m.nome : ''], ['Modelo / Fabricante', [m && m.modelo, m && m.fabricante].filter(Boolean).join(' / ')],
      ['Data da coleta', fmt(k.data)], ['Usuário', k.tecnico], ['Temperatura', k.temperatura ? k.temperatura + ' °C' : ''], ['Pressão', k.pressao ? k.pressao + ' bar' : ''],
      ['Contaminantes', k.contaminante], ['ISO 4406', k.iso], ['Volume de óleo', k.volume ? k.volume + ' L' : ''], ['Tipo de óleo', k.tipoOleo],
      ['Conexão de pressão', k.conexaoPressao], ['Conexão de retorno', k.conexaoRetorno], ['Tensão', k.tensao]
    ];
    const cw = 58, rh = 7.2;
    doc.setLineWidth(0.2); doc.setDrawColor(...LINE); doc.setFontSize(9.5);
    rows.forEach(([a, b], i) => {
      doc.setFillColor(i % 2 ? 255 : 247, i % 2 ? 255 : 248, i % 2 ? 255 : 252); doc.rect(M, y, W - 2 * M, rh, 'F');
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREY); doc.text(a, M + 3, y + 4.9);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(21, 25, 51); doc.text(String(b || '—'), M + cw, y + 4.9, { maxWidth: W - 2 * M - cw - 3 });
      y += rh;
    });
    doc.rect(M, y - rh * rows.length, W - 2 * M, rh * rows.length);
    y += 8;
    if (k.observacoes) {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY); doc.setFontSize(11); doc.text('Observações', M, y); y += 6;
      doc.setFont('helvetica', 'normal'); doc.setTextColor(21, 25, 51); doc.setFontSize(9.5);
      const lines = doc.splitTextToSize(k.observacoes, W - 2 * M); doc.text(lines, M, y); y += lines.length * 4.6 + 6;
    }
    if (fotos && fotos.length) {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY); doc.setFontSize(11); doc.text('Fotos', M, y); y += 4;
      const cols = 2, gap = 6, bw = (W - 2 * M - gap) / cols, bh = bw * 0.75;
      for (let i = 0; i < fotos.length; i++) {
        if (y + bh > 280) { doc.addPage(); y = 18; }
        const u = await toDataUrl(fotos[i]); const s = await imgSize(u);
        const r = Math.min(bw / s.w, bh / s.h), w = s.w * r, h = s.h * r;
        const x = M + (i % cols) * (bw + gap);
        doc.setFillColor(238, 240, 250); doc.rect(x, y, bw, bh, 'F');
        doc.addImage(u, 'JPEG', x + (bw - w) / 2, y + (bh - h) / 2, w, h, undefined, 'MEDIUM');
        if (i % cols === cols - 1 || i === fotos.length - 1) y += bh + gap;
      }
    }
    if (y > 255) { doc.addPage(); y = 30; }
    y = Math.max(y + 10, 258);
    doc.setDrawColor(21, 25, 51); doc.setLineWidth(0.3);
    doc.line(M, y, M + 75, y); doc.line(W - M - 75, y, W - M, y);
    doc.setFontSize(9); doc.setTextColor(...GREY); doc.setFont('helvetica', 'normal');
    doc.text('Usuário: ' + (k.tecnico || ''), M, y + 5); doc.text('Responsável', W - M - 75, y + 5);
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p); doc.setFillColor(...GREEN); doc.rect(0, 291, W, 6, 'F');
      doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.text('Triple R · ProAtiva', M, 295);
      doc.text(p + '/' + pages, W - M, 295, { align: 'right' });
    }
    return doc.output('blob');
  }
  window.Relatorio = { build };
})();
