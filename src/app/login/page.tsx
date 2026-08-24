import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { SESSION_COOKIE } from "@/lib/http";
import { getSession } from "@/lib/store";
export const metadata = { title: "Anmelden" };
export default async function LoginPage() { if (await getSession((await cookies()).get(SESSION_COOKIE)?.value)) redirect("/stundenplan"); return <main className="login-page"><section className="login-card"><div className="brand-mark">UP</div><p className="eyebrow">Untiplan</p><h1>Dein Stundenplan.<br/>Einfach übersichtlich.</h1><p className="muted">Die Verbindung zu WebUntis läuft geschützt über deinen Server.</p><LoginForm /></section></main>; }
