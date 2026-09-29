export default function AppLoading() {
  return (
    <main className="min-h-full px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-[1600px] animate-pulse">
        <div className="h-3 w-32 rounded bg-prism-panel2" />
        <div className="mt-4 h-10 w-72 max-w-full rounded bg-prism-panel2" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-prism-panel2/70" />
        <section className="mt-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-32 rounded-xl border border-prism-line bg-prism-panel" />
          ))}
        </section>
        <section className="mt-5 h-80 rounded-xl border border-prism-line bg-prism-panel" />
      </div>
    </main>
  );
}
