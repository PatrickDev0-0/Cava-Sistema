import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Boxes } from "lucide-react";
import { formatNumber, formatCurrency, formatDate, calcRendimentoMedio, calcPaginasPorDia, calcPaginasPorMes, diffDias } from "@/lib/printUtils";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export default function TonerDetail() {
  const { id } = useParams();
  const [toner, setToner] = useState(null);
  const [trocas, setTrocas] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const t = await base44.entities.Toner.get(id);
    setToner(t);
    const all = await base44.entities.TrocaToner.list();
    setTrocas(all.filter((x) => x.toner_id === id).sort((a, b) => new Date(b.data) - new Date(a.data)));
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);
  useRealtimeSync(["Toner", "TrocaToner"], load);

  const rendimentoMedio = useMemo(() => calcRendimentoMedio(trocas), [trocas]);
  const totalPaginas = useMemo(() => trocas.reduce((a, t) => a + Number(t.paginas_produzidas || 0), 0), [trocas]);

  const paginasPorDia = useMemo(() => {
    if (trocas.length === 0) return 0;
    const datas = trocas.map((t) => new Date(t.data)).sort((a, b) => a - b);
    return calcPaginasPorDia(totalPaginas, datas[0], new Date());
  }, [trocas, totalPaginas]);

  const custoPorPagina = useMemo(() => {
    if (totalPaginas <= 0 || !toner) return 0;
    // custo médio ponderado: valor unitário / rendimento médio
    return rendimentoMedio > 0 ? Number(toner.valor_unitario || 0) / rendimentoMedio : 0;
  }, [totalPaginas, rendimentoMedio, toner]);

  if (loading) return <div className="text-center py-20 text-muted-foreground">Carregando...</div>;
  if (!toner) return <div className="text-center py-20">Toner não encontrado.</div>;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild><Link to="/toners"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Link></Button>

      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center"><Boxes className="w-6 h-6 text-primary" /></div>
          <div className="flex-1">
            <h1 className="text-2xl font-heading font-bold">{toner.codigo}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground mt-1">
              <span>{toner.fabricante} {toner.modelo}</span>
              <span>Cor: <span className="text-foreground font-medium">{toner.cor}</span></span>
              <span>Valor: {formatCurrency(toner.valor_unitario)}</span>
              <span>Rendimento esperado: {formatNumber(toner.rendimento_esperado)} pág</span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">Compatível: {toner.impressoras_compativeis || "-"}</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Estoque atual</div><div className="text-xl font-bold mt-1">{formatNumber(toner.quantidade_estoque)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Rendimento médio</div><div className="text-xl font-bold mt-1">{formatNumber(Math.round(rendimentoMedio))}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Páginas/dia</div><div className="text-xl font-bold mt-1">{formatNumber(Math.round(paginasPorDia))}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Páginas/mês</div><div className="text-xl font-bold mt-1">{formatNumber(Math.round(calcPaginasPorMes(paginasPorDia)))}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Custo por página</div><div className="text-xl font-bold mt-1">{formatCurrency(custoPorPagina)}</div></Card>
      </div>

      <Card className="p-4">
        <h2 className="font-heading font-semibold mb-3">Histórico de Uso</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground"><tr>
              <th className="text-left px-3 py-2 font-medium">Data</th>
              <th className="text-left px-3 py-2 font-medium">Impressora</th>
              <th className="text-right px-3 py-2 font-medium">Inicial</th>
              <th className="text-right px-3 py-2 font-medium">Final</th>
              <th className="text-right px-3 py-2 font-medium">Páginas</th>
              <th className="text-right px-3 py-2 font-medium">Rendimento</th>
              <th className="text-right px-3 py-2 font-medium">Custo/pág</th>
            </tr></thead>
            <tbody>
              {trocas.length === 0 ? <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">Sem registros de uso.</td></tr> :
                trocas.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-3 py-2">{formatDate(t.data)}</td>
                    <td className="px-3 py-2 font-medium">{t.impressora_nome || "-"}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(t.contador_inicial)}</td>
                    <td className="px-3 py-2 text-right">{t.contador_final ? formatNumber(t.contador_final) : "-"}</td>
                    <td className="px-3 py-2 text-right font-semibold">{t.paginas_produzidas ? formatNumber(t.paginas_produzidas) : "-"}</td>
                    <td className="px-3 py-2 text-right">{t.rendimento_real ? formatNumber(t.rendimento_real) : "-"}</td>
                    <td className="px-3 py-2 text-right">{t.custo_por_pagina ? formatCurrency(t.custo_por_pagina) : "-"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}