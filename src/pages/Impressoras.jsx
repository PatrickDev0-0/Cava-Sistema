import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Ban, Search, Printer, Link2 } from "lucide-react";
import { formatNumber, formatDate } from "@/lib/printUtils";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Link } from "react-router-dom";

const emptyForm = {
  fabricante: "", modelo: "", patrimonio: "", numero_serie: "", ip: "",
  setor: "", localizacao: "", status: "Ativa", compativel_snmp: false, contador_atual: 0,
};

export default function Impressoras() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async (silent) => {
    if (!silent) setLoading(true);
    const data = await base44.entities.Impressora.list();
    setItems(data.filter((i) => i.ativo !== false));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useRealtimeSync(["Impressora"], () => load(true));

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return items.filter((i) =>
      !s || [i.fabricante, i.modelo, i.patrimonio, i.numero_serie, i.setor, i.localizacao].join(" ").toLowerCase().includes(s)
    );
  }, [items, search]);

  const openNew = () => { setForm(emptyForm); setEditingId(null); setOpen(true); };
  const openEdit = (i) => { setForm({ ...i }); setEditingId(i.id); setOpen(true); };

  const save = async () => {
    setSaving(true);
    if (editingId) {
      await base44.entities.Impressora.update(editingId, { ...form });
    } else {
      await base44.entities.Impressora.create({ ...form, ativo: true });
    }
    setSaving(false); setOpen(false); load();
  };

  const inativar = async (i) => {
    await base44.entities.Impressora.update(i.id, { ativo: false, status: "Inativa" });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Impressoras</h1>
          <p className="text-sm text-muted-foreground">Cadastro e controle do parque de impressoras</p>
        </div>
        <div className="sm:ml-auto flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-full sm:w-64" />
          </div>
          <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1" /> Nova
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Nenhuma impressora cadastrada.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((i) => (
            <Card key={i.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center shrink-0">
                  <Printer className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={`/impressoras/${i.id}`} className="font-semibold hover:text-primary flex items-center gap-1">
                    {i.fabricante} {i.modelo} <Link2 className="w-3 h-3" />
                  </Link>
                  <div className="text-xs text-muted-foreground">Patrimônio: {i.patrimonio || "-"} • Setor: {i.setor}</div>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${i.status === "Ativa" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"}`}>
                  {i.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div>Série: <span className="text-foreground">{i.numero_serie || "-"}</span></div>
                <div>IP: <span className="text-foreground">{i.ip || "-"}</span></div>
                <div>Local: <span className="text-foreground">{i.localizacao || "-"}</span></div>
                <div>SNMP: <span className="text-foreground">{i.compativel_snmp ? "Sim" : "Não"}</span></div>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Contador: </span>
                  <span className="font-semibold">{formatNumber(i.contador_atual)}</span>
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
          <DialogHeader><DialogTitle>{editingId ? "Editar Impressora" : "Nova Impressora"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Fabricante *</Label><Input value={form.fabricante} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} /></div>
            <div><Label>Modelo *</Label><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></div>
            <div><Label>Patrimônio</Label><Input value={form.patrimonio} onChange={(e) => setForm({ ...form, patrimonio: e.target.value })} /></div>
            <div><Label>Número de Série</Label><Input value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} /></div>
            <div><Label>IP</Label><Input value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} /></div>
            <div><Label>Setor *</Label><Input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} /></div>
            <div><Label>Localização</Label><Input value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Ativa">Ativa</SelectItem><SelectItem value="Inativa">Inativa</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Contador atual</Label><Input type="number" value={form.contador_atual} onChange={(e) => setForm({ ...form, contador_atual: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2 pt-7">
              <Switch checked={form.compativel_snmp} onCheckedChange={(v) => setForm({ ...form, compativel_snmp: v })} />
              <Label>Compatível SNMP</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.fabricante || !form.modelo || !form.setor} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}