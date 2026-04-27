import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// The root route only decides whether the user should land on login or dashboard.
export default async function Home() {
  const cookieStore = await cookies();
  const hasSession =
    cookieStore.has("clockhub_access") || cookieStore.has("clockhub_refresh");

  redirect(hasSession ? "/dashboard" : "/auth/login");
}
