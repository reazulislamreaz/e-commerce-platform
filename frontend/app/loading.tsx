export default function Loading() {
  return (
    <main
      id="main-content"
      className="flex flex-1 items-center justify-center bg-black py-24"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-pulse rounded-full border-2 border-[#e3bb78] border-t-transparent" />
        <p className="text-sm text-[#b5b0a8]">Loading…</p>
      </div>
    </main>
  );
}
