import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Banknote, ShoppingCart, RotateCcw, Tag, Percent } from "lucide-react";
import { reportsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import DateFilter from "@/components/DateFilter";

const Analytics = () => {
  const [metrics, setMetrics] = useState([
    { title: "Total Sales", value: "₨0", change: "", icon: Banknote, color: "text-success" },
    { title: "Total Orders", value: "0", change: "", icon: ShoppingCart, color: "text-primary" },
    { title: "Total Returns", value: "0", change: "", icon: RotateCcw, color: "text-destructive" },
    { title: "Net Revenue", value: "₨0", change: "", icon: Tag, color: "text-accent" },
    { title: "Total Discounts", value: "₨0", change: "", icon: Percent, color: "text-orange-500" },
  ]);

  const [range, setRange] = useState<{ start?: string; end?: string }>({});
  useEffect(() => {
    (async () => {
      try {
        console.log('Analytics: Loading data with range:', range);

        const [summary, transactions, top, byCat] = await Promise.all([
          reportsApi.summary(range),
          reportsApi.transactions({ limit: 200, ...range }),
          reportsApi.topProducts(4),
          reportsApi.salesByCategory(range),
        ]);

        console.log('Analytics: Summary data:', summary.data);
        console.log('Analytics: Transactions data:', transactions.data);

        const s = summary.data;
        const ordersCount = transactions.data.length;
        const refundsCount = transactions.data.filter((t: any) => t.type === 'Refund').length;
        setMetrics([
          { title: "Total Sales", value: `${formatCurrency(s.totalSales ?? 0)}`, change: "", icon: Banknote, color: "text-success" },
          { title: "Total Orders", value: String(ordersCount), change: "", icon: ShoppingCart, color: "text-primary" },
          { title: "Total Returns", value: String(refundsCount), change: "", icon: RotateCcw, color: "text-destructive" },
          { title: "Net Revenue", value: `${formatCurrency(s.netRevenue ?? 0)}`, change: "", icon: Tag, color: "text-accent" },
          { title: "Total Discounts", value: `${formatCurrency(s.totalDiscounts ?? 0)}`, change: `${s.discountPercentage ?? 0}% of orders`, icon: Percent, color: "text-orange-500" },
        ]);
        setTopProducts(top.data.map((p: any) => ({ name: p.name, sales: p.sales, revenue: formatCurrency(p.revenue) })));
        setCategories(byCat.data.map((c: any) => ({ category: c.category || 'Uncategorized', percentage: 0, amount: formatCurrency(c.revenue), revenue: c.revenue })));

        console.log('Analytics: Data loaded successfully');
      } catch (e) {
        console.error('Analytics: Failed to load data:', e);
      }
    })();
  }, [range]);

  const [topProducts, setTopProducts] = useState<{ name: string; sales: number; revenue: string }[]>([]);
  const [categories, setCategories] = useState<{ category: string; percentage: number; amount: string; revenue: number }[]>([]);

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
        setCats(r.data);
      } catch (e) {
        console.error(e);
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
