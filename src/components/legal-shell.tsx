import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export function LegalShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="legal-layout">
      <header className="legal-topbar">
        <Link className="brand" href="/" aria-label="Zurück zu Untiplan">
          <Image className="brand-icon" src="/untiplan-logo.png" alt="" width={36} height={36} priority />
          <b>Untiplan</b>
        </Link>
        <Link className="ghost legal-back" href="/">Zur App</Link>
      </header>
      <main className="legal-main">
        <article className="legal-card">
          <header className="legal-title">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="muted">{intro}</p>
          </header>
          <div className="legal-copy">{children}</div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

