import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, MetricCardSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { reportsApi } from "@/lib/api";
import { dynamicProductsApi } from "@/lib/multi-industry-api";
import { formatCurrency } from "@/lib/utils";
import { Activity, Banknote, Package, RefreshCw, ShoppingCart, TrendingUp } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";

// Helper function to calculate time ago
const getTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} days ago`;
};

const Dashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Use React Query for real-time data with proper query keys
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['summary', 'dashboard'],
    queryFn: () => reportsApi.getSummary(),
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
    select: (response) => (response as any).data || response,
  });

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', 'dashboard'],
    queryFn: () => reportsApi.getTransactions(),
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
    select: (response) => (response as any).data || response || [],
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', user?.id],
    queryFn: () => dynamicProductsApi.list(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 minute
    select: (response) => (response as any).data || response || [],
  });

  const isLoading = summaryLoading || transactionsLoading || productsLoading;
  const [isRefetching, setIsRefetching] = useState(false);

  // Process data
  const summary = summaryData || {};
  const transactionsArray = Array.isArray(transactionsData) ? transactionsData : [];
  const productsArray = Array.isArray(productsData) ? productsData : [];

      const today = new Date().toISOString().slice(0, 10);
      const todayTx = transactionsArray.filter((o: any) => {
        const orderDate = o.created_at || o.createdAt;
        return orderDate?.slice(0, 10) === today;
      });

      const todaySales = todayTx
        .filter((o: any) => o.type === 'Sale')
        .reduce((s: number, o: any) => s + (o.total || 0), 0);

      const ordersCount = todayTx.length;
      const totalProducts = productsArray.length;
      const revenue = (summary as any).netRevenue ?? 0;

      // Get recent activity (last 5 transactions)
  const recentActivity = transactionsArray
        .slice(0, 5)
        .map((tx: any) => ({
          id: tx.id || tx._id,
          orderNumber: tx.order_number || tx.orderNumber,
          type: tx.type,
          total: tx.total,
          createdAt: tx.created_at || tx.createdAt,
          timeAgo: getTimeAgo(tx.created_at || tx.createdAt)
        }));

  const stats = [
        { title: "Today's Sales", value: `${formatCurrency(todaySales)}`, change: "", icon: Banknote, color: "text-success" },
        { title: "Total Products", value: String(totalProducts), change: "", icon: Package, color: "text-accent" },
        { title: "Orders", value: String(ordersCount), change: "", icon: ShoppingCart, color: "text-primary" },
        { title: "Revenue", value: `${formatCurrency(revenue)}`, change: "", icon: TrendingUp, color: "text-success" },
  ];

  const handleRefresh = async () => {
    setIsRefetching(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['summary'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ]);
    } finally {
      setIsRefetching(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Welcome back, {user?.username || 'User'}! Here's what's happening today.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="flex items-center space-x-2 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Link to="/pos">
            <Button className="btn-primary shadow-glow">
              <ShoppingCart className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Open POS</span>
              <span className="sm:hidden">POS</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4 w-full">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <MetricCardSkeleton key={index} />
          ))
        ) : (
          stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="metric-card animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", stat.color)} />
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                  <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground break-words overflow-hidden">{stat.value}</div>
                  {stat.change && (
                    <p className={cn("text-xs mt-1 flex items-center", stat.color)}>
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {stat.change}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="card-professional">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/products" className="block">
              <Button variant="secondary" className="w-full justify-start hover:bg-primary hover:text-primary-foreground transition-all duration-200">
                <Package className="w-4 h-4 mr-2" />
                Manage Products
              </Button>
            </Link>
            <Link to="/stock" className="block">
              <Button variant="secondary" className="w-full justify-start hover:bg-primary hover:text-primary-foreground transition-all duration-200">
                <Package className="w-4 h-4 mr-2" />
                Check Stock
              </Button>
            </Link>
            <Link to="/returns" className="block">
              <Button variant="secondary" className="w-full justify-start hover:bg-primary hover:text-primary-foreground transition-all duration-200">
                <Package className="w-4 h-4 mr-2" />
                Process Returns
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="card-professional md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 rounded-lg bg-secondary/50">
                      <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                        <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                      </div>
                      <div className="h-4 bg-muted rounded w-16 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="flex items-center space-x-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-all duration-200 animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={`w-2 h-2 rounded-full ${activity.type === 'Sale' ? 'bg-success' : 'bg-destructive'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Order #{activity.orderNumber} {activity.type === 'Sale' ? 'completed' : 'refunded'}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.timeAgo}</p>
                    </div>
                    <div className={`text-sm font-medium ${activity.type === 'Sale' ? 'text-success' : 'text-destructive'}`}>
                      {activity.type === 'Sale' ? '+' : '-'}{formatCurrency(Math.abs(activity.total))}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<Activity className="w-12 h-12 text-muted-foreground" />}
                  title="No Recent Activity"
                  description="Start making sales to see your recent activity here."
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
