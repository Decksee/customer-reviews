import type { Route } from "./+types/logout";
import { redirect } from "react-router";
import { getSession, destroySession } from "~/utils/session.server";
import { authService } from "~/services/auth.service.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Déconnexion - Pharmacy Val d'Oise" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  // Get the current session
  const session = await getSession(request.headers.get("Cookie"));
  
  // Call the auth service logout method to clear the session
  const clearedSession = await authService.logout(session);
  
  // Redirect to the login page with the cleared session cookie
  return redirect("/admin/login", {
    headers: { "Set-Cookie": await destroySession(clearedSession) }
  });
}

// No default export needed as this is just a loader route with no UI
