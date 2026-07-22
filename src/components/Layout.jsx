import React, { useState } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Printer, Boxes, Disc, Gauge, RefreshCw, Package, BarChart3, Menu, X, Building2 } from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: Gauge },
  { to: "/impressoras", label: "Impressoras", icon: Printer },
  { to: "/toners", label: "Toners", icon: Boxes },
  { to: "/cilindros", label: "Cilindros", icon: Disc },
  { to: "/leituras", label: "Leituras", icon: BarChart3 },
  { to: "/trocas-toner", label: "Trocas de Toner", icon: RefreshCw },
  { to: "/trocas-cilindro", label: "Trocas de Cilindro", icon: RefreshCw },
  { to: "/estoque", label: "Movimentações", icon: Package },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

export default function Layout() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (to) => (to === "/" ? location.pathname === "/" : location.pathname.startsWith(to));

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground flex flex-col transform transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-16 flex items-center gap-2 px-5 border-b border-sidebar-border bg-secondary">
          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-secondary" />
          </div>
          <div className="leading-tight">
            <div className="font-heading font-bold text-white text-sm">CAVA ENGENHARIA</div>
            <div className="text-[11px] text-sidebar-foreground/70">Controle de Impressões</div>
          </div>
          <button className="ml-auto lg:hidden text-sidebar-foreground" onClick={() => setOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/60">
          Setor de T.I. • Uso interno
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card border-b border-border flex items-center gap-3 px-4 lg:px-8 sticky top-0 z-20">
          <button className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <div className="font-heading font-semibold text-foreground">
            {navItems.find((n) => isActive(n.to))?.label || "CAVA"}
          </div>
          <div className="ml-auto text-xs text-muted-foreground hidden sm:block">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}