import type { Route } from "./+types/index";
import { useState, useEffect } from "react";
import { data, useLoaderData, useFetcher } from "react-router";
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
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Users,
  Check,
  X
} from "lucide-react";
import { positionService } from "~/services/position.service.server";
import { authService } from "~/services/auth.service.server";
import type { IPosition } from "~/core/entities/position.entity.server";
import { serializeDocument, serializeDocuments } from "~/core/db/utils";
import User from "~/core/entities/user.entity.server";
import mongoose from "mongoose";

// Define position interface
interface Position {
  id: string;
  title: string;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

// Action data types
type ActionSuccessData = { success: true; message: string; position?: any };
type ActionErrorData = { success: false; error: string };
type ActionData = ActionSuccessData | ActionErrorData;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Positions - Pharmacy Val d'Oise" },
    { name: "description", content: "Manage employee positions" },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  try {
    switch (intent) {
      case "create": {
        const title = formData.get("title") as string;
        
        if (!title || title.trim() === "") {
          return data<ActionData>({ success: false, error: "Le titre du poste est requis" });
        }
        
        // Check if position with this title already exists
        const existingPosition = await positionService.findByTitle(title.trim());
        if (existingPosition) {
          return data<ActionData>({ success: false, error: "Un poste avec ce titre existe déjà" });
        }
        
        // Create new position
        const newPosition = await positionService.createPosition(title.trim());
        
        return data<ActionData>({ 
          success: true, 
          message: "Poste créé avec succès",
          position: serializeDocument(newPosition)
        });
      }
      
      case "edit": {
        const id = formData.get("id") as string;
        const title = formData.get("title") as string;
        
        if (!id || !title || title.trim() === "") {
          return data<ActionData>({ success: false, error: "Données manquantes pour la modification" });
        }
        
        // Check if another position with this title already exists
        const existingPosition = await positionService.findByTitle(title.trim());
        if (existingPosition && existingPosition._id?.toString() !== id) {
          return data<ActionData>({ success: false, error: "Un poste avec ce titre existe déjà" });
        }
        
        // Update position
        const updatedPosition = await positionService.updatePosition(id, title.trim());
        
        if (!updatedPosition) {
          return data<ActionData>({ success: false, error: "Poste non trouvé" });
        }
        
        return data<ActionData>({ 
          success: true, 
          message: "Poste modifié avec succès",
          position: serializeDocument(updatedPosition)
        });
      }
      
      case "delete": {
        const id = formData.get("id") as string;
        
        if (!id) {
          return data<ActionData>({ success: false, error: "ID du poste requis" });
        }
        
        // Check if position is in use
        const isInUse = await positionService.isPositionInUse(id);
        if (isInUse) {
          return data<ActionData>({ 
            success: false, 
            error: "Impossible de supprimer ce poste car il est utilisé par des employés" 
          });
        }
        
        // Delete position
        const deleted = await positionService.deletePosition(id);
        
        if (!deleted) {
          return data<ActionData>({ success: false, error: "Poste non trouvé" });
        }
        
        return data<ActionData>({ 
          success: true, 
          message: "Poste supprimé avec succès"
        });
      }
      
      default:
        return data<ActionData>({ success: false, error: "Opération non valide" });
    }
  } catch (error: any) {
    return data<ActionData>({ 
      success: false, 
      error: error.message || "Une erreur est survenue lors du traitement de votre demande" 
    });
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  // Ensure user is authenticated
  await authService.requireUser(request);
  
  try {
    // Get all positions
    const positions = await positionService.getAllPositions();
    const serializedPositions = serializeDocuments(positions);
    
    // Get user count for each position
    const positionsWithUserCount = await Promise.all(
      serializedPositions.map(async (position) => {
        // Convert the string ID back to ObjectId for MongoDB query
        const positionObjectId = new mongoose.Types.ObjectId(position.id);
        const userCount = await User.countDocuments({ position: positionObjectId });
        
        return {
          id: position.id || '',
          title: position.title,
          userCount,
          createdAt: position.createdAt || '',
          updatedAt: position.updatedAt || '',
        } as Position;
      })
    );
    
    return data({ 
      positions: positionsWithUserCount
    });
  } catch (error) {
    console.error("Error fetching positions:", error);
    
    return data({ 
      positions: []
    });
  }
}

export default function PositionsPage() {
  const { positions } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionData>();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Check for mobile viewport
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkIfMobile = () => setIsMobile(window.innerWidth < 640);
      checkIfMobile();
      window.addEventListener('resize', checkIfMobile);
      return () => window.removeEventListener('resize', checkIfMobile);
    }
  }, []);

  // Handle fetcher feedback
  useEffect(() => {
    if (fetcher.data) {
      setShowFeedback(true);
      
      // Hide feedback after 3 seconds
      const timer = setTimeout(() => {
        setShowFeedback(false);
        
        // If successful, close dialogs and reset forms
        if (fetcher.data?.success) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setIsDeleteDialogOpen(false);
          setEditingId(null);
          setCreateTitle("");
          setEditValue("");
          setSelectedPosition(null);
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [fetcher.data]);

  // Handle inline edit
  const handleInlineEdit = (position: Position) => {
    setEditingId(position.id);
    setEditValue(position.title);
  };

  const handleSaveInlineEdit = () => {
    if (editingId && editValue.trim() !== "") {
      fetcher.submit(
        { 
          intent: "edit", 
          id: editingId, 
          title: editValue.trim() 
        },
        { method: "POST" }
      );
    }
  };

  const handleCancelInlineEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  // Handle create
  const handleCreate = () => {
    if (createTitle.trim() !== "") {
      fetcher.submit(
        { 
          intent: "create", 
          title: createTitle.trim() 
        },
        { method: "POST" }
      );
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (selectedPosition) {
      fetcher.submit(
        { 
          intent: "delete", 
          id: selectedPosition.id 
        },
        { method: "POST" }
      );
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isLoading = fetcher.state === "submitting";

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Postes</h1>
          <p className="text-sm text-muted-foreground">
            Gestion des postes et fonctions des employés
          </p>
        </div>
        
        <Button 
          onClick={() => setIsCreateDialogOpen(true)} 
          size={isMobile ? "sm" : "default"} 
          className="mt-2 sm:mt-0"
          disabled={isLoading}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un poste
        </Button>
      </div>
      
      {/* Feedback message */}
      {showFeedback && fetcher.data && (
        <div className={`p-3 sm:p-4 rounded-md ${fetcher.data.success ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'} text-sm`}>
          {fetcher.data.success 
            ? fetcher.data.message 
            : fetcher.data.error}
        </div>
      )}
      
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Liste des Postes</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {positions.length} poste{positions.length > 1 ? 's' : ''} • {positions.reduce((total, pos) => total + pos.userCount, 0)} employé{positions.reduce((total, pos) => total + pos.userCount, 0) > 1 ? 's' : ''} assigné{positions.reduce((total, pos) => total + pos.userCount, 0) > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {/* Positions Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">Poste et assignations</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Historique</TableHead>
                  <TableHead className="w-[80px] sm:w-[100px] text-xs sm:text-sm text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.length > 0 ? (
                  positions.map((position: Position) => (
                    <TableRow key={position.id}>
                      <TableCell className="text-xs sm:text-sm font-medium">
                        {editingId === position.id ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-8"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveInlineEdit();
                                } else if (e.key === 'Escape') {
                                  handleCancelInlineEdit();
                                }
                              }}
                              autoFocus
                              disabled={isLoading}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleSaveInlineEdit}
                              disabled={isLoading}
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelInlineEdit}
                              disabled={isLoading}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-medium">{position.title}</span>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Users className="h-3 w-3 mr-1 text-blue-500" />
                              <span>{position.userCount} employé{position.userCount > 1 ? 's' : ''} assigné{position.userCount > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center text-xs">
                            <span className="text-muted-foreground mr-1">Créé:</span>
                            <span>{formatDate(position.createdAt)}</span>
                          </div>
                          <div className="flex items-center text-xs">
                            <span className="text-muted-foreground mr-1">Modifié:</span>
                            <span>{formatDate(position.updatedAt)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading}>
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleInlineEdit(position)}
                              className="text-xs sm:text-sm"
                              disabled={editingId !== null}
                            >
                              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600 text-xs sm:text-sm"
                              onClick={() => {
                                setSelectedPosition(position);
                                setIsDeleteDialogOpen(true);
                              }}
                              disabled={position.userCount > 0}
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-6 text-sm">
                      Aucun poste trouvé
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Create Position Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau poste</DialogTitle>
            <DialogDescription>
              Créez un nouveau poste pour vos employés.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="title" className="text-right">
                Titre du poste
              </label>
              <Input 
                id="title"
                className="col-span-3" 
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Ex: Pharmacien, Préparateur..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreate();
                  }
                }}
                disabled={isLoading}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)} 
              type="button"
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={isLoading || createTitle.trim() === ""}
            >
              {isLoading ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le poste "{selectedPosition?.title}" ?
              {selectedPosition?.userCount && selectedPosition.userCount > 0 ? (
                <span className="text-red-600 font-semibold block mt-2">
                  Attention: Ce poste est actuellement assigné à {selectedPosition.userCount} employé(s).
                  Vous devez d'abord réassigner ces employés avant de pouvoir supprimer ce poste.
                </span>
              ) : (
                <span className="block mt-2">Cette action ne peut pas être annulée.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)} 
              type="button"
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isLoading || (selectedPosition?.userCount || 0) > 0}
            >
              {isLoading ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
