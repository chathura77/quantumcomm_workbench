"use client";

import { useEffect, useState } from "react";
import { buildShareableStateUrl, decodeShareableState, encodeShareableState } from "@/lib/export/shareableState";
import { SecondaryButton } from "@/components/ui";

export function useShareableToolState<T extends Record<string, unknown>>(queryKey: string, defaults: T) {
  const [state, setState] = useState<T>(defaults);
  const [hydrated, setHydrated] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const encoded = new URLSearchParams(window.location.search).get(queryKey);
    if (!encoded) {
      setHydrated(true);
      return;
    }

    try {
      const parsed = decodeShareableState<Partial<T>>(encoded);
      setState({ ...defaults, ...parsed });
      setShareMessage("Loaded calculator inputs from the shareable URL.");
    } catch {
      setShareMessage("Shareable URL data was invalid, so the default preset stayed active.");
    }

    setHydrated(true);
  }, [defaults, queryKey]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.set(queryKey, encodeShareableState(state));
    const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", next);
  }, [hydrated, queryKey, state]);

  const copyShareUrl = async () => {
    if (typeof window === "undefined") {
      return;
    }

    const url = buildShareableStateUrl(window.location.pathname, queryKey, state);
    const absoluteUrl = `${window.location.origin}${url}`;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(absoluteUrl);
      setShareMessage("Shareable URL copied. It includes teaching inputs only, never secret key material.");
    } catch {
      setShareMessage(`Shareable URL ready: ${absoluteUrl}`);
    }
  };

  return { state, setState, shareMessage, setShareMessage, copyShareUrl };
}

export function ShareUrlControls({
  onCopy,
  message
}: {
  onCopy: () => void | Promise<void>;
  message: string | null;
}) {
  return (
    <div className="rounded-lg border border-cyan-100 bg-cyan-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">Shareable URL state</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">Keep the current calculator inputs in the URL so this teaching setup can be reopened or shared without exporting files.</p>
        </div>
        <SecondaryButton onClick={() => void onCopy()}>Copy share URL</SecondaryButton>
      </div>
      {message ? <p className="mt-2 text-xs text-cyan-900">{message}</p> : <p className="mt-2 text-xs text-slate-500">Only model inputs are stored in the link. No keys or telemetry are added.</p>}
    </div>
  );
}
