import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Package, ArrowDownCircle, ArrowUpCircle, Settings } from "lucide-react";
import { formatNumber, formatDate } from "@/lib/printUtils";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export default function Estoque() {
  const [movs, setMovs] = useState([]);
  const [toners, setToners] = useState([]);
  const [cilindros, setCilindros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tipo_item: "Toner", item_id: "", tipo_movimento: "Entrada", quantidade: 1, data: new Date().toISOString().slice(0, 10), observacao: "",
  });

  const load = async (silent) => {
    if (!silent) setLoading(true);
    const [m, t, c] = await Promise.all([
      base44.entities.MovimentoEstoque.list("-data"),
      base44.entities.Toner.list(),
      base44.entities.Cilindro.list(),
    ]);
    setMovs(m);
    setToners(t.filter((i) => i.ativo !== false));
    setCilindros(c.filter((i) => i.ativo !== false));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useRealtimeSync(["MovimentoEstoque", "Toner", "Cilindro"], () => load(true));

  const items = form.tipo_item === "Toner" ? toners : cilindros;
  const ordered = useMemo(() => movs.slice().sort((a, b) => new Date(b.data) - new Date(a.data)), [movs]);

  const save = async () => {
    setSaving(true);
    const item = items.find((i) => i.id === form.item_id);
    if (!item) { setSaving(false); return; }
    const qtd = Number(form.quantidade || 0);
    let novoEstoque = Number(item.quantidade_estoque || 0);
    if (form.tipo_movimento === "Entrada") novoEstoque += qtd;
    else if (form.tipo_movimento === "Consumo" || form.tipo_movimento === "Instalacao") novoEstoque = Math.max(0, novoEstoque - qtd);
    else if (form.tipo_movimento === "Ajuste") novoEstoque = qtd;

    const ent = form.tipo_item === "Toner" ? base44.entities.Toner : base44.entities.Cilindro;
    await ent.update(item.id, { quantidade_estoque: novoEstoque });
    await base44.entities.MovimentoEstoque.create({
      tipo_item: form.tipo_item, item_id: item.id, item_codigo: item.codigo,
      tipo_movimento: form.tipo_movimento, quantidade: qtd, data: form.data, observacao: form.observacao,
    });
    setSaving(false); setOpen(false);
    setForm({ tipo_item: "Toner", item_id: "", tipo_movimento: "Entrada", quantidade: 1, data: new Date().toISOString().slice(0, 10), observacao: "" });
    load();
  };

  const iconFor = (tipo) => {
    if (tipo === "Entrada") return <ArrowDownCircle className="w-4 h-4 text-green-600" />;
    if (tipo === "Instalacao") return <ArrowUpCircle className="w-4 h-4 text-amber-600" />;
    if (tipo === "Consumo") return <ArrowUpCircle className="w-4 h-4 text-destructive" />;
    return <Settings className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Movimentações de Estoque</h1>
          <p className="text-sm text-muted-foreground">Entradas, instalações, consumo e ajustes de suprimentos</p>
        </div>
        <Button onClick={() => setOpen(true)} className="sm:ml-auto bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="w-4 h-4 mr-1" /> Nova Movimentação</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Total de movimentações</div><div className="text-2xl font-bold mt-1">{formatNumber(movs.length)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><Package className="w-3 h-3" /> Toners em estoque</div><div className="text-2xl font-bold mt-1">{formatNumber(toners.reduce((a, t) => a + Number(t.quantidade_estoque || 0), 0))}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground flex items-center gap-1"><Package className="w-3 h-3" /> Cilindros em estoque</div><div className="text-2xl font-bold mt-1">{formatNumber(cilindros.reduce((a, c) => a + Number(c.quantidade_estoque || 0), 0))}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Entradas registradas</div><div className="text-2xl font-bold mt-1">{formatNumber(movs.filter((m) => m.tipo_movimento === "Entrada").length)}</div></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Data</th>
                <th className="text-left px-4 py-2.5 font-medium">Tipo</th>
                <th className="text-left px-4 py-2.5 font-medium">Suprimento</th>
                <th className="text-left px-4 py-2.5 font-medium">Movimento</th>
                <th className="text-right px-4 py-2.5 font-medium">Qtd</th>
                <th className="text-left px-4 py-2.5 font-medium">Observação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Carregando...</td></tr>
              ) : ordered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Nenhuma movimentação.</td></tr>
              ) : ordered.map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-muted/50">
                  <td className="px-4 py-2.5">{formatDate(m.data)}</td>
                  <td className="px-4 py-2.5">{m.tipo_item}</td>
                  <td className="px-4 py-2.5 font-medium">{m.item_codigo || "-"}</td>
                  <td className="px-4 py-2.5"><div className="flex items-center gap-2">{iconFor(m.tipo_movimento)} {m.tipo_movimento}</div></td>
                  <td className="px-4 py-2.5 text-right font-semibold">{formatNumber(m.quantidade)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{m.observacao || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Movimentação</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Tipo de suprimento</Label>
              <Select value={form.tipo_item} onValueChange={(v) => setForm({ ...form, tipo_item: v, item_id: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Toner">Toner</SelectItem><SelectItem value="Cilindro">Cilindro</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Tipo de movimento</Label>
              <Select value={form.tipo_movimento} onValueChange={(v) => setForm({ ...form, tipo_movimento: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Entrada">Entrada</SelectItem><SelectItem value="Consumo">Consumo</SelectItem><SelectItem value="Ajuste">Ajuste (define estoque)</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Suprimento *</Label>
              <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{items.map((i) => (<SelectItem key={i.id} value={i.id}>{i.codigo} - {i.fabricante} {i.modelo} (Estoque: {i.quantidade_estoque})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Quantidade</Label><Input type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} /></div>
            <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
            <div className="col-span-2"><Label>Observação</Label><Input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.item_id} className="bg-primary text-primary-foreground hover:bg-primary/90">{saving ? "Salvando..." : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}