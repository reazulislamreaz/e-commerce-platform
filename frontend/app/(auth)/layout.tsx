export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main-content"
      className="flex flex-1 items-center justify-center bg-gradient-to-b from-zinc-50 to-indigo-50/40 px-4 py-16"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        {children}
      </div>
    </main>
  );
}
