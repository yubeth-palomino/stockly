import { describe, expect, it } from 'vitest';
import { validarDestinoDePruebas } from '../scripts/entorno-pruebas.mjs';

const staging = 'vmuwhxxdocujvbolrfhx';
const produccion = 'kzjvamlbbberhqdzqqhj';

describe('protección de bases para scripts de prueba', () => {
  it('permite el proyecto staging identificado por usuario de pooler', () => {
    expect(() =>
      validarDestinoDePruebas({
        urlConexion: `postgresql://postgres.${staging}@aws-1-us-east-1.pooler.supabase.com:5432/postgres`,
        urlSupabase: `https://${staging}.supabase.co`,
      }),
    ).not.toThrow();
  });

  it('bloquea Production incluso si está marcada como prueba', () => {
    expect(() =>
      validarDestinoDePruebas({
        urlConexion: `postgresql://postgres.${produccion}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
        entorno: 'pruebas',
      }),
    ).toThrow(`Production (${produccion})`);
  });

  it('bloquea proyectos no identificados como prueba', () => {
    expect(() =>
      validarDestinoDePruebas({
        urlConexion: 'postgresql://postgres@db.other-project.supabase.co:5432/postgres',
      }),
    ).toThrow('Destino no autorizado');
  });

  it('permite una base aislada identificada explícitamente como pruebas', () => {
    expect(() =>
      validarDestinoDePruebas({
        urlConexion: 'postgresql://tester@localhost:5432/stockly_test',
        entorno: 'pruebas',
      }),
    ).not.toThrow();
  });

  it('rechaza referencias PostgreSQL y Supabase que no coinciden', () => {
    expect(() =>
      validarDestinoDePruebas({
        urlConexion: `postgresql://postgres.${staging}@aws-1-us-east-1.pooler.supabase.com:5432/postgres`,
        urlSupabase: 'https://otherproject.supabase.co',
      }),
    ).toThrow('apuntan a proyectos distintos');
  });

  it('rechaza una configuración sin URL PostgreSQL', () => {
    expect(() =>
      validarDestinoDePruebas({
        urlConexion: '',
        urlSupabase: '',
        entorno: '',
      }),
    ).toThrow('Falta la URL PostgreSQL');
  });
});
