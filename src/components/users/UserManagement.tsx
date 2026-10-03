'use client';

import { type FormEvent, useEffect, useState } from 'react';
import styles from './UserManagement.module.css';

type ManagedUser = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  created_at: string;
};

type UserForm = {
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
};

const emptyForm: UserForm = { fullName: '', email: '', password: '', role: 'user' };

async function requestUsers(): Promise<ManagedUser[]> {
  const response = await fetch('/api/admin/users');
  const body = (await response.json()) as { users?: ManagedUser[]; error?: string };
  if (!response.ok) throw new Error(body.error ?? 'No se pudo cargar la lista de usuarios.');
  return body.users ?? [];
}

export function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    void requestUsers()
      .then((nextUsers) => {
        if (isCurrent) setUsers(nextUsers);
      })
      .catch((error: unknown) => {
        if (isCurrent) setLoadError(error instanceof Error ? error.message : 'No se pudo cargar la lista.');
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => { isCurrent = false; };
  }, []);

  function openCreateDialog() {
    setSelectedUser(null);
    setForm(emptyForm);
    setFormError('');
    setDialogMode('create');
  }

  function openEditDialog(user: ManagedUser) {
    setSelectedUser(user);
    setForm({ fullName: user.full_name, email: user.email, password: '', role: user.role });
    setFormError('');
    setDialogMode('edit');
  }

  function closeDialog() {
    if (isSaving) return;
    setDialogMode(null);
    setSelectedUser(null);
    setFormError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError('');

    const isCreating = dialogMode === 'create';
    const payload = {
      fullName: form.fullName,
      email: form.email,
      ...(isCreating || form.password ? { password: form.password } : {}),
      ...(!isCreating ? { role: form.role } : {}),
    };

    try {
      const response = await fetch(
        isCreating ? '/api/admin/users' : `/api/admin/users/${selectedUser?.id}`,
        {
          method: isCreating ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json()) as { user?: ManagedUser; error?: string };
      if (!response.ok || !body.user) throw new Error(body.error ?? 'No se pudo guardar el usuario.');

      setUsers((current) => isCreating
        ? [body.user as ManagedUser, ...current]
        : current.map((user) => user.id === body.user?.id ? body.user as ManagedUser : user));
      setDialogMode(null);
      setSelectedUser(null);
      setForm(emptyForm);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar el usuario.');
    } finally {
      setIsSaving(false);
    }
  }

  const filteredUsers = users.filter((user) =>
    `${user.full_name} ${user.email} ${user.role}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/dashboard"><span className="brand-mark">S</span><span>stockly</span></a>
        <p className="eyebrow">Administración</p>
        <nav aria-label="Administración de usuarios">
          <a className="nav-item" href="/dashboard"><span aria-hidden="true">◈</span> Resumen</a>
          <a className="nav-item active" href="/users" aria-current="page"><span aria-hidden="true">♙</span> Usuarios</a>
        </nav>
      </aside>

      <section className={`content ${styles.content}`}>
        <header className="topbar">
          <a className="mobile-brand" href="/dashboard"><span className="brand-mark">S</span> stockly</a>
          <span className={styles.sectionName}>Administración de usuarios</span>
        </header>

        <div className={styles.heading}>
          <div>
            <p className="eyebrow">Equipo</p>
            <h1>Usuarios</h1>
          </div>
          <button className="primary-button" type="button" onClick={openCreateDialog}>+ Crear usuario</button>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.search}>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Buscar por nombre o correo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar usuarios"
            />
          </label>
          <span className={styles.count}>{users.length} {users.length === 1 ? 'usuario' : 'usuarios'}</span>
        </div>

        {loadError && <p className={styles.error} role="alert">{loadError}</p>}
        <div className={styles.tableFrame}>
          <table className={styles.table}>
            <thead>
              <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Creado</th><th><span className={styles.srOnly}>Acciones</span></th></tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className={styles.empty}>Cargando usuarios…</td></tr>}
              {!isLoading && !loadError && filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td data-label="Nombre">{user.full_name || 'Sin nombre'}</td>
                  <td data-label="Correo">{user.email}</td>
                  <td data-label="Rol"><span className={`${styles.role} ${user.role === 'admin' ? styles.admin : ''}`}>{user.role === 'admin' ? 'Administrador' : 'Usuario'}</span></td>
                  <td data-label="Creado">{new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(new Date(user.created_at))}</td>
                  <td className={styles.actionCell}><button className={styles.editButton} type="button" onClick={() => openEditDialog(user)}>Editar</button></td>
                </tr>
              ))}
              {!isLoading && !loadError && filteredUsers.length === 0 && (
                <tr><td colSpan={5} className={styles.empty}>{search ? 'No hay coincidencias.' : 'No hay usuarios registrados.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {dialogMode && (
        <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
          <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="user-dialog-title">
            <div className={styles.dialogHeading}>
              <div>
                <p className={styles.dialogKicker}>{dialogMode === 'create' ? 'NUEVO ACCESO' : 'PERFIL DE CUENTA'}</p>
                <h2 id="user-dialog-title">{dialogMode === 'create' ? 'Crear usuario' : 'Editar usuario'}</h2>
              </div>
              <button className={styles.closeButton} type="button" aria-label="Cerrar" onClick={closeDialog}>×</button>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.field}>
                <span>Nombre completo</span>
                <input required maxLength={160} autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
              </label>
              <label className={styles.field}>
                <span>Correo electrónico</span>
                <input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </label>
              <label className={styles.field}>
                <span>{dialogMode === 'create' ? 'Contraseña inicial' : 'Nueva contraseña'}</span>
                <input
                  required={dialogMode === 'create'}
                  minLength={12}
                  maxLength={128}
                  type="password"
                  autoComplete={dialogMode === 'create' ? 'new-password' : 'off'}
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                />
                {dialogMode === 'edit' && <small>Déjala vacía para conservar la contraseña actual.</small>}
              </label>
              {dialogMode === 'edit' && (
                <label className={styles.field}>
                  <span>Rol</span>
                  <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserForm['role'] })}>
                    <option value="user">Usuario</option>
                    <option value="admin">Administrador</option>
                  </select>
                </label>
              )}

              {formError && <p className={styles.error} role="alert">{formError}</p>}
              <div className={styles.formActions}>
                <button className={styles.cancelButton} type="button" onClick={closeDialog} disabled={isSaving}>Cancelar</button>
                <button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? 'Guardando…' : 'Guardar usuario'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}