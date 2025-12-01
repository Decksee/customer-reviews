import type { Route } from "./+types/index";
import { useState, useEffect } from "react";
import { data, useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "@/components/ui/chart";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, TrendingDown, Calendar, FilterIcon } from "lucide-react";
import { feedbackSessionService } from "~/services/feedback-session.service.server";
import { authService } from "~/services/auth.service.server";
export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Note Pharmacies - Pharmacy Val d'Oise" },
    { name: "description", content: "Rating history and trends for Pharmacy Val d'Oise" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  await authService.requireUser(request);

  const url = new URL(request.url);
  const timeFilter = url.searchParams.get("timeFilter") || "all";
  const ratingFilter = url.searchParams.get("ratingFilter") || "all";
  const page = parseInt(url.searchParams.get("page") || "1");
  const sentimentFilter = url.searchParams.get("sentimentFilter") || "all";

  const startDateParam = url.searchParams.get("startDate");
  const endDateParam = url.searchParams.get("endDate");

  const startDate = startDateParam ? new Date(startDateParam) : null;
  const endDate = endDateParam ? new Date(endDateParam) : null;

  const { ratings, stats, total } = await feedbackSessionService.getPharmacyRatings(
    timeFilter,
    page,
    10,
    ratingFilter,
    sentimentFilter,
    startDate,
    endDate
  );

  const chartData = await feedbackSessionService.getPharmacyRatingTrends(timeFilter);

  return data({
    ratings,
    stats,
    chartData,
    total,
    timeFilter,
    ratingFilter,
    sentimentFilter,
    currentPage: page,
    // ✅ Convertir les dates en strings
    startDate: startDate ? startDate.toISOString() : null,
    endDate: endDate ? endDate.toISOString() : null
  });
}

