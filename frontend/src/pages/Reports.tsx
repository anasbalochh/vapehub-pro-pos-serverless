import { useEffect, useMemo, useState } from "react";
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
  const [summary, setSummary] = useState<{ totalSales: number; totalRefunds: number; netRevenue: number; counts?: any } | null>(null);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [range, setRange] = useState<{ start?: string; end?: string }>({});

  useEffect(() => {
    (async () => {
      try {
        console.log('Reports: Loading data with range:', range);

        const params = range.start || range.end ? { start: range.start, end: range.end } : undefined;
        console.log('Reports: API params:', params);

        const [s, t] = await Promise.all([
          reportsApi.summary(params),
          reportsApi.transactions({ limit: 100, ...(params || {}) }),
        ]);

        console.log('Reports: Summary data:', s.data);
        console.log('Reports: Transactions data:', t.data);

        setSummary(s.data);
        setRows(t.data);

        console.log('Reports: Data loaded successfully');
      } catch (e) {
        console.error('Reports: Failed to load data:', e);
        toast.error("Failed to load reports data");
      }
    })();
  }, [range]);

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

  const totalSales = summary?.totalSales ?? 0;
  const totalRefunds = summary?.totalRefunds ?? 0;
  const netRevenue = summary?.netRevenue ?? 0;

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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            View detailed transaction reports and analytics
          </p>
        </div>
        <div className="flex gap-2">
          <DateFilter onChange={(range) => {
            console.log('Reports: DateFilter onChange called with range:', range);
            setRange(range);
          }} />
          <Button className="bg-gradient-primary" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
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
                      className={`text-right font-medium ${report.amount >= 0 ? "text-success" : "text-destructive"
                        }`}
                    >
                      {formatCurrency(Math.abs(report.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
