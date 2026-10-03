import Link from 'next/link';
import styles from './AdminUsersLink.module.css';

export function AdminUsersLink() {
  return <Link className={styles.link} href="/users" aria-label="Administrar usuarios" title="Usuarios">♙</Link>;
}