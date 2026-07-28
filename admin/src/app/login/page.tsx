'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button, Input } from '@/components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [loginName, setLoginName] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(loginName, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl border border-brand-200 bg-white/90 p-8 shadow-lg"
      >
        <div className="mb-8">
          <div className="text-3xl font-semibold text-brand-950">BlockERP</div>
          <p className="mt-2 text-brand-700/80">Вход в систему завода цементных блоков</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-brand-800">Логин</label>
            <Input value={loginName} onChange={(e) => setLoginName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm text-brand-800">Пароль</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <div className="text-sm text-red-700">{error}</div> : null}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Вход...' : 'Войти'}
          </Button>
        </div>
        <p className="mt-6 text-xs text-brand-700/70">
          Демо: admin / admin123 (также director, manager, production, warehouse, driver, accountant)
        </p>
      </form>
    </div>
  );
}
