import type { Route } from "./+types/index";
import { useState, useEffect } from "react";
import { data, Link, useActionData, redirect, useNavigate, useLoaderData, useSearchParams } from "react-router";
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
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  Star,
  User
} from "lucide-react";
import { feedbackSessionService } from "~/services/feedback-session.service.server";
import { userService } from "~/services/user.service.server";
import { positionService } from "~/services/position.service.server";
import type { IUser } from "~/core/entities/user.entity.server";
import { handleFileUpload } from "~/utils/upload.server";
import { randomBytes } from "node:crypto";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { authService } from "~/services/auth.service.server";
import { Types } from "mongoose";
import { serializeDocument, serializeDocuments } from "~/core/db/utils";

// Function to generate a random password
function generateRandomPassword(length = 12) {
  return randomBytes(length).toString('base64').slice(0, length);
}

// Define employee type interface
interface Employee {
  id: string;
  name: string;
  role: string;
  userRole: string;
  photo: string;
  status: string;
  email?: string;
  phone?: string;
  rating?: number;
  totalReviews?: number;
}

// Add type declarations for actionData to fix TypeScript errors
type ActionSuccessData = { success: true; message: string; employee?: any };
type ActionErrorData = { success: false; error: string };
type ActionData = ActionSuccessData | ActionErrorData;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Employees - Pharmacy Val d'Oise" },
    { name: "description", content: "Manage pharmacy employees" },
  ];
}


export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  try {
    // Handle based on the intent from the form
    switch (intent) {
      case "create": {
        const firstName = formData.get("firstName") as string;
        const lastName = formData.get("lastName") as string;
        const positionId = formData.get("position") as string;
        const status = formData.get("status") as string;
        const email = formData.get("email") as string;
        const allowLogin = formData.get("allowLogin") === "true";
        const userRole = formData.get("userRole") as string || "employee"; // Get explicit role selection
        let password = formData.get("password") as string;
        let passwordConfirm = formData.get("passwordConfirm") as string;
        
        // Validate required fields
        if (!firstName || !lastName || !positionId) {
          return data<ActionData>({ success: false, error: "Missing required fields" });
        }
        
        // If login is allowed, validate passwords
        if (allowLogin) {
          if (!password || !passwordConfirm) {
            return data<ActionData>({ success: false, error: "Password is required when login is enabled" });
          }
          
          if (password !== passwordConfirm) {
            return data<ActionData>({ success: false, error: "Passwords do not match" });
          }
        } else {
          // Generate random password if login is not allowed
          password = generateRandomPassword();
          passwordConfirm = password;
        }
        
        // Handle avatar upload
        let avatar = null;
        try {
          avatar = await handleFileUpload(formData);
        } catch (error: any) {
          return data<ActionData>({ success: false, error: error.message });
        }
        
        // Create user in database - use the explicit role selection
        const newUser = await userService.createOne({
          firstName,
          lastName,
          email,
          password,
          position: new Types.ObjectId(positionId), // Use position ID reference
          role: allowLogin ? userRole : "employee", // Only use selected role if login is allowed
          isActive: status === "active",
          avatar: avatar || undefined // Add avatar if uploaded
        });
        
        // Redirect to refresh the page after successful creation
        return redirect("/admin/employees");
      }
      
      case "edit": {
        const id = formData.get("id") as string;
        const firstName = formData.get("firstName") as string;
        const lastName = formData.get("lastName") as string;
        const email = formData.get("email") as string;
        const positionId = formData.get("position") as string;
        const status = formData.get("status") as string;
        const allowLogin = formData.get("allowLogin") === "true";
        const userRole = formData.get("userRole") as string || "employee"; // Get explicit role selection
        const password = formData.get("password") as string;
        const passwordConfirm = formData.get("passwordConfirm") as string;
        
        if (!id || !firstName || !lastName || !positionId) {
          return data<ActionData>({ success: false, error: "Missing required fields" });
        }
        
        // Create base update object without password
        const updateData: any = {
          firstName,
          lastName,
          email,
          position: new Types.ObjectId(positionId),
          isActive: status === "active",
          role: allowLogin ? userRole : "employee" // Use selected role if login is allowed
        };
        
        // Only add password if it was provided and not empty
        const hasProvidedPassword = password && password.trim() !== "";
        if (hasProvidedPassword) {
          // Validate password confirmation only if password was provided
          if (password !== passwordConfirm) {
            return data<ActionData>({ success: false, error: "Passwords do not match" });
          }
          updateData.password = password;
        }
        
        // Handle avatar upload
        let avatar = null;
        try {
          avatar = await handleFileUpload(formData);
        } catch (error: any) {
          return data<ActionData>({ success: false, error: error.message });
        }
        
        // Only add avatar if a new one was uploaded
        if (avatar) {
          updateData.avatar = avatar;
        }
        
        // Update user in database
        const updatedUser = await userService.updateOne(id, updateData);
        
        // Redirect to refresh the page after successful update
        return redirect("/admin/employees");
      }
      
      case "delete": {
        const id = formData.get("id") as string;
        
        if (!id) {
          return data<ActionData>({ success: false, error: "Employee ID is required" });
        }
        
        // Delete user from database
        await userService.deleteOne(id);
        
        // Redirect to refresh the page after successful deletion  
        return redirect("/admin/employees");
      }
      
      default:
        return data<ActionData>({ success: false, error: "Invalid operation" });
    }
  } catch (error: any) {
    return data<ActionData>({ 
      success: false, 
      error: error.message || "An error occurred while processing your request" 
    });
  }
}

