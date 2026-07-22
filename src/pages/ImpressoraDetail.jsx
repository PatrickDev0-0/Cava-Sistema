import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, MapPin, Network, Hash, Building } from "lucide-react";
import { formatNumber, formatCurrency, formatDate, calcPaginasPorDia, calcPaginasPorMes, diffDias } from "@/lib/printUtils";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export default function ImpressoraDetail() {
  const { id } = useParams();
  const [imp, setImp] = useState(null);
  const [leituras, setLeituras] = useState([]);
  const [trocasToner, setTrocasToner] = useState([]);
  const [trocasCilindro, setTrocasCilindro] = useState([]);
  const [toners, setToners] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const i = await base44.entities.Impressora.get(id);
    setImp(i);
    const [l, tt, tc, ton] = await Promise.all([
      base44.entities.Leitura.list(),
      base44.entities.TrocaToner.list(),
      base44.entities.TrocaCilindro.list(),
      base44.entities.Toner.list(),
    ]);
    setLeituras(l.filter((x) => x.impressora_id === id).sort((a, b) => new Date(b.data) - new Date(a.data)));
    setTrocasToner(tt.filter((x) => x.impressora_id === id).sort((a, b) => new Date(b.data) - new Date(a.data)));
    setTrocasCilindro(tc.filter((x) => x.impressora_id === id).sort((a, b) => new Date(b.data) - new Date(a.data)));
    setToners(ton);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);
  useRealtimeSync(["Leitura", "TrocaToner", "TrocaCilindro", "Impressora", "Toner"], load);

  const totalPaginas = useMemo(() => leituras.reduce((a, l) => a + Number(l.diferenca || 0), 0), [leituras]);

  const custoAcumulado = useMemo(() => {
    const gt = trocasToner.reduce((a, t) => {
      const toner = toners.find((x) => x.id === t.toner_id);
      return a + (toner ? Number(toner.valor_unitario || 0) : 0);
    }, 0);
    return gt;
  }, [trocasToner, toners]);

  const consumoMedio = useMemo(() => {
    if (leituras.length === 0) return 0;
    const datas = leituras.map((l) => new Date(l.data)).sort((a, b) => a - b);
    const dias = diffDias(datas[0], new Date());
    return totalPaginas / dias;
  }, [leituras, totalPaginas]);

  if (loading) return <div className="text-center py-20 text-muted-foreground">Carregando...</div>;
  if (!imp) return <div className="text-center py-20">Impressora não encontrada.</div>;

  const sectionCard = (title, children) => (
    <Card className="p-4">
      <h2 className="font-heading font-semibold mb-3">{title}</h2>
      {children}
    </Card>
  );

  const tableWrap = (rows) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{rows}</table>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link to="/impressoras"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Link></Button>
      </div>

      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-12 h-12 rounded-md bg-secondary flex items-center justify-center"><Printer className="w-6 h-6 text-primary" /></div>
          <div className="flex-1">
            <h1 className="text-2xl font-heading font-bold">{imp.fabricante} {imp.modelo}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5" /> {imp.patrimonio || "-"}</span>
              <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" /> {imp.setor}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {imp.localizacao || "-"}</span>
              <span className="flex items-center gap-1"><Network className="w-3.5 h-3.5" /> {imp.ip || "-"}</span>
              <span>Série: {imp.numero_serie || "-"}</span>
              <span>SNMP: {imp.compativel_snmp ? "Sim" : "Não"}</span>
              <span>Status: <span className={imp.status === "Ativa" ? "text-green-600 font-medium" : "text-muted-foreground"}>{imp.status}</span></span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Contador atual</div><div className="text-xl font-bold mt-1">{formatNumber(imp.contador_atual)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total de páginas</div><div className="text-xl font-bold mt-1">{formatNumber(totalPaginas)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Consumo médio (pág/dia)</div><div className="text-xl font-bold mt-1">{formatNumber(Math.round(consumoMedio))}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Custo acumulado (toners)</div><div className="text-xl font-bold mt-1">{formatCurrency(custoAcumulado)}</div></Card>
      </div>

      {sectionCard("Histórico de Leituras",
        tableWrap(
          <>
            <thead className="bg-muted text-muted-foreground"><tr>
              <th className="text-left px-3 py-2 font-medium">Data</th>
              <th className="text-left px-3 py-2 font-medium">Hora</th>
              <th className="text-right px-3 py-2 font-medium">Contador</th>
              <th className="text-right px-3 py-2 font-medium">Diferença</th>
            </tr></thead>
            <tbody>
              {leituras.length === 0 ? <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Sem leituras.</td></tr> :
                leituras.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-3 py-2">{formatDate(l.data)}</td>
                    <td className="px-3 py-2">{l.hora || "-"}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(l.contador_atual)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-primary">{formatNumber(l.diferenca)}</td>
                  </tr>
                ))}
            </tbody>
          </>
        )
      )}

      {sectionCard("Histórico de Troca de Toner",
        tableWrap(
          <>
            <thead className="bg-muted text-muted-foreground"><tr>
              <th className="text-left px-3 py-2 font-medium">Data</th>
              <th className="text-left px-3 py-2 font-medium">Toner</th>
              <th className="text-right px-3 py-2 font-medium">Inicial</th>
              <th className="text-right px-3 py-2 font-medium">Final</th>
              <th className="text-right px-3 py-2 font-medium">Páginas</th>
              <th className="text-right px-3 py-2 font-medium">Custo/pág</th>
            </tr></thead>
            <tbody>
              {trocasToner.length === 0 ? <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Sem trocas.</td></tr> :
                trocasToner.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-3 py-2">{formatDate(t.data)}</td>
                    <td className="px-3 py-2 font-medium">{t.toner_codigo || "-"}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(t.contador_inicial)}</td>
                    <td className="px-3 py-2 text-right">{t.contador_final ? formatNumber(t.contador_final) : "-"}</td>
                    <td className="px-3 py-2 text-right font-semibold">{t.paginas_produzidas ? formatNumber(t.paginas_produzidas) : "-"}</td>
                    <td className="px-3 py-2 text-right">{t.custo_por_pagina ? formatCurrency(t.custo_por_pagina) : "-"}</td>
                  </tr>
                ))}
            </tbody>
          </>
        )
      )}

      {sectionCard("Histórico de Troca de Cilindro",
        tableWrap(
          <>
            <thead className="bg-muted text-muted-foreground"><tr>
              <th className="text-left px-3 py-2 font-medium">Data</th>
              <th className="text-left px-3 py-2 font-medium">Cilindro</th>
              <th className="text-right px-3 py-2 font-medium">Inicial</th>
              <th className="text-right px-3 py-2 font-medium">Final</th>
              <th className="text-right px-3 py-2 font-medium">Páginas</th>
              <th className="text-right px-3 py-2 font-medium">Custo/pág</th>
            </tr></thead>
            <tbody>
              {trocasCilindro.length === 0 ? <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">Sem trocas.</td></tr> :
                trocasCilindro.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-3 py-2">{formatDate(t.data)}</td>
                    <td className="px-3 py-2 font-medium">{t.cilindro_codigo || "-"}</td>
                    <td className="px-3 py-2 text-right">{formatNumber(t.contador_inicial)}</td>
                    <td className="px-3 py-2 text-right">{t.contador_final ? formatNumber(t.contador_final) : "-"}</td>
                    <td className="px-3 py-2 text-right font-semibold">{t.paginas_produzidas ? formatNumber(t.paginas_produzidas) : "-"}</td>
                    <td className="px-3 py-2 text-right">{t.custo_por_pagina ? formatCurrency(t.custo_por_pagina) : "-"}</td>
                  </tr>
                ))}
            </tbody>
          </>
        )
      )}
    </div>
  );
}