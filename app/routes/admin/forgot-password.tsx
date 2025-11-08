import type { Route } from "./+types/forgot-password";
import { useState, useEffect } from "react";
import { data, Form, Link, useActionData, useNavigation } from "react-router";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, AlertCircle, MailIcon } from "lucide-react";
import config from "@/config/config.server";
import { tokenService } from "~/services/token.service.server";
import { userService } from "~/services/user.service.server";
import emailUtils from "~/core/utils/email.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mot de passe oublié - Pharmacy Val d'Oise" },
    { name: "description", content: "Demandez une réinitialisation de mot de passe pour Pharmacy Val d'Oise" },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const email = formData.get("email") as string

  // Validate form data
  if (!email) {
    return data({ error: "Email requis", success: false })
  }

  try {
    // Find user by email
    const user = await userService.findByEmail(email)
    
    // Even if user doesn't exist, we don't want to reveal that information
    if (user) {
      // Generate reset token
      const resetToken = await tokenService.generateResetToken(
        user,
        config.auth.tokenTypes.RESET_PASSWORD
      )

      // Generate reset URL
      const resetUrl = `${config.domainName}/admin/reset-password?token=${resetToken.token}`

      // Send email
      await emailUtils.notifyEmail(
        email,
        "Réinitialisation de votre mot de passe",
        "Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.",
        [{ text: "Réinitialiser mon mot de passe", url: resetUrl }],
        user.firstName || "" // Use firstName if available
      )
    }

    // Always return success to prevent email enumeration
    return data({ success: true, error: null })
  } catch (error) {
    console.error("Password reset request error:", error)
    return data({ error: "Une erreur est survenue lors de l'envoi de l'email de réinitialisation", success: false })
  }
}

export default function ForgotPassword({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [clientValidationError, setClientValidationError] = useState<string | null>(null);
  
  const isSubmitting = navigation.state === "submitting";

  // Clear validation errors when user types
  useEffect(() => {
    if (clientValidationError && email) {
      setClientValidationError(null);
    }
  }, [email, clientValidationError]);

  const validateForm = (e: React.FormEvent) => {
    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email.trim()) {
      e.preventDefault();
      setClientValidationError("Veuillez entrer une adresse e-mail");
      return false;
    }
    
    if (!emailRegex.test(email)) {
      e.preventDefault();
      setClientValidationError("Veuillez entrer une adresse e-mail valide");
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
            <CardTitle>Mot de passe oublié</CardTitle>
            <CardDescription>
              Entrez votre adresse e-mail pour recevoir un lien de réinitialisation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {actionData?.success ? (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4 flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-green-800 dark:text-green-300 text-sm">
                    <p className="font-medium">Lien de réinitialisation envoyé!</p>
                    <p className="mt-1">Nous avons envoyé un e-mail à <strong>{email}</strong> avec les instructions pour réinitialiser votre mot de passe.</p>
                    <p className="mt-2 text-xs">Si vous ne recevez pas l'e-mail dans quelques minutes, vérifiez votre dossier de spam ou essayez à nouveau.</p>
                  </div>
                </div>
                <div className="text-center">
                  <Button asChild variant="outline">
                    <Link to="/admin/login">Retour à la connexion</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <Form method="post" className="space-y-4" onSubmit={validateForm}>
                {(actionData?.error || clientValidationError) && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-red-800 dark:text-red-300 text-sm">
                      {actionData?.error || clientValidationError}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse e-mail</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Entrez votre adresse e-mail"
                      disabled={isSubmitting}
                      required
                      className="pl-10"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MailIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    "Envoyer le lien de réinitialisation"
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