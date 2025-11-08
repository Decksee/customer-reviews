import type { Route } from "./+types/view";
import { useState, useEffect, useRef } from "react";
import { Link, data, useNavigate } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Download,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Star,
  User,
  Clock
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Chart, registerables } from 'chart.js';
import { feedbackSessionService } from "~/services/feedback-session.service.server";
import { userService } from "~/services/user.service.server";
import { authService } from "~/services/auth.service.server";

// Register Chart.js components
Chart.register(...registerables);

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Détails de l'employé - Pharmacy Val d'Oise" },
    { name: "description", content: "Détails et évaluations de l'employé" },
  ];
}

// Generate chart data from rating history
function generateRatingChartData(ratings: any[]) {
  // Group ratings by month
  const monthlyData: Record<string, {total: number, count: number}> = {};
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  // Initialize empty months (last 6 months)
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    monthlyData[monthKey] = { total: 0, count: 0 };
  }
  
  // Collect ratings data
  ratings.forEach(rating => {
    const date = new Date(rating.date);
    if (date >= sixMonthsAgo) {
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, count: 0 };
      }
      monthlyData[monthKey].total += rating.rating;
      monthlyData[monthKey].count += 1;
    }
  });
  
  // Convert to chart format
  const sortedMonths = Object.keys(monthlyData).sort();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const chartData = {
    labels: sortedMonths.map(key => {
      const [year, month] = key.split('-');
      return monthNames[parseInt(month) - 1];
    }),
    data: sortedMonths.map(key => {
      const { total, count } = monthlyData[key];
      return count > 0 ? parseFloat((total / count).toFixed(1)) : null;
    })
  };
  
  return chartData;
}

export async function loader({ params, request }: Route.LoaderArgs) {
  // Ensure user is authenticated
  await authService.requireUser(request);
  
  const employeeId = params.id;
  
  if (!employeeId) {
    throw new Response("Employee ID is required", { status: 400 });
  }
  
  // Get employee data with all details from the database
  const employee = await userService.getEmployeeDetails(employeeId);
  
  if (!employee) {
    throw new Response("Employee not found", { status: 404 });
  }
  
  // Get employee's ratings
  const { ratings, total } = await feedbackSessionService.getEmployeeRatings(employeeId, 1, 100);
  
  // Get employee stats
  const stats = await feedbackSessionService.getEmployeeStatistics(employeeId);
  
  // Map the employee data to the format needed for the view
  // Handle position field - check both the new position field and fallback to currentPosition
  let positionTitle = 'Employé';
  if (employee.position && typeof employee.position === 'object' && 'title' in employee.position) {
    positionTitle = (employee.position as any).title;
  } else if (employee.position && typeof employee.position === 'string') {
    positionTitle = employee.position;
  } else {
    positionTitle = 'Employé'; // Default fallback
  }
  
  const employeeData = {
    id: employee._id?.toString() || employeeId,
    name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
    role: positionTitle,
    email: employee.email || '',
    phone: employee.phone || 'Non renseigné',
    address: employee.address || 'Non renseignée',
    hireDate: employee.hireDate || new Date().toISOString(),
    photo: employee.avatar || employee.photo || "/images/logo.png",
    status: employee.isActive ? "active" : "inactive",
    rating: stats?.averageRating || 0,
    totalReviews: stats?.totalReviews || 0,
    feedbacks: ratings.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment || '',
      date: r.date,
      clientName: r.clientName || 'Client'
    }))
  };
  
  // Generate chart data
  const ratingChartData = generateRatingChartData(ratings);
  
  return data({ 
    employee: employeeData, 
    ratings, 
    stats,
    chartData: {
      labels: ratingChartData.labels,
      datasets: [
        {
          label: 'Note moyenne',
          data: ratingChartData.data,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          tension: 0.3,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          pointRadius: 4,
          fill: true,
        }
      ]
    }
  });
}

