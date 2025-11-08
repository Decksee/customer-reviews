import type { Route } from "./+types/reset-password";
import { useState, useEffect } from "react";
import { data, Form, Link, redirect, useLoaderData, useNavigate, useNavigation } from "react-router";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, EyeIcon, EyeOffIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { tokenService } from "~/services/token.service.server";
import config from "@/config/config.server";
import emailUtils from "~/core/utils/email.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Réinitialisation du mot de passe - Pharmacy Val d'Oise" },
    { name: "description", content: "Réinitialisez votre mot de passe pour Pharmacy Val d'Oise" },
  ];
}

// Password strength calculator
const calculatePasswordStrength = (password: string) => {
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 25;
  
  // Contains lowercase
  if (/[a-z]/.test(password)) score += 25;
  
  // Contains uppercase
  if (/[A-Z]/.test(password)) score += 25;
  
  // Contains number or special char
  if (/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 25;
  
  return score;
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const token = url.searchParams.get("token")
  
  if (!token) {
    return data({ tokenValid: false, tokenChecking: false, token: null })
  }

  try {
    // Verify the token server-side
    await tokenService.verifyToken(token, config.auth.tokenTypes.RESET_PASSWORD)
    return data({ tokenValid: true, tokenChecking: false, token })
  } catch (error) {
    console.error("Token validation error:", error)
    return data({ tokenValid: false, tokenChecking: false, token: null })
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const token = formData.get("token") as string
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string

  // Validate form data
  if (!token) {
    return data({ error: "Token requis" , success: false })
  }

  if (!password || !confirmPassword) {
    return data({ error: "Tous les champs sont requis" , success: false })
  }

  if (password !== confirmPassword) {
    return data({ error: "Les mots de passe ne correspondent pas" , success: false })
  }

  if (password.length < 8) {
    return data({ error: "Le mot de passe doit contenir au moins 8 caractères" , success: false })
  }

  try {
    // Reset the password and get user info
    const user = await tokenService.resetPassword(token, password)
    
    // Send email notification about the password change
    if (user && user.email) {
      await emailUtils.notifyEmail(
        user.email,
        "Votre mot de passe a été réinitialisé",
        "Votre mot de passe pour Avis Pharmacy Val d'Oise a été réinitialisé avec succès. Si vous n'êtes pas à l'origine de cette action, veuillez contacter immédiatement le support.",
        [{ text: "Se connecter", url: `${config.domainName}/admin/login` }],
        user.firstName || ""
      )
    }
    
    // Return success data
    return data({ success: true, error: null })
  } catch (error) {
    console.error("Password reset error:", error)
    return data({ error: "Le lien de réinitialisation est invalide ou a expiré" , success: false })
  }
}

export default function ResetPassword({loaderData, actionData}: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();

  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [password, setPassword] = useState("");
  const [clientValidationError, setClientValidationError] = useState<string | null>(null);

  const {tokenChecking, tokenValid, token} = loaderData;
  const isSubmitting = navigation.state === "submitting";

  // Calculate password strength on change
  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
    // Clear validation error when user starts typing
    if (clientValidationError) {
      setClientValidationError(null);
    }
  }, [password, clientValidationError]);

  // Clear validation error when confirm password changes
  useEffect(() => {
    if (clientValidationError && confirmPassword) {
      setClientValidationError(null);
    }
  }, [confirmPassword, clientValidationError]);

  // Countdown for redirect after success
  useEffect(() => {
    if (actionData?.success && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (actionData?.success && redirectCountdown === 0) {
      navigate("/admin/login");
    }
  }, [actionData?.success, redirectCountdown, navigate]);

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 25) return "Faible";
    if (passwordStrength <= 50) return "Moyen";
    if (passwordStrength <= 75) return "Bon";
    return "Fort";
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 25) return "bg-red-500";
    if (passwordStrength <= 50) return "bg-yellow-500";
    if (passwordStrength <= 75) return "bg-blue-500";
    return "bg-green-500";
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = (e: React.FormEvent) => {
    // Client-side validation before submission
    if (!password) {
      e.preventDefault();
      setClientValidationError("Veuillez entrer un mot de passe");
      return false;
    }

    if (password.length < 8) {
      e.preventDefault();
      setClientValidationError("Le mot de passe doit contenir au moins 8 caractères");
      return false;
    }

    if (!/[a-z]/.test(password)) {
      e.preventDefault();
      setClientValidationError("Le mot de passe doit contenir au moins une lettre minuscule");
      return false;
    }

    if (!/[A-Z]/.test(password)) {
      e.preventDefault();
      setClientValidationError("Le mot de passe doit contenir au moins une lettre majuscule");
      return false;
    }

    if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      e.preventDefault();
      setClientValidationError("Le mot de passe doit contenir au moins un chiffre ou caractère spécial");
      return false;
    }

    if (password !== confirmPassword) {
      e.preventDefault();
      setClientValidationError("Les mots de passe ne correspondent pas");
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
            Réinitialisation de mot de passe
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Créer un nouveau mot de passe</CardTitle>
            <CardDescription>
              Veuillez choisir un nouveau mot de passe sécurisé.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tokenChecking ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
                <span>Vérification du lien de réinitialisation...</span>
              </div>
            ) : actionData?.success ? (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4 flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-green-800 dark:text-green-300 text-sm">
                    <p className="font-medium">Mot de passe réinitialisé avec succès!</p>
                    <p className="mt-1">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
                    <p className="mt-1">Un email de confirmation a été envoyé à votre adresse e-mail.</p>
                    <p className="mt-2">Redirection vers la page de connexion dans {redirectCountdown} secondes...</p>
                  </div>
                </div>
                <div className="text-center">
                  <Button asChild variant="outline">
                    <Link to="/admin/login">Aller à la connexion</Link>
                  </Button>
                </div>
              </div>
            ) : !tokenValid ? (
              <div className="p-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                Le lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien.
                <div className="mt-4 flex justify-center">
                  <Button
                    asChild
                    variant="outline"
                    className="mt-2"
                  >
                    <Link to="/admin/forgot-password">
                      Demander un nouveau lien
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <Form method="post" onSubmit={validateForm} className="space-y-4">
                {(actionData?.error || clientValidationError) && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-red-800 dark:text-red-300 text-sm">
                      {actionData?.error || clientValidationError}
                    </div>
                  </div>
                )}
                
                {!token && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 text-yellow-800 dark:text-yellow-300 text-sm">
                    Aucun jeton de réinitialisation n'a été trouvé. Veuillez utiliser le lien complet envoyé par e-mail.
                  </div>
                )}
                
                <input type="hidden" name="token" value={token as string} />

                <div className="space-y-2">
                  <Label htmlFor="password">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Entrez votre nouveau mot de passe"
                      disabled={isSubmitting || !token}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? (
                        <EyeOffIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <p>Le mot de passe doit contenir :</p>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5">
                      <li className={password.length >= 8 ? "text-green-600 dark:text-green-400" : ""}>
                        Au moins 8 caractères
                      </li>
                      <li className={/[a-z]/.test(password) ? "text-green-600 dark:text-green-400" : ""}>
                        Une lettre minuscule
                      </li>
                      <li className={/[A-Z]/.test(password) ? "text-green-600 dark:text-green-400" : ""}>
                        Une lettre majuscule
                      </li>
                      <li className={/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? "text-green-600 dark:text-green-400" : ""}>
                        Un chiffre ou caractère spécial
                      </li>
                    </ul>
                  </div>
                  
                  {password && (
                    <div className="space-y-1 mt-2">
                      <div className="flex justify-between text-xs">
                        <span>Force: {getPasswordStrengthText()}</span>
                        <span>{passwordStrength}%</span>
                      </div>
                      <Progress value={passwordStrength} className={getPasswordStrengthColor()} />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmez votre nouveau mot de passe"
                    disabled={isSubmitting || !token}
                    required
                  />
                  {password && confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting || !token}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Réinitialisation en cours...
                    </>
                  ) : (
                    "Réinitialiser le mot de passe"
                  )}
                </Button>
              </Form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-4">
            <div className="text-center">
              <Link 
                to="/admin/login"
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                ← Retour à la connexion
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 