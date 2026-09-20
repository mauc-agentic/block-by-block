import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="border border-edge bg-surface rounded-lg p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
          {title}
        </h1>
        <p className="mt-2 text-sm text-fg-soft">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
