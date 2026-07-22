import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Printer, Boxes, Disc, FileText, DollarSign, TrendingUp, Calculator } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { formatNumber, formatCurrency, ultimos12Meses, monthKey } from "@/lib/printUtils";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export default function Dashboard() {
  const [impressoras, setImpressoras] = useState([]);
  const [toners, setToners] = useState([]);
  const [cilindros, setCilindros] = useState([]);
  const [leituras, setLeituras] = useState([]);
  const [trocasToner, setTrocasToner] = useState([]);
  const [trocasCilindro, setTrocasCilindro] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [imp, ton, cil, lei, tt, tc] = await Promise.all([
      base44.entities.Impressora.list(),
      base44.entities.Toner.list(),
      base44.entities.Cilindro.list(),
      base44.entities.Leitura.list(),
      base44.entities.TrocaToner.list(),
      base44.entities.TrocaCilindro.list(),
    ]);
    setImpressoras(imp.filter((i) => i.ativo !== false));
    setToners(ton.filter((i) => i.ativo !== false));
    setCilindros(cil.filter((i) => i.ativo !== false));
    setLeituras(lei);
    setTrocasToner(tt);
    setTrocasCilindro(tc);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useRealtimeSync(["Impressora", "Toner", "Cilindro", "Leitura", "TrocaToner", "TrocaCilindro"], load);

  const totalPaginas = useMemo(() => leituras.reduce((a, l) => a + Number(l.diferenca || 0), 0), [leituras]);

  const estoqueToners = useMemo(() => toners.reduce((a, t) => a + Number(t.quantidade_estoque || 0), 0), [toners]);
  const estoqueCilindros = useMemo(() => cilindros.reduce((a, c) => a + Number(c.quantidade_estoque || 0), 0), [cilindros]);

  const gastosSuprimentos = useMemo(() => {
    const gastoToner = trocasToner.reduce((a, t) => {
      const toner = toners.find((x) => x.id === t.toner_id);
      return a + (toner ? Number(toner.valor_unitario || 0) : 0);
    }, 0);
    const gastoCil = trocasCilindro.reduce((a, t) => {
      const cil = cilindros.find((x) => x.id === t.cilindro_id);
      return a + (cil ? Number(cil.valor_unitario || 0) : 0);
    }, 0);
    return gastoToner + gastoCil;
  }, [trocasToner, trocasCilindro, toners, cilindros]);

  const custoMedio = useMemo(() => {
    const paginasToner = trocasToner.reduce((a, t) => a + Number(t.paginas_produzidas || 0), 0);
    const paginasCil = trocasCilindro.reduce((a, t) => a + Number(t.paginas_produzidas || 0), 0);
    const totalPags = paginasToner + paginasCil;
    return totalPags > 0 ? gastosSuprimentos / totalPags : 0;
  }, [trocasToner, trocasCilindro, gastosSuprimentos]);

  const consumoMensal = useMemo(() => {
    const atual = new Date();
    const key = `${atual.getFullYear()}-${String(atual.getMonth() + 1).padStart(2, "0")}`;
    return leituras.filter((l) => monthKey(l.data) === key).reduce((a, l) => a + Number(l.diferenca || 0), 0);
  }, [leituras]);

  const dados12Meses = useMemo(() => {
    const meses = ultimos12Meses();
    return meses.map((m) => {
      const paginas = leituras.filter((l) => monthKey(l.data) === m.key).reduce((a, l) => a + Number(l.diferenca || 0), 0);
      const trocasT = trocasToner.filter((t) => monthKey(t.data) === m.key).length;
      const trocasC = trocasCilindro.filter((t) => monthKey(t.data) === m.key).length;
      return { label: m.label, Páginas: paginas, "Trocas Toner": trocasT, "Trocas Cilindro": trocasC };
    });
  }, [leituras, trocasToner, trocasCilindro]);

  const rankingConsumo = useMemo(() => {
    const map = {};
    leituras.forEach((l) => {
      const id = l.impressora_id;
      if (!id) return;
      map[id] = map[id] || { nome: l.impressora_nome || "-", total: 0 };
      map[id].total += Number(l.diferenca || 0);
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [leituras]);

  if (loading) return <div className="text-center py-20 text-muted-foreground">Carregando dashboard...</div>;

  const kpis = [
    { label: "Impressoras", value: formatNumber(impressoras.length), icon: Printer, color: "text-blue-600" },
    { label: "Total de páginas", value: formatNumber(totalPaginas), icon: FileText, color: "text-primary" },
    { label: "Toners em estoque", value: formatNumber(estoqueToners), icon: Boxes, color: "text-purple-600" },
    { label: "Cilindros em estoque", value: formatNumber(estoqueCilindros), icon: Disc, color: "text-teal-600" },
    { label: "Consumo mensal", value: formatNumber(consumoMensal), icon: TrendingUp, color: "text-green-600" },
    { label: "Gastos com suprimentos", value: formatCurrency(gastosSuprimentos), icon: DollarSign, color: "text-destructive" },
    { label: "Custo médio por página", value: formatCurrency(custoMedio), icon: Calculator, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do controle de impressões e suprimentos</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground leading-tight">{k.label}</div>
                <Icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <div className="text-xl font-bold mt-2">{k.value}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2">
          <h2 className="font-heading font-semibold mb-3">Histórico dos últimos 12 meses</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={dados12Meses}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Páginas" fill="hsl(43 96% 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <h2 className="font-heading font-semibold mb-3">Impressoras com maior consumo</h2>
          {rankingConsumo.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">Sem dados ainda.</div>
          ) : (
            <div className="space-y-3">
              {rankingConsumo.map((r, i) => {
                const max = rankingConsumo[0].total || 1;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium truncate">{r.nome}</span>
                      <span className="font-semibold">{formatNumber(r.total)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(r.total / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h2 className="font-heading font-semibold mb-3">Trocas de Toner (mensal)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dados12Meses}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Trocas Toner" fill="hsl(222 47% 30%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <h2 className="font-heading font-semibold mb-3">Trocas de Cilindro (mensal)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dados12Meses}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Trocas Cilindro" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}