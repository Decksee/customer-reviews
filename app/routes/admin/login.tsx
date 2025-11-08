import type { Route } from "./+types/login";
import { useState, useEffect } from "react";
import { useNavigate, redirect, useFetcher, Link, data, useLocation } from "react-router";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, EyeIcon, EyeOffIcon, CheckCircle2 } from "lucide-react";
import { getSession } from "~/utils/session.server";
import { commitSession } from "~/utils/session.server";
import { authService } from "~/services/auth.service.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Admin Login - Pharmacy Val d'Oise" },
    { name: "description", content: "Admin login page for Pharmacy Val d'Oise feedback system" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  // const user = await authService.getUser(request);
  // if (user) {
  //   return redirect("/admin");
  // }

  // Check for url params
  const url = new URL(request.url);
  const resetSuccess = url.searchParams.get('resetSuccess') === 'true';
  
  return data({ resetSuccess });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  // Validate form data
  if (!email || !password) {
    return data({ error: "Email et mot de passe requis" })
  }

  try {
    // Authenticate user
    const user = await authService.withEmailAuthenticate(email, password)
    
    if (!user) {
      return data({ error: "Email ou mot de passe incorrect" })
    }

    // Generate token
    const token = authService.generateToken(user)
    
    // Get session and store token
    const session = await getSession(request.headers.get("Cookie"))
    const updatedSession = authService.setAuthToken(session, token, user)

    // Redirect to admin page with session cookie
    return redirect("/admin", {
      headers: {
        "Set-Cookie": await commitSession(updatedSession)
      }
    })
  } catch (error) {
    console.error("Login error:", error)
    return data({ error: "Une erreur est survenue lors de la connexion" })
  }
}

export default function AdminLogin({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const fetcher = useFetcher<typeof action>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clientValidationError, setClientValidationError] = useState<string | null>(null);
  const [showResetSuccess, setShowResetSuccess] = useState(loaderData?.resetSuccess || false);

  const isSubmitting = fetcher.state === "submitting";
  const actionData = fetcher.data;

  // Clear client validation errors when user inputs change
  useEffect(() => {
    if (clientValidationError) {
      setClientValidationError(null);
    }
  }, [email, password, clientValidationError]);

  // Auto-hide reset success message after 5 seconds
  useEffect(() => {
    if (showResetSuccess) {
      const timer = setTimeout(() => {
        setShowResetSuccess(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showResetSuccess]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = (e: React.FormEvent) => {
    if (!email.trim()) {
      e.preventDefault();
      setClientValidationError("Veuillez entrer votre email");
      return false;
    }

    if (!password) {
      e.preventDefault();
      setClientValidationError("Veuillez entrer votre mot de passe");
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      e.preventDefault();
      setClientValidationError("Format d'email invalide");
      return false;
    }

    return true;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1c7b80]/5 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/5 dark:bg-gray-800 flex items-center justify-center shadow-md mb-4 border-2 border-[#1c7b80]/30">
            <img 
              src="/images/logo.png" 
              alt="Pharmacy Logo" 
              className="h-12 w-12 rounded-full"
            />
          </div>
          <h1 className="text-2xl font-bold text-[#1c7b80] dark:text-white">
            Pharmacie Val d'Oise
          </h1>
          <p className="text-[#1c7b80]/80 dark:text-gray-400">
            Accès à l'administration
          </p>
        </div>

        <Card className="border border-[#1c7b80]/20 shadow-lg bg-card">
          <CardHeader className="bg-gradient-to-r from-[#1c7b80]/10 to-transparent dark:from-gray-800 dark:to-gray-800/90 border-b border-[#1c7b80]/10">
            <CardTitle className="text-[#1c7b80] dark:text-white">Connexion</CardTitle>
            <CardDescription>
              Connectez-vous pour accéder au tableau de bord administrateur.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {showResetSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3 mb-4 flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-green-800 dark:text-green-300 text-sm">
                  <p className="font-medium">Mot de passe réinitialisé avec succès!</p>
                  <p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
                </div>
              </div>
            )}

            <fetcher.Form method="post" className="space-y-4 relative" onSubmit={validateForm}>
              {isSubmitting && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-gray-900/70 rounded-md">
                  <Loader2 className="h-8 w-8 text-[#1c7b80] dark:text-white animate-spin" />
                </div>
              )}
              {(actionData?.error || clientValidationError) && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-red-800 dark:text-red-300 text-sm">
                    {actionData?.error || clientValidationError}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  value={email}
                  placeholder="Entrez votre email"
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Link 
                    to="/admin/forgot-password" 
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Mot de passe oublié?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Entrez votre mot de passe"
                    disabled={isSubmitting}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={togglePasswordVisibility}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-[#1c7b80] hover:bg-[#1c7b80]/90 text-white" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </fetcher.Form>
          </CardContent>
        </Card>
        
        <div className="mt-4 text-center">
          <Link 
            to="/"
            className="text-sm text-[#1c7b80] hover:text-[#1c7b80]/80 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
} 