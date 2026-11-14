'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MODULO_ECONOMICO_ACTIVO } from '@/lib/config/stockly';
import type { Rol } from '@/lib/reglas/roles';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { InsigniaRol } from '@/components/panel/InsigniaRol';
import styles from './panel.module.css';

type EnlacePanel = { href: string; etiqueta: string; icono: string };

export function NavegacionPanel({
  rol,
  nombre,
  productosPorReponer = 0,
}: {
  rol: Rol;
  nombre: string;
  productosPorReponer?: number;
}) {
  const ruta = usePathname();
  const enlaces: EnlacePanel[] = [
    { href: '/panel', etiqueta: 'Dashboard', icono: '◫' },
    { href: '/panel/inventario', etiqueta: 'Inventario', icono: '▦' },
    { href: '/panel/inventario/nuevo', etiqueta: 'Agregar producto', icono: '+' },
    { href: '/panel/evolucion', etiqueta: 'Reportes', icono: '▤' },
    { href: '/panel/ventas', etiqueta: 'Ventas', icono: '↗' },
  ];
  if (rol === 'dueno') {
    enlaces.push({ href: '/panel/dashboard', etiqueta: 'Análisis comercial', icono: '◷' });
    enlaces.push({ href: '/panel/caja', etiqueta: 'Caja', icono: '$' });
    enlaces.push({ href: '/panel/proveedores', etiqueta: 'Proveedores', icono: '⇄' });
    enlaces.push({ href: '/panel/clientes', etiqueta: 'Clientes', icono: '♙' });
    enlaces.push({ href: '/panel/cuentas-por-cobrar', etiqueta: 'Cuentas por cobrar', icono: '◉' });
    enlaces.push({ href: '/panel/usuarios', etiqueta: 'Usuarios', icono: '♧' });
    if (MODULO_ECONOMICO_ACTIVO) {
      enlaces.push({ href: '/panel/economia', etiqueta: 'Economía', icono: '◇' });
    }
  }

  return (
    <aside className={styles.navegacion} aria-label="Navegación principal">
      <div className={styles.barra}>
        <Link className={styles.marca} href="/panel" aria-label="Stockly, resumen">
          <span className={styles.marcaIcono} aria-hidden="true">
            S
          </span>
          <span className={styles.marcaTexto}>
            <strong>Stockly</strong>
            <small>GESTIÓN DE INVENTARIO</small>
          </span>
        </Link>
        <p className={styles.etiquetaNavegacion}>MENÚ PRINCIPAL</p>
        <nav className={styles.enlaces}>
          {enlaces.map(({ href, etiqueta, icono }) => {
            const activo =
              href === '/panel'
                ? ruta === href
                : href === '/panel/inventario'
                  ? ruta.startsWith(href) && ruta !== '/panel/inventario/nuevo'
                  : ruta === href || ruta.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                className={`${styles.enlace} ${activo ? styles.enlaceActivo : ''}`}
                href={href}
                aria-current={activo ? 'page' : undefined}
              >
                <span className={styles.iconoEnlace} aria-hidden="true">
                  {icono}
                </span>
                <span>{etiqueta}</span>
                {href === '/panel/inventario' && productosPorReponer > 0 && (
                  <strong
                    className={styles.insigniaReposicion}
                    aria-label={`${productosPorReponer} productos por reponer`}
                  >
                    {productosPorReponer}
                  </strong>
                )}
              </Link>
            );
          })}
        </nav>
        <div className={styles.usuarioNav}>
          <span className={styles.avatarUsuario} aria-hidden="true">
            {nombre.trim().slice(0, 1).toUpperCase()}
          </span>
          <div className={styles.identidad}>
            <span className={styles.nombreUsuario}>{nombre}</span>
            <InsigniaRol rol={rol} />
          </div>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
