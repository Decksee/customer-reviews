import type { Route } from "./+types/index";
import { useState } from "react";
import { data } from "react-router";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  MoreVertical, 
  Eye, 
  Phone,
  Mail,
  Check,
  X,
  Calendar
} from "lucide-react";
import { feedbackSessionService } from "~/services/feedback-session.service.server";
import { authService } from "~/services/auth.service.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Clients - Pharmacy Val d'Oise" },
    { name: "description", content: "Manage pharmacy client information" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
   // Ensure user is authenticated
   await authService.requireUser(request);
  
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const search = url.searchParams.get("search") || "";
  
  // Get clients data from feedback sessions
  const { clients, total } = await feedbackSessionService.getClientsList(page, 10, search);
  
  return data({ 
    clients,
    total,
    currentPage: page,
    searchTerm: search
  });
}

export default function ClientsPage({ loaderData }: Route.ComponentProps) {
  const { clients, total, currentPage: initialPage, searchTerm: initialSearch } = loaderData;
  
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(total / itemsPerPage);

  // State for view client modal
  const [isViewClientDialogOpen, setIsViewClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  // View client handler
  const handleViewClient = (client: any) => {
    setSelectedClient(client);
    setIsViewClientDialogOpen(true);
  };

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `/admin/clients?search=${encodeURIComponent(searchTerm)}&page=1`;
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    window.location.href = `/admin/clients?search=${encodeURIComponent(searchTerm)}&page=${page}`;
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Gestion des clients et de leur information
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Liste des Clients</CardTitle>
          <CardDescription>
            Total de {total} clients enregistrés
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <form onSubmit={handleSearch} className="relative flex-1 mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher un client..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>
          
          {/* Clients Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Consentement</TableHead>
                  <TableHead className="text-center">Date visite</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length > 0 ? (
                  clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.lastName}</TableCell>
                      <TableCell>{client.firstName}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                          <span>{client.phone || "Non renseigné"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                          <span>{client.email || "Non renseigné"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {client.consent ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100">
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Oui
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-100">
                            <X className="h-3.5 w-3.5 mr-1" />
                            Non
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                          <span className="text-sm">{formatDate(client.lastVisit)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewClient(client)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir le profil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      Aucun client trouvé
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
                      isActive={currentPage > 1}
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
                      isActive={currentPage < totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* View Client Dialog */}
      <Dialog open={isViewClientDialogOpen} onOpenChange={setIsViewClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détails du client</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Prénom</p>
                  <p className="font-medium">{selectedClient.firstName || "Non renseigné"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Nom</p>
                  <p className="font-medium">{selectedClient.lastName || "Non renseigné"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-muted-foreground mr-1" />
                    <p>{selectedClient.email || "Non renseigné"}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-muted-foreground mr-1" />
                    <p>{selectedClient.phone || "Non renseigné"}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Première visite</p>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                    <p>{formatDate(selectedClient.dateJoined)}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Dernière visite</p>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-muted-foreground mr-1" />
                    <p>{formatDate(selectedClient.lastVisit)}</p>
                  </div>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Consentement</p>
                  <div>
                    {selectedClient.consent ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100">
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Accepte de recevoir des communications promotionnelles
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-100">
                        <X className="h-3.5 w-3.5 mr-1" />
                        N'accepte pas de recevoir des communications promotionnelles
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewClientDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 