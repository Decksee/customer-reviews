import type { Route } from "./+types/index";
import React from "react";
import { useState } from "react";
import { data, useLoaderData, useNavigate, Form, useActionData, useSubmit } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Download,
  FileText,
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye
} from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

import { reportService } from "~/services/report.service.server";
import { schedulerService } from "~/services/scheduler.service.server";
import { settingsService } from "~/services/settings.service.server";
import { userService } from "~/services/user.service.server";
import { authService } from "~/services/auth.service.server";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Rapports - Pharmacy Val d'Oise" },
    { name: "description", content: "Télécharger et générer des rapports pour Pharmacy Val d'Oise" },
  ];
}

// Define a type for the report object
type ReportType = {
  id: string;
  name: string;
  format: string;
  filePath: string;
  dateRange?: string;
  size?: string;
  employee?: string;
  type?: string;
  date?: string;
};

// Define a type for the action data
type ActionDataType = {
  success: boolean;
  report?: ReportType;
  error?: string;
};

export async function loader({ request }: Route.LoaderArgs) {
  // Ensure user is authenticated and is admin
  const user = await authService.requireUser(request);
  const userId = user?.id || (user as any)?._id?.toString();

  // Get recent reports
  const recentReports = await reportService.getRecentReports(5);

  // Format recent reports for display
  const formattedRecentReports = recentReports.map(report => ({
    id: report._id?.toString() || '',
    name: report.name,
    format: report.format,
    size: report.size,
    date: report.date.toISOString(),
    type: report.type,
    downloaded: report.downloadCount,
    filePath: report.filePath
  }));

  // Get available report types
  const availableReportTypes = reportService.getAvailableReportTypes();

  // Get employees for employee selection
  const employees = await userService.getAllEmployees();
  const formattedEmployees = employees.map(employee => ({
    id: employee._id?.toString() || '',
    name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Sans nom',
    position: (employee.position as any)?.title || employee.currentPosition || 'Employé'
  }));

  // Get application settings
  const settings = await settingsService.getSettings(userId);

  // Get scheduled tasks info
  const scheduledTasks = schedulerService.getTasksInfo();

  // Get last generated report from session or URL params
  const url = new URL(request.url);
  const lastGeneratedReport = url.searchParams.get('lastReport') ?
    JSON.parse(decodeURIComponent(url.searchParams.get('lastReport') || '{}')) : null;

  return data({
    recentReports: formattedRecentReports,
    availableReportTypes,
    employees: formattedEmployees,
    settings: {
      autoGenerateMonthlyReport: settings.autoGenerateMonthlyReport,
      monthlyReportFormat: settings.monthlyReportFormat
    },
    scheduledTasks,
    lastGeneratedReport
  });
}

export async function action({ request }: Route.ActionArgs): Promise<ActionDataType> {
  // Ensure user is authenticated
  const user = await authService.requireUser(request);
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const userId = user?.id || (user as any)?._id?.toString() || '';

  const formData = await request.formData();
  const action = formData.get('action') as string;

  if (action === 'generate-report') {
    const reportType = formData.get('type') as string;
    const reportFormat = formData.get('format') as 'PDF' | 'EXCEL';
    const periodType = formData.get('period') as string;
    let dateRange;

    if (periodType === 'custom') {
      const startDate = formData.get('startDate') as string;
      const endDate = formData.get('endDate') as string;
      dateRange = { start: new Date(startDate), end: new Date(endDate) };
    } else {
      dateRange = reportService.getDateRangeForPeriod(periodType);
    }

    const employeeId = formData.get('employeeId') as string || undefined;
    const employeeName = formData.get('employeeName') as string || undefined;
    const sentimentFilter = formData.get('sentimentFilter') as string || 'all';

    // Generate report
    const report = await reportService.generateReport(
      reportType as any,
      reportFormat,
      userId,
      dateRange,
      employeeId,
      sentimentFilter
    );

    // Format the date range for display if available
    const dateRangePart = dateRange ?
      `${dateRange.start.toLocaleDateString('fr-FR')} - ${dateRange.end.toLocaleDateString('fr-FR')}` : '';

    // Return the full report object
    return {
      success: true,
      report: {
        id: report._id?.toString(),
        name: report.name,
        format: report.format,
        filePath: report.filePath,
        type: report.type,
        date: report.date.toISOString(),
        size: report.size,
        dateRange: dateRangePart,
        employee: employeeName
      }
    };
  }

  if (action === 'update-monthly-report') {
    const isEnabled = formData.get('isEnabled') === 'true';
    const reportFormat = formData.get('reportFormat') as 'PDF' | 'EXCEL' | 'BOTH';

    // Update application settings
    await settingsService.updateSettings({
      autoGenerateMonthlyReport: isEnabled,
      monthlyReportFormat: reportFormat
    }, userId);

    // Update scheduler settings
    await schedulerService.updateSettings();

    return { success: true };
  }

  if (action === 'run-now') {
    const taskId = formData.get('taskId') as string;

    // Run the scheduled task now
    const success = await schedulerService.runTask(taskId);

    return { success };
  }

  return { success: false, error: 'Action inconnue' };
}

