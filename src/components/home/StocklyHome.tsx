'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type Product = {
  name: string;
  sku: string;
  stock: number;
  minimumStock: number;
};

const fallbackProducts: Product[] = [
  { name: 'Cafe de origen', sku: 'CAF-001', stock: 128, minimumStock: 40 },
  { name: 'Vasos compostables', sku: 'VAS-014', stock: 42, minimumStock: 30 },
  { name: 'Jarabe de vainilla', sku: 'JAR-009', stock: 8, minimumStock: 20 },
];

export function StocklyHome() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts);

  useEffect(() => {
    void fetch('/api/data/products?limit=3&sortBy=stock&sortOrder=asc')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('API unavailable'))))
      .then((payload: { data?: { data?: Product[] } }) => {
        if (payload.data?.data) setProducts(payload.data.data);
      })
      .catch(() => undefined);
  }, []);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">S</span><span>stockly</span></div>
        <p className="eyebrow">Workspace</p>
        <nav aria-label="Navegacion principal">
          <a className="nav-item active" href="#resumen"><span>◈</span> Resumen</a>
          <a className="nav-item" href="#productos"><span>□</span> Productos</a>
          <a className="nav-item" href="#movimientos"><span>↗</span> Movimientos</a>
          <a className="nav-item" href="#alertas"><span>!</span> Alertas <strong>3</strong></a>
        </nav>
        <div className="sidebar-footer"><span className="avatar">JC</span><div><b>Jhonatan Castro</b><small>Administrador</small></div><span>···</span></div>
      </aside>

      <section className="content" id="resumen">
        <header className="topbar"><div className="mobile-brand"><span className="brand-mark">S</span> stockly</div><div className="topbar-actions"><button className="icon-button" aria-label="Buscar">⌕</button><button className="icon-button" aria-label="Notificaciones">♢</button><span className="avatar">JC</span></div></header>
        <div className="page-heading"><div><p className="eyebrow">Viernes, 12 de septiembre de 2026</p><h1>Buenos dias, Jhonatan.</h1><p className="lede">Esto es lo que esta pasando con tu inventario hoy.</p></div><button className="primary-button">+ Añadir producto</button></div>

        <div className="metrics" aria-label="Metricas de inventario">
          <Metric label="Productos activos" value="248" change="+12%" detail="vs. mes anterior" accent="teal" />
          <Metric label="Valor del inventario" value="$18,420" change="+8.4%" detail="vs. mes anterior" accent="blue" />
          <Metric label="Stock bajo" value="12" change="-4" detail="desde la semana pasada" accent="coral" />
        </div>

        <div className="dashboard-grid">
          <section className="panel products-panel" id="productos"><div className="panel-heading"><div><h2>Productos por revisar</h2><p>Los movimientos mas recientes de tu catalogo.</p></div><a href="#productos">Ver todos ↗</a></div><div className="product-list">{products.map((product, index) => { const status = getStockStatus(product); return <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.12 }} className="product-row" key={product.sku}><span className={`product-icon ${status.tone}`}>{product.name[0]}</span><div className="product-name"><b>{product.name}</b><small>{product.sku}</small></div><span className={`status ${status.tone}`}>{status.label}</span><strong>{product.stock}<small> uds.</small></strong><span className="row-arrow">→</span></motion.div>; })}</div></section>
          <section className="panel activity-panel" id="movimientos"><div className="panel-heading"><div><h2>Actividad reciente</h2><p>Ultimas entradas y salidas.</p></div></div><div className="activity-list"><Activity title="Entrada de inventario" detail="Cafe de origen · 40 uds." time="Hace 12 min" type="in" /><Activity title="Salida registrada" detail="Vasos compostables · 12 uds." time="Hace 48 min" type="out" /><Activity title="Alerta de stock" detail="Jarabe de vainilla · 8 uds." time="Hace 2 h" type="alert" /></div></section>
        </div>
        <footer className="footer"><span>Stockly v0.1.0</span><span>Todos los sistemas operativos <i /></span></footer>
      </section>
    </main>
  );
}

function Metric({ label, value, change, detail, accent }: { label: string; value: string; change: string; detail: string; accent: string }) {
  return <article className={`metric ${accent}`}><span className="metric-label">{label}</span><strong>{value}</strong><span className="metric-change">{change} <small>{detail}</small></span><span className="sparkline">∿</span></article>;
}

function Activity({ title, detail, time, type }: { title: string; detail: string; time: string; type: string }) {
  return <div className="activity-row"><span className={`activity-icon ${type}`}>{type === 'in' ? '↓' : type === 'out' ? '↑' : '!'}</span><div><b>{title}</b><small>{detail}</small></div><time>{time}</time></div>;
}

function getStockStatus(product: Product): { label: string; tone: 'green' | 'amber' | 'red' } {
  if (product.stock <= product.minimumStock / 2) return { label: 'Critico', tone: 'red' };
  if (product.stock <= product.minimumStock) return { label: 'Vigilar', tone: 'amber' };
  return { label: 'En stock', tone: 'green' };
}