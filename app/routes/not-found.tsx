import type { Route } from "./+types/not-found";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Page non trouvée - Pharmacy Val d'Oise" },
    { name: "description", content: "La page que vous cherchez n'existe pas" },
  ];
}

export default function NotFoundPage({}: Route.ComponentProps) {
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
        </div>

        <Card className="border-2 border-gray-200 dark:border-gray-700">
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-red-50 dark:bg-red-900/20">
              <span className="text-3xl font-bold text-red-500 dark:text-red-400">404</span>
            </div>
            <CardTitle className="text-xl">Page non trouvée</CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400">
              La page que vous cherchez n'existe pas ou a été déplacée.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              Vérifiez l'URL ou revenez à la page d'accueil.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild variant="default">
                <Link to="/">
                  Accueil
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/admin/login">
                  Administration
                </Link>
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center border-t pt-4">
            <div className="text-xs text-center text-gray-500 dark:text-gray-400">
              Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le support technique.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 