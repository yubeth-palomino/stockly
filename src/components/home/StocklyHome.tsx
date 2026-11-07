'use client';

import Link from 'next/link';
import { ChangePasswordButton } from '@/components/auth/ChangePasswordButton';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { AdminUsersLink } from '@/components/users/AdminUsersLink';

type DashboardUser = { id: string; email: string; full_name: string; role: 'admin' | 'user' };

export function StocklyHome({ user }: { user: DashboardUser }) {
  const displayName = user.full_name || user.email;
  const firstName = displayName.split(/\s+/)[0] ?? displayName;
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">S</span><span>stockly</span></div>
        <p className="eyebrow">Panel</p>
        <nav aria-label="Navegación principal">
          <Link className="nav-item active" href="/dashboard"><span aria-hidden="true">◈</span> Resumen</Link>
          <Link className="nav-item" href="/panel"><span aria-hidden="true">□</span> Inventario Stockly</Link>
          {user.role === 'admin' && <Link className="nav-item" href="/users"><span aria-hidden="true">♙</span> Usuarios</Link>}
        </nav>
        <div className="sidebar-footer">
          <span className="avatar">{initials}</span>
          <div>
            <b>{displayName}</b>
            <small>{user.role === 'admin' ? 'Administrador' : 'Usuario'}</small>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">S</span> stockly</div>
          <div className="topbar-actions">
            {user.role === 'admin' && <AdminUsersLink />}
            <span className="avatar">{initials}</span>
            <ChangePasswordButton />
            <LogoutButton />
          </div>
        </header>

        <div className="page-heading">
          <div>
            <p className="eyebrow">Resumen anterior</p>
            <h1>Hola, {firstName}.</h1>
            <p className="lede">Este resumen de muestra fue desactivado para no confundirlo con los datos reales de tu inventario.</p>
          </div>
        </div>

        <section className="panel" aria-labelledby="legacy-dashboard-title">
          <div className="panel-heading">
            <div>
              <h2 id="legacy-dashboard-title">Este panel no está conectado al inventario real</h2>
              <p>Las cifras, productos y movimientos que aparecían aquí eran datos de demostración.</p>
            </div>
          </div>
          <p>
            Para consultar información de Stockly, abre el panel autenticado. Si tu cuenta aún no tiene
            un perfil Stockly vinculado, solicita al dueño que lo habilite.
          </p>
          <Link className="primary-button" href="/panel" style={{ textDecoration: 'none' }}>
            Ir al panel Stockly
          </Link>
        </section>
      </section>
    </main>
  );
}
