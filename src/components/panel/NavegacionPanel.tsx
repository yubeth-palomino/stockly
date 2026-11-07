'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { MODULO_ECONOMICO_ACTIVO } from '@/lib/config/stockly';
import type { Rol } from '@/lib/reglas/roles';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { InsigniaRol } from '@/components/panel/InsigniaRol';
import styles from './panel.module.css';

type EnlacePanel = { href: string; etiqueta: string };

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
  const [menuAbierto, setMenuAbierto] = useState(false);
  const enlaces: EnlacePanel[] = [
    { href: '/panel', etiqueta: 'Resumen' },
    { href: '/panel/inventario', etiqueta: 'Inventario' },
    { href: '/panel/ventas', etiqueta: 'Ventas' },
    { href: '/panel/evolucion', etiqueta: 'Evolución' },
  ];
  if (rol === 'dueno') {
    enlaces.push({ href: '/panel/usuarios', etiqueta: 'Usuarios' });
    if (MODULO_ECONOMICO_ACTIVO) {
      enlaces.push({ href: '/panel/economia', etiqueta: 'Economía' });
    }
  }

  return (
    <header className={styles.navegacion}>
      <div className={styles.barra}>
        <Link className={styles.marca} href="/panel" aria-label="Stockly, resumen">
          <span className={styles.marcaIcono} aria-hidden="true">
            S
          </span>
          Stockly
        </Link>
        <button
          className={styles.botonMenu}
          type="button"
          aria-expanded={menuAbierto}
          aria-controls="panel-menu"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
        >
          {menuAbierto ? 'Cerrar menú' : 'Menú'}
        </button>
        <nav
          className={`${styles.enlaces} ${menuAbierto ? styles.enlacesAbiertos : ''}`}
          id="panel-menu"
          aria-label="Navegación principal"
        >
          {enlaces.map(({ href, etiqueta }) => {
            const activo = href === '/panel' ? ruta === href : ruta.startsWith(href);
            return (
              <Link
                key={href}
                className={`${styles.enlace} ${activo ? styles.enlaceActivo : ''}`}
                href={href}
                aria-current={activo ? 'page' : undefined}
                onClick={() => setMenuAbierto(false)}
              >
                {etiqueta}
                  {href === '/panel/inventario' && productosPorReponer > 0 && (
                    <strong className={styles.insigniaReposicion} aria-label={`${productosPorReponer} productos por reponer`}>
                      {productosPorReponer}
                    </strong>
                  )}
                </Link>
            );
          })}
        </nav>
        <div className={styles.usuarioNav}>
          <div className={styles.identidad}>
            <span className={styles.nombreUsuario}>{nombre}</span>
            <InsigniaRol rol={rol} />
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
