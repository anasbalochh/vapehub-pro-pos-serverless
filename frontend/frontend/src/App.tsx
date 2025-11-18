import ProtectedRoute from "@/components/ProtectedRoute";
import PageTransition from "@/components/PageTransition";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CheckEmail from "./pages/CheckEmail";
import EmailConfirmation from "./pages/EmailConfirmation";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Lazy load pages for better code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products")); // Use updated products page
const Stock = lazy(() => import("./pages/Stock"));
const POS = lazy(() => import("./pages/POS"));
const Reports = lazy(() => import("./pages/Reports"));
const Returns = lazy(() => import("./pages/Returns"));
const Analytics = lazy(() => import("./pages/Analytics"));
const PrinterManager = lazy(() => import("./pages/PrinterManager"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Optimized QueryClient with better caching and performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh for 5 min
      gcTime: 1000 * 60 * 10, // 10 minutes - cache garbage collection (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus for better performance
      refetchOnReconnect: true, // Refetch when connection is restored
      retry: 1, // Only retry once on failure
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
    mutations: {
      retry: 0, // Don't retry mutations
    },
  },
});

// Optimized loading component with skeleton
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    <div className="relative">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500/20 border-t-blue-500"></div>
      <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-blue-500/30"></div>
    </div>
    <p className="text-sm text-muted-foreground animate-pulse">Loading page...</p>
  </div>
);

// Industry Setup Component - Simplified to skip industry selection
const IndustrySetup: React.FC<{ userId: string }> = ({ userId }) => {
  // Skip industry selection and go directly to main app
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/products" element={<PageTransition><Products /></PageTransition>} />
          <Route path="/stock" element={<PageTransition><Stock /></PageTransition>} />
          <Route path="/pos" element={<PageTransition><POS /></PageTransition>} />
          <Route path="/reports" element={<PageTransition><Reports /></PageTransition>} />
          <Route path="/returns" element={<PageTransition><Returns /></PageTransition>} />
          <Route path="/analytics" element={<PageTransition><Analytics /></PageTransition>} />
          <Route path="/printer" element={<PageTransition><PrinterManager /></PageTransition>} />
          <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
    </Layout>
  );
};

// Main App Routes Component
const AppRoutes: React.FC = () => {
  const { user, isLoading } = useAuth();

  // Show loader only while checking auth
  if (isLoading) {
    return <PageLoader />;
  }

  // If no user after loading, ProtectedRoute will handle redirect
  if (!user?.id) {
    return null; // ProtectedRoute will redirect to login
  }

  return <IndustrySetup userId={user.id} />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/check-email" element={<CheckEmail />} />
                <Route path="/auth/confirm" element={<EmailConfirmation />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <AppRoutes />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
