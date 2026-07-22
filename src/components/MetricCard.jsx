export default function MetricCard({ label, value, hint, icon: Icon }) {
  return <div className="group rounded-xl border border-zinc-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
    <div className="mb-5 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</span>{Icon && <span className="rounded-lg bg-amber-100 p-2 text-amber-700"><Icon size={18}/></span>}</div><p className="text-3xl font-black tracking-tight">{value}</p>{hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
  </div>;
}