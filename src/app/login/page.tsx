import { cookies } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { SiteFooter } from "@/components/site-footer";
import { SESSION_COOKIE } from "@/lib/http";
import { getSession } from "@/lib/store";
export const metadata = { title: "Anmelden" };
export default async function LoginPage({searchParams}:{searchParams:Promise<{add?:string}>}) { const addingAccount=(await searchParams).add==="1";const session=await getSession((await cookies()).get(SESSION_COOKIE)?.value);if(session&&!addingAccount)redirect("/stundenplan");if(!session&&addingAccount)redirect("/login");return <div className="login-shell"><main className="login-page"><section className="login-card">{addingAccount&&<a className="login-back" href="/stundenplan">← Zum Stundenplan</a>}<Image className="brand-mark" src="/untiplan-logo.png" alt="" width={52} height={52} priority/><p className="eyebrow">{addingAccount?"Weiteres Konto":"Untiplan"}</p><h1>{addingAccount?<>Konto hinzufügen.</>:<>Dein Stundenplan.<br/>Einfach übersichtlich.</>}</h1>{addingAccount&&<p className="muted">Melde dich mit einem weiteren WebUntis-Konto an. Dein bisheriges Konto bleibt angemeldet.</p>}<LoginForm addingAccount={addingAccount}/>{!addingAccount&&<><p className="age-notice">Untiplan richtet sich an Nutzerinnen und Nutzer ab 16 Jahren.</p><div className="demo-entry"><span>oder</span><a className="ghost" href="/vorschau">Ohne Anmeldung mit Beispieldaten ansehen</a></div></>}</section></main><SiteFooter /></div>; }