// Format date helper
const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Function to export feedback data as CSV
const exportFeedbackData = (employee: any, ratings: any[]) => {
  const headers = ['Date', 'Note', 'Client', 'Commentaire'];
  const rows = ratings.map(rating => [
    formatDate(rating.date),
    rating.rating,
    rating.clientName,
    `"${(rating.comment || '').replace(/"/g, '""')}"`
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `evaluations_${employee.name.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function EmployeeDetailPage({ loaderData }: Route.ComponentProps) {
  const { employee, chartData, ratings } = loaderData;
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("overview");
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check for mobile viewport on client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkIfMobile = () => setIsMobile(window.innerWidth < 640);
      checkIfMobile();
      window.addEventListener('resize', checkIfMobile);
      return () => window.removeEventListener('resize', checkIfMobile);
    }
  }, []);
  
  // Handle export data button
  const handleExportData = () => {
    exportFeedbackData(employee, ratings);
  };
  
  // Function to create or update chart
  const createOrUpdateChart = () => {
    if (!chartRef.current) return;
    
    // If a chart instance exists, destroy it before creating a new one
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    const ctx = chartRef.current.getContext('2d');
    
    if (ctx) {
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: false,
              min: 3.5,
              max: 5,
              ticks: {
                stepSize: 0.5,
                callback: function(value) {
                  return value.toString();
                }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.05)',
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: 10,
              titleFont: {
                size: isMobile ? 12 : 14
              },
              bodyFont: {
                size: isMobile ? 11 : 13
              },
              callbacks: {
                label: function(context) {
                  return `Note: ${context.parsed.y}/5`;
                }
              }
            }
          }
        }
      });
    }
  };
  
  // Initialize chart when component mounts
  useEffect(() => {
    createOrUpdateChart();
    
    // Cleanup function to destroy chart when component unmounts
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);
  
  // Re-render chart when active tab changes to overview
  useEffect(() => {
    if (activeTab === "overview") {
      // Use setTimeout to ensure the canvas is properly rendered 
      // before attempting to draw the chart
      setTimeout(() => {
        createOrUpdateChart();
      }, 0);
    }
  }, [activeTab]);
  
  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/employees")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Détails de l'employé
          </h1>
        </div>
        
        <Button 
          onClick={handleExportData} 
          disabled={employee.feedbacks.length === 0}
          size={isMobile ? "sm" : "default"}
          className="mt-2 sm:mt-0"
        >
          <Download className="h-4 w-4 mr-2" />
          Exporter les évaluations
        </Button>
      </div>
      
      {/* Employee summary stats at top of page */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center space-x-3 sm:space-x-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 sm:p-3 rounded-full">
              <Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Évaluation moyenne</p>
              <div className="flex items-center">
                <span className="text-lg sm:text-2xl font-bold">{employee.rating.toFixed(1)}</span>
                <span className="text-xs sm:text-sm text-gray-500 ml-1">/ 5</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center space-x-3 sm:space-x-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 sm:p-3 rounded-full">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Nombre d'avis</p>
              <div className="text-lg sm:text-2xl font-bold">{employee.totalReviews}</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Employee Profile Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="text-center p-4 sm:p-6">
            <Avatar className="h-16 w-16 sm:h-24 sm:w-24 mx-auto">
              <img
                src={employee.photo}
                alt={employee.name}
                className="h-full w-full object-cover"
              />
            </Avatar>
            <CardTitle className="mt-3 text-base sm:text-lg">{employee.name}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{employee.role}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-4 sm:pb-6">
            <div className="flex justify-center">
              <Badge
                variant={employee.status === "active" ? "default" : "secondary"}
                className={
                  employee.status === "active"
                    ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100 text-xs"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-100 text-xs"
                }
              >
                {employee.status === "active" ? "Actif" : "Inactif"}
              </Badge>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex items-center">
                <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 text-gray-500" />
                <span className="text-xs sm:text-sm truncate">{employee.email}</span>
              </div>
              <div className="flex items-center">
                <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 text-gray-500" />
                <span className="text-xs sm:text-sm">{employee.phone}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 text-gray-500" />
                <span className="text-xs sm:text-sm truncate">{employee.address}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 text-gray-500" />
                <span className="text-xs sm:text-sm">Recruté le {formatDate(employee.hireDate)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Évaluations et Commentaires</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Performance et retours des clients
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 px-2 sm:p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-2 mb-4 sm:mb-6">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">Vue d'ensemble</TabsTrigger>
                <TabsTrigger value="feedbacks" className="text-xs sm:text-sm">Commentaires</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4 sm:space-y-6">
                {employee.totalReviews > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-sm sm:text-lg font-medium">Évolution des évaluations</h3>
                    
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-4 h-52 sm:h-64 shadow-sm">
                      <canvas ref={chartRef} />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-10 text-sm text-gray-500">
                    Aucune évaluation disponible pour cet employé
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="feedbacks" className="space-y-3 sm:space-y-4">
                <div>
                  <h3 className="text-sm sm:text-lg font-medium mb-3 sm:mb-4">Derniers commentaires</h3>
                  
                  <ScrollArea className="h-[300px] sm:h-[400px] rounded-md border p-2 sm:p-4">
                    <div className="space-y-3 sm:space-y-4">
                      {employee.feedbacks.length > 0 ? (
                        employee.feedbacks.map((feedback) => (
                          <Card key={feedback.id} className="overflow-hidden">
                            <CardContent className="p-0">
                              <div className="p-3 sm:p-4 border-b bg-gray-50 dark:bg-gray-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                                <div className="flex items-center space-x-2">
                                  <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-3 w-3 sm:h-4 sm:w-4 ${
                                          i < feedback.rating
                                            ? "text-yellow-500 fill-yellow-500"
                                            : "text-gray-300"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs sm:text-sm font-medium">{feedback.clientName}</span>
                                </div>
                                <div className="flex items-center ml-5 sm:ml-0">
                                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 mr-1" />
                                  <span className="text-xs text-gray-500">
                                    {formatDate(feedback.date)}
                                  </span>
                                </div>
                              </div>
                              <div className="p-3 sm:p-4">
                                <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{feedback.comment || "Pas de commentaire"}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-6 sm:py-10 text-sm text-gray-500">
                          Aucun commentaire disponible pour cet employé
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
