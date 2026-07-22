import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Ban, Search, Disc } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/printUtils";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

const emptyForm = {
  codigo: "", fabricante: "", modelo: "", impressoras_compativeis: "",
  rendimento_esperado: 0, valor_unitario: 0, quantidade_estoque: 0,
};

export default function Cilindros() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async (silent) => {
    if (!silent) setLoading(true);
    const data = await base44.entities.Cilindro.list();
    setItems(data.filter((i) => i.ativo !== false));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useRealtimeSync(["Cilindro"], () => load(true));

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return items.filter((i) => !s || [i.codigo, i.fabricante, i.modelo].join(" ").toLowerCase().includes(s));
  }, [items, search]);

  const openNew = () => { setForm(emptyForm); setEditingId(null); setOpen(true); };
  const openEdit = (i) => { setForm({ ...i }); setEditingId(i.id); setOpen(true); };

  const save = async () => {
    setSaving(true);
    const payload = { ...form, rendimento_esperado: Number(form.rendimento_esperado), valor_unitario: Number(form.valor_unitario), quantidade_estoque: Number(form.quantidade_estoque) };
    if (editingId) await base44.entities.Cilindro.update(editingId, payload);
    else await base44.entities.Cilindro.create({ ...payload, ativo: true });
    setSaving(false); setOpen(false); load();
  };

  const inativar = async (i) => {
    await base44.entities.Cilindro.update(i.id, { ativo: false });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Cilindros</h1>
          <p className="text-sm text-muted-foreground">Cadastro e controle de estoque de cilindros</p>
        </div>
        <div className="sm:ml-auto flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-full sm:w-64" />
          </div>
          <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="w-4 h-4 mr-1" /> Novo</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nenhum cilindro cadastrado.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((i) => (
            <Card key={i.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center shrink-0">
                  <Disc className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{i.codigo}</div>
                  <div className="text-xs text-muted-foreground">{i.fabricante} {i.modelo}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div>Rendimento: <span className="text-foreground">{formatNumber(i.rendimento_esperado)}</span></div>
                <div>Valor: <span className="text-foreground">{formatCurrency(i.valor_unitario)}</span></div>
                <div className="col-span-2">Compatível: <span className="text-foreground">{i.impressoras_compativeis || "-"}</span></div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Estoque: </span>
                  <span className={`font-semibold ${i.quantidade_estoque <= 2 ? "text-destructive" : ""}`}>{formatNumber(i.quantidade_estoque)}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(i)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => inativar(i)} title="Inativar"><Ban className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Editar Cilindro" : "Novo Cilindro"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Código *</Label><Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
            <div><Label>Fabricante *</Label><Input value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} /></div>
            <div className="col-span-2"><Label>Modelo *</Label><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></div>
            <div className="col-span-2"><Label>Impressoras compatíveis (separe por vírgula)</Label><Input value={form.impressoras_compativeis} onChange={(e) => setForm({ ...form, impressoras_compativeis: e.target.value })} /></div>
            <div><Label>Rendimento esperado (páginas)</Label><Input type="number" value={form.rendimento_esperado} onChange={(e) => setForm({ ...form, rendimento_esperado: e.target.value })} /></div>
            <div><Label>Valor unitário (R$)</Label><Input type="number" step="0.01" value={form.valor_unitario} onChange={(e) => setForm({ ...form, valor_unitario: e.target.value })} /></div>
            <div><Label>Quantidade em estoque</Label><Input type="number" value={form.quantidade_estoque} onChange={(e) => setForm({ ...form, quantidade_estoque: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.codigo || !form.fabricante || !form.modelo} className="bg-primary text-primary-foreground hover:bg-primary/90">{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}