"use client";

import { useId, useMemo, useState } from "react";
import { MetricCard, NumberField } from "@/components/ui";

function seededBit(index: number, salt: number) {
  return ((index * 1103515245 + salt * 12345) >>> 4) % 2;
}

export function BB84MiniDemo() {
  const [eveFraction, setEveFraction] = useState(0.1);
  const summaryId = useId();
  const demo = useMemo(() => {
    const rows = Array.from({ length: 16 }, (_, index) => {
      const aliceBit = seededBit(index, 3);
      const aliceBasis = seededBit(index, 7) === 0 ? "+" : "x";
      const bobBasis = seededBit(index, 11) === 0 ? "+" : "x";
      const eveTouches = index / 16 < eveFraction;
      const disturbed = eveTouches && aliceBasis !== bobBasis;
      const bobBit = bobBasis === aliceBasis ? aliceBit : seededBit(index, 19);
      const finalBit = disturbed ? 1 - bobBit : bobBit;
      return { index, aliceBit, aliceBasis, bobBasis, bobBit: finalBit, kept: aliceBasis === bobBasis, error: aliceBasis === bobBasis && finalBit !== aliceBit };
    });
    const kept = rows.filter((row) => row.kept);
    const errors = kept.filter((row) => row.error);
    return { rows, siftedLength: kept.length, qber: kept.length ? errors.length / kept.length : 0 };
  }, [eveFraction]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-ink">BB84 mini-demo</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-[260px,1fr]">
        <NumberField label="Eve/intercept fraction" value={eveFraction} min={0} max={1} onChange={setEveFraction} />
        <div className="grid gap-3 md:grid-cols-2">
          <MetricCard label="Sifted bits" value={demo.siftedLength} />
          <MetricCard label="Demo QBER" value={`${(demo.qber * 100).toFixed(1)}%`} />
        </div>
      </div>
      <p id={summaryId} className="mt-4 text-sm leading-6 text-slate-600">
        This deterministic teaching trace shows 16 transmissions, {demo.siftedLength} sifted bits, and a demo QBER of {(demo.qber * 100).toFixed(1)}%.
        It illustrates intercept-resend disturbance only and is not a finite-key or device-imperfection security proof.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm" aria-describedby={summaryId}>
          <caption className="pb-2 text-left text-xs leading-5 text-slate-500">
            Row-by-row BB84 sifting view showing Alice and Bob bases, kept bits, and whether the deterministic teaching trace produced an error.
          </caption>
          <thead className="text-slate-500"><tr><th className="py-2">i</th><th>Alice bit</th><th>Alice basis</th><th>Bob basis</th><th>Bob bit</th><th>Kept</th><th>Error</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {demo.rows.map((row) => <tr key={row.index}><td className="py-2">{row.index}</td><td>{row.aliceBit}</td><td>{row.aliceBasis}</td><td>{row.bobBasis}</td><td>{row.bobBit}</td><td>{row.kept ? "yes" : "no"}</td><td>{row.error ? "yes" : "no"}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function E91MiniDemo() {
  const [visibility, setVisibility] = useState(0.94);
  const [noise, setNoise] = useState(0.02);
  const sValue = useMemo(() => {
    const ideal = 2 * Math.SQRT2;
    return Math.max(0, ideal * visibility * (1 - noise));
  }, [visibility, noise]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-ink">E91 CHSH-style demo</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-[260px,260px,1fr]">
        <NumberField label="Visibility" value={visibility} min={0} max={1} onChange={setVisibility} />
        <NumberField label="Noise fraction" value={noise} min={0} max={1} onChange={setNoise} />
        <div className="grid gap-3 md:grid-cols-2">
          <MetricCard label="CHSH S proxy" value={sValue.toFixed(3)} />
          <MetricCard label="Bell indicator" value={sValue > 2 ? "above 2" : "not above 2"} />
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">This is a teaching proxy for correlation visibility, not a loophole-free device-independent security test.</p>
    </div>
  );
}
