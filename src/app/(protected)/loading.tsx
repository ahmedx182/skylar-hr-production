import { TopProgressFallback } from "@/components/ui/top-progress-bar";
import { getLayoutPreferences } from "@/server/preferences/layout-preferences";

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-paper/[0.07] ${className}`} />;
}

export default function ProtectedLoading() {
  const { navCollapsed } = getLayoutPreferences();
  return (
    <main className="min-h-dvh bg-ink text-paper" aria-busy="true">
      <TopProgressFallback />
      <div className="flex min-h-dvh w-full flex-col px-4 pb-3 md:px-5 md:pb-4 lg:pl-3 2xl:pr-7">
        <header className="sticky top-0 z-20 -mx-4 flex h-14 items-center gap-2.5 border-b border-paper/10 bg-ink px-5 md:-mx-5 md:px-6 lg:-ml-3 lg:pl-5 2xl:-mr-7 2xl:pr-8">
          <span
            aria-hidden="true"
            className="block size-8 bg-[url('/brand/logo.png')] bg-[length:28px_26px] bg-center bg-no-repeat"
          />
          <p className="text-base font-semibold">
            Skylar <span className="ml-1.5 text-sm font-normal text-paper-3">Loading...</span>
          </p>
        </header>

        <section
          className={`grid flex-1 gap-4 py-4 ${
            navCollapsed
              ? "lg:grid-cols-[56px_minmax(0,1fr)]"
              : "lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[212px_minmax(0,1fr)] 2xl:grid-cols-[224px_minmax(0,1fr)]"
          }`}
        >
          <aside className={`hidden content-start gap-3 border-paper/10 pt-3 lg:grid lg:border-r ${navCollapsed ? "lg:pr-2" : "lg:pr-3"}`}>
            {!navCollapsed && (
              <>
                <Bar className="h-4 w-24" />
                <Bar className="h-3 w-40" />
              </>
            )}
            <div className="mt-3 grid gap-2">
              {Array.from({ length: 6 }, (_, index) => (
                <Bar key={index} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </aside>

          <div className="grid min-w-0 content-start gap-4">
            <span className="sr-only" role="status">
              Loading page
            </span>
            <Bar className="h-72 w-full rounded-2xl" />
            <Bar className="h-40 w-full rounded-2xl" />
          </div>
        </section>
      </div>
    </main>
  );
}
