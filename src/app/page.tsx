import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  // Choose the destination without blocking the landing page on an API call.
  // The dashboard still validates the session before showing protected data.
  const jar = await cookies();
  redirect(jar.has("emp_rt") ? "/dashboard" : "/login");
}
