import type { Route } from "./+types/index";
import { useState, useEffect } from "react";
import { data, useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, BarChart } from "@/components/ui/chart";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Star, 
  MessageSquare, 
  Calendar, 
  UserCircle, 
  Trophy,
  Clock,
  CheckCircle2,
  Medal,
  ChevronDown
} from "lucide-react";

import { feedbackSessionService } from "~/services/feedback-session.service.server";
import { userService } from "~/services/user.service.server";
import { authService } from "~/services/auth.service.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Statistics - Pharmacy Val d'Oise" },
    { name: "description", content: "Statistical analytics for Pharmacy Val d'Oise" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  // Ensure user is authenticated
  await authService.requireUser(request);
  
  // Get the period from URL query
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || 'year';
  
  // Map URL period values to service period parameters
  const periodMap: Record<string, string> = {
    'current-month': 'month',
    'current-year': 'year', 
    'last-year': 'last-year',
    'all-time': 'all'
  };
  
  // Get the actual period value for the services
  const servicePeriod = periodMap[period] || 'year';
  
  // Get satisfaction trends data
  const monthlySatisfactionData = await feedbackSessionService.getSatisfactionTrends(servicePeriod);
  
  // Get monthly visitors data
  const monthlyVisitorsData = await feedbackSessionService.getMonthlyVisitors(servicePeriod);
  
  // Get star rating distribution
  const starRatingDistributionData = await feedbackSessionService.getStarRatingDistribution(servicePeriod);
  
  // Get feedback by time of day
  const feedbackByTimeData = await feedbackSessionService.getFeedbackByTime(servicePeriod);
  
  // Get role distribution and satisfaction by role
  const { roleDistributionData, satisfactionByRoleData } = await feedbackSessionService.getRoleDistribution(servicePeriod);
  
  // Get monthly employee ratings data
  const employeeRatingsData = await feedbackSessionService.getMonthlyRatingData();
  
  // Get top employees
  const topEmployees = await userService.getTopRatedEmployees(5);
  
  // Get recent employee reviews
  const recentEmployeeReviews = await userService.getRecentEmployeeReviews(4);
  
  // Get employee review distribution
  const employeeReviewsDistribution = await userService.getEmployeeReviewDistribution();
  
  // Get statistics summary
  const { statsSummary, clientCompletionData } = await feedbackSessionService.getStatisticsSummary(servicePeriod);

  return data({ 
    monthlySatisfactionData, 
    monthlyVisitorsData,
    starRatingDistributionData,
    feedbackByTimeData,
    roleDistributionData,
    satisfactionByRoleData,
    employeeRatingsData,
    topEmployees,
    recentEmployeeReviews,
    employeeReviewsDistribution,
    clientCompletionData,
    statsSummary,
    currentPeriod: period
  });
}

export default function StatisticsPage({ loaderData }: Route.ComponentProps) {
  const { 
    monthlySatisfactionData, 
    monthlyVisitorsData,
    starRatingDistributionData,
    feedbackByTimeData,
    roleDistributionData,
    satisfactionByRoleData,
    employeeRatingsData,
    topEmployees,
    recentEmployeeReviews,
    employeeReviewsDistribution,
    clientCompletionData,
    statsSummary,
    currentPeriod
  } = loaderData;
  
  const navigate = useNavigate();
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
  
  // Handle period filter change
  const handlePeriodFilterChange = (value: string) => {
    navigate(`/admin/statistics?period=${value}`);
  };

  // Helper function to render star rating
  const renderStars = (rating: number) => {
    return Array(5).fill(0).map((_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 sm:h-4 sm:w-4 ${i < Math.floor(rating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
      />
    ));
  };

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Statistiques</h1>
          <p className="text-sm text-muted-foreground">
            Analyse et tendances des données de satisfaction client
          </p>
        </div>
        
        <Select 
          value={currentPeriod} 
          onValueChange={handlePeriodFilterChange}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current-month">Mois en cours</SelectItem>
            <SelectItem value="current-year">Année en cours</SelectItem>
            <SelectItem value="last-year">Année précédente</SelectItem>
            <SelectItem value="all-time">Tout le temps</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Summary Cards - Row 1 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Satisfaction client</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:pt-2">
            <div className="flex items-center">
              <div className="text-lg sm:text-2xl font-bold">{statsSummary.satisfactionRate}%</div>
              <div className="ml-2">
                {statsSummary.satisfactionChange >= 0 ? (
                  <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    +{statsSummary.satisfactionChange}%
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                    <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    {statsSummary.satisfactionChange}%
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Comparé à la période précédente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total des avis</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:pt-2">
            <div className="flex items-center">
              <div className="text-lg sm:text-2xl font-bold">{statsSummary.totalFeedbacks}</div>
              <div className="ml-2">
                {statsSummary.feedbackChange >= 0 ? (
                  <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    +{statsSummary.feedbackChange}%
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                    <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    {statsSummary.feedbackChange}%
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avis collectés cette année
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Visiteurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:pt-2">
            <div className="flex items-center">
              <div className="text-lg sm:text-2xl font-bold">{statsSummary.totalVisitors}</div>
              <div className="ml-2">
                {statsSummary.visitorsChange >= 0 ? (
                  <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    +{statsSummary.visitorsChange}%
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                    <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    {statsSummary.visitorsChange}%
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Visiteurs uniques cette année
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Taux de participation</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:pt-2">
            <div className="flex items-center">
              <div className="text-lg sm:text-2xl font-bold">{statsSummary.feedbackPercentage}%</div>
              <div className="ml-2">
                {statsSummary.feedbackPercentageChange >= 0 ? (
                  <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    +{statsSummary.feedbackPercentageChange}%
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                    <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    {statsSummary.feedbackPercentageChange}%
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pourcentage de clients donnant un avis
            </p>
          </CardContent>
        </Card>

        {/* Employee Metrics Summary - Row 2 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Moyenne des notes employés</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:pt-2">
            <div className="flex items-center">
              <div className="text-lg sm:text-2xl font-bold">{statsSummary.employeeAvgRating}</div>
              <div className="ml-2">
                {statsSummary.employeeRatingChange >= 0 ? (
                  <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    +{statsSummary.employeeRatingChange}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                    <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    {statsSummary.employeeRatingChange}
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Note moyenne sur 5 pour tous les employés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Nombre d'avis employés</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:pt-2">
            <div className="flex items-center">
              <div className="text-lg sm:text-2xl font-bold">{statsSummary.employeeReviewCount}</div>
              <div className="ml-2">
                {statsSummary.employeeReviewChange >= 0 ? (
                  <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    +{statsSummary.employeeReviewChange}%
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                    <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    {statsSummary.employeeReviewChange}%
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avis sur les employés cette année
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Taux de satisfaction employés</CardTitle>
            <UserCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:pt-2">
            <div className="flex items-center">
              <div className="text-lg sm:text-2xl font-bold">{employeeReviewsDistribution.withReviews}/{employeeReviewsDistribution.totalEmployees}</div>
            </div>
            <div className="flex items-center mt-1">
              <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                <div 
                  className="bg-purple-600 h-2.5 rounded-full" 
                  style={{ width: `${(employeeReviewsDistribution.withReviews / employeeReviewsDistribution.totalEmployees) * 100}%` }}
                ></div>
              </div>
              <span className="text-xs text-muted-foreground ml-2">
                {Math.round((employeeReviewsDistribution.withReviews / employeeReviewsDistribution.totalEmployees) * 100)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Employés ayant reçu au moins un avis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Taux de complétion clients</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:pt-2">
            <div className="flex items-center">
              <div className="text-lg sm:text-2xl font-bold">{clientCompletionData.completionRate}%</div>
              <div className="ml-2">
                {clientCompletionData.completionRateChange >= 0 ? (
                  <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    +{clientCompletionData.completionRateChange}%
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                    <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    {clientCompletionData.completionRateChange}%
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Questionnaires complétés ({clientCompletionData.completedFeedbacks}/{clientCompletionData.startedFeedbacks})
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="satisfaction" className="space-y-4">
        <div className="relative overflow-auto pb-2">
          <TabsList className="flex w-max no-scrollbar">
            <TabsTrigger value="satisfaction" className="text-xs sm:text-sm flex-shrink-0">Satisfaction</TabsTrigger>
            <TabsTrigger value="visitors" className="text-xs sm:text-sm flex-shrink-0">Visites</TabsTrigger>
            <TabsTrigger value="ratings" className="text-xs sm:text-sm flex-shrink-0">Notes</TabsTrigger>
            <TabsTrigger value="timing" className="text-xs sm:text-sm flex-shrink-0">Horaires</TabsTrigger>
            <TabsTrigger value="roles" className="text-xs sm:text-sm flex-shrink-0">Rôles</TabsTrigger>
            <TabsTrigger value="satisfaction-by-role" className="text-xs sm:text-sm flex-shrink-0">Par rôle</TabsTrigger>
            <TabsTrigger value="employee-ratings" className="text-xs sm:text-sm flex-shrink-0">Évolution</TabsTrigger>
            <TabsTrigger value="top-employees" className="text-xs sm:text-sm flex-shrink-0">Top 5</TabsTrigger>
            <TabsTrigger value="recent-reviews" className="text-xs sm:text-sm flex-shrink-0">Avis</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="satisfaction" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Évolution de la satisfaction</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Tendance de la satisfaction client sur les 12 derniers mois
              </CardDescription>
            </CardHeader>
            <CardContent className="h-60 sm:h-80 p-2 sm:p-6">
              <LineChart 
                data={monthlySatisfactionData}
                options={getChartOptions({
                  scales: {
                    y: {
                      beginAtZero: false,
                      min: 80,
                      max: 100
                    }
                  }
                })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visitors" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Évolution des visites</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Nombre de visites mensuelles sur l'année
              </CardDescription>
            </CardHeader>
            <CardContent className="h-60 sm:h-80 p-2 sm:p-6">
              <LineChart 
                data={monthlyVisitorsData}
                options={getChartOptions()}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ratings" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Distribution des notes</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Répartition des avis selon le nombre d'étoiles
              </CardDescription>
            </CardHeader>
            <CardContent className="h-60 sm:h-80 p-2 sm:p-6">
              <BarChart 
                data={starRatingDistributionData}
                options={getChartOptions({
                  indexAxis: 'y' as const
                })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Avis par horaire</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Distribution des avis selon l'heure de la journée
              </CardDescription>
            </CardHeader>
            <CardContent className="h-60 sm:h-80 p-2 sm:p-6">
              <BarChart 
                data={feedbackByTimeData}
                options={getChartOptions()}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Répartition des rôles notés</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Nombre d'avis reçus par catégorie de personnel
              </CardDescription>
            </CardHeader>
            <CardContent className="h-60 sm:h-80 p-2 sm:p-6">
              <BarChart 
                data={roleDistributionData}
                options={getChartOptions({
                  indexAxis: 'y' as const,
                  plugins: {
                    legend: {
                      display: false
                    }
                  }
                })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="satisfaction-by-role" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Classement des fonctions les mieux notées</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Note moyenne de satisfaction par catégorie de personnel
              </CardDescription>
            </CardHeader>
            <CardContent className="h-60 sm:h-80 p-2 sm:p-6">
              <BarChart 
                data={satisfactionByRoleData}
                options={getChartOptions({
                  scales: {
                    y: {
                      beginAtZero: true,
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
        </TabsContent>

        {/* New tabs for employee metrics */}
        <TabsContent value="employee-ratings" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Courbe d'évolution des notes des employés</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Évolution de la note moyenne des employés sur les 12 derniers mois
              </CardDescription>
            </CardHeader>
            <CardContent className="h-60 sm:h-80 p-2 sm:p-6">
              <LineChart 
                data={employeeRatingsData}
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
        </TabsContent>

        <TabsContent value="top-employees" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Top 5 des employés les mieux notés</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Classement des employés selon leur note moyenne
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                {topEmployees.map((employee, index) => (
                  <div key={employee.id} className="flex items-center">
                    <div className="mr-3 sm:mr-4 flex-shrink-0 relative">
                      {index === 0 && <Medal className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 absolute -ml-1 -mt-1" />}
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-primary">
                        <AvatarImage src={employee.avatar} alt={employee.name} />
                        <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {employee.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-0 sm:ml-2">
                          <Badge variant="secondary" className="text-xs">
                            {employee.reviewCount} avis
                          </Badge>
                        </p>
                      </div>
                      <div className="flex items-center mt-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {employee.role}
                        </p>
                        <div className="ml-auto flex items-center">
                          <span className="text-xs sm:text-sm font-medium mr-1">{employee.rating}</span>
                          <div className="flex">
                            {renderStars(employee.rating)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent-reviews" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Notes et commentaires récents sur les employés</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Derniers avis clients sur les employés de la pharmacie
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4 sm:space-y-6">
                {recentEmployeeReviews.map((review) => (
                  <div key={review.id} className="border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10 mr-2 sm:mr-3 flex-shrink-0">
                        <AvatarImage src={review.avatar} alt={review.employeeName} />
                        <AvatarFallback>{review.employeeName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                          <p className="text-xs sm:text-sm font-medium">{review.employeeName}</p>
                          <p className="text-xs text-gray-500 mt-0.5 sm:mt-0">
                            {new Date(review.date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">{review.employeeRole}</p>
                        <div className="flex items-center mt-1">
                          <div className="flex mr-1">
                            {renderStars(review.rating)}
                          </div>
                          <span className="text-xs font-medium">{review.rating}/5</span>
                        </div>
                        <p className="mt-2 text-xs sm:text-sm line-clamp-3 sm:line-clamp-none">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 