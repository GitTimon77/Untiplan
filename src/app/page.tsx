import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/store";
import { SESSION_COOKIE } from "@/lib/http";
export default async function Home() { const token = (await cookies()).get(SESSION_COOKIE)?.value; redirect(await getSession(token) ? "/stundenplan" : "/login"); }
