import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, Warehouse, ShoppingCart, FileText, RotateCcw, BarChart3, LogOut, User, Printer, Sun, Moon, Menu, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import BusinessLogo from "@/components/BusinessLogo";
import { useState } from "react";
import { useBusinessName } from "@/hooks/useBusinessName";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isLoading: themeLoading } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const businessName = useBusinessName();

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/products", icon: Package, label: "Products" },
    { path: "/stock", icon: Warehouse, label: "Stock" },
    { path: "/pos", icon: ShoppingCart, label: "POS" },
    { path: "/reports", icon: FileText, label: "Reports" },
    { path: "/returns", icon: RotateCcw, label: "Returns" },
    { path: "/analytics", icon: BarChart3, label: "Analytics" },
    { path: "/printer", icon: Printer, label: "Printer" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      // Use React Router navigate instead of window.location to avoid 404
      navigate('/login', { replace: true });
    } catch (error) {
      // Even if logout fails, navigate to login
      navigate('/login', { replace: true });
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 transition-all duration-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden ${
                user?.logoUrl
                  ? 'bg-transparent p-1'
                  : 'bg-gradient-to-br from-blue-600 to-blue-800 shadow-md border border-blue-400'
              }`}>
                <BusinessLogo size="sm" variant="contrast" />
              </div>
              <span className="font-bold text-xl bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent drop-shadow-sm">
                {businessName}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center space-x-1 px-2 py-2 rounded-md transition-all duration-200 transform hover:scale-105",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium hidden xl:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Desktop User Actions */}
            <div className="hidden lg:flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{user?.username}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                disabled={themeLoading}
                className="flex items-center space-x-1"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
                <span className="hidden xl:inline">
                  {theme === 'light' ? 'Dark' : 'Light'}
                </span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-1"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden xl:inline">Logout</span>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-card/95 backdrop-blur-sm animate-slide-down">
            <div className="px-4 py-4 space-y-4 animate-fade-in">
              {/* User Info */}
              <div className="flex items-center space-x-2 pb-4 border-b border-border">
                <User className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium">{user?.username}</span>
              </div>

              {/* Navigation Items */}
              <div className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={closeMobileMenu}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 text-base",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Mobile Actions */}
              <div className="pt-4 border-t border-border space-y-2">
                <Button
                  variant="outline"
                  onClick={toggleTheme}
                  disabled={themeLoading}
                  className="w-full flex items-center justify-center space-x-2 py-3"
                >
                  {theme === 'light' ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Sun className="w-5 h-5" />
                  )}
                  <span className="font-medium">
                    Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
                  </span>
                </Button>

                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 py-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
        <div className="animate-slide-up">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
