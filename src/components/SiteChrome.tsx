import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-foreground/15 px-4 py-3">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4" aria-label="Primary navigation">
        <Link className="font-display text-2xl" href="/">CY//MATCH</Link>
        <div className="flex gap-4 font-mono text-sm"><Link href="/">Home</Link><Link href="/profile">Profile</Link></div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return <footer className="mt-auto border-t border-foreground/15 px-4 py-4 text-center legal-footer">CyberLife monitors all interactions to ensure optimal social harmony.</footer>;
}
