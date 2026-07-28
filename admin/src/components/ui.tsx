import { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-950">{title}</h1>
        {subtitle ? <p className="mt-1 text-brand-700/80">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-brand-200/80 bg-white/80 backdrop-blur p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <div className="text-sm text-brand-700/70">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-brand-900">{value}</div>
    </Card>
  );
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  const base =
    variant === 'primary'
      ? 'bg-brand-700 text-white hover:bg-brand-800'
      : 'bg-transparent border border-brand-300 text-brand-800 hover:bg-brand-50';
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${base} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
      {...props}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
      {...props}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
      {...props}
    />
  );
}