export default function ReportsPage() {
  const {
    recentReports,
    availableReportTypes,
    employees,
    settings,
    scheduledTasks,
    lastGeneratedReport: initialLastReport
  } = useLoaderData<typeof loader>();

  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const submit = useSubmit();

  // States for report generation form
  const [selectedReportType, setSelectedReportType] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('PDF');
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('all');

  // States for monthly report configuration
  const [isMonthlyReportEnabled, setIsMonthlyReportEnabled] = useState(settings.autoGenerateMonthlyReport);
  const [monthlyReportFormat, setMonthlyReportFormat] = useState<'PDF' | 'EXCEL' | 'BOTH'>(
    settings.monthlyReportFormat as 'PDF' | 'EXCEL' | 'BOTH'
  );

  // States for modals
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState<ReportType | null>(null);

  // State for last generated report - initialized from loader data if available
  const [lastGeneratedReport, setLastGeneratedReport] = useState<ReportType | null>(initialLastReport);

  // Effect to update lastGeneratedReport when action data changes
  React.useEffect(() => {
    if (actionData?.success && actionData.report) {
      setLastGeneratedReport(actionData.report);

      const reportData = encodeURIComponent(JSON.stringify(actionData.report));
      navigate(`?lastReport=${reportData}`, { replace: true });

      setCurrentReport(actionData.report);

      // Ouvrir la prévisualisation au lieu du dialog de succès
      if (actionData.report.format === 'PDF') {
        setIsPreviewOpen(true);
      } else {
        // Pour Excel, afficher juste le succès
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setCurrentReport(null);
        }, 2000);
      }
    }
  }, [actionData, navigate]);

  // Get selected report details
  const selectedReport = availableReportTypes.find(report => report.id === selectedReportType);
  const requiresEmployee = selectedReport?.requiresEmployeeSelection || false;

  const handleGenerateReport = (event: React.FormEvent<HTMLFormElement>) => {
    if (!selectedReportType) {
      event.preventDefault();
      return;
    }

    // Get employee name if required
    const employeeName = requiresEmployee && selectedEmployeeId ?
      employees.find(e => e.id === selectedEmployeeId)?.name : undefined;

    // Show processing modal
    setIsProcessing(true);

    // Add hidden fields for employee name if applicable
    if (employeeName) {
      const employeeNameInput = document.createElement('input');
      employeeNameInput.type = 'hidden';
      employeeNameInput.name = 'employeeName';
      employeeNameInput.value = employeeName;
      event.currentTarget.appendChild(employeeNameInput);
    }
  };

  const handleDownloadReport = (report: ReportType) => {
    // Create a link with reloadDocument to properly handle the resource route
    const link = document.createElement('a');
    link.href = `/admin/reports/download/${report.id}`;
    link.setAttribute('download', '');

    // Add event listener to refresh page after download starts
    link.addEventListener('click', () => {
      // Refresh the page after a short delay to allow download to start
      setTimeout(() => {
        navigate(0);
      }, 800);
    });

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMonthlyReportToggle = (checked: boolean) => {
    setIsMonthlyReportEnabled(checked);

    // Use React Router's submit function for form submission
    const formData = new FormData();
    formData.append('action', 'update-monthly-report');
    formData.append('isEnabled', checked.toString());
    formData.append('reportFormat', monthlyReportFormat);

    submit(formData, { method: 'post' });
  };

  const handleMonthlyReportFormatChange = (format: string) => {
    setMonthlyReportFormat(format as 'PDF' | 'EXCEL' | 'BOTH');

    // Use React Router's submit function for form submission
    const formData = new FormData();
    formData.append('action', 'update-monthly-report');
    formData.append('isEnabled', isMonthlyReportEnabled.toString());
    formData.append('reportFormat', format);

    submit(formData, { method: 'post' });
  };

  const handleRunNow = () => {
    // Use React Router's submit function for form submission
    const formData = new FormData();
    formData.append('action', 'run-now');
    formData.append('taskId', 'monthlyReport');

    // Show processing modal
    setIsProcessing(true);

    submit(formData, { method: 'post' });
  };

  // Hide processing dialog when action data is received
  React.useEffect(() => {
    if (actionData) {
      setIsProcessing(false);
    }
  }, [actionData]);

  // Format date for display
  const formatDate = (dateString?: Date | string) => {
    if (!dateString) return 'Non planifié';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to get icon for report type
  const getReportTypeIcon = (type: string) => {
    return <FileText className="h-4 w-4 text-blue-500" />;
  };

  return (
    <div className="space-y-6 px-2 sm:px-4 pb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Rapports</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Générer et télécharger les rapports d'activité et de satisfaction
        </p>
      </div>

      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-base sm:text-lg">Générer un nouveau rapport</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Sélectionnez le type de rapport et les options souhaitées
          </CardDescription>
        </CardHeader>

        {/* Last Generated Report Section - Moved to top with improved visibility */}
        {lastGeneratedReport && (
          <div className="mx-4 sm:mx-6 mb-5">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 sm:p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-blue-900">Dernier rapport généré</h3>
                  <div className="mt-1 text-xs text-blue-800">
                    <p className="font-medium">{lastGeneratedReport.name}</p>
                    <p className="mt-1">
                      <span className="inline-block mr-2 px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium uppercase text-[10px]">
                        {lastGeneratedReport.format}
                      </span>
                      {lastGeneratedReport.dateRange && (
                        <span className="text-blue-700">
                          Période: {lastGeneratedReport.dateRange}
                        </span>
                      )}
                    </p>
                    {(lastGeneratedReport.size || lastGeneratedReport.employee) && (
                      <p className="mt-1 text-blue-700">
                        {lastGeneratedReport.size && `Taille: ${lastGeneratedReport.size}`}
                        {lastGeneratedReport.size && lastGeneratedReport.employee && " • "}
                        {lastGeneratedReport.employee && `Employé: ${lastGeneratedReport.employee}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="ml-2 flex-shrink-0">
                  <Button
                    onClick={() => handleDownloadReport(lastGeneratedReport)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Télécharger
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-xs text-blue-600 border-t border-blue-200 pt-2">
                Pour consulter d'autres rapports, voir la liste des rapports récents ci-dessous
              </div>
            </div>
          </div>
        )}

        <CardContent className="px-4 sm:px-6">
          <Form method="post" onSubmit={handleGenerateReport}>
            <div className="space-y-4">
              <input type="hidden" name="action" value="generate-report" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Type de rapport</label>
                  <Select
                    value={selectedReportType}
                    onValueChange={value => {
                      setSelectedReportType(value);
                      setSelectedEmployeeId(''); // Reset employee selection when type changes
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir un type de rapport" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableReportTypes.map(report => (
                        <SelectItem key={report.id} value={report.id}>
                          {report.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="type" value={selectedReportType} />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Format d'export</label>
                  <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PDF">PDF</SelectItem>
                      <SelectItem value="EXCEL">EXCEL</SelectItem>
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="format" value={selectedFormat} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Période</label>
                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Période" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current-month">Mois en cours</SelectItem>
                      <SelectItem value="last-month">Mois précédent</SelectItem>
                      <SelectItem value="current-quarter">Trimestre en cours</SelectItem>
                      <SelectItem value="last-quarter">Trimestre précédent</SelectItem>
                      <SelectItem value="current-year">Année en cours</SelectItem>
                      <SelectItem value="custom">Période personnalisée</SelectItem>
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="period" value={selectedPeriod} />
                </div>

                {(selectedReportType === 'pharmacy-reviews' || selectedReportType === 'employee-reviews' || selectedReportType === 'specific-employee-reviews') && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Type d'avis</label>
                    <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filtrer les avis" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les avis</SelectItem>
                        <SelectItem value="positive">Avis positifs (≥ 3★)</SelectItem>
                        <SelectItem value="negative">Avis négatifs (&lt; 3★)</SelectItem>
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="sentimentFilter" value={sentimentFilter} />
                  </div>
                )}

                {requiresEmployee && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Employé</label>
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner un employé" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map(employee => (
                          <SelectItem key={employee.id} value={employee.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{employee.name}</span>
                              <span className="text-xs text-muted-foreground">{employee.position}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="employeeId" value={selectedEmployeeId} />
                  </div>
                )}
              </div>

              {selectedPeriod === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Date de début</label>
                    <Input
                      type="date"
                      name="startDate"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Date de fin</label>
                    <Input
                      type="date"
                      name="endDate"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-4">
                <Button
                  type="submit"
                  disabled={
                    !selectedReportType ||
                    (requiresEmployee && !selectedEmployeeId) ||
                    (selectedPeriod === 'custom' && (!customStartDate || !customEndDate))
                  }
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Générer le rapport
                </Button>
              </div>
            </div>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-base sm:text-lg">Rapports récents</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Les derniers rapports générés
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px] sm:w-[50px]">Type</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead className="text-center">Format</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Taille</TableHead>
                  <TableHead className="hidden sm:table-cell text-center">Date</TableHead>
                  <TableHead className="w-[70px] sm:w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentReports.length > 0 ? (
                  recentReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        {getReportTypeIcon(report.type)}
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        <div className="flex flex-col">
                          <span>{report.name}</span>
                          <span className="text-xs text-muted-foreground sm:hidden">
                            {report.format} • {report.size}
                          </span>
                          <span className="text-xs text-muted-foreground sm:hidden">
                            {new Date(report.date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="uppercase text-xs">
                          {report.format}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-center text-xs sm:text-sm">{report.size}</TableCell>
                      <TableCell className="hidden sm:table-cell text-center text-xs sm:text-sm">
                        {new Date(report.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadReport(report)}
                        >
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Télécharger</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-xs sm:text-sm text-muted-foreground">
                      Aucun rapport généré
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-4 py-3 sm:px-6 sm:py-4">
          <CardTitle className="text-base sm:text-lg">Rapport mensuel automatique</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Configuration de la génération automatique du rapport mensuel
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Calendar className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium">Rapport mensuel automatique</h3>
                  <p className="text-xs text-muted-foreground">
                    Généré le premier jour de chaque mois
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Select
                  value={monthlyReportFormat}
                  onValueChange={handleMonthlyReportFormatChange}
                >
                  <SelectTrigger id="report-format" className="w-[120px]">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="EXCEL">EXCEL</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    {isMonthlyReportEnabled ? 'Activé' : 'Désactivé'}
                  </span>
                  <Switch
                    checked={isMonthlyReportEnabled}
                    onCheckedChange={handleMonthlyReportToggle}
                  />
                </div>
              </div>
            </div>

            {scheduledTasks.monthlyReport && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Dernière génération: </span>
                  {scheduledTasks.monthlyReport.lastRun ?
                    formatDate(scheduledTasks.monthlyReport.lastRun) :
                    "Jamais exécuté"}
                </div>
                <div>
                  <span className="font-medium">Prochaine génération: </span>
                  {scheduledTasks.monthlyReport.nextRun ?
                    formatDate(scheduledTasks.monthlyReport.nextRun) :
                    "Non planifié"}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Processing Dialog */}
      <Dialog open={isProcessing} onOpenChange={setIsProcessing}>
        <DialogContent className="w-[90vw] max-w-md mx-auto sm:max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Génération du rapport en cours</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Veuillez patienter pendant que nous générons votre rapport...
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center py-6 sm:py-10">
            <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-blue-500" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              Prévisualisation : {currentReport?.name}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {currentReport?.dateRange && `Période: ${currentReport.dateRange}`}
              {currentReport?.employee && ` • Employé: ${currentReport.employee}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden rounded-md border bg-gray-50">
            <iframe
              src={`/admin/reports/preview/${currentReport?.id}`}
              className="w-full h-full"
              title="Prévisualisation du rapport"
            />
          </div>
          <DialogFooter className="flex sm:flex-row flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsPreviewOpen(false);
                setCurrentReport(null);
              }}
              className="w-full sm:w-auto"
            >
              Fermer
            </Button>
            <Button
              onClick={() => {
                if (currentReport) {
                  handleDownloadReport(currentReport);
                  setIsPreviewOpen(false);
                }
              }}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={isSuccess} onOpenChange={setIsSuccess}>
        <DialogContent className="w-[90vw] max-w-md mx-auto sm:max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Rapport généré avec succès</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Votre rapport a été généré et est maintenant disponible au téléchargement.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4 sm:py-6 space-y-3 sm:space-y-4">
            <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 text-green-500" />
            <div className="text-center">
              <p className="font-medium text-sm sm:text-base">{currentReport?.name}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Format: {currentReport?.format}
                {currentReport?.employee && ` • Employé: ${currentReport.employee}`}
                {currentReport?.dateRange && ` • Période: ${currentReport.dateRange}`}
              </p>
            </div>
          </div>
          <DialogFooter className="flex sm:flex-row flex-col space-y-2 sm:space-y-0 sm:space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsSuccess(false);
                setCurrentReport(null);
              }}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Fermer
            </Button>
            {currentReport?.filePath && (
              <Button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = `/admin/reports/download/${currentReport.id}`;
                  link.setAttribute('download', '');

                  link.addEventListener('click', () => {
                    setIsSuccess(false);
                    setTimeout(() => {
                      navigate(0);
                    }, 800);
                  });

                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 