import DateFilter from "@/components/DateFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { reportsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Banknote, Percent, RotateCcw, ShoppingCart, Tag, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

const Analytics = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<{ start?: string; end?: string }>({});

  // Use React Query for real-time data
  const { data: summaryData } = useQuery({
    queryKey: ['summary', 'analytics', range],
    queryFn: () => reportsApi.summary(range.start || range.end ? range : undefined),
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
    select: (response) => (response as any).data || response,
  });

  const { data: transactionsData } = useQuery({
    queryKey: ['transactions', 'analytics', range],
    queryFn: () => reportsApi.transactions({
      limit: 200,
      ...(range.start || range.end ? { start: range.start, end: range.end } : {})
    }),
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
    select: (response) => (response as any).data || response || [],
  });

  const { data: topProductsData } = useQuery({
    queryKey: ['topProducts', 'analytics'],
    queryFn: () => reportsApi.topProducts(4),
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 minute
    select: (response) => (response as any).data || response || [],
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['salesByCategory', 'analytics', range],
    queryFn: () => reportsApi.salesByCategory(),
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 minute
    select: (response) => (response as any).data || response || [],
  });

  let transactions = (transactionsData || []) as any[];

  // Additional client-side filtering to ensure only transactions within date range are shown
  if (range.start || range.end) {
    transactions = transactions.filter((transaction: any) => {
      const orderDate = new Date(transaction.createdAt || transaction.created_at || transaction.date || new Date()).toISOString().split('T')[0];
      if (range.start && orderDate < range.start) return false;
      if (range.end && orderDate > range.end) return false;
      return true;
    });
  }

  // Calculate metrics from filtered transactions if date range is active, otherwise use summary
  const hasDateRange = !!(range.start || range.end);
  const sales = transactions.filter((t: any) => t.type === 'Sale');
  const refunds = transactions.filter((t: any) => t.type === 'Refund');

  // When date range is active, calculate from filtered transactions; otherwise use summary API data
  const totalSales = hasDateRange
    ? sales.reduce((sum: number, t: any) => sum + (t.total || 0), 0)
    : (summaryData?.totalSales ?? 0);

  const totalRefunds = hasDateRange
    ? refunds.reduce((sum: number, t: any) => sum + Math.abs(t.total || 0), 0)
    : (summaryData?.totalRefunds ?? 0);

  const netRevenue = totalSales - totalRefunds;

  const totalDiscounts = hasDateRange
    ? sales.reduce((sum: number, t: any) => sum + (t.discount_amount || t.discountAmount || 0), 0)
    : (summaryData?.totalDiscounts ?? 0);

  const discountedOrders = sales.filter((t: any) => (t.discount_amount || t.discountAmount || 0) > 0).length;
  const discountPercentage = sales.length > 0 ? (discountedOrders / sales.length * 100).toFixed(1) : '0';

  const ordersCount = transactions.length;
  const refundsCount = refunds.length;

  const metrics = [
    { title: "Total Sales", value: `${formatCurrency(totalSales)}`, change: "", icon: Banknote, color: "text-success" },
    { title: "Total Orders", value: String(ordersCount), change: "", icon: ShoppingCart, color: "text-primary" },
    { title: "Total Returns", value: String(refundsCount), change: "", icon: RotateCcw, color: "text-destructive" },
    { title: "Net Revenue", value: `${formatCurrency(netRevenue)}`, change: "", icon: Tag, color: "text-accent" },
    { title: "Total Discounts", value: `${formatCurrency(totalDiscounts)}`, change: `${discountPercentage}% of orders`, icon: Percent, color: "text-orange-500" },
  ];

  const topProducts = (topProductsData || []).map((p: any) => ({ name: p.name, sales: p.sales, revenue: formatCurrency(p.revenue) }));
  const categories = (categoriesData || []).map((c: any) => ({ category: c.category || 'Uncategorized', percentage: 0, amount: formatCurrency(c.revenue), revenue: c.revenue }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your store's performance and insights
          </p>
        </div>
        <DateFilter onChange={(range) => {
          console.log('Analytics: DateFilter onChange called with range:', range);
          setRange(range);
        }} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card
              key={metric.title}
              className="border-border hover:border-primary/50 transition-all duration-200"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                <p className={`text-xs mt-1 flex items-center ${metric.color}`}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {metric.change} from last month
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.sales} units sold
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success">{product.revenue}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesByCategory />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Monthly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyBars />
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;

function MonthlyBars() {
  const [data, setData] = useState<{ day: string; total: number }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const s = await reportsApi.summary();
        const byDaySales = (s.data as any).byDaySales as Array<{ _id: string; total: number }>;
        const byDayRefunds = (s.data as any).byDayRefunds as Array<{ _id: string; total: number }>;
        const mapTotal: Record<string, number> = {};
        (byDaySales || []).forEach((d) => { mapTotal[d._id] = (mapTotal[d._id] || 0) + d.total; });
        (byDayRefunds || []).forEach((d) => { mapTotal[d._id] = (mapTotal[d._id] || 0) - Math.abs(d.total); });
        const days: string[] = [];
        const today = new Date();
        for (let i = 27; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          days.push(d.toISOString().slice(0, 10));
        }
        const mapped = days.map((iso) => ({ day: iso, total: mapTotal[iso] || 0 }));
        setData(mapped);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // group by weekday columns (Mon..Sun) over recent 4 weeks, pad missing
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // match JS getDay
  const columns: { label: string; values: number[] }[] = weekdays.map((w) => ({ label: w, values: [] }));
  const today = new Date();
  const days: string[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const valueMap = new Map(data.map((d) => [d.day, d.total]));
  days.forEach((iso) => {
    const d = new Date(iso);
    const wd = d.getDay();
    columns[wd].values.push(valueMap.get(iso) ?? 0);
  });

  const maxVal = Math.max(1, ...data.map((d) => d.total));

  return (
    <div className="grid grid-cols-7 gap-2">
      {columns.map((col) => (
        <div key={col.label} className="text-center">
          <p className="text-xs text-muted-foreground mb-2">{col.label}</p>
          <div className="space-y-1">
            {col.values.map((v, i) => (
              <div
                key={i}
                className="bg-gradient-primary rounded"
                style={{ height: `${(v / maxVal) * 80 + 10}px` }}
                title={`${col.label} #${i + 1}: ${formatCurrency(v)}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SalesByCategory() {
  const [cats, setCats] = useState<{ category: string; revenue: number }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await reportsApi.salesByCategory();
        const data = (r as any).data || r || [];
        setCats(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setCats([]);
      }
    })();
  }, []);

  const totalRevenue = cats.reduce((s, c) => s + (c.revenue || 0), 0) || 1;

  return (
    <div className="space-y-4">
      {cats.map((item) => {
        const percentage = Math.round(((item.revenue || 0) / totalRevenue) * 100);
        return (
          <div key={item.category || 'Uncategorized'} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{item.category || 'Uncategorized'}</span>
              <span className="text-sm text-muted-foreground">
                {percentage}% · {formatCurrency(item.revenue || 0)}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
