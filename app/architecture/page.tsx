import dynamic from "next/dynamic";

const ConsentKeyDiagramFlow = dynamic(
  () => import("../components/ConsentKeyDiagramFlow"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] animate-pulse rounded-3xl border border-white/10 bg-slate-900/40" />
    )
  }
);

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div>
          <div className="text-xs tracking-[0.25em] text-white/60">CONSENTKEY ARCHITECTURE</div>
          <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
            Physical consent firewall for AI actions
          </h1>
          <p className="mt-2 max-w-4xl text-sm text-white/70 sm:text-base">
            Agent proposes -&gt; broker evaluates risk -&gt; consent on MX Console -&gt; token allows
            execution (or 403 blocks).
          </p>
        </div>

        <div className="mt-5">
          <ConsentKeyDiagramFlow />
        </div>
      </div>
    </div>
  );
}
