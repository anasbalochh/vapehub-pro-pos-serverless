import { IndustrySelection } from "@/components/IndustrySelection";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { userIndustryApi } from "@/lib/multi-industry-api";
import type { Industry, UserIndustrySettings } from "@/types/multi-industry";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Lazy load pages for better code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/ProductsDynamic")); // Use dynamic products page
const Stock = lazy(() => import("./pages/Stock"));
const POS = lazy(() => import("./pages/POS"));
const Reports = lazy(() => import("./pages/Reports"));
const Returns = lazy(() => import("./pages/Returns"));
const Analytics = lazy(() => import("./pages/Analytics"));
const PrinterManager = lazy(() => import("./pages/PrinterManager"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Industry Setup Component
const IndustrySetup: React.FC<{ userId: string }> = ({ userId }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userIndustry, setUserIndustry] = useState<UserIndustrySettings | null>(null);

  useEffect(() => {
    loadUserIndustry();
  }, [userId]);

  const loadUserIndustry = async () => {
    try {
      setIsLoading(true);
      const response = await userIndustryApi.get(userId);
      setUserIndustry(response.data);
    } catch (error) {
      console.error('Failed to load user industry:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIndustrySelected = (industry: Industry) => {
    // Industry is set, reload to get updated settings
    loadUserIndustry();
  };

  const handleSkip = () => {
    // Allow user to proceed without setting industry
    setUserIndustry({} as UserIndustrySettings); // Set empty object to proceed
  };

  if (isLoading) {
    return <PageLoader />;
  }

  // If user has industry set, show the main app
  if (userIndustry) {
    return (
      <Layout>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/printer" element={<PrinterManager />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Layout>
    );
  }

  // Show industry selection
  return (
    <IndustrySelection
      userId={userId}
      onIndustrySelected={handleIndustrySelected}
      onSkip={handleSkip}
    />
  );
};

// Main App Routes Component
const AppRoutes: React.FC<{ userId: string }> = ({ userId }) => {
  return <IndustrySetup userId={userId} />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AppRoutes userId={""} />
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

export default App;
