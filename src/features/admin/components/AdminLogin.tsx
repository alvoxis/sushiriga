import { useState, type FormEvent } from 'react';
import { Button, Card, TextField } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { AdminError, type AdminService } from '@/services/admin/adminService';
import type { StaffUser } from '@/types';
import styles from '@/pages/admin/admin.module.css';

/** Staff sign-in. Accounts are created by the owner (server CLI); there is no sign-up. */
export function AdminLogin({
  admin,
  onSignedIn,
  notice,
}: {
  admin: AdminService;
  onSignedIn: (user: StaffUser) => void;
  notice?: string | null;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await admin.login(email, password));
    } catch (failure) {
      const code = failure instanceof AdminError ? failure.code : 'failed';
      setError(
        code === 'invalid-credentials' || code === 'unauthorized'
          ? t('admin.login.invalid')
          : code === 'too-many-requests'
            ? t('admin.login.tooMany')
            : code === 'network'
              ? t('admin.errors.network')
              : t('admin.errors.failed'),
      );
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card as="section" className={styles.login} aria-labelledby="admin-login-title">
      <h1 id="admin-login-title" className={styles.loginTitle}>
        {t('admin.login.title')}
      </h1>
      {notice && <p role="status">{notice}</p>}
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <TextField
          label={t('admin.login.email')}
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label={t('admin.login.password')}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div>
          <Button type="submit" size="lg" disabled={busy || !email || !password}>
            {t('admin.login.submit')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
