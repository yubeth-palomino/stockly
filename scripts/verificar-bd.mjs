import { crearClienteBaseDatos } from './db-client.mjs';

const cliente = crearClienteBaseDatos();

let fallas = 0;

function resultado(nombre, correcto, detalle = '') {
  console.log(`${correcto ? 'OK' : 'FALLA'} ${nombre}${detalle ? `: ${detalle}` : ''}`);
  if (!correcto) fallas += 1;
}

async function verificarEsquema() {
  const nombres = [
    'usuarios',
    'productos',
    'ventas',
    'eventos_inventario',
    'v_productos',
    'clientes',
    'proveedores',
    'pagos_venta',
    'cuentas_por_cobrar',
    'abonos',
    'cajas',
    'caja_movimientos',
  ];
  for (const nombre of nombres) {
    const { rows } = await cliente.query('SELECT to_regclass($1) IS NOT NULL AS existe', [
      `public.${nombre}`,
    ]);
    resultado(`existencia ${nombre}`, rows[0].existe);
    if (rows[0].existe && nombre !== 'v_productos') {
      const { rows: conteo } = await cliente.query(
        `SELECT count(*)::integer AS total FROM ${nombre}`,
      );
      console.log(`  filas ${nombre}: ${conteo[0].total}`);
    }
  }

  const { rows: restricciones } = await cliente.query(`
    SELECT conrelid::regclass::text AS tabla, conname AS nombre, contype AS tipo
    FROM pg_constraint
    WHERE conrelid IN ('public.productos'::regclass, 'public.ventas'::regclass)
    ORDER BY tabla, nombre
  `);
  console.log('Restricciones productos/ventas:', JSON.stringify(restricciones));

  const { rows: indices } = await cliente.query(`
    SELECT tablename AS tabla, indexname AS nombre, indexdef AS definicion
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname IN (
      'ux_productos_ref_talla', 'ux_usuarios_usuario', 'ux_productos_codigo_barras',
      'ux_ventas_clave_idempotencia', 'ux_clientes_identificacion',
      'ux_proveedores_identificacion', 'ux_cajas_una_abierta',
      'idx_pagos_venta_created_at', 'idx_abonos_created_at'
    )
    ORDER BY indexname
  `);
  console.log('Índices requeridos:', JSON.stringify(indices));
  resultado(
    'índice ux_productos_ref_talla',
    indices.some((indice) => indice.nombre === 'ux_productos_ref_talla'),
  );
  resultado(
    'índice ux_usuarios_usuario',
    indices.some((indice) => indice.nombre === 'ux_usuarios_usuario'),
  );
  for (const nombre of [
    'ux_productos_codigo_barras',
    'ux_ventas_clave_idempotencia',
    'ux_clientes_identificacion',
    'ux_proveedores_identificacion',
    'ux_cajas_una_abierta',
    'idx_pagos_venta_created_at',
    'idx_abonos_created_at',
  ]) {
    resultado(
      `índice ${nombre}`,
      indices.some((indice) => indice.nombre === nombre),
    );
  }

  const columnasRequeridas = [
    ['productos', 'codigo_barras'],
    ['productos', 'stock_minimo'],
    ['v_productos', 'codigo_barras'],
    ['v_productos', 'stock_minimo'],
    ['ventas', 'cliente_id'],
    ['ventas', 'pago_registrado'],
    ['ventas', 'clave_idempotencia'],
    ['cajas', 'clave_apertura'],
    ['cajas', 'clave_cierre'],
    ['caja_movimientos', 'huella_idempotencia'],
  ];
  const { rows: columnas } = await cliente.query(`
    SELECT table_name AS tabla, column_name AS columna
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `);
  for (const [tabla, columna] of columnasRequeridas) {
    resultado(
      `columna ${tabla}.${columna}`,
      columnas.some((fila) => fila.tabla === tabla && fila.columna === columna),
    );
  }

  const restriccionesComercialesRequeridas = [
    ['ventas', 'ventas_cliente_id_fkey'],
    ['cajas', 'cajas_cierre_consistente'],
    ['caja_movimientos', 'caja_movimiento_origen_valido'],
    ['pagos_venta', 'pagos_venta_venta_metodo_unico'],
  ];
  const { rows: restriccionesComerciales } = await cliente.query(`
    SELECT conrelid::regclass::text AS tabla, conname AS nombre
    FROM pg_constraint
    WHERE conrelid IN (
      'public.ventas'::regclass,
      'public.cajas'::regclass,
      'public.caja_movimientos'::regclass,
      'public.pagos_venta'::regclass
    )
  `);
  for (const [tabla, nombre] of restriccionesComercialesRequeridas) {
    resultado(
      `restricción ${nombre}`,
      restriccionesComerciales.some((fila) => fila.tabla === tabla && fila.nombre === nombre),
    );
  }

  const { rows: rls } = await cliente.query(`
    SELECT relname AS tabla, relrowsecurity AS activo
    FROM pg_class
    WHERE oid = ANY(ARRAY[
      to_regclass('public.usuarios'),
      to_regclass('public.productos'),
      to_regclass('public.ventas'),
      to_regclass('public.eventos_inventario'),
      to_regclass('public.clientes'),
      to_regclass('public.proveedores'),
      to_regclass('public.pagos_venta'),
      to_regclass('public.cuentas_por_cobrar'),
      to_regclass('public.abonos'),
      to_regclass('public.cajas'),
      to_regclass('public.caja_movimientos')
    ])
    ORDER BY relname
  `);
  for (const tabla of [
    'usuarios',
    'productos',
    'ventas',
    'eventos_inventario',
    'clientes',
    'proveedores',
    'pagos_venta',
    'cuentas_por_cobrar',
    'abonos',
    'cajas',
    'caja_movimientos',
  ]) {
    const estado = rls.find((fila) => fila.tabla === tabla);
    resultado(`RLS ${tabla}`, estado?.activo === true);
  }
}

