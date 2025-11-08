import type { Route } from "./+types/index";
import { useState, useEffect } from "react";
import { data, Form, useSubmit, useActionData } from "react-router";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Save, 
  Settings, 
  Moon,
  Sun,
  Layout, 
  AlertCircle,
  MessageSquare,
  UserCircle,
  Lightbulb,
  ThumbsUp,
  CheckCircle,
  FileType,
  Mail
} from "lucide-react";

import { settingsService } from "~/services/settings.service.server";
import { authService } from "~/services/auth.service.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Settings - Pharmacy Val d'Oise" },
    { name: "description", content: "Application settings for Pharmacy Val d'Oise feedback system" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  // Get the authenticated user
  const user = await authService.requireUser(request);
  
  console.log("user", user);  
  
  if (!user || !user.id) {
    throw new Error("Unauthorized access");
  }
  
  // Get settings from the database
  const settings = await settingsService.getSettings(user.id);
  console.log("Raw settings from DB:", settings);
  
  // Map settings to view model for the UI
  const viewModel = settingsService.mapToViewModel(settings);
  console.log("Mapped view model:", viewModel);
  
  // Ensure feedback pages are properly set
  if (!viewModel.feedbackPages) {
    viewModel.feedbackPages = {
      feedbackCollectionEnabled: true,
      clientInfoEnabled: true,
      suggestionEnabled: true,
      thankYouEnabled: true
    };
  }
  
  return data({ settings: viewModel });
}

// Define action type
type ActionData = { success: boolean; message: string } | undefined;

export async function action({ request }: Route.ActionArgs) {
  try {
    // Get the authenticated user
    const user = await authService.requireUser(request);
    
    console.log("user", user);  
    
    if (!user || !user.id) {
      throw new Error("Unauthorized access");
    }
    
    // Get form data
    const formData = await request.formData();
    
    // Log form data to debug
    console.log("Form data entries:", Array.from(formData.entries()));
    
    const settingsJson = formData.get("settings");
    console.log("Settings JSON:", settingsJson);
    
    if (!settingsJson || typeof settingsJson !== 'string') {
      throw new Error("No settings data provided");
    }
    
    // Parse the JSON string
    const settingsData = JSON.parse(settingsJson);
    console.log("Parsed settings:", settingsData);
    
    // Verify feedbackPages is present
    if (!settingsData.feedbackPages) {
      console.error("Missing feedbackPages in settings data");
      throw new Error("Missing required settings data");
    }
    
    // Make sure all fields have explicit boolean values
    if (settingsData.feedbackPages) {
      // settingsData.feedbackPages.feedbackCollectionEnabled = 
      //   settingsData.feedbackPages.feedbackCollectionEnabled === true;
      settingsData.feedbackPages.clientInfoEnabled = 
        settingsData.feedbackPages.clientInfoEnabled === true;
      settingsData.feedbackPages.suggestionEnabled = 
        settingsData.feedbackPages.suggestionEnabled === true;
      settingsData.feedbackPages.thankYouEnabled = 
        settingsData.feedbackPages.thankYouEnabled === true;
    }
    
    // Log the prepared settings
    console.log("Prepared settings data:", settingsData);
    
    // Map to entity model and save to database
    const settingsToSave = settingsService.mapFromViewModel(settingsData);
    console.log("Settings to save:", settingsToSave);
    
    // Save settings to database
    await settingsService.updateSettings(settingsToSave, user.id);
    
    // Get the updated settings to verify they were saved correctly
    const updatedSettings = await settingsService.getSettings(user.id);
    console.log("Updated settings in DB:", updatedSettings);
    
    return data<ActionData>({ success: true, message: "Settings saved successfully" });
  } catch (error) {
    console.error("Error saving settings:", error);
    return data<ActionData>({ success: false, message: error instanceof Error ? error.message : "Failed to save settings" });
  }
}

