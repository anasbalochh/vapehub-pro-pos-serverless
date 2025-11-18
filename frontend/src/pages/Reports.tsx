import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar, Download } from "lucide-react";
import { reportsApi } from "@/lib/api";
import DateFilter from "@/components/DateFilter";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface OrderRow {
  _id: string;
  orderNumber: string;
  createdAt: string;
  type: "Sale" | "Refund";
  total: number;
  subtotal: number;
  discountAmount?: number;
  discountType?: string;
  discountValue?: number;
  items: { quantity: number }[];
}

const Reports = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<{ start?: string; end?: string }>({});

  // Use React Query for real-time data
  const { data: summaryData } = useQuery({
    queryKey: ['summary', 'reports', range],
    queryFn: () => reportsApi.summary(range.start || range.end ? range : undefined),
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
    select: (response) => (response as any).data || response,
  });

  const { data: transactionsData } = useQuery({
    queryKey: ['transactions', 'reports', range],
    queryFn: () => reportsApi.transactions({
      ...(range.start || range.end ? { start: range.start, end: range.end } : {})
    }),
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
    select: (response) => (response as any).data || response || [],
  });

  const summary = summaryData || null;
  let rows = (transactionsData || []) as OrderRow[];

  // Additional client-side filtering to ensure only transactions within date range are shown
  if (range.start || range.end) {
    rows = rows.filter((row) => {
      const orderDate = new Date(row.createdAt || row.created_at || new Date()).toISOString().split('T')[0];
      if (range.start && orderDate < range.start) return false;
      if (range.end && orderDate > range.end) return false;
      return true;
    });
  }

  const handleExport = async () => {
    try {
      const params = range.start || range.end ? { start: range.start, end: range.end } : undefined;
      const response = await reportsApi.exportTransactions(params);

      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Export completed successfully!');
    } catch (e) {
      console.error(e);
      toast.error('Export failed');
    }
  };

  // Calculate metrics from filtered transactions if date range is active, otherwise use summary
  const hasDateRange = !!(range.start || range.end);
  const sales = rows.filter((r) => r.type === 'Sale');
  const refunds = rows.filter((r) => r.type === 'Refund');

  const totalSales = hasDateRange
    ? sales.reduce((sum, order) => sum + (order.total || 0), 0)
    : (summary?.totalSales ?? 0);

  const totalRefunds = hasDateRange
    ? refunds.reduce((sum, order) => sum + Math.abs(order.total || 0), 0)
    : (summary?.totalRefunds ?? 0);

  const netRevenue = totalSales - totalRefunds;

  const tableRows = useMemo(() => rows.map((r) => {
    const dateObj = new Date(r.createdAt || r.created_at || new Date());
    const date = isNaN(dateObj.getTime()) ? new Date().toISOString().slice(0, 10) : dateObj.toISOString().slice(0, 10);
    const time = isNaN(dateObj.getTime()) ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const itemsCount = (r.items || r.order_items || []).reduce((s, i) => s + (i.quantity || 0), 0);
    return {
      id: r._id || r.id,
      orderId: r.orderNumber || r.order_number,
      date,
      time,
      type: r.type,
      amount: r.total,
      items: itemsCount,
      discountAmount: r.discountAmount || r.discount_amount || 0,
      discountType: r.discountType || r.discount_type,
      discountValue: r.discountValue || r.discount_value,
    };
  }), [rows]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Reports
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            View detailed transaction reports and analytics
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <DateFilter onChange={(range) => {
            console.log('Reports: DateFilter onChange called with range:', range);
            setRange(range);
          }} />
          <Button className="bg-gradient-primary w-full sm:w-auto" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(totalSales)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {rows.filter((r) => r.type === "Sale").length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Refunds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalRefunds)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {rows.filter((r) => r.type === "Refund").length} refunds
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(netRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              After refunds
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {tableRows.length === 0 ? (
            <div className="text-center py-8 text-sm sm:text-base text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-3">
                {tableRows.map((report) => (
                  <Card key={report.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">Order #{report.orderId}</p>
                          <p className="text-xs text-muted-foreground">{report.date} {report.time}</p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${report.type === "Sale"
                            ? "bg-success/20 text-success"
                            : "bg-destructive/20 text-destructive"
                            }`}
                        >
                          {report.type}
                        </span>
                      </div>
                      <div className="space-y-1 pt-2 border-t">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Items:</span>
                          <span className="font-medium">{report.items}</span>
                        </div>
                        {report.discountAmount > 0 && (
                          <div className="flex justify-between text-xs text-orange-600">
                            <span>Discount:</span>
                            <span className="font-medium">
                              {report.discountType === 'percentage' ? `${report.discountValue}%` : 'Fixed'} -{formatCurrency(report.discountAmount)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold pt-1">
                          <span>Amount:</span>
                          <span className={report.amount >= 0 ? "text-success" : "text-destructive"}>
                            {formatCurrency(Math.abs(report.amount))}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-card/50">
                      <TableHead className="min-w-[120px]">Order ID</TableHead>
                      <TableHead className="min-w-[100px]">Date</TableHead>
                      <TableHead className="min-w-[80px]">Time</TableHead>
                      <TableHead className="min-w-[80px]">Type</TableHead>
                      <TableHead className="min-w-[60px]">Items</TableHead>
                      <TableHead className="min-w-[100px]">Discount</TableHead>
                      <TableHead className="text-right min-w-[100px]">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRows.map((report) => (
                      <TableRow key={report.id} className="hover:bg-secondary/50">
                        <TableCell className="font-medium">{report.orderId}</TableCell>
                        <TableCell>{report.date}</TableCell>
                        <TableCell>{report.time}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${report.type === "Sale"
                              ? "bg-success/20 text-success"
                              : "bg-destructive/20 text-destructive"
                              }`}
                          >
                            {report.type}
                          </span>
                        </TableCell>
                        <TableCell>{report.items}</TableCell>
                        <TableCell className="text-orange-600">
                          {report.discountAmount > 0 ? (
                            <span className="text-xs">
                              {report.discountType === 'percentage' ? `${report.discountValue}%` : 'Fixed'}
                              <br />
                              -{formatCurrency(report.discountAmount)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">None</span>
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium whitespace-nowrap ${report.amount >= 0 ? "text-success" : "text-destructive"
                            }`}
                        >
                          {formatCurrency(Math.abs(report.amount))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
