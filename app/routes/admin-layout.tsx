import React, { useState, useEffect } from "react"
import { Link, Outlet, useNavigate, useLocation, type LoaderFunctionArgs, useLoaderData, data } from "react-router"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/ui/sidebar"
import { 
  LayoutDashboard, 
  Users, 
  Star, 
  UserCircle, 
  BarChart2, 
  FileText, 
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { authService } from "@/services/auth.service.server"
import type { IPosition } from "~/core/entities/position.entity.server"



export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authService.getUser(request);

  console.log("IN admin layout", user);
  return data({ user });
}

export default function AdminLayout() {
  const { user } = useLoaderData<typeof loader>();

  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  
  // Disable document body scrolling when this layout mounts
  useEffect(() => {
    // Store original overflow style
    const originalStyle = document.body.style.overflow
    
    // Prevent document level scrolling
    document.body.style.overflow = "hidden"
    
    // Restore original style on unmount
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [])
  
  const navigation = [
    { 
      name: "Tableau de bord", 
      href: "/admin", 
      icon: LayoutDashboard, 
      current: location.pathname === "/admin" 
    },
    { 
      name: "Employés", 
      href: "/admin/employees", 
      icon: Users, 
      current: location.pathname.startsWith("/admin/employees") 
    },
    { 
      name: "Notes pharmacie", 
      href: "/admin/pharmacy-ratings", 
      icon: Star, 
      current: location.pathname.startsWith("/admin/pharmacy-ratings") 
    },
    { 
      name: "Clients", 
      href: "/admin/clients", 
      icon: UserCircle, 
      current: location.pathname.startsWith("/admin/clients") 
    },
    { 
      name: "Statistiques", 
      href: "/admin/statistics", 
      icon: BarChart2, 
      current: location.pathname.startsWith("/admin/statistics") 
    },
    { 
      name: "Rapports", 
      href: "/admin/reports", 
      icon: FileText, 
      current: location.pathname.startsWith("/admin/reports") 
    },
    { 
      name: "Postes", 
      href: "/admin/positions", 
      icon: Users, 
      current: location.pathname.startsWith("/admin/positions") 
    },
    { 
      name: "Paramètres", 
      href: "/admin/settings", 
      icon: Settings, 
      current: location.pathname.startsWith("/admin/settings") 
    },
  ]

  const handleLogout = () => {
    // Handle logout logic here
    navigate("/admin/logout")
  }
  
  // Primary color
  const primaryColor = "#1c7b80";

  // Current section title
  const currentSection = navigation.find(item => item.current)?.name || "Tableau de bord";

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#1c7b80]/5 dark:bg-gray-900">
      {/* Decorative gradient circles in background */}
      <div className="fixed hidden lg:block right-0 bottom-0 w-96 h-96 bg-gradient-to-br from-cyan-50 to-teal-100 dark:from-teal-900/20 dark:to-blue-900/10 rounded-full blur-3xl opacity-50 -z-10 transform translate-x-1/3 translate-y-1/3"></div>
      <div className="fixed hidden lg:block left-1/3 top-0 w-72 h-72 bg-gradient-to-br from-emerald-50 to-cyan-100 dark:from-cyan-900/10 dark:to-teal-900/5 rounded-full blur-2xl opacity-40 -z-10 transform -translate-y-1/2"></div>
      
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-800 bg-opacity-75 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      {/* Mobile sidebar */}
      <div 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-[#1c7b80]/5 dark:bg-gray-800 
          transition-transform duration-300 ease-in-out lg:hidden shadow-xl
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div 
          className="h-full flex flex-col bg-[#1c7b80]/5 dark:bg-gray-800"
        >
          <div 
            className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700"
            style={{
              background: `linear-gradient(to right, ${primaryColor}, ${primaryColor}f0)`,
            }}
          >
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
                <img 
                  src="/images/logo.png" 
                  alt="Pharmacy Logo" 
                  className="h-8 w-8 rounded-full object-cover"
                />
              </div>
              <span className="ml-3 text-xl font-semibold text-white">
                Val d'Oise
              </span>
            </div>
            <button 
              className="p-1 text-white hover:bg-white/10 rounded-full transition-colors"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="bg-gradient-to-b from-teal-600 to-teal-700 px-4 py-6">
            <div className="flex flex-col items-center mb-2">
              <Avatar className="h-20 w-20 mb-2 ring-4 ring-white shadow-lg">
                <AvatarImage 
                  src={user?.avatar || undefined}
                  alt={user?.firstName + " " + user?.lastName} 
                  className="object-cover"
                />
                <AvatarFallback className="bg-white text-teal-800 text-lg">
                  {user?.firstName?.[0]?.toUpperCase()}{user?.lastName?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-medium text-white">{user?.firstName} {user?.lastName}</h3>
              <p className="text-sm text-white/90">{(user?.position as unknown as IPosition)?.title || user?.currentPosition}</p>
            </div>
          </div>
          
          <nav className="mt-2 px-3 py-2 overflow-y-auto flex-1 bg-white dark:bg-gray-800">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  group flex items-center px-3 py-2.5 text-base font-medium rounded-lg mb-1
                  transition-all duration-200
                  ${item.current 
                    ? `bg-${primaryColor.replace('#', '')}/10 text-${primaryColor.replace('#', '')} font-semibold shadow-sm` 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'}
                `}
                style={{
                  ...(item.current ? {
                    backgroundColor: `${primaryColor}15`,
                    color: primaryColor,
                  } : {})
                }}
                onClick={() => setMobileSidebarOpen(false)}
              >
                <item.icon 
                  className={`mr-3 h-6 w-6 ${item.current 
                    ? `text-${primaryColor.replace('#', '')}` 
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`}
                  style={{...(item.current ? {color: primaryColor} : {})}}
                />
                {item.name}
              </Link>
            ))}
            
            <Separator className="my-4 bg-gray-200 dark:bg-gray-700" />
            
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start px-3 py-2.5 text-base font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
            >
              <LogOut className="mr-3 h-6 w-6 text-gray-500 dark:text-gray-400" />
              Déconnexion
            </Button>
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:block ${sidebarOpen ? 'w-64' : 'w-16'} flex-shrink-0 transition-all duration-300 z-30`}>
        <div className="h-full border-r border-gray-200 dark:border-gray-700 bg-[#1c7b80]/5 dark:bg-gray-800 flex flex-col shadow-md relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute -right-6 top-40 w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/20 opacity-70"></div>
          <div className="absolute -left-3 top-72 w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900/20 opacity-70"></div>
          
          {/* Gradient header */}
          <div 
            className="relative flex flex-col items-center border-b border-gray-200 dark:border-gray-700"
            style={{
              background: `linear-gradient(to right, ${primaryColor}, ${primaryColor}f0, ${primaryColor}e0)`,
              height: sidebarOpen ? '160px' : '80px',
              transition: 'height 0.3s ease'
            }}
          >
            <div className="flex items-center h-16 px-4 w-full justify-between">
              {sidebarOpen && (
                <>
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                      <img 
                        src="/images/logo.png" 
                        alt="Pharmacy Logo" 
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    </div>
                    <span className="ml-3 text-xl font-semibold text-white">
                      Val d'Oise
                    </span>
                  </div>
                </>
              )}
              <Button
                variant="ghost"
                className={`${sidebarOpen ? '' : 'mx-auto'} p-1.5 rounded-full text-white hover:bg-white/20 focus:outline-none`}
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
            
            {sidebarOpen && (
              <div className="flex flex-col items-center mt-2 pb-4">
                <Avatar className="h-16 w-16 ring-2 ring-white shadow-md">
                  <AvatarImage 
                    src={user?.avatar || undefined}
                    alt={user?.firstName + " " + user?.lastName} 
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-white text-teal-800">
                    {user?.firstName?.[0]?.toUpperCase()}{user?.lastName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-sm font-medium mt-2 text-white">{user?.firstName} {user?.lastName}</h3>
                <p className="text-xs text-white/80">{(user?.position as unknown as IPosition)?.title || user?.currentPosition}</p>
              </div>
            )}
          </div>
          
          <nav className="flex-1 overflow-y-auto pt-5 px-3">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-lg mb-1
                  transition-all duration-200
                  ${sidebarOpen ? '' : 'justify-center py-3'}
                  ${item.current 
                    ? `bg-${primaryColor.replace('#', '')}/10 text-${primaryColor.replace('#', '')} dark:bg-${primaryColor.replace('#', '')}/20 dark:text-cyan-200` 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'}
                `}
                style={{
                  ...(item.current ? {
                    backgroundColor: `${primaryColor}15`,
                    color: primaryColor,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  } : {})
                }}
              >
                <item.icon 
                  className={`
                    ${sidebarOpen ? 'mr-3' : 'mx-auto'} 
                    h-5 w-5 
                    ${item.current ? `text-${primaryColor.replace('#', '')} dark:text-cyan-200` : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}
                  `} 
                  style={{...(item.current ? {color: primaryColor} : {})}}
                  aria-hidden="true" 
                />
                {sidebarOpen && item.name}
              </Link>
            ))}
            
            <Separator className="my-4" />
            
            <Button
              variant="ghost"
              onClick={handleLogout}
              className={`
                group flex ${sidebarOpen ? '' : 'justify-center py-3'} w-full items-center px-3 py-2 text-sm font-medium rounded-lg 
                text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white
                transition-all duration-200
              `}
            >
              <LogOut 
                className={`
                  ${sidebarOpen ? 'mr-3' : 'mx-auto'} 
                  h-5 w-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300
                `} 
              />
              {sidebarOpen && 'Déconnexion'}
            </Button>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation - Enhanced with glassmorphism effect */}
        <header className="bg-[#1c7b80]/5 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm flex-shrink-0 z-20 relative">
          {/* Decorative top border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500/30 via-cyan-500/40 to-teal-500/30"></div>
          
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <button
                  className="lg:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none dark:text-gray-400 dark:hover:text-gray-50"
                  onClick={() => setMobileSidebarOpen(true)}
                >
                  <span className="sr-only">Open sidebar</span>
                  <Menu className="h-6 w-6" aria-hidden="true" />
                </button>
                <div className="lg:hidden ml-2 flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-100 to-cyan-50 flex items-center justify-center shadow-sm">
                    <img 
                      src="/images/logo.png" 
                      alt="Pharmacy Logo" 
                      className="h-6 w-6 rounded-full"
                    />
                  </div>
                  <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-white" style={{color: primaryColor}}>
                    Pharmacie Val d'Oise
                  </span>
                </div>
              </div>
              
              {/* Page title with fancy badge - displayed on medium screens and up */}
              <div className="hidden md:flex items-center">
                <div className="relative group">
                  <div className="flex items-center space-x-1 bg-gray-100/50 dark:bg-gray-700/50 px-4 py-1.5 rounded-full">
                    <h1 className="text-base font-medium" style={{color: primaryColor}}>
                      {currentSection}
                    </h1>
                    <ChevronDown className="h-4 w-4 opacity-50" style={{color: primaryColor}} />
                  </div>
                  
                  {/* Decorative ring */}
                  <div 
                    className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-teal-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 blur-sm transition duration-500"
                    style={{zIndex: -1}}
                  ></div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="ml-4 flex items-center">
                  <div className="flex-shrink-0 relative">
                    <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-gray-700 shadow-sm" style={{borderColor: `${primaryColor}25`}}>
                      <AvatarImage 
                        src={user?.avatar || undefined}
                        alt={user?.firstName + " " + user?.lastName} 
                      />
                      <AvatarFallback className="text-white" style={{backgroundColor: primaryColor}}>
                        {user?.firstName?.[0]?.toUpperCase()}{user?.lastName?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-800"></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.firstName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{(user?.position as unknown as IPosition)?.title || user?.currentPosition}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Add subtle decorative gradient line at bottom of header */}
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-teal-500/30 to-transparent"></div>
        </header>

        {/* Page content with scrolling enabled - Enhanced with decorative elements */}
        <main className="flex-1 overflow-y-auto bg-[#1c7b80]/5 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 relative">
          {/* Subtle grid pattern in background */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
          
          {/* Decorative shapes in main content */}
          <div className="fixed right-8 top-32 w-64 h-64 rounded-full bg-teal-50 dark:bg-teal-900/5 filter blur-3xl opacity-30 pointer-events-none"></div>
          <div className="fixed left-1/3 bottom-20 w-40 h-40 rounded-full bg-cyan-50 dark:bg-cyan-900/5 filter blur-2xl opacity-20 pointer-events-none"></div>
          
          {/* Top decorative wave pattern */}
          <div className="absolute top-0 left-0 w-full h-16 overflow-hidden opacity-20 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-full" style={{fill: primaryColor, opacity: 0.1}}>
              <path d="M0,224L48,224C96,224,192,224,288,208C384,192,480,160,576,165.3C672,171,768,213,864,208C960,203,1056,149,1152,144C1248,139,1344,181,1392,202.7L1440,224L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
            </svg>
          </div>
          
          {/* Content card with enhanced styling */}
          <div className="relative z-10">
            <div className="relative bg-card dark:bg-gray-800 rounded-xl overflow-hidden border border-[#1c7b80]/15 dark:border-gray-700">
              {/* Decorative corner shapes */}
              <div className="absolute -top-6 -left-6 w-12 h-12 rounded-full bg-teal-100/80 dark:bg-teal-700/20 blur-xl opacity-80"></div>
              <div className="absolute -bottom-6 -right-6 w-12 h-12 rounded-full bg-cyan-100/80 dark:bg-cyan-700/20 blur-xl opacity-80"></div>
              
              {/* Top decorative accent */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500/30 via-cyan-400/40 to-teal-500/30"></div>
              
              {/* Subtle diagonal pattern in card background */}
              <div className="absolute inset-0 bg-stripes-pattern opacity-[0.02] dark:opacity-[0.03] pointer-events-none"></div>
              
              {/* Inner glowing shape */}
              <div className="absolute top-1/4 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-teal-400/5 to-cyan-300/5 dark:from-teal-400/10 dark:to-cyan-300/10 blur-2xl transform rotate-45"></div>
              <div className="absolute bottom-1/3 left-0 w-40 h-40 rounded-full bg-gradient-to-tr from-cyan-400/5 to-teal-300/5 dark:from-cyan-400/10 dark:to-teal-300/10 blur-2xl transform -rotate-12"></div>
              
              {/* Content with proper padding */}
              <div className="relative p-6 sm:p-8">
                <Outlet />
              </div>
            </div>
          </div>
          
          {/* Add the diagonal stripes pattern via CSS */}
          <style>
            {`
              .bg-stripes-pattern {
                background-image: repeating-linear-gradient(
                  45deg,
                  currentColor,
                  currentColor 1px,
                  transparent 1px,
                  transparent 10px
                );
              }
            `}
          </style>
        </main>
      </div>
      
      {/* Add the grid pattern via CSS */}
      <style>
        {`
          .bg-grid-pattern {
            background-image: 
              linear-gradient(to right, rgba(128, 128, 128, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(128, 128, 128, 0.1) 1px, transparent 1px);
            background-size: 40px 40px;
          }
        `}
      </style>
    </div>
  )
}
