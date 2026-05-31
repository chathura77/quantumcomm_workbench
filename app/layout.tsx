import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { disclaimer, mainNav } from "@/lib/content";

export const metadata: Metadata = {
  title: "QuantumComm Workbench",
  description: "Quantum communication calculators, QKD API sandboxes, and network scenario tools.",
  icons: {
    icon: "/icon.svg"
  }
};

const sourceRepositoryUrl = "https://github.com/chathura77/quantumcomm_workbench";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="skip-link"
        >
          Skip to main content
        </a>
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white/95">
            <nav aria-label="Primary" className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <Link href="/" className="text-lg font-semibold text-ink">QuantumComm Workbench</Link>
              <div className="flex flex-wrap gap-2">
                {mainNav.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-ink">
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>
          </header>
          <div id="main-content" tabIndex={-1} className="focus:outline-none">
            {children}
          </div>
          <footer className="mt-10 border-t border-slate-200 bg-white" aria-label="Site footer">
            <div className="mx-auto grid w-full max-w-6xl gap-5 px-5 py-8 text-sm leading-6 text-slate-600 md:grid-cols-[1fr,260px]">
              <p>{disclaimer}</p>
              <div className="flex flex-col gap-2">
                <Link href="/resources/standards" className="font-medium text-ink hover:text-cyanline">References and standards</Link>
                <Link href="/resources/model-limitations" className="font-medium text-ink hover:text-cyanline">Model limitations</Link>
                <a href={sourceRepositoryUrl} className="font-medium text-ink hover:text-cyanline">Source repository</a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
