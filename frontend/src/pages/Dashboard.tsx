import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Banknote, Package, ShoppingCart, TrendingUp, RefreshCw, Activity, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { productsApi, reportsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { MetricCardSkeleton, LoadingSpinner, EmptyState } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

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
  const [stats, setStats] = useState([
    { title: "Today's Sales", value: "₨0.00", change: "", icon: Banknote, color: "text-success" },
    { title: "Total Products", value: "0", change: "", icon: Package, color: "text-accent" },
    { title: "Orders", value: "0", change: "", icon: ShoppingCart, color: "text-primary" },
    { title: "Revenue", value: "₨0.00", change: "", icon: TrendingUp, color: "text-success" },
  ]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useAuth();

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching dashboard data...');

      const [summaryResponse, transactionsResponse, productsResponse] = await Promise.all([
        reportsApi.getSummary(),
        reportsApi.getTransactions(500),
        productsApi.list(),
      ]);

      console.log('Dashboard API responses:', {
        summary: summaryResponse,
        transactions: transactionsResponse,
        products: productsResponse
      });

      const summary = (summaryResponse as any).data || summaryResponse;
      const transactions = (transactionsResponse as any).data || transactionsResponse;
      const products = (productsResponse as any).data || productsResponse;

      // Ensure we have arrays
      const transactionsArray = Array.isArray(transactions) ? transactions : [];
      const productsArray = Array.isArray(products) ? products : [];

      console.log('Processing data:', {
        transactionsArray: transactionsArray.length,
        productsArray: productsArray.length,
        summary
      });

      const today = new Date().toISOString().slice(0, 10);
      const todayTx = transactionsArray.filter((o: any) => {
        const orderDate = o.created_at || o.createdAt;
        return orderDate?.slice(0, 10) === today;
      });

      console.log('Today transactions:', todayTx);

      const todaySales = todayTx
        .filter((o: any) => o.type === 'Sale')
        .reduce((s: number, o: any) => s + (o.total || 0), 0);

      const ordersCount = todayTx.length;
      const totalProducts = productsArray.length;
      const revenue = (summary as any).netRevenue ?? 0;

      console.log('Calculated values:', {
        todaySales,
        ordersCount,
        totalProducts,
        revenue
      });

      // Get recent activity (last 5 transactions)
      const recentTransactions = transactionsArray
        .slice(0, 5)
        .map((tx: any) => ({
          id: tx.id || tx._id,
          orderNumber: tx.order_number || tx.orderNumber,
          type: tx.type,
          total: tx.total,
          createdAt: tx.created_at || tx.createdAt,
          timeAgo: getTimeAgo(tx.created_at || tx.createdAt)
        }));

      setStats([
        { title: "Today's Sales", value: `${formatCurrency(todaySales)}`, change: "", icon: Banknote, color: "text-success" },
        { title: "Total Products", value: String(totalProducts), change: "", icon: Package, color: "text-accent" },
        { title: "Orders", value: String(ordersCount), change: "", icon: ShoppingCart, color: "text-primary" },
        { title: "Revenue", value: `${formatCurrency(revenue)}`, change: "", icon: TrendingUp, color: "text-success" },
      ]);

      setRecentActivity(recentTransactions);
    } catch (e) {
      console.error('Dashboard data fetch error:', e);
      // Set default values on error
      setStats([
        { title: "Today's Sales", value: "₨0.00", change: "", icon: Banknote, color: "text-success" },
        { title: "Total Products", value: "0", change: "", icon: Package, color: "text-accent" },
        { title: "Orders", value: "0", change: "", icon: ShoppingCart, color: "text-primary" },
        { title: "Revenue", value: "₨0.00", change: "", icon: TrendingUp, color: "text-success" },
      ]);
      setRecentActivity([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
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
            onClick={() => fetchDashboardData()}
            disabled={isRefreshing}
            className="flex items-center space-x-2 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <MetricCardSkeleton key={index} />
          ))
        ) : (
          stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="metric-card animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={cn("h-5 w-5", stat.color)} />
                </CardHeader>
                <CardContent>
                  <div className="metric-value">{stat.value}</div>
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
