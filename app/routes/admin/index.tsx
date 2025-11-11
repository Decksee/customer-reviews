import type { Route } from "./+types/index";
import { data } from "react-router";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { BarChart, LineChart } from "@/components/ui/chart";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Star, 
  MessageSquare, 
  Calendar 
} from "lucide-react";

import { feedbackSessionService } from "~/services/feedback-session.service.server";
import { userService } from "~/services/user.service.server";
import { authService } from "~/services/auth.service.server";
import type { IUser } from "~/core/entities/user.entity.server";

// Define types for better type safety
interface EmployeeStats {
  employeeId: string;
  totalReviews: number;
  averageRating: number;
  score: number;
  ratingDistribution: Record<string, number>;
}

interface TopEmployee {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  rating: number;
  avatar: string;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Admin Dashboard - Pharmacy Val d'Oise" },
    { name: "description", content: "Administration dashboard for Pharmacy Val d'Oise feedback system" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  // Ensure user is authenticated
  await authService.requireUser(request);
  
  // Get pharmacy ratings statistics
  const pharmacyRatingsData = await feedbackSessionService.getPharmacyRatings('all', 1, 3);
  const totalReviews = pharmacyRatingsData.total;
  const pharmacyStats = pharmacyRatingsData.stats;
  const averageRating = pharmacyStats.averageRating || 0;
  const comparisonToLastMonth = pharmacyStats.comparisonToLastMonth || 0;
  
  // Get recent reviews
  const recentReviews = pharmacyRatingsData.ratings.map(rating => ({
    id: rating.id,
    pharmacyRating: rating.rating,
    comment: rating.comment || "Pas de commentaire",
    date: rating.date,
    client: { name: rating.client.name }
  }));
  
  // Get employee data using the new methods
  const totalEmployees = await userService.countEmployees();
  
  // Get employee statistics
  const employeeStats = await feedbackSessionService.getEmployeeStatistics() as EmployeeStats[];
  
  // Calculate average employee rating
  const averageEmployeeRating = employeeStats.length > 0
    ? employeeStats.reduce((sum: number, stat: EmployeeStats) => sum + stat.averageRating, 0) / employeeStats.length
    : 0;
  
  // Sort ALL employees by rating first, then take top 5
  const sortedEmployeeStats = employeeStats.sort((a, b) => b.score - a.score);
  
  // Get top employees (now properly sorted)
  const topEmployees: TopEmployee[] = [];
  for (const stat of sortedEmployeeStats.slice(0, 5)) {
    const employee = await userService.findById(stat.employeeId) as IUser;
    if (employee && employee._id) {
      topEmployees.push({
        id: employee._id.toString(),
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        position: (employee.position as any)?.title || employee.currentPosition || 'Employé',
        rating: stat.averageRating,
        avatar: employee.avatar || "/images/employees/employee1.jpg"
      });
    }
  }
  
  // No need to sort again since we already have the top 5 by rating
  
  // Get reviews from last month for comparison
  const reviewsLastMonth = (await feedbackSessionService.getPharmacyRatings('30days')).total;

  // Generate monthly data for chart using the new helper method
  const monthlyRatingData = await feedbackSessionService.getMonthlyRatingData();

  // Generate role performance data using the new helper method
  const rolePerformanceData = await feedbackSessionService.getRolePerformanceData(employeeStats);

  return data({ 
    totalReviews, 
    averageRating, 
    totalEmployees, 
    averageEmployeeRating, 
    reviewsLastMonth, 
    comparisonToLastMonth, 
    recentReviews, 
    topEmployees,
    monthlyRatingData,
    rolePerformanceData
  });
}

export default function AdminDashboard({ loaderData }: Route.ComponentProps) {
  const { 
    totalReviews, 
    averageRating, 
    totalEmployees, 
    averageEmployeeRating, 
    reviewsLastMonth, 
    comparisonToLastMonth, 
    recentReviews, 
    topEmployees,
    monthlyRatingData,
    rolePerformanceData
  } = loaderData;

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

  // Create chart options with SSR-compatible font size
  const getChartOptions = (options = {}) => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            boxWidth: 12,
            font: {
              size: isMobile ? 10 : 12
            }
          }
        }
      },
      ...options
    };
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Vue d'ensemble des retours clients et performances
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Card 1: Total Reviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Evaluations Totales</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:pt-2">
            <div className="text-lg sm:text-2xl font-bold">{totalReviews}</div>
            <p className="text-xs text-muted-foreground">
              +{reviewsLastMonth} ce mois
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Average Note Pharmacie */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Note Moyenne Pharmacie</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:pt-2">
            <div className="flex items-center">
              <div className="text-lg sm:text-2xl font-bold">{averageRating}/5</div>
              <div className="ml-2">
                {comparisonToLastMonth >= 0 ? (
                  <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    +{comparisonToLastMonth}%
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                    <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    {comparisonToLastMonth}%
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Comparé au mois dernier
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Total Employees */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Employés Actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:pt-2">
            <div className="text-lg sm:text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Personnel participant au programme
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Average Employee Rating */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Note Moyenne Employés</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:pt-2">
            <div className="text-lg sm:text-2xl font-bold">{averageEmployeeRating.toFixed(1)}/5</div>
            <p className="text-xs text-muted-foreground">
              Basé sur {totalReviews} évaluations
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-2 sm:gap-4 grid-cols-1 lg:grid-cols-7">
        {/* Charts Section */}
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Évolution des Notes</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Notes mensuelles de la pharmacie et des employés pour l'année en cours
            </CardDescription>
          </CardHeader>
          <CardContent className="h-60 sm:h-80 p-2 sm:p-6">
            <LineChart 
              data={monthlyRatingData}
              options={getChartOptions({
                scales: {
                  y: {
                    beginAtZero: false,
                    min: 3.5,
                    max: 5
                  }
                }
              })}
            />
          </CardContent>
        </Card>

        {/* Top Employees */}
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Top 5 Employés</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Employés les mieux notés par les clients
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {topEmployees.map((employee, index) => (
                <div key={employee.id} className="flex items-center">
                  <Badge variant="outline" className="w-5 h-5 flex items-center justify-center mr-2 sm:mr-3">
                    {index + 1}
                  </Badge>
                  <Avatar className="h-7 w-7 sm:h-9 sm:w-9 mr-2 sm:mr-3">
                    <img
                      src={employee.avatar}
                      alt={`${employee.firstName} ${employee.lastName}`}
                      className="h-full w-full object-cover"
                    />
                  </Avatar>
                  <div className="flex-1 space-y-0.5 sm:space-y-1">
                    <p className="text-xs sm:text-sm font-medium leading-none">{employee.firstName} {employee.lastName}</p>
                    <p className="text-xs text-muted-foreground">{employee.position}</p>
                  </div>
                  <div className="flex items-center">
                    <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-yellow-500" />
                    <span className="text-xs sm:text-sm font-medium">{employee.rating.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-2 sm:gap-4 grid-cols-1 lg:grid-cols-7">
        {/* Recent Reviews */}
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Avis Récents</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Les derniers commentaires clients
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3 sm:space-y-4">
              {recentReviews.map((review) => (
                <div key={review.id} className="border-b pb-3 sm:pb-4 last:border-0 last:pb-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1">
                    <p className="font-medium text-xs sm:text-sm">{review.client.name}</p>
                    <div className="flex items-center mt-1 sm:mt-0">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 sm:h-4 sm:w-4 ${
                              i < review.pharmacyRating
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground ml-2">
                        {new Date(review.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 line-clamp-3 sm:line-clamp-none">
                    "{review.comment}"
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Role Performance */}
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Performance par Fonction</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Notes moyennes selon la fonction occupée
            </CardDescription>
          </CardHeader>
          <CardContent className="h-60 sm:h-80 p-2 sm:p-6">
            <BarChart 
              data={rolePerformanceData}
              options={getChartOptions({
                scales: {
                  y: {
                    beginAtZero: false,
                    min: 3.5,
                    max: 5,
                    title: {
                      display: !isMobile,
                      text: 'Note moyenne (sur 5)'
                    }
                  }
                }
              })}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 