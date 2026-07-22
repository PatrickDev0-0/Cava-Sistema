import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, CheckCircle2, RefreshCw } from "lucide-react";
import { formatNumber, formatCurrency, formatDate, calcRendimentoReal, calcCustoPorPagina } from "@/lib/printUtils";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export default function TrocasToner() {
  const [trocas, setTrocas] = useState([]);
  const [impressoras, setImpressoras] = useState([]);
  const [toners, setToners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalizando, setFinalizando] = useState(null);
  const [contadorFinal, setContadorFinal] = useState(0);
  const [form, setForm] = useState({ impressora_id: "", toner_id: "", data: new Date().toISOString().slice(0, 10), contador_inicial: 0 });

  const load = async (silent) => {
    if (!silent) setLoading(true);
    const [t, imp, ton] = await Promise.all([
      base44.entities.TrocaToner.list("-data"),
      base44.entities.Impressora.list(),
      base44.entities.Toner.list(),
    ]);
    setTrocas(t);
    setImpressoras(imp.filter((i) => i.ativo !== false));
    setToners(ton.filter((i) => i.ativo !== false));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useRealtimeSync(["TrocaToner", "Impressora", "Toner"], () => load(true));

  const ordered = useMemo(() =>
    trocas.slice().sort((a, b) => new Date(b.data) - new Date(a.data)), [trocas]);

  const onImpressoraChange = (v) => {
    const imp = impressoras.find((i) => i.id === v);
    setForm({ ...form, impressora_id: v, contador_inicial: imp ? Number(imp.contador_atual || 0) : 0 });
  };

  const save = async () => {
    setSaving(true);
    const imp = impressoras.find((i) => i.id === form.impressora_id);
    const toner = toners.find((t) => t.id === form.toner_id);
    const contadorInicial = Number(form.contador_inicial || 0);

    // Finaliza troca aberta anterior da mesma impressora
    const abertas = trocas.filter((t) => t.impressora_id === form.impressora_id && (!t.contador_final || t.contador_final === 0));
    for (const ab of abertas) {
      const paginas = calcRendimentoReal(ab.contador_inicial, contadorInicial);
      const tonerAnt = toners.find((t) => t.id === ab.toner_id);
      const custo = calcCustoPorPagina(tonerAnt ? tonerAnt.valor_unitario : 0, paginas);
      await base44.entities.TrocaToner.update(ab.id, {
        contador_final: contadorInicial,
        paginas_produzidas: paginas,
        rendimento_real: paginas,
        custo_por_pagina: custo,
      });
    }

    // Cria nova troca (aberta)
    await base44.entities.TrocaToner.create({
      impressora_id: form.impressora_id,
      impressora_nome: imp ? `${imp.fabricante} ${imp.modelo}` : "",
      toner_id: form.toner_id,
      toner_codigo: toner ? toner.codigo : "",
      data: form.data,
      contador_inicial: contadorInicial,
      contador_final: 0,
      paginas_produzidas: 0,
      rendimento_real: 0,
      custo_por_pagina: 0,
    });

    // Baixa no estoque do toner
    if (toner) {
      await base44.entities.Toner.update(toner.id, { quantidade_estoque: Math.max(0, Number(toner.quantidade_estoque || 0) - 1) });
      await base44.entities.MovimentoEstoque.create({
        tipo_item: "Toner", item_id: toner.id, item_codigo: toner.codigo,
        tipo_movimento: "Instalacao", quantidade: 1, data: form.data,
        observacao: `Instalado em ${imp ? imp.fabricante + " " + imp.modelo : ""}`,
      });
    }
    // Atualiza contador da impressora
    if (imp) await base44.entities.Impressora.update(imp.id, { contador_atual: contadorInicial });

    setSaving(false); setOpen(false);
    setForm({ impressora_id: "", toner_id: "", data: new Date().toISOString().slice(0, 10), contador_inicial: 0 });
    load();
  };

  const abrirFinalizar = (t) => { setFinalizando(t); setContadorFinal(t.contador_inicial); };
  const confirmarFinalizar = async () => {
    const t = finalizando;
    const toner = toners.find((x) => x.id === t.toner_id);
    const paginas = calcRendimentoReal(t.contador_inicial, contadorFinal);
    const custo = calcCustoPorPagina(toner ? toner.valor_unitario : 0, paginas);
    await base44.entities.TrocaToner.update(t.id, {
      contador_final: Number(contadorFinal),
      paginas_produzidas: paginas,
      rendimento_real: paginas,
      custo_por_pagina: custo,
    });
    setFinalizando(null);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Trocas de Toner</h1>
          <p className="text-sm text-muted-foreground">Controle de ciclos, rendimento real e custo por página</p>
        </div>
        <Button onClick={() => setOpen(true)} className="sm:ml-auto bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="w-4 h-4 mr-1" /> Nova Troca</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Data</th>
                <th className="text-left px-4 py-2.5 font-medium">Impressora</th>
                <th className="text-left px-4 py-2.5 font-medium">Toner</th>
                <th className="text-right px-4 py-2.5 font-medium">Cont. Inicial</th>
                <th className="text-right px-4 py-2.5 font-medium">Cont. Final</th>
                <th className="text-right px-4 py-2.5 font-medium">Páginas</th>
                <th className="text-right px-4 py-2.5 font-medium">Custo/pág</th>
                <th className="text-center px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Carregando...</td></tr>
              ) : ordered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Nenhuma troca registrada.</td></tr>
              ) : ordered.map((t) => {
                const aberta = !t.contador_final || t.contador_final === 0;
                return (
                  <tr key={t.id} className="border-t border-border hover:bg-muted/50">
                    <td className="px-4 py-2.5">{formatDate(t.data)}</td>
                    <td className="px-4 py-2.5 font-medium">{t.impressora_nome || "-"}</td>
                    <td className="px-4 py-2.5">{t.toner_codigo || "-"}</td>
                    <td className="px-4 py-2.5 text-right">{formatNumber(t.contador_inicial)}</td>
                    <td className="px-4 py-2.5 text-right">{t.contador_final ? formatNumber(t.contador_final) : "-"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{t.paginas_produzidas ? formatNumber(t.paginas_produzidas) : "-"}</td>
                    <td className="px-4 py-2.5 text-right">{t.custo_por_pagina ? formatCurrency(t.custo_por_pagina) : "-"}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${aberta ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        {aberta ? "Em uso" : "Fechada"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {aberta && <Button size="sm" variant="outline" onClick={() => abrirFinalizar(t)}><CheckCircle2 className="w-4 h-4 mr-1" /> Finalizar</Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Troca de Toner</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Impressora *</Label>
              <Select value={form.impressora_id} onValueChange={onImpressoraChange}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{impressoras.map((i) => (<SelectItem key={i.id} value={i.id}>{i.fabricante} {i.modelo} ({i.patrimonio || "-"})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Toner *</Label>
              <Select value={form.toner_id} onValueChange={(v) => setForm({ ...form, toner_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{toners.map((t) => (<SelectItem key={t.id} value={t.id}>{t.codigo} - {t.fabricante} {t.modelo} (Estoque: {t.quantidade_estoque})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
            <div><Label>Contador inicial</Label><Input type="number" value={form.contador_inicial} onChange={(e) => setForm({ ...form, contador_inicial: e.target.value })} /></div>
            <div className="col-span-2 text-xs bg-muted p-2 rounded flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5" /> A troca anterior em uso será automaticamente fechada com este contador.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.impressora_id || !form.toner_id} className="bg-primary text-primary-foreground hover:bg-primary/90">{saving ? "Salvando..." : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!finalizando} onOpenChange={(v) => !v && setFinalizando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Finalizar Troca</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Toner: <span className="text-foreground font-medium">{finalizando?.toner_codigo}</span></div>
            <div><Label>Contador final</Label><Input type="number" value={contadorFinal} onChange={(e) => setContadorFinal(e.target.value)} /></div>
            <div className="text-sm">Páginas produzidas: <span className="font-semibold text-primary">{formatNumber(calcRendimentoReal(finalizando?.contador_inicial || 0, contadorFinal))}</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizando(null)}>Cancelar</Button>
            <Button onClick={confirmarFinalizar} className="bg-primary text-primary-foreground hover:bg-primary/90">Finalizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}