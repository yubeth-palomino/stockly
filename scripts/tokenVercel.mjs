import { execSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const rutaProyecto = process.cwd();
const rutaEntorno = path.join(rutaProyecto, '.env.local');
const rutaTemporal = path.join(rutaProyecto, '.env.vercel.local');
const aviso = 'Aviso: no se pudo renovar la conexión con Vercel. El envío de correos no funcionará en local.';
let entornoInicial = '';
let entornoLeido = false;

try {
  entornoInicial = existsSync(rutaEntorno) ? readFileSync(rutaEntorno, 'utf8') : '';
  entornoLeido = true;

  execSync('npx vercel env pull .env.vercel.local --yes', {
    cwd: rutaProyecto,
    stdio: 'ignore',
    windowsHide: true,
  });

  const lineasDescargadas = readFileSync(rutaTemporal, 'utf8').split(/\r?\n/);
  const lineaToken = lineasDescargadas.find((linea) => /^VERCEL_OIDC_TOKEN\s*=/.test(linea));
  if (!lineaToken) throw new Error('No se encontró la variable del token.');

  const salto = entornoInicial.includes('\r\n') ? '\r\n' : '\n';
  const patronToken = /^[ \t]*VERCEL_OIDC_TOKEN[ \t]*=[^\r\n]*/gm;
  if (patronToken.test(entornoInicial)) {
    const entornoActualizado = entornoInicial.replace(patronToken, () => lineaToken);
    writeFileSync(rutaEntorno, entornoActualizado, 'utf8');
  } else {
    const terminaEnSalto = /(?:\r\n|\n|\r)$/.test(entornoInicial);
    const separador = entornoInicial && !terminaEnSalto ? salto : '';
    writeFileSync(rutaEntorno, `${entornoInicial}${separador}${lineaToken}${terminaEnSalto ? salto : ''}`, 'utf8');
  }
} catch {
  if (entornoLeido) {
    try {
      writeFileSync(rutaEntorno, entornoInicial, 'utf8');
    } catch {
      console.warn(aviso);
    }
  }
  console.warn(aviso);
} finally {
  try {
    if (existsSync(rutaTemporal)) unlinkSync(rutaTemporal);
  } catch {
    console.warn(aviso);
  }
}