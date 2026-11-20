import { Logo } from "./ui";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto max-w-3xl px-6 py-6">
        <Logo />
      </header>
      <article className="mx-auto max-w-3xl px-6 pb-16 text-zinc-700 [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-zinc-900 [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3 [&_ul]:mb-3">
        <h1 className="text-3xl font-bold text-zinc-900">{title}</h1>
        <p className="mt-1 text-sm text-zinc-500">Última atualização: {updated}</p>
        {children}
      </article>
    </div>
  );
}
