import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search } from "lucide-react";
import { formatNumber, formatDate } from "@/lib/printUtils";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export default function Leituras() {
  const [leituras, setLeituras] = useState([]);
  const [impressoras, setImpressoras] = useState([]);
  const [toners, setToners] = useState([]);
  const [cilindros, setCilindros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    hora: new Date().toTimeString().slice(0, 5),
    impressora_id: "",
    contador_atual: 0,
    toner_instalado_id: "",
    cilindro_instalado_id: "",
    observacao: "",
  });

  const load = async (silent) => {
    if (!silent) setLoading(true);
    const [l, imp, t, c] = await Promise.all([
      base44.entities.Leitura.list("-data"),
      base44.entities.Impressora.list(),
      base44.entities.Toner.list(),
      base44.entities.Cilindro.list(),
    ]);
    setLeituras(l);
    setImpressoras(imp.filter((i) => i.ativo !== false));
    setToners(t.filter((i) => i.ativo !== false));
    setCilindros(c.filter((i) => i.ativo !== false));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useRealtimeSync(["Leitura", "Impressora", "Toner", "Cilindro"], () => load(true));

  const lastReading = useMemo(() => {
    if (!form.impressora_id) return null;
    const prev = leituras
      .filter((l) => l.impressora_id === form.impressora_id)
      .sort((a, b) => new Date(b.data + "T" + (b.hora || "00:00")) - new Date(a.data + "T" + (a.hora || "00:00")));
    return prev[0] || null;
  }, [leituras, form.impressora_id]);

  const diferenca = lastReading ? Math.max(0, Number(form.contador_atual || 0) - Number(lastReading.contador_atual || 0)) : Number(form.contador_atual || 0);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return leituras
      .slice()
      .sort((a, b) => new Date(b.data + "T" + (b.hora || "00:00")) - new Date(a.data + "T" + (a.hora || "00:00")))
      .filter((l) => !s || [l.impressora_nome, l.data].join(" ").toLowerCase().includes(s));
  }, [leituras, search]);

  const save = async () => {
    setSaving(true);
    const imp = impressoras.find((i) => i.id === form.impressora_id);
    const toner = toners.find((t) => t.id === form.toner_instalado_id);
    const cil = cilindros.find((c) => c.id === form.cilindro_instalado_id);
    await base44.entities.Leitura.create({
      data: form.data,
      hora: form.hora,
      impressora_id: form.impressora_id,
      impressora_nome: imp ? `${imp.fabricante} ${imp.modelo}` : "",
      contador_atual: Number(form.contador_atual),
      diferenca,
      toner_instalado_id: form.toner_instalado_id || "",
      toner_codigo: toner ? toner.codigo : "",
      cilindro_instalado_id: form.cilindro_instalado_id || "",
      cilindro_codigo: cil ? cil.codigo : "",
      observacao: form.observacao,
    });
    // Atualiza contador da impressora
    await base44.entities.Impressora.update(form.impressora_id, { contador_atual: Number(form.contador_atual) });
    setSaving(false);
    setOpen(false);
    setForm({ data: new Date().toISOString().slice(0, 10), hora: new Date().toTimeString().slice(0, 5), impressora_id: "", contador_atual: 0, toner_instalado_id: "", cilindro_instalado_id: "", observacao: "" });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold">Leituras de Impressão</h1>
          <p className="text-sm text-muted-foreground">Registro manual do contador das impressoras</p>
        </div>
        <div className="sm:ml-auto flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-full sm:w-64" />
          </div>
          <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="w-4 h-4 mr-1" /> Nova Leitura</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Data</th>
                <th className="text-left px-4 py-2.5 font-medium">Hora</th>
                <th className="text-left px-4 py-2.5 font-medium">Impressora</th>
                <th className="text-right px-4 py-2.5 font-medium">Contador</th>
                <th className="text-right px-4 py-2.5 font-medium">Diferença</th>
                <th className="text-left px-4 py-2.5 font-medium">Toner</th>
                <th className="text-left px-4 py-2.5 font-medium">Cilindro</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Nenhuma leitura registrada.</td></tr>
              ) : filtered.map((l) => (
                <tr key={l.id} className="border-t border-border hover:bg-muted/50">
                  <td className="px-4 py-2.5">{formatDate(l.data)}</td>
                  <td className="px-4 py-2.5">{l.hora || "-"}</td>
                  <td className="px-4 py-2.5 font-medium">{l.impressora_nome || "-"}</td>
                  <td className="px-4 py-2.5 text-right">{formatNumber(l.contador_atual)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-primary">{formatNumber(l.diferenca)}</td>
                  <td className="px-4 py-2.5">{l.toner_codigo || "-"}</td>
                  <td className="px-4 py-2.5">{l.cilindro_codigo || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Leitura</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
            <div><Label>Hora</Label><Input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} /></div>
            <div className="col-span-2"><Label>Impressora *</Label>
              <Select value={form.impressora_id} onValueChange={(v) => setForm({ ...form, impressora_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{impressoras.map((i) => (<SelectItem key={i.id} value={i.id}>{i.fabricante} {i.modelo} ({i.patrimonio || "-"})</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Contador atual *</Label><Input type="number" value={form.contador_atual} onChange={(e) => setForm({ ...form, contador_atual: e.target.value })} /></div>
            <div><Label>Diferença</Label><div className="h-9 flex items-center font-semibold text-primary">{formatNumber(diferenca)}</div></div>
            <div><Label>Toner instalado</Label>
              <Select value={form.toner_instalado_id} onValueChange={(v) => setForm({ ...form, toner_instalado_id: v })}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>{toners.map((t) => (<SelectItem key={t.id} value={t.id}>{t.codigo} - {t.fabricante} {t.modelo}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Cilindro instalado</Label>
              <Select value={form.cilindro_instalado_id} onValueChange={(v) => setForm({ ...form, cilindro_instalado_id: v })}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>{cilindros.map((c) => (<SelectItem key={c.id} value={c.id}>{c.codigo} - {c.fabricante} {c.modelo}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Observação</Label><Input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></div>
            {lastReading && (
              <div className="col-span-2 text-xs bg-muted p-2 rounded">Última leitura: {formatDate(lastReading.data)} • Contador: {formatNumber(lastReading.contador_atual)}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !form.impressora_id} className="bg-primary text-primary-foreground hover:bg-primary/90">{saving ? "Salvando..." : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}