import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  data,
} from "react-router";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import type { Route } from "./+types/root";
import "./app.css";
import { settingsService } from "~/services/settings.service.server";
import { FullscreenToggle } from "./components/ui/fullscreen-toggle";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  {
    rel: "icon",
    type: "image/png",
    href: "/images/logo.png",
  },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Système de Feedback - Pharmacie Val d'Oise" },
    {
      name: "description",
      content:
        "Partagez votre expérience et aidez-nous à améliorer nos services pharmaceutiques",
    },
    // Open Graph / Facebook
    { property: "og:type", content: "website" },
    {
      property: "og:title",
      content: "Système de Feedback - Pharmacie Val d'Oise",
    },
    {
      property: "og:description",
      content:
        "Donnez votre avis sur nos services et notre équipe pharmaceutique pour nous aider à mieux vous servir",
    },
    { property: "og:image", content: "/images/logo.png" },
    { property: "og:site_name", content: "Pharmacie Val d'Oise" },
    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    {
      name: "twitter:title",
      content: "Système de Feedback - Pharmacie Val d'Oise",
    },
    {
      name: "twitter:description",
      content:
        "Donnez votre avis sur nos services et notre équipe pharmaceutique pour nous aider à mieux vous servir",
    },
    { name: "twitter:image", content: "/images/logo.png" },
  ];
}

export async function loader({}: Route.LoaderArgs) {
  try {
    // Get settings from the database
    const settings = await settingsService.getSettings();
    return data({
      darkMode: settings?.darkMode ?? false,
    });
  } catch (error) {
    console.error("Error loading settings:", error);
    // Return default values if there's an error
    return data({
      darkMode: false,
    });
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  const loaderData = useLoaderData<typeof loader>();
  // Use fallback value if loaderData or darkMode is undefined
  const darkMode = loaderData?.darkMode ?? false;

  // Set theme based on settings
  const theme = darkMode ? "dark" : "light";

  // Force theme application with useEffect
  useEffect(() => {
    // Force theme to match our setting regardless of system preference
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <html lang="en" suppressHydrationWarning className={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme={theme}
          enableSystem={false}
          forcedTheme={theme}
        >
          {children}
        </ThemeProvider>
        <FullscreenToggle />

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