export default function SettingsPage({ loaderData }: Route.ComponentProps) {
  const { settings } = loaderData;
  const { theme, setTheme } = useTheme();
  
  // Ensure we have proper default values for all settings
  const [displaySettings, setDisplaySettings] = useState({
    darkModeEnabled: settings.display?.darkModeEnabled || false
  });
  
  const [feedbackPageSettings, setFeedbackPageSettings] = useState({
    // feedbackCollectionEnabled: settings.feedbackPages?.feedbackCollectionEnabled !== undefined 
    //   ? settings.feedbackPages.feedbackCollectionEnabled 
    //   : true,
    clientInfoEnabled: settings.feedbackPages?.clientInfoEnabled !== undefined 
      ? settings.feedbackPages.clientInfoEnabled 
      : true,
    suggestionEnabled: settings.feedbackPages?.suggestionEnabled !== undefined 
      ? settings.feedbackPages.suggestionEnabled 
      : true,
    thankYouEnabled: settings.feedbackPages?.thankYouEnabled !== undefined 
      ? settings.feedbackPages.thankYouEnabled 
      : true
  });
  
  const [reportSettings, setReportSettings] = useState({
    autoGenerateMonthlyReport: settings.reports?.autoGenerateMonthlyReport || false,
    emailNotifications: settings.reports?.emailNotifications || false,
    monthlyReportFormat: settings.reports?.monthlyReportFormat || 'PDF',
  });

  // Log initial values for debugging
  useEffect(() => {
    console.log("Initial display settings:", displaySettings);
    console.log("Initial feedback page settings:", feedbackPageSettings);
    console.log("Initial report settings:", reportSettings);
  }, []);
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const submit = useSubmit();
  const actionData = useActionData<ActionData>();

  // Sync the local state with the current theme when component mounts
  useEffect(() => {
    setDisplaySettings((prevSettings: typeof displaySettings) => ({
      ...prevSettings,
      darkModeEnabled: theme === "dark"
    }));
  }, [theme]);
  
  // Show success modal when action is successful
  useEffect(() => {
    if (actionData?.success) {
      setShowSuccessModal(true);
      setIsSubmitting(false);
      
      // Automatically close the modal after 3 seconds
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    } else if (actionData && !actionData.success) {
      setIsSubmitting(false);
    }
  }, [actionData]);

  const handleDarkModeToggle = (checked: boolean) => {
    // Update local state
    setDisplaySettings({...displaySettings, darkModeEnabled: checked});
    
    // Update the theme using next-themes
    setTheme(checked ? "dark" : "light");
  };

  const handleSaveSettings = () => {
    setIsSubmitting(true);
    
    // Log current values before saving
    console.log("Saving display settings:", displaySettings);
    console.log("Saving feedback page settings:", feedbackPageSettings);
    console.log("Saving report settings:", reportSettings);
    
    // Create clean objects without circular references
    const cleanDisplaySettings = {
      darkModeEnabled: displaySettings.darkModeEnabled
    };
    
    const cleanFeedbackPageSettings = {
      // feedbackCollectionEnabled: feedbackPageSettings.feedbackCollectionEnabled,
      clientInfoEnabled: feedbackPageSettings.clientInfoEnabled,
      suggestionEnabled: feedbackPageSettings.suggestionEnabled,
      thankYouEnabled: feedbackPageSettings.thankYouEnabled
    };
    
    const cleanReportSettings = {
      autoGenerateMonthlyReport: reportSettings.autoGenerateMonthlyReport,
      emailNotifications: reportSettings.emailNotifications,
      monthlyReportFormat: reportSettings.monthlyReportFormat,
    };
    
    // Prepare settings data for submission using clean objects
    const settingsToSave = {
      display: cleanDisplaySettings,
      feedbackPages: cleanFeedbackPageSettings,
      reports: cleanReportSettings
    };
    
    // Log stringified data
    console.log("Settings to save:", JSON.stringify(settingsToSave));
    
    // Submit the form programmatically
    const formData = new FormData();
    formData.append("settings", JSON.stringify(settingsToSave));
    
    submit(formData, { method: "post", replace: true });
  };

  return (
    <div className="space-y-6 px-2 sm:px-4 pb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Configurer l'application de feedback client
        </p>
      </div>

      <Tabs defaultValue="display" className="space-y-4">
        <div className="overflow-x-auto pb-2">
          <TabsList className="w-full sm:w-auto flex">
            <TabsTrigger value="display" className="flex items-center text-xs sm:text-sm py-2 px-3 flex-1">
              <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Affichage
            </TabsTrigger>
            <TabsTrigger value="feedbackPages" className="flex items-center text-xs sm:text-sm py-2 px-3 flex-1">
              <Layout className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Pages de feedback
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center text-xs sm:text-sm py-2 px-3 flex-1">
              <FileType className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Rapports
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* Display Settings Tab */}
        <TabsContent value="display">
          <Card>
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
              <CardTitle className="text-base sm:text-lg">Paramètres d'affichage</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Personnaliser l'apparence de l'application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
                <div className="flex items-center space-x-2">
                  {displaySettings.darkModeEnabled ? (
                    <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
                  ) : (
                    <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
                  )}
                  <div className="space-y-0.5">
                    <Label>Mode {displaySettings.darkModeEnabled ? "sombre" : "clair"}</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {displaySettings.darkModeEnabled 
                        ? "Utiliser un thème sombre pour réduire la fatigue oculaire" 
                        : "Utiliser un thème clair et lumineux"}
                    </p>
                  </div>
                </div>
                <Switch 
                  className="mt-2 sm:mt-0"
                  checked={displaySettings.darkModeEnabled}
                  onCheckedChange={handleDarkModeToggle}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Feedback Pages Settings Tab */}
        <TabsContent value="feedbackPages">
          <Card>
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
              <CardTitle className="text-base sm:text-lg">Visibilité des pages de feedback</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Activer ou désactiver l'affichage des différentes étapes du processus de feedback
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              {/* Feedback Pages Settings - Each setting with more touch-friendly layout */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <Label className="font-bold">Page de collecte des avis <span className="bg-primary text-white text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">Ne peut pas être désactivée</span></Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Permet aux clients de donner leurs avis et notations
                    </p>
                  </div>
                </div>
                <Switch 
                  className="mt-2 sm:mt-0"
                  checked={true}
                  disabled={true}
                  title="Cette option ne peut pas être désactivée"
                />
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
                <div className="flex items-center space-x-2">
                  <UserCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <Label>Page d'information client</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Collecte des informations personnelles du client (optionnel)
                    </p>
                  </div>
                </div>
                <Switch 
                  className="mt-2 sm:mt-0"
                  checked={feedbackPageSettings.clientInfoEnabled}
                  onCheckedChange={(checked) => {
                    console.log("Toggling clientInfoEnabled to", checked);
                    setFeedbackPageSettings({
                      ...feedbackPageSettings, 
                      clientInfoEnabled: checked
                    });
                  }}
                />
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <Label>Page de suggestions</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Permet aux clients de proposer des améliorations
                    </p>
                  </div>
                </div>
                <Switch 
                  className="mt-2 sm:mt-0"
                  checked={feedbackPageSettings.suggestionEnabled}
                  onCheckedChange={(checked) => {
                    console.log("Toggling suggestionEnabled to", checked);
                    setFeedbackPageSettings({
                      ...feedbackPageSettings, 
                      suggestionEnabled: checked
                    });
                  }}
                />
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
                <div className="flex items-center space-x-2">
                  <ThumbsUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <Label>Page de remerciement</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Affiche un message de remerciement après soumission
                    </p>
                  </div>
                </div>
                <Switch 
                  className="mt-2 sm:mt-0"
                  checked={feedbackPageSettings.thankYouEnabled}
                  onCheckedChange={(checked) => {
                    console.log("Toggling thankYouEnabled to", checked);
                    setFeedbackPageSettings({
                      ...feedbackPageSettings, 
                      thankYouEnabled: checked
                    });
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Reports Settings Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
              <CardTitle className="text-base sm:text-lg">Paramètres des rapports</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Configurer la génération et l'envoi des rapports mensuels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
                <div className="flex items-center space-x-2">
                  <FileType className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <Label>Génération automatique des rapports</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Générer automatiquement un rapport mensuel des avis clients
                    </p>
                  </div>
                </div>
                <Switch 
                  className="mt-2 sm:mt-0"
                  checked={reportSettings.autoGenerateMonthlyReport}
                  onCheckedChange={(checked) => setReportSettings({
                    ...reportSettings, 
                    autoGenerateMonthlyReport: checked
                  })}
                />
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <Label>Notifications par email</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Recevoir les rapports mensuels par email
                    </p>
                  </div>
                </div>
                <Switch 
                  className="mt-2 sm:mt-0"
                  checked={reportSettings.emailNotifications}
                  onCheckedChange={(checked) => setReportSettings({
                    ...reportSettings, 
                    emailNotifications: checked
                  })}
                />
              </div>
              
              <Separator className="my-2" />
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between">
                <div className="flex items-center space-x-2">
                  <FileType className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
                  <div className="space-y-0.5">
                    <Label>Format des rapports</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Choisir le format des rapports mensuels
                    </p>
                  </div>
                </div>
                <Select 
                  value={reportSettings.monthlyReportFormat}
                  onValueChange={(value) => setReportSettings({
                    ...reportSettings, 
                    monthlyReportFormat: value as 'PDF' | 'EXCEL' | 'BOTH'
                  })}
                >
                  <SelectTrigger className="w-full sm:w-[180px] mt-2 sm:mt-0">
                    <SelectValue placeholder="Format des rapports" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="EXCEL">Excel</SelectItem>
                    <SelectItem value="BOTH">PDF et Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-end mt-6">
        <Button 
          onClick={handleSaveSettings}
          disabled={isSubmitting}
          className="w-full sm:w-auto sm:min-w-[150px]"
        >
          {isSubmitting ? (
            <>Enregistrement...</>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Enregistrer
            </>
          )}
        </Button>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="w-[90vw] max-w-md mx-auto sm:max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Paramètres enregistrés</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Vos paramètres ont été enregistrés avec succès.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center py-4 sm:py-6">
            <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-2 sm:p-3">
                <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Les modifications ont été appliquées à votre application.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setShowSuccessModal(false)}
              className="w-full sm:w-auto"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 