export default function PharmacyRatingsPage({ loaderData }: Route.ComponentProps) {
  const {
    ratings,
    stats,
    chartData,
    total,
    startDate,
    endDate,
    timeFilter: initialTimeFilter,
    ratingFilter: initialRatingFilter,
    sentimentFilter: initialSentimentFilter,
    currentPage: initialPage
  } = loaderData;

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Global time period filter
  const [timeFilter, setTimeFilter] = useState(initialTimeFilter);
  const [ratingFilter, setRatingFilter] = useState(initialRatingFilter);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [activeTab, setActiveTab] = useState("charts");
  const [isMobile, setIsMobile] = useState(false);

  const [customDateRange, setCustomDateRange] = useState<{ start: string, end: string } | null>(
    startDate && endDate
      ? {
        start: new Date(startDate).toISOString().split('T')[0],
        end: new Date(endDate).toISOString().split('T')[0]
      }
      : null
  );
  const [sentimentFilter, setSentimentFilter] = useState(initialSentimentFilter);

  // Check for mobile viewport on client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkIfMobile = () => setIsMobile(window.innerWidth < 640);
      checkIfMobile();
      window.addEventListener('resize', checkIfMobile);
      return () => window.removeEventListener('resize', checkIfMobile);
    }
  }, []);

  const updateURLParams = (params: Record<string, string>) => {
    const newSearchParams = new URLSearchParams(searchParams);

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newSearchParams.set(key, value);
      } else {
        newSearchParams.delete(key);
      }
    });

    navigate(`?${newSearchParams.toString()}`, { replace: true });
  };

  const itemsPerPage = 10;
  const totalPages = Math.ceil(total / itemsPerPage);

  const handleChangeDateStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setCustomDateRange(prev => ({
      start: newStart,
      end: prev?.end || ''
    }));
    setTimeFilter('custom');
  };


  const handleChangeDateEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value;
    setCustomDateRange(prev => ({
      start: prev?.start || '',
      end: newEnd
    }));

    if (customDateRange?.start && newEnd) {
      setTimeFilter('custom');
      updateURLParams({
        timeFilter: 'custom',
        startDate: customDateRange.start,
        endDate: newEnd,
        ratingFilter: ratingFilter,
        sentimentFilter: sentimentFilter,
        page: '1'
      });
    }
  };

  // Handlers for filter changes
  const handleTimeFilterChange = (value: string) => {
    setTimeFilter(value);

    if (value !== "custom") {
      updateURLParams({
        timeFilter: value,
        ratingFilter: ratingFilter,
        page: '1',
        startDate: '', // Supprimer les dates si ce n'est pas custom
        endDate: ''
      });
    }
  };

  const handleRatingFilterChange = (value: string) => {
    setRatingFilter(value);

    updateURLParams({
      timeFilter: timeFilter,
      ratingFilter: value,
      page: '1'
    });
  };

  const handleSentimentFilterChange = (value: string) => {
    setSentimentFilter(value);
    setCurrentPage(1);

    updateURLParams({
      timeFilter: timeFilter,
      ratingFilter: ratingFilter,
      sentimentFilter: value,
      page: '1'
    });
  };

  // Handle pagination
  const handlePageChange = (page: number) => {

    updateURLParams({
      timeFilter: timeFilter,
      ratingFilter: ratingFilter,
      page: page.toString()
    });
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate percentage for rating distribution
  const calculatePercentage = (count: number) => {
    return stats.totalReviews > 0 ? Math.round((count / stats.totalReviews) * 100) : 0;
  };

  // Time filter options
  const timeFilterOptions = [
    { value: "all", label: "Toutes les données" },
    { value: "30days", label: "30 derniers jours" },
    { value: "quarter", label: "Ce trimestre" },
    { value: "semester", label: "Ce semestre" },
    { value: "year", label: "Cette année" },
    { value: "lastYear", label: "L'année dernière" }
  ];

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Notes de la Pharmacie</h1>
          <p className="text-sm text-muted-foreground">
            Historique et tendances des évaluations clients de la pharmacie
          </p>
        </div>

        {/* Global time filter */}
        <div className="flex items-center space-x-2">
          <FilterIcon className="h-4 w-4 text-muted-foreground" />
          <Select
            value={timeFilter}
            onValueChange={handleTimeFilterChange}
          >
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Sélectionner une période" />
            </SelectTrigger>
            <SelectContent>
              {timeFilterOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Période personnalisée</SelectItem>
            </SelectContent>
          </Select>

          {timeFilter === "custom" && (
            <div className="flex gap-2">
              <input
                type="date"
                value={customDateRange?.start || ''}
                className="px-3 py-2 border rounded-md text-sm"
                onChange={handleChangeDateStart}
              />
              <input
                type="date"
                value={customDateRange?.end || ''}
                className="px-3 py-2 border rounded-md text-sm"
                onChange={handleChangeDateEnd}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Summary Cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Note Moyenne</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:pt-2">
            <div className="flex items-center">
              <div className="text-lg sm:text-2xl font-bold">{stats.averageRating}/5</div>
              <div className="ml-2">
                {stats.comparisonToLastMonth >= 0 ? (
                  <Badge variant="outline" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    +{stats.comparisonToLastMonth}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                    <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                    {stats.comparisonToLastMonth}
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Comparé au mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total des Avis</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 sm:pt-2">
            <div className="text-lg sm:text-2xl font-bold">{stats.totalReviews}</div>
            <p className="text-xs text-muted-foreground">
              Nombre total d'évaluations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Notes 5 étoiles</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="p-3 sm:pt-2">
            <div className="text-lg sm:text-2xl font-bold">{stats.ratingsDistribution?.[5] || 0}</div>
            <p className="text-xs text-muted-foreground">
              {calculatePercentage(stats.ratingsDistribution?.[5] || 0)}% des avis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Notes &lt; 3 étoiles</CardTitle>
            <Star className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="p-3 sm:pt-2">
            <div className="text-lg sm:text-2xl font-bold">
              {(stats.ratingsDistribution?.[1] || 0) + (stats.ratingsDistribution?.[2] || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {calculatePercentage((stats.ratingsDistribution?.[1] || 0) + (stats.ratingsDistribution?.[2] || 0))}% des avis
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="charts" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex w-max no-scrollbar overflow-auto">
          <TabsTrigger value="charts" className="text-xs sm:text-sm">Graphiques</TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs sm:text-sm">Avis</TabsTrigger>
          <TabsTrigger value="distribution" className="text-xs sm:text-sm">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base sm:text-lg">Évolution des Notes</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Tendance des notes moyennes sur la période
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-60 sm:h-80 p-2 sm:p-6">
              <LineChart
                data={chartData}
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

        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              {/* <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
                <div>
                  <CardTitle className="text-base sm:text-lg">Avis Récents</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Les derniers retours clients
                  </CardDescription>
                </div>
                <Select
                  value={ratingFilter}
                  onValueChange={handleRatingFilterChange}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrer par note" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les notes</SelectItem>
                    <SelectItem value="positive">Avis positifs</SelectItem>
                    <SelectItem value="negative">Avis négatifs</SelectItem>
                    <SelectItem value="5">5 étoiles</SelectItem>
                    <SelectItem value="4">4 étoiles</SelectItem>
                    <SelectItem value="3">3 étoiles</SelectItem>
                    <SelectItem value="2">2 étoiles</SelectItem>
                    <SelectItem value="1">1 étoile</SelectItem>
                  </SelectContent>
                </Select>
              </div> */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
                <div>
                  <CardTitle className="text-base sm:text-lg">Avis Récents</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Les derniers retours clients
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={sentimentFilter}
                    onValueChange={handleSentimentFilterChange}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Type d'avis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les avis</SelectItem>
                      <SelectItem value="positive">Avis positifs (4-5★)</SelectItem>
                      <SelectItem value="negative">Avis négatifs (1-3★)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={ratingFilter}
                    onValueChange={handleRatingFilterChange}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filtrer par note" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les notes</SelectItem>
                      <SelectItem value="5">5 étoiles</SelectItem>
                      <SelectItem value="4">4 étoiles</SelectItem>
                      <SelectItem value="3">3 étoiles</SelectItem>
                      <SelectItem value="2">2 étoiles</SelectItem>
                      <SelectItem value="1">1 étoile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-2">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Client</TableHead>
                      <TableHead className="text-xs sm:text-sm">Note</TableHead>
                      <TableHead className="text-xs sm:text-sm">Commentaire</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ratings.length > 0 ? (
                      ratings.map((rating: any) => (
                        <TableRow key={rating.id}>
                          <TableCell className="text-xs sm:text-sm font-medium">{rating.client.name}</TableCell>
                          <TableCell>
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 sm:h-4 sm:w-4 ${i < rating.rating
                                    ? "text-yellow-500 fill-yellow-500"
                                    : "text-gray-300"
                                    }`}
                                />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-md truncate text-xs sm:text-sm">
                            {rating.comment || "Pas de commentaire"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                              <span className="text-xs sm:text-sm">
                                {formatDate(rating.date)}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-sm">
                          Aucun avis trouvé
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {total > 0 && (
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>

                      {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                        let pageNumber = i + 1;

                        // Adjust page numbers if we're near the end
                        if (totalPages > 5 && currentPage > 3) {
                          const offset = Math.min(totalPages - 5, currentPage - 3);
                          pageNumber += offset;
                        }

                        // Don't render pages beyond the total
                        if (pageNumber > totalPages) return null;

                        return (
                          <PaginationItem key={i}>
                            <PaginationLink
                              isActive={currentPage === pageNumber}
                              onClick={() => handlePageChange(pageNumber)}
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                          className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Distribution des Notes</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Répartition des évaluations par nombre d'étoiles
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 sm:space-y-4">
                {[5, 4, 3, 2, 1].map(rating => {
                  const count = stats.ratingsDistribution?.[rating] || 0;
                  const percentage = calculatePercentage(count);

                  return (
                    <div key={rating} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-xs sm:text-sm font-medium mr-2">{rating}</span>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 sm:h-4 sm:w-4 ${i < rating
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-gray-300"
                                  }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {count} avis ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 