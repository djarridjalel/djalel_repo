import { Brand } from "./Brand";

export function AuthShell({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bone">
      <header className="studio-bar flex h-14 items-center px-4 sm:px-6">
        <Brand />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-12 sm:items-center">
        <div className="w-full max-w-sm">
          <h1 className="text-[26px] font-medium leading-tight">{title}</h1>
          <p className="mb-6 mt-2 text-[14px] text-mute">{lead}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
