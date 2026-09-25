import { redirect } from "next/navigation";
import { BRIEFING_PATH, LOGIN_PATH } from "@/constants/routes";
import { getSession } from "@/server/auth/get-session";

export default async function Home() {
  redirect((await getSession()) ? BRIEFING_PATH : LOGIN_PATH);
}
