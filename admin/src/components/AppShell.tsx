'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import clsx from 'clsx';

const nav = [
  { href: '/dashboard', label: 'Dashboard', roles: ['ADMIN', 'DIRECTOR', 'MANAGER', 'WAREHOUSE', 'ACCOUNTANT', 'PRODUCTION', 'DRIVER'] },
  { href: '/production', label: 'Производство', roles: ['ADMIN', 'DIRECTOR', 'PRODUCTION', 'WAREHOUSE', 'MANAGER'] },
  { href: '/stock', label: 'Склад', roles: ['ADMIN', 'DIRECTOR', 'WAREHOUSE', 'MANAGER', 'PRODUCTION'] },
  { href: '/orders', label: 'Продажи', roles: ['ADMIN', 'DIRECTOR', 'MANAGER', 'ACCOUNTANT'] },
  { href: '/deliveries', label: 'Доставки', roles: ['ADMIN', 'DIRECTOR', 'MANAGER', 'DRIVER'] },
  { href: '/employees', label: 'Сотрудники', roles: ['ADMIN', 'DIRECTOR', 'ACCOUNTANT', 'MANAGER'] },
  { href: '/salary', label: 'Зарплата', roles: ['ADMIN', 'DIRECTOR', 'ACCOUNTANT'] },
  { href: '/reports', label: 'Отчеты', roles: ['ADMIN', 'DIRECTOR', 'ACCOUNTANT', 'MANAGER'] },
  { href: '/customers', label: 'Клиенты', roles: ['ADMIN', 'DIRECTOR', 'MANAGER'] },
  { href: '/vehicles', label: 'Автопарк', roles: ['ADMIN', 'DIRECTOR', 'MANAGER', 'DRIVER'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-brand-800">
        Загрузка...
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') router.replace('/login');
    return null;
  }

  const items = nav.filter((n) => n.roles.includes(user.role));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-brand-200/70 bg-brand-950 text-sand-50">
        <div className="px-5 py-6 border-b border-white/10">
          <div className="text-2xl font-semibold tracking-tight">BlockERP</div>
          <div className="mt-1 text-sm text-brand-200">Завод цементных блоков</div>
        </div>
        <nav className="p-3 space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'block rounded-lg px-3 py-2 text-sm transition',
                pathname.startsWith(item.href)
                  ? 'bg-brand-700 text-white'
                  : 'text-brand-100 hover:bg-white/10'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-4 border-t border-white/10 text-sm">
          <div className="font-medium">{user.login}</div>
          <div className="text-brand-200">{user.roleName || user.role}</div>
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="mt-3 text-brand-300 hover:text-white underline"
          >
            Выйти
          </button>
        </div>
      </aside>
      <main className="p-4 md:p-8">{children}</main>
    </div>
  );
}
