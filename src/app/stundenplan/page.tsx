import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { SESSION_COOKIE } from "@/lib/http";
import { getSession } from "@/lib/store";
export const metadata = { title: "Stundenplan" };
export default async function TimetablePage() { const session = await getSession((await cookies()).get(SESSION_COOKIE)?.value); if (!session) redirect("/login"); return <Dashboard key={session.filterStorageId} displayName={session.displayName || session.credentials.username} filterStorageId={session.filterStorageId} />; }