export async function loader({ request }: Route.LoaderArgs) {
   // Ensure user is authenticated
   await authService.requireUser(request);
  
  // Parse URL for pagination and filtering
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = parseInt(url.searchParams.get("limit") || "10", 10);
  const search = url.searchParams.get("search") || "";
  const roleFilter = url.searchParams.get("role") || "all";
  const statusFilter = url.searchParams.get("status") || "all";
  const userRoleFilter = url.searchParams.get("userRole") || "all";
  
  console.log("Pagination params:", { page, limit, search, roleFilter, statusFilter, userRoleFilter });
  
  try {
    // Get all employees (populated with position data since userService.getAllEmployees uses populate)
    let allUsers = await userService.getAllEmployees();
    
    // Get all positions for lookup
    const allPositions = await positionService.getAllPositions();
    const positionLookup = new Map(allPositions.map(pos => [pos._id?.toString(), pos.title]));
    
    // Apply filters manually since we need to work with populated data
    let filteredUsers = allUsers;
    
    // Apply search filter
    if (search) {
      filteredUsers = filteredUsers.filter(user => {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        const searchLower = search.toLowerCase();
        
        // Get position title for search
        let positionTitle = '';
        if (user.position && typeof user.position === 'object' && 'title' in user.position) {
          positionTitle = (user.position as any).title.toLowerCase();
        } else if (user.position && typeof user.position === 'string') {
          positionTitle = positionLookup.get(user.position) || '';
        } else if (user.currentPosition) {
          positionTitle = user.currentPosition.toLowerCase();
        }
        
        return fullName.includes(searchLower) || positionTitle.includes(searchLower);
      });
    }
    
    // Apply role filter
    if (roleFilter !== "all") {
      filteredUsers = filteredUsers.filter(user => {
        let positionTitle = '';
        if (user.position && typeof user.position === 'object' && 'title' in user.position) {
          positionTitle = (user.position as any).title;
        } else if (user.position && typeof user.position === 'string') {
          positionTitle = positionLookup.get(user.position) || '';
        } else if (user.currentPosition) {
          positionTitle = user.currentPosition;
        }
        return positionTitle === roleFilter;
      });
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      filteredUsers = filteredUsers.filter(user => user.isActive === isActive);
    }
    
    // Apply user role filter
    if (userRoleFilter !== "all") {
      filteredUsers = filteredUsers.filter(user => user.role === userRoleFilter);
    }
    
    console.log(`Total users after filtering: ${filteredUsers.length}`);
    
    // Manual pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
    
    console.log(`Paginated slice: ${startIndex} to ${endIndex}, showing ${paginatedUsers.length} users`);
    
    // Transform the user data to our employee interface format
    const employees = paginatedUsers.map((user: IUser) => {
      // Handle position field - it could be populated object or just ID
      let positionTitle = 'Employé';
      if (user.position && typeof user.position === 'object' && 'title' in user.position) {
        positionTitle = (user.position as any).title;
      } else if (user.position && typeof user.position === 'string') {
        positionTitle = positionLookup.get(user.position) || 'Employé';
      } else if (user.currentPosition) {
        positionTitle = user.currentPosition;
      }
      
      return {
        id: user._id?.toString() || '',
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        role: positionTitle,
        userRole: user.role || 'employee',
        email: user.email,
        photo: user.avatar || '/images/employees/default.jpg',
        status: user.isActive ? 'active' : 'inactive',
      };
    });

    // Get employee stats from feedback sessions
    const employeeStats = await feedbackSessionService.getEmployeeStatistics();

    // Merge ratings data with employee data
    const employeesWithRatings = employees.map((emp: Employee) => {
      const stats = employeeStats.find((stat: any) => stat.employeeId === emp.id);
      return {
        ...emp,
        rating: stats ? stats.averageRating : 0,
        totalReviews: stats ? stats.totalReviews : 0
      };
    });

    // Get all positions for the dropdown
    const positions = await positionService.getAllPositions();
    const serializedPositions = serializeDocuments(positions);
    const roles = serializedPositions.map(position => position.title);

    // Add user roles for selection
    const userRoles = [
      "employee",
      "manager"
    ];

    return data({ 
      employees: employeesWithRatings, 
      roles, 
      positions: serializedPositions, // Pass the serialized position objects
      userRoles,
      pagination: {
        page,
        limit,
        totalItems: filteredUsers.length,
        totalPages: Math.ceil(filteredUsers.length / limit)
      },
      filters: {
        search,
        role: roleFilter,
        status: statusFilter,
        userRole: userRoleFilter
      }
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    
    // Return empty data on error
    return data({ 
      employees: [], 
      roles: [],
      positions: serializeDocuments([]), // Use serialized empty array
      userRoles: ["employee", "manager"],
      pagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 1
      },
      filters: {
        search,
        role: roleFilter,
        status: statusFilter,
        userRole: userRoleFilter
      }
    });
  }
}

export default function EmployeesPage() {
  const { 
    employees, 
    roles, 
    positions,
    userRoles,
    pagination,
    filters
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<ActionData>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const [roleFilter, setRoleFilter] = useState(filters.role);
  const [statusFilter, setStatusFilter] = useState(filters.status);
  const [userRoleFilter, setUserRoleFilter] = useState(filters.userRole);
  const [isNewEmployeeDialogOpen, setIsNewEmployeeDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<{id: string, name: string} | null>(null);
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
  
  // New state variables for view and edit modals
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    status: "active",
    password: "",
    passwordConfirm: "",
    allowLogin: false,
    userRole: "employee"
  });

  // Add state for login toggle and role in the new employee form
  const [allowLoginNew, setAllowLoginNew] = useState(false);
  const [newUserRole, setNewUserRole] = useState("employee");

  const [showFeedback, setShowFeedback] = useState(false);

  // Show feedback when action data changes
  useEffect(() => {
    if (actionData) {
      setShowFeedback(true);
      // Hide feedback after 3 seconds
      const timer = setTimeout(() => {
        setShowFeedback(false);
        
        // If the action was successful, close any open dialogs
        if ((actionData as ActionSuccessData).success) {
          setIsNewEmployeeDialogOpen(false);
          setIsEditDialogOpen(false);
          setIsDeleteDialogOpen(false);
          
          // Refresh the page to get updated data
          navigate(".", { replace: true });
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionData, navigate]);

  // Apply filters when they change
  const applyFilters = () => {
    const newParams = new URLSearchParams(searchParams);
    
    // Preserve current page if it exists in the URL, otherwise default to page 1
    if (!searchParams.has("page")) {
      newParams.set("page", "1");
    }
    
    // Add search term if not empty
    if (searchTerm) {
      newParams.set("search", searchTerm);
    } else {
      newParams.delete("search");
    }
    
    // Add role filter if not "all"
    if (roleFilter !== "all") {
      newParams.set("role", roleFilter);
    } else {
      newParams.delete("role");
    }
    
    // Add status filter if not "all"
    if (statusFilter !== "all") {
      newParams.set("status", statusFilter);
    } else {
      newParams.delete("status");
    }
    
    // Add user role filter if not "all"
    if (userRoleFilter !== "all") {
      newParams.set("userRole", userRoleFilter);
    } else {
      newParams.delete("userRole");
    }
    
    // Log the filter parameters being applied
    console.log("Applying filters with params:", newParams.toString());
    
    // Update URL with new search params
    setSearchParams(newParams);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    console.log(`Changing to page ${newPage}`);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    
    // Log the new params being set
    console.log("New search params:", newParams.toString());
    
    // Update URL and trigger navigation
    setSearchParams(newParams);
  };

  // Delete employee handler
  const handleDeleteEmployee = () => {
    // We'll let the form submission be handled by React Router
    // with the form element in the dialog
    setIsDeleteDialogOpen(false);
    setEmployeeToDelete(null);
  };
  
  // Handle view employee
  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsViewDialogOpen(true);
  };
  
  // Handle edit employee
  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    // Split name into first and last name
    const nameParts = employee.name.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    
    // Find the position ID for the current role
    const currentPosition = positions.find(pos => pos.title === employee.role);
    // Use first available position as fallback if current position is not found
    const fallbackPosition = positions.find(pos => pos.id);
    const positionId = currentPosition?.id || fallbackPosition?.id || "";
    
    setEditFormData({
      firstName,
      lastName,
      email: employee.email || "",
      role: positionId || "", // Store position ID in the role field for now
      status: employee.status,
      password: "",
      passwordConfirm: "",
      allowLogin: employee.userRole !== "employee", // Set allowLogin based on userRole
      userRole: employee.userRole || "employee"
    });
    setIsEditDialogOpen(true);
  };
  
  // Handle save edit
  const handleSaveEdit = () => {
    // We'll let the form submission be handled by React Router
    // with the form element in the dialog
    setIsEditDialogOpen(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">
            Gestion des employés et de leurs évaluations
          </p>
        </div>
        
        <Button onClick={() => setIsNewEmployeeDialogOpen(true)} size={isMobile ? "sm" : "default"} className="mt-2 sm:mt-0">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un employé
        </Button>
      </div>
      
      {/* Feedback message */}
      {showFeedback && actionData && (
        <div className={`p-3 sm:p-4 rounded-md ${actionData.success ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'} text-sm`}>
          {actionData.success 
            ? (actionData as ActionSuccessData).message 
            : (actionData as ActionErrorData).error}
        </div>
      )}
      
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Liste des Employés</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Total de {pagination.totalItems} employés enregistrés
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {/* Filters */}
          <div className="flex flex-col space-y-2 mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher un employé..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Select 
                value={roleFilter} 
                onValueChange={setRoleFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filtrer par poste" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les postes</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={userRoleFilter} 
                onValueChange={setUserRoleFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filtrer par accès" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les accès</SelectItem>
                  <SelectItem value="employee">Employé</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
              
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={applyFilters} className="w-full">
                Appliquer
              </Button>
            </div>
          </div>
          
          {/* Employees Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] text-xs sm:text-sm">Photo</TableHead>
                  <TableHead className="text-xs sm:text-sm">Nom et statut</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Accès</TableHead>
                  <TableHead className="text-xs sm:text-sm text-center">Évaluation</TableHead>
                  <TableHead className="w-[80px] sm:w-[100px] text-xs sm:text-sm text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length > 0 ? (
                  employees.map((employee: Employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <Avatar className="h-7 w-7 sm:h-9 sm:w-9">
                          <img 
                            src={employee.photo} 
                            alt={employee.name}
                            className="h-full w-full object-cover" 
                          />
                        </Avatar>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm font-medium">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            
                            <span className="font-medium">{employee.name}</span>
                            <span className="text-xs text-muted-foreground"> - </span>
                            <Badge 
                              variant={employee.status === "active" ? "default" : "secondary"}
                              className={employee.status === "active" 
                                ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100 text-xs" 
                                : "bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-100 text-xs"
                              }
                            >
                              {employee.status === "active" ? "Actif" : "Inactif"}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">{employee.role}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge 
                          variant={employee.userRole === "manager" ? "outline" : "secondary"}
                          className={employee.userRole === "manager" 
                            ? "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-100 text-xs" 
                            : "bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-100 text-xs"
                          }
                        >
                          {employee.userRole === "manager" ? "Manager" : "Employé"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex items-center">
                            <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 mr-1" />
                            <span className="text-xs sm:text-sm font-medium">
                              {employee.rating && employee.rating > 0 ? employee.rating.toFixed(1) : "-"}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {employee.totalReviews || 0} avis
                          </span>
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
                            <DropdownMenuItem onClick={() => handleViewEmployee(employee)} className="text-xs sm:text-sm">
                              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                              Aperçu rapide
                            </DropdownMenuItem>
                            <Link to={`/admin/employees/view/${employee.id}`} className="w-full">
                              <DropdownMenuItem className="text-xs sm:text-sm">
                                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                                Voir la fiche complète
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem 
                              onClick={() => handleEditEmployee(employee)}
                              className="text-xs sm:text-sm"
                            >
                              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600 text-xs sm:text-sm"
                              onClick={() => {
                                setEmployeeToDelete(employee);
                                setIsDeleteDialogOpen(true);
                              }}
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
                    <TableCell colSpan={5} className="text-center py-6 text-sm">
                      Aucun employé trouvé
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Updated Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href={pagination.page > 1 ? `?${new URLSearchParams({...Object.fromEntries(searchParams), page: (pagination.page - 1).toString()}).toString()}` : undefined}
                      className={pagination.page <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  
                  {/* Show first page */}
                  {pagination.page > 2 && !isMobile && (
                    <PaginationItem>
                      <PaginationLink 
                        href={`?${new URLSearchParams({...Object.fromEntries(searchParams), page: "1"}).toString()}`}
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Show ellipsis if not showing first page */}
                  {pagination.page > 3 && !isMobile && (
                    <PaginationItem>
                      <span className="px-4">...</span>
                    </PaginationItem>
                  )}
                  
                  {/* Show previous page if not first */}
                  {pagination.page > 1 && (
                    <PaginationItem>
                      <PaginationLink 
                        href={`?${new URLSearchParams({...Object.fromEntries(searchParams), page: (pagination.page - 1).toString()}).toString()}`}
                      >
                        {pagination.page - 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Show current page */}
                  <PaginationItem>
                    <PaginationLink isActive className="cursor-default">
                      {pagination.page}
                    </PaginationLink>
                  </PaginationItem>
                  
                  {/* Show next page if not last */}
                  {pagination.page < pagination.totalPages && (
                    <PaginationItem>
                      <PaginationLink 
                        href={`?${new URLSearchParams({...Object.fromEntries(searchParams), page: (pagination.page + 1).toString()}).toString()}`}
                      >
                        {pagination.page + 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Show ellipsis if not showing last page */}
                  {pagination.page < pagination.totalPages - 2 && !isMobile && (
                    <PaginationItem>
                      <span className="px-4">...</span>
                    </PaginationItem>
                  )}
                  
                  {/* Show last page if more than one page away */}
                  {pagination.page < pagination.totalPages - 1 && !isMobile && (
                    <PaginationItem>
                      <PaginationLink 
                        href={`?${new URLSearchParams({...Object.fromEntries(searchParams), page: pagination.totalPages.toString()}).toString()}`}
                      >
                        {pagination.totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href={pagination.page < pagination.totalPages ? `?${new URLSearchParams({...Object.fromEntries(searchParams), page: (pagination.page + 1).toString()}).toString()}` : undefined}
                      className={pagination.page >= pagination.totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* New Employee Dialog - Updated with role selection */}
      <Dialog open={isNewEmployeeDialogOpen} onOpenChange={setIsNewEmployeeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un nouvel employé</DialogTitle>
            <DialogDescription>
              Remplissez les informations pour ajouter un nouvel employé à la liste.
            </DialogDescription>
          </DialogHeader>
          <form method="post" encType="multipart/form-data">
            <input type="hidden" name="intent" value="create" />
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="firstName" className="text-right">
                  Prénom
                </label>
                <Input id="firstName" name="firstName" className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="lastName" className="text-right">
                  Nom
                </label>
                <Input id="lastName" name="lastName" className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="email" className="text-right">
                  Email
                </label>
                <Input id="email" name="email" type="email" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="allowLogin" className="text-right">
                  Permettre de se connecter
                </label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Switch 
                    id="allowLogin" 
                    name="allowLogin"
                    checked={allowLoginNew}
                    onCheckedChange={setAllowLoginNew}
                    value={allowLoginNew ? "true" : "false"}
                  />
                  <Label htmlFor="allowLogin">
                    {allowLoginNew ? "Peut se connecter" : "Ne peut pas se connecter"}
                  </Label>
                </div>
              </div>
              
              {/* Add role selection that appears when login is enabled */}
              {allowLoginNew && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="userRole" className="text-right">
                    Niveau d'accès
                  </label>
                  <Select 
                    name="userRole" 
                    value={newUserRole}
                    onValueChange={setNewUserRole}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Sélectionner un niveau d'accès" />
                    </SelectTrigger>
                    <SelectContent>
                      {userRoles.map(role => (
                        <SelectItem key={role} value={role}>
                          {role === "manager" ? "Manager" : "Employé"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Password fields only shown if login is allowed */}
              {allowLoginNew && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="password" className="text-right">
                      Mot de passe
                    </label>
                    <Input id="password" name="password" type="password" className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="passwordConfirm" className="text-right">
                      Confirmer
                    </label>
                    <Input id="passwordConfirm" name="passwordConfirm" type="password" className="col-span-3" required />
                  </div>
                </>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="position" className="text-right">
                  Poste
                </label>
                <Select name="position" required>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Sélectionner un poste" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions
                      .filter(position => position.id) // Filter out positions without valid IDs
                      .map(position => (
                        <SelectItem key={position.id!} value={position.id!}>
                          {position.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="photo" className="text-right">
                  Photo
                </label>
                <Input id="photo" name="avatar" type="file" className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="status" className="text-right">
                  Statut
                </label>
                <Select name="status" defaultValue="active">
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewEmployeeDialogOpen(false)} type="button">
                Annuler
              </Button>
              <Button type="submit">
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* View Employee Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Détails de l'employé</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="flex flex-col items-center space-y-4 py-4">
              <Avatar className="h-24 w-24">
                <img 
                  src={selectedEmployee.photo} 
                  alt={selectedEmployee.name}
                  className="h-full w-full object-cover" 
                />
              </Avatar>
              
              <div className="grid w-full gap-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Nom:</span>
                  <span>{selectedEmployee.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Rôle:</span>
                  <span>{selectedEmployee.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Statut:</span>
                  <Badge 
                    variant={selectedEmployee.status === "active" ? "default" : "secondary"}
                    className={selectedEmployee.status === "active" 
                      ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100" 
                      : "bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-100"
                    }
                  >
                    {selectedEmployee.status === "active" ? "Actif" : "Inactif"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Note moyenne:</span>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-500 mr-1" />
                    <span>{selectedEmployee.rating && selectedEmployee.rating > 0 ? `${selectedEmployee.rating} / 5` : "Non évalué"}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">Nombre d'avis:</span>
                  <span>{selectedEmployee.totalReviews || 0}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between items-center">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Fermer
            </Button>
            <Link to={selectedEmployee ? `/admin/employees/view/${selectedEmployee.id}` : "#"}>
              <Button>
                <User className="h-4 w-4 mr-2" />
                Voir la fiche complète
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Employee Dialog - Updated with role selection */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'employé</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'employé.
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <form method="post" encType="multipart/form-data">
              <input type="hidden" name="intent" value="edit" />
              <input type="hidden" name="id" value={selectedEmployee.id} />
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="edit-firstName" className="text-right">
                    Prénom
                  </label>
                  <Input 
                    id="edit-firstName"
                    name="firstName" 
                    className="col-span-3" 
                    value={editFormData.firstName}
                    onChange={(e) => setEditFormData({...editFormData, firstName: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="edit-lastName" className="text-right">
                    Nom
                  </label>
                  <Input 
                    id="edit-lastName"
                    name="lastName" 
                    className="col-span-3" 
                    value={editFormData.lastName}
                    onChange={(e) => setEditFormData({...editFormData, lastName: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="edit-email" className="text-right">
                    Email
                  </label>
                  <Input 
                    id="edit-email"
                    name="email"
                    type="email" 
                    className="col-span-3" 
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="edit-allowLogin" className="text-right">
                    Permettre de se connecter
                  </label>
                  <div className="flex items-center space-x-2 col-span-3">
                    <Switch 
                      id="edit-allowLogin" 
                      name="allowLogin"
                      checked={editFormData.allowLogin}
                      onCheckedChange={(checked) => setEditFormData({...editFormData, allowLogin: checked})}
                      value={editFormData.allowLogin ? "true" : "false"}
                    />
                    <Label htmlFor="edit-allowLogin">
                      {editFormData.allowLogin ? "Peut se connecter" : "Ne peut pas se connecter"}
                    </Label>
                  </div>
                </div>
                
                {/* Add role selection that appears when login is enabled */}
                {editFormData.allowLogin && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="edit-userRole" className="text-right">
                      Niveau d'accès
                    </label>
                    <Select 
                      name="userRole" 
                      value={editFormData.userRole}
                      onValueChange={(value) => setEditFormData({...editFormData, userRole: value})}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {userRoles.map(role => (
                          <SelectItem key={role} value={role}>
                            {role === "manager" ? "Manager" : "Employé"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Password fields only shown if login is allowed */}
                {editFormData.allowLogin && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="edit-password" className="text-right">
                        Mot de passe
                      </label>
                      <Input 
                        id="edit-password"
                        name="password"
                        type="password" 
                        className="col-span-3" 
                        value={editFormData.password}
                        onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                        placeholder={editFormData.allowLogin ? "Laisser vide pour ne pas changer" : ""}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <label htmlFor="edit-passwordConfirm" className="text-right">
                        Confirmer
                      </label>
                      <Input 
                        id="edit-passwordConfirm"
                        name="passwordConfirm"
                        type="password" 
                        className="col-span-3" 
                        value={editFormData.passwordConfirm}
                        onChange={(e) => setEditFormData({...editFormData, passwordConfirm: e.target.value})}
                        placeholder={editFormData.allowLogin ? "Laisser vide pour ne pas changer" : ""}
                      />
                    </div>
                  </>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="edit-position" className="text-right">
                    Poste
                  </label>
                  <Select 
                    name="position"
                    value={editFormData.role || undefined}
                    onValueChange={(value) => setEditFormData({...editFormData, role: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Sélectionner un poste" />
                    </SelectTrigger>
                                        <SelectContent>
                      {positions
                        .filter(position => position.id) // Filter out positions without valid IDs
                        .map(position => (
                          <SelectItem key={position.id!} value={position.id!}>
                            {position.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="edit-photo" className="text-right">
                    Photo
                  </label>
                  <div className="col-span-3 flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      <img 
                        src={selectedEmployee.photo} 
                        alt={selectedEmployee.name}
                        className="h-full w-full object-cover" 
                      />
                    </Avatar>
                    <Input id="edit-photo" name="avatar" type="file" />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="edit-status" className="text-right">
                    Statut
                  </label>
                  <Select 
                    name="status"
                    value={editFormData.status}
                    onValueChange={(value) => setEditFormData({...editFormData, status: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} type="button">
                  Annuler
                </Button>
                <Button type="submit">
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer {employeeToDelete?.name} de la liste des employés ?
              Cette action ne peut pas être annulée.
            </DialogDescription>
          </DialogHeader>
          <form method="post">
            <input type="hidden" name="intent" value="delete" />
            {employeeToDelete && (
              <input type="hidden" name="id" value={employeeToDelete.id} />
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} type="button">
                Annuler
              </Button>
              <Button 
                variant="destructive" 
                type="submit"
              >
                Supprimer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 