async function casoQueFalla(nombre, sql, valores, codigoEsperado, restriccionEsperada) {
  await cliente.query('SAVEPOINT caso_esperado');
  let errorCapturado;
  try {
    await cliente.query(sql, valores);
  } catch (error) {
    errorCapturado = error;
  }
  await cliente.query('ROLLBACK TO SAVEPOINT caso_esperado');
  await cliente.query('RELEASE SAVEPOINT caso_esperado');

  const correcto =
    errorCapturado?.code === codigoEsperado &&
    (!restriccionEsperada || errorCapturado.constraint === restriccionEsperada);
  resultado(
    nombre,
    correcto,
    correcto
      ? ''
      : `esperado ${codigoEsperado}${restriccionEsperada ? `/${restriccionEsperada}` : ''}, recibido ${
          errorCapturado
            ? `${errorCapturado.code}/${errorCapturado.constraint ?? 'sin restricción'}`
            : 'sin error'
        }`,
  );
}

async function verificarIntegridad() {
  const fechaActual = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const referenciaValidacion = `CAM${Date.now().toString().slice(-6)}`;

  await cliente.query('BEGIN');
  try {
    await cliente.query(
      `INSERT INTO productos
         (referencia, marca, descripcion, talla, cantidad, precio_venta, fecha_entrada)
       VALUES ($1, 'X', 'Y', 'M', 10, 50000, $2)`,
      [referenciaValidacion, fechaActual],
    );
    const { rows: normalizado } = await cliente.query(
      `SELECT id, clave_referencia, clave_talla
      FROM productos
      WHERE clave_referencia = $1 AND clave_talla = 'M'`,
      [referenciaValidacion],
    );
    const { rows: disponible } = await cliente.query(
      'SELECT disponible FROM v_productos WHERE id = $1',
      [normalizado[0]?.id],
    );
    resultado(
      'producto CAM001 insertado y normalizado',
      normalizado.length === 1 &&
        normalizado[0].clave_referencia === referenciaValidacion &&
        normalizado[0].clave_talla === 'M' &&
        disponible[0]?.disponible === true,
    );

    await casoQueFalla(
      'referencia/talla duplicadas normalizadas',
      `INSERT INTO productos
         (referencia, marca, descripcion, talla, cantidad, precio_venta, fecha_entrada)
       VALUES ($1, 'X', 'Y', 'm', 10, 50000, $2)`,
      [referenciaValidacion, fechaActual],
      '23505',
      'ux_productos_ref_talla',
    );
    await casoQueFalla(
      'cantidad negativa',
      `INSERT INTO productos
         (referencia, marca, descripcion, talla, cantidad, precio_venta, fecha_entrada)
       VALUES ('NEG001', 'X', 'Y', 'M', -1, 50000, CURRENT_DATE)`,
      [],
      '23514',
      'productos_cantidad_valida',
    );
    await casoQueFalla(
      'precio de venta cero',
      `INSERT INTO productos
         (referencia, marca, descripcion, talla, cantidad, precio_venta, fecha_entrada)
       VALUES ('PRE001', 'X', 'Y', 'M', 1, 0, CURRENT_DATE)`,
      [],
      '23514',
      'productos_precio_venta_valido',
    );
    await casoQueFalla(
      'rol de usuario no permitido',
      `INSERT INTO usuarios (nombre, usuario, rol)
       VALUES ('Prueba inválida', 'prueba-invalida', 'gerente')`,
      [],
      '23514',
    );

    await cliente.query('UPDATE productos SET cantidad = 0 WHERE id = $1', [normalizado[0]?.id]);
    const { rows: agotado } = await cliente.query(
      'SELECT disponible FROM v_productos WHERE id = $1',
      [normalizado[0]?.id],
    );
    resultado('vista indica no disponible con cantidad cero', agotado[0]?.disponible === false);
  } finally {
    await cliente.query('ROLLBACK');
  }
}

try {
  await cliente.connect();
  await verificarEsquema();
  await verificarIntegridad();
} catch (error) {
  console.error('Falló la verificación de la base de datos:', error);
  fallas += 1;
} finally {
  await cliente.end().catch((error) => {
    console.error('No se pudo cerrar la conexión de verificación:', error);
    fallas += 1;
  });
  console.log(`Total de fallas: ${fallas}`);
  if (fallas > 0) process.exitCode = 1;
}
