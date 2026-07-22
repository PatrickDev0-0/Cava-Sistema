import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Printer, Boxes, Disc, ClipboardList, RefreshCw, Package, BarChart3 } from 'lucide-react';

const links = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/impressoras', 'Impressoras', Printer],
  ['/toners', 'Toners', Boxes],
  ['/cilindros', 'Cilindros', Disc],
  ['/leituras', 'Leituras', ClipboardList],
  ['/trocas-toner', 'Trocas Toner', RefreshCw],
  ['/trocas-cilindro', 'Trocas Cilindro', Disc],
  ['/estoque', 'Estoque', Package],
  ['/relatorios', 'Relatórios', BarChart3],
];

export default function AppShell() {
  return (
    <div className="min-h-screen bg-[#f4f4f2] text-zinc-900 lg:flex">
      <aside className="bg-black text-white lg:fixed lg:inset-y-0 lg:w-64">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-[#ffb400] font-black text-2xl text-black">C</div>
          <div>
            <b className="tracking-widest">CAVA</b>
            <p className="text-[10px] uppercase tracking-[.2em] text-zinc-400">Controle de impressões</p>
          </div>
        </div>
        <nav className="flex overflow-x-auto p-3 lg:block lg:space-y-1 lg:p-4">
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  isActive ? 'bg-[#ffb400] text-black' : 'text-zinc-400 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 lg:ml-64">
        <div className="p-5 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}