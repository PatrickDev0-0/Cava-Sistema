export default function PageHeader({ eyebrow = 'CAVA Engenharia · T.I.', title, description, action }) {
  return <header className="flex flex-col gap-4 border-b border-zinc-200 bg-white px-5 py-6 sm:flex-row sm:items-end sm:justify-between lg:px-8">
    <div><p className="mb-1 text-[11px] font-bold uppercase tracking-[.2em] text-amber-600">{eyebrow}</p><h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>{description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}</div>{action}
  </header>;
}