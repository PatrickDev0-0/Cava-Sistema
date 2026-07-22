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

export default function TrocasCilindro() {
  const [trocas, setTrocas] = useState([]);
  const [impressoras, setImpressoras] = useState([]);
  const [cilindros, setCilindros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalizando, setFinalizando] = useState(null);
  const [contadorFinal, setContadorFinal] = useState(0);
  const [form, setForm] = useState({ impressora_id: "", cilindro_id: "", data: new Date().toISOString().slice(0, 10), contador_inicial: 0 });

  const load = async (silent) => {
    if (!silent) setLoading(true);
    const [t, imp, cil] = await Promise.all([
      base44.entities.TrocaCilindro.list("-data"),
      base44.entities.Impressora.list(),
      base44.entities.Cilindro.list(),
    ]);
    setTrocas(t);
    setImpressoras(imp.filter((i) => i.ativo !== false));
    setCilindros(cil.filter((i) => i.ativo !== false));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useRealtimeSync(["TrocaCilindro", "Impressora", "Cilindro"], () => load(true));

  const ordered = useMemo(() =>
    trocas.slice().sort((a, b) => new Date(b.data) - new Date(a.data)), [trocas]);

  const onImpressoraChange = (v) => {
    const imp = impressoras.find((i) => i.id === v);
    setForm({ ...form, impressora_id: v, contador_inicial: imp ? Number(imp.contador_atual || 0) : 0 });
  };

  const save = async () => {
    setSaving(true);
    const imp = impressoras.find((i) => i.id === form.impressora_id);
    const cil = cilindros.find((c) => c.id === form.cilindro_id);
    const contadorInicial = Number(form.contador_inicial || 0);

    const abertas = trocas.filter((t) => t.impressora_id === form.impressora_id && (!t.contador_final || t.contador_final === 0));
    for (const ab of abertas) {
      const paginas = calcRendimentoReal(ab.contador_inicial, contadorInicial);
      const cilAnt = cilindros.find((c) => c.id === ab.cilindro_id);
      const custo = calcCustoPorPagina(cilAnt ? cilAnt.valor_unitario : 0, paginas);
      await base44.entities.TrocaCilindro.update(ab.id, {
        contador_final: contadorInicial, paginas_produzidas: paginas,
        rendimento_real: paginas, custo_por_pagina: custo,
      });
    }

    await base44.entities.TrocaCilindro.create({
      impressora_id: form.impressora_id,
      impressora_nome: imp ? `${imp.fabricante} ${imp.modelo}` : "",
      cilindro_id: form.cilindro_id,
      cilindro_codigo: cil ? cil.codigo : "",
      data: form.data,
      contador_inicial: contadorInicial, contador_final: 0,
      paginas_produzidas: 0, rendimento_real: 0, custo_por_pagina: 0,
    });

    if (cil) {
      await base44.entities.Cilindro.update(cil.id, { quantidade_estoque: Math.max(0, Number(cil.quantidade_estoque || 0) - 1) });
      await base44.entities.MovimentoEstoque.create({
        tipo_item: "Cilindro", item_id: cil.id, item_codigo: cil.codigo,
        tipo_movimento: "Instalacao", quantidade: 1, data: form.data,
        observacao: `Instalado em ${imp ? imp.fabricante + " " + imp.modelo : ""}`,
      });
    }
    if (imp) await base44.entities.Impressora.update(imp.id, { contador_atual: contadorInicial });

    setSaving(false); setOpen(false);
    setForm({ impressora_id: "", cilindro_id: "", data: new Date().toISOString().slice(0, 10), contador_inicial: 0 });
    load();
  };

  const abrirFinalizar = (t) => { setFinalizando(t); setContadorFinal(t.contador_inicial); };
  const confirmarFinalizar = async () => {
    const t = finalizando;
    const cil = cilindros.find((x) => x.id === t.cilindro_id);
    const paginas = calcRendimentoReal(t.contador_inicial, contadorFinal);
    const custo = calcCustoPorPagina(cil ? cil.valor_unitario : 0, paginas);
    await base44.entities.TrocaCilindro.update(t.id, {
      contador_final: Number(contadorFinal), paginas_produzidas: paginas,
      rendimento_real: paginas, custo_por_pagina: custo,
    });
    setFinalizando(null); load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Trocas de Cilindro</h1>
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
                <th className="text-left px-4 py-2.5 font-medium">Cilindro</th>
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
                    <td className="px-4 py-2.5">{t.cilindro_codigo || "-"}</td>
                    <td className="px-4 py-2.5 text-right">{formatNumber(t.contador_inicial)}</td>
                    <td className="px-4 py-2.5 text-right">{t.contador_final ? formatNumber(t.contador_final) : "-"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{t.paginas_produzidas ? formatNumber(t.paginas_produzidas) : "-"}</td>
                    <td className="px-4 py-2.5 text-right">{t.custo_por_pagina ? formatCurrency(t.custo_por_pagina) : "-"}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${aberta ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{aberta ? "Em uso" : "Fechada"}</span>
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
          <DialogHeader><DialogTitle>Nova Troca de Cilindro</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Impressora *</Label>
              <Select value={form.impressora_id} onValueChange={onImpressoraChange}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{impressoras.map((i) => (<SelectItem key={i.id} value={i.id}>{i.fabricante} {i.modelo} ({i.patrimonio || "-"})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Cilindro *</Label>
              <Select value={form.cilindro_id} onValueChange={(v) => setForm({ ...form, cilindro_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{cilindros.map((c) => (<SelectItem key={c.id} value={c.id}>{c.codigo} - {c.fabricante} {c.modelo} (Estoque: {c.quantidade_estoque})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
            <div><Label>Contador inicial</Label><Input type="number" value={form.contador_inicial} onChange={(e) => setForm({ ...form, contador_inicial: e.target.value })} /></div>
            <div className="col-span-2 text-xs bg-muted p-2 rounded flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" /> A troca anterior em uso será automaticamente fechada com este contador.</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.impressora_id || !form.cilindro_id} className="bg-primary text-primary-foreground hover:bg-primary/90">{saving ? "Salvando..." : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!finalizando} onOpenChange={(v) => !v && setFinalizando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Finalizar Troca</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Cilindro: <span className="text-foreground font-medium">{finalizando?.cilindro_codigo}</span></div>
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