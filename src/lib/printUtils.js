// Utilitários de cálculo e formatação do sistema CAVA

export function formatCurrency(value) {
  const v = Number(value || 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString("pt-BR");
}

export function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("pt-BR");
}

export function monthLabel(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

// Total de páginas impressas a partir das leituras (soma das diferenças)
export function totalPaginasFromLeituras(leituras) {
  return leituras.reduce((acc, l) => acc + Number(l.diferenca || 0), 0);
}

// Rendimento real = páginas produzidas no ciclo da troca
export function calcRendimentoReal(contadorInicial, contadorFinal) {
  return Math.max(0, Number(contadorFinal || 0) - Number(contadorInicial || 0));
}

// Custo por página = valor unitário / páginas produzidas
export function calcCustoPorPagina(valorUnitario, paginasProduzidas) {
  const p = Number(paginasProduzidas || 0);
  if (p <= 0) return 0;
  return Number(valorUnitario || 0) / p;
}

// Rendimento médio de um suprimento a partir das trocas concluídas
export function calcRendimentoMedio(trocas) {
  const concluidas = trocas.filter((t) => Number(t.paginas_produzidas || 0) > 0);
  if (concluidas.length === 0) return 0;
  const total = concluidas.reduce((acc, t) => acc + Number(t.paginas_produzidas || 0), 0);
  return total / concluidas.length;
}

// Páginas por dia entre duas datas
export function calcPaginasPorDia(paginas, dataInicial, dataFinal) {
  const di = new Date(dataInicial);
  const df = dataFinal ? new Date(dataFinal) : new Date();
  const dias = Math.max(1, Math.round((df - di) / (1000 * 60 * 60 * 24)));
  return Number(paginas || 0) / dias;
}

export function calcPaginasPorMes(paginasPorDia) {
  return Number(paginasPorDia || 0) * 30;
}

export function diffDias(dataInicial, dataFinal) {
  const di = new Date(dataInicial);
  const df = dataFinal ? new Date(dataFinal) : new Date();
  return Math.max(1, Math.round((df - di) / (1000 * 60 * 60 * 24)));
}

// Últimos 12 meses como array de chaves "YYYY-MM" (labels pt-BR)
export function ultimos12Meses() {
  const arr = [];
  const base = new Date();
  base.setDate(1);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    arr.push({ key, label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }) });
  }
  return arr;
}

export function monthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    if (s.includes(";") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const csv = [
    headers.join(";"),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(";")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadExcel(filename, rows) {
  // Exporta como CSV compatível com Excel (extensão .xls abre no Excel)
  downloadCSV(filename.replace(/\.xlsx?$/i, "") + ".csv", rows);
}

export async function downloadPDF(title, rows) {
  const { jsPDF } = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text("CAVA Engenharia - " + title, 14, 18);
  doc.setFontSize(9);
  if (!rows || rows.length === 0) {
    doc.text("Sem dados para exibir.", 14, 30);
    doc.save(title.replace(/\s+/g, "_") + ".pdf");
    return;
  }
  const headers = Object.keys(rows[0]);
  let y = 30;
  const pageWidth = doc.internal.pageSize.getWidth() - 28;
  const colWidth = pageWidth / headers.length;
  doc.setFillColor(43, 96, 50);
  doc.rect(14, y - 6, pageWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  headers.forEach((h, i) => {
    doc.text(String(h).substring(0, 22), 14 + i * colWidth, y);
  });
  doc.setTextColor(20, 20, 20);
  y += 6;
  rows.forEach((r, idx) => {
    if (y > 190) {
      doc.addPage();
      y = 20;
    }
    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(14, y - 5, pageWidth, 7, "F");
    }
    headers.forEach((h, i) => {
      const val = r[h] == null ? "" : String(r[h]).substring(0, 22);
      doc.text(val, 14 + i * colWidth, y);
    });
    y += 7;
  });
  doc.save(title.replace(/\s+/g, "_") + ".pdf");
}