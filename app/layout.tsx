import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { disclaimer, hostBrand, hostNav, mainNav } from "@/lib/content";

export const metadata: Metadata = {
  title: "QuantumComm Workbench | Chathura Sarathchandra",
  description: "Quantum communication calculators, QKD API sandboxes, and network scenario tools.",
  openGraph: {
    siteName: "Chathura Sarathchandra",
    title: "QuantumComm Workbench",
    description: "Quantum communication calculators, QKD API sandboxes, and network scenario tools.",
    type: "website"
  },
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
          <div className="bg-hostbrown text-white">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-3 text-sm md:flex-row md:items-center md:justify-between">
              <a href={hostBrand.homeUrl} className="font-semibold hover:text-hostorange">
                {hostBrand.name}
              </a>
              <nav aria-label="SarathChandra.com" className="flex flex-wrap gap-x-4 gap-y-2 text-white/80">
                {hostNav.map((item) => (
                  <a key={item.href} href={item.href} className="hover:text-white">
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </div>
          <header className="border-b border-slate-200 bg-white/95">
            <nav aria-label="Primary" className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <Link href="/" className="flex max-w-full flex-col gap-1">
                <span className="text-xs font-semibold uppercase text-hostorange">{hostBrand.label}</span>
                <span className="text-xl font-semibold text-ink">QuantumComm Workbench</span>
              </Link>
              <div className="flex flex-wrap gap-2">
                {mainNav.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-warmpaper hover:text-ink">
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
            <div className="mx-auto grid w-full max-w-6xl gap-7 px-5 py-8 text-sm leading-6 text-slate-600 lg:grid-cols-[1.35fr,0.75fr,260px]">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-hostorange">{hostBrand.label}</p>
                <p>{hostBrand.tagline}</p>
                <p>{hostBrand.personalDisclaimer}</p>
              </div>
              <p>{disclaimer}</p>
              <div className="flex flex-col gap-2">
                <a href={hostBrand.homeUrl} className="font-medium text-ink hover:text-hostorange">Back to sarathchandra.com</a>
                <a href={hostBrand.sandboxUrl} className="font-medium text-ink hover:text-hostorange">The Sandbox</a>
                <Link href="/resources/standards" className="font-medium text-ink hover:text-cyanline">References and standards</Link>
                <Link href="/resources/model-limitations" className="font-medium text-ink hover:text-cyanline">Model limitations</Link>
                <a href={sourceRepositoryUrl} className="font-medium text-ink hover:text-cyanline">Source repository</a>
              </div>
            </div>
            <div className="border-t border-slate-200 bg-warmpaper/70 px-5 py-3 text-center text-xs text-slate-600">
              Hosted in the public research sandbox by {hostBrand.name}. Educational estimates only.
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
