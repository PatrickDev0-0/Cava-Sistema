import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { formatNumber, formatCurrency, formatDate, monthKey, downloadCSV, downloadExcel, downloadPDF } from "@/lib/printUtils";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

const TABS = [
  { key: "consumo", label: "Consumo de Impressões" },
  { key: "toner", label: "Uso de Toner" },
  { key: "cilindro", label: "Uso de Cilindro" },
  { key: "gastos", label: "Gastos por Período" },
  { key: "comp_impressoras", label: "Comparação entre Impressoras" },
  { key: "comp_setores", label: "Comparação entre Setores" },
];

export default function Relatorios() {
  const [tab, setTab] = useState("consumo");
  const [leituras, setLeituras] = useState([]);
  const [trocasToner, setTrocasToner] = useState([]);
  const [trocasCilindro, setTrocasCilindro] = useState([]);
  const [impressoras, setImpressoras] = useState([]);
  const [toners, setToners] = useState([]);
  const [cilindros, setCilindros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    impressora_id: "all", setor: "all", toner_id: "all", cilindro_id: "all",
    data_inicial: "", data_final: "",
  });

  const load = async () => {
    const [l, tt, tc, imp, ton, cil] = await Promise.all([
      base44.entities.Leitura.list(),
      base44.entities.TrocaToner.list(),
      base44.entities.TrocaCilindro.list(),
      base44.entities.Impressora.list(),
      base44.entities.Toner.list(),
      base44.entities.Cilindro.list(),
    ]);
    setLeituras(l); setTrocasToner(tt); setTrocasCilindro(tc);
    setImpressoras(imp.filter((i) => i.ativo !== false));
    setToners(ton.filter((i) => i.ativo !== false));
    setCilindros(cil.filter((i) => i.ativo !== false));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useRealtimeSync(["Leitura", "TrocaToner", "TrocaCilindro", "Impressora", "Toner", "Cilindro"], load);

  const setores = useMemo(() => [...new Set(impressoras.map((i) => i.setor).filter(Boolean))], [impressoras]);

  const inPeriod = (dateStr) => {
    const d = new Date(dateStr);
    if (filtros.data_inicial && d < new Date(filtros.data_inicial)) return false;
    if (filtros.data_final && d > new Date(filtros.data_final + "T23:59:59")) return false;
    return true;
  };

  const impressoraFiltro = (id) => filtros.impressora_id === "all" || filtros.impressora_id === id;
  const setorFiltro = (impId) => {
    if (filtros.setor === "all") return true;
    const imp = impressoras.find((i) => i.id === impId);
    return imp && imp.setor === filtros.setor;
  };

  // Linhas de cada relatório (após filtros)
  const relatorio = useMemo(() => {
    let rows = [];
    if (tab === "consumo") {
      rows = leituras
        .filter((l) => inPeriod(l.data) && impressoraFiltro(l.impressora_id) && setorFiltro(l.impressora_id))
        .sort((a, b) => new Date(b.data) - new Date(a.data))
        .map((l) => ({
          Data: formatDate(l.data), Impressora: l.impressora_nome, "Contador Atual": l.contador_atual,
          "Páginas (diferença)": l.diferenca, Toner: l.toner_codigo || "-", Cilindro: l.cilindro_codigo || "-",
        }));
    } else if (tab === "toner") {
      rows = trocasToner
        .filter((t) => inPeriod(t.data) && impressoraFiltro(t.impressora_id) && setorFiltro(t.impressora_id) && (filtros.toner_id === "all" || filtros.toner_id === t.toner_id))
        .sort((a, b) => new Date(b.data) - new Date(a.data))
        .map((t) => ({
          Data: formatDate(t.data), Impressora: t.impressora_nome, Toner: t.toner_codigo,
          "Cont. Inicial": t.contador_inicial, "Cont. Final": t.contador_final || "-",
          "Páginas Produzidas": t.paginas_produzidas || 0, "Custo/página": t.custo_por_pagina ? formatCurrency(t.custo_por_pagina) : "-",
        }));
    } else if (tab === "cilindro") {
      rows = trocasCilindro
        .filter((t) => inPeriod(t.data) && impressoraFiltro(t.impressora_id) && setorFiltro(t.impressora_id) && (filtros.cilindro_id === "all" || filtros.cilindro_id === t.cilindro_id))
        .sort((a, b) => new Date(b.data) - new Date(a.data))
        .map((t) => ({
          Data: formatDate(t.data), Impressora: t.impressora_nome, Cilindro: t.cilindro_codigo,
          "Cont. Inicial": t.contador_inicial, "Cont. Final": t.contador_final || "-",
          "Páginas Produzidas": t.paginas_produzidas || 0, "Custo/página": t.custo_por_pagina ? formatCurrency(t.custo_por_pagina) : "-",
        }));
    } else if (tab === "gastos") {
      const map = {};
      trocasToner.filter((t) => inPeriod(t.data) && impressoraFiltro(t.impressora_id) && setorFiltro(t.impressora_id)).forEach((t) => {
        const k = monthKey(t.data);
        map[k] = map[k] || { "Mês": k, "Gasto Toner (R$)": 0, "Gasto Cilindro (R$)": 0 };
        const toner = toners.find((x) => x.id === t.toner_id);
        map[k]["Gasto Toner (R$)"] += toner ? Number(toner.valor_unitario || 0) : 0;
      });
      trocasCilindro.filter((t) => inPeriod(t.data) && impressoraFiltro(t.impressora_id) && setorFiltro(t.impressora_id)).forEach((t) => {
        const k = monthKey(t.data);
        map[k] = map[k] || { "Mês": k, "Gasto Toner (R$)": 0, "Gasto Cilindro (R$)": 0 };
        const cil = cilindros.find((x) => x.id === t.cilindro_id);
        map[k]["Gasto Cilindro (R$)"] += cil ? Number(cil.valor_unitario || 0) : 0;
      });
      rows = Object.values(map).map((r) => ({
        ...r,
        "Gasto Toner (R$)": r["Gasto Toner (R$)"].toFixed(2),
        "Gasto Cilindro (R$)": r["Gasto Cilindro (R$)"].toFixed(2),
        "Total (R$)": (Number(r["Gasto Toner (R$)"]) + Number(r["Gasto Cilindro (R$)"])).toFixed(2),
      })).sort((a, b) => a["Mês"].localeCompare(b["Mês"]));
    } else if (tab === "comp_impressoras") {
      const map = {};
      leituras.filter((l) => inPeriod(l.data) && impressoraFiltro(l.impressora_id) && setorFiltro(l.impressora_id)).forEach((l) => {
        const id = l.impressora_id;
        map[id] = map[id] || { Impressora: l.impressora_nome, "Páginas": 0, Leituras: 0 };
        map[id]["Páginas"] += Number(l.diferenca || 0);
        map[id].Leituras += 1;
      });
      trocasToner.filter((t) => inPeriod(t.data) && impressoraFiltro(t.impressora_id) && setorFiltro(t.impressora_id)).forEach((t) => {
        const id = t.impressora_id;
        map[id] = map[id] || { Impressora: t.impressora_nome, "Páginas": 0, Leituras: 0 };
        map[id]["Trocas Toner"] = (map[id]["Trocas Toner"] || 0) + 1;
      });
      rows = Object.values(map).map((r) => ({ ...r, "Trocas Toner": r["Trocas Toner"] || 0 })).sort((a, b) => b["Páginas"] - a["Páginas"]);
    } else if (tab === "comp_setores") {
      const map = {};
      leituras.filter((l) => inPeriod(l.data) && impressoraFiltro(l.impressora_id) && setorFiltro(l.impressora_id)).forEach((l) => {
        const imp = impressoras.find((i) => i.id === l.impressora_id);
        const s = imp ? imp.setor : "Sem setor";
        map[s] = map[s] || { Setor: s, "Páginas": 0, Impressoras: new Set() };
        map[s]["Páginas"] += Number(l.diferenca || 0);
        if (imp) map[s].Impressoras.add(imp.id);
      });
      rows = Object.values(map).map((r) => ({ Setor: r.Setor, "Páginas": r["Páginas"], "Impressoras": r.Impressoras.size })).sort((a, b) => b["Páginas"] - a["Páginas"]);
    }
    return rows;
  }, [tab, leituras, trocasToner, trocasCilindro, filtros, impressoras, toners, cilindros]);

  const exportar = async (tipo) => {
    const nome = "relatorio_" + tab;
    if (tipo === "csv") downloadCSV(nome + ".csv", relatorio);
    else if (tipo === "excel") downloadExcel(nome + ".xlsx", relatorio);
    else if (tipo === "pdf") await downloadPDF(TABS.find((t) => t.key === tab).label, relatorio);
  };

  const headers = relatorio.length > 0 ? Object.keys(relatorio[0]) : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Análise de consumo, suprimentos, custos e comparações</p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div><Label>Impressora</Label>
            <Select value={filtros.impressora_id} onValueChange={(v) => setFiltros({ ...filtros, impressora_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todas</SelectItem>{impressoras.map((i) => (<SelectItem key={i.id} value={i.id}>{i.fabricante} {i.modelo}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div><Label>Setor</Label>
            <Select value={filtros.setor} onValueChange={(v) => setFiltros({ ...filtros, setor: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem>{setores.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div><Label>Toner</Label>
            <Select value={filtros.toner_id} onValueChange={(v) => setFiltros({ ...filtros, toner_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem>{toners.map((t) => (<SelectItem key={t.id} value={t.id}>{t.codigo} - {t.modelo}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div><Label>Cilindro</Label>
            <Select value={filtros.cilindro_id} onValueChange={(v) => setFiltros({ ...filtros, cilindro_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos</SelectItem>{cilindros.map((c) => (<SelectItem key={c.id} value={c.id}>{c.codigo} - {c.modelo}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Data inicial</Label><Input type="date" value={filtros.data_inicial} onChange={(e) => setFiltros({ ...filtros, data_inicial: e.target.value })} /></div>
            <div><Label>Data final</Label><Input type="date" value={filtros.data_final} onChange={(e) => setFiltros({ ...filtros, data_final: e.target.value })} /></div>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.key} variant={tab === t.key ? "default" : "outline"} onClick={() => setTab(t.key)} className={tab === t.key ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}>{t.label}</Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" onClick={() => exportar("csv")} disabled={relatorio.length === 0}><FileText className="w-4 h-4 mr-1" /> CSV</Button>
        <Button variant="outline" onClick={() => exportar("excel")} disabled={relatorio.length === 0}><FileSpreadsheet className="w-4 h-4 mr-1" /> Excel</Button>
        <Button variant="outline" onClick={() => exportar("pdf")} disabled={relatorio.length === 0}><FileDown className="w-4 h-4 mr-1" /> PDF</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>{headers.map((h) => <th key={h} className="text-left px-4 py-2.5 font-medium whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={headers.length || 1} className="text-center py-10 text-muted-foreground">Carregando...</td></tr>
              ) : relatorio.length === 0 ? (
                <tr><td colSpan={headers.length || 1} className="text-center py-10 text-muted-foreground">Sem dados para os filtros selecionados.</td></tr>
              ) : relatorio.map((r, i) => (
                <tr key={i} className="border-t border-border hover:bg-muted/50">
                  {headers.map((h) => <td key={h} className="px-4 py-2.5 whitespace-nowrap">{r[h]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {relatorio.length > 0 && <div className="text-sm text-muted-foreground text-right">{relatorio.length} registro(s)</div>}
    </div>
  );
}