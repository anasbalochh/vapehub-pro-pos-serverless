import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Printer, Wifi, Usb, TestTube, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { printerApi } from "@/lib/api";
import { testSupabaseConnection } from "@/lib/supabase";
import { toast } from "sonner";

interface PrinterDevice {
    vendorId: string;
    productId: string;
    deviceAddress: string;
    manufacturer: string;
    product: string;
}

interface PrinterStatus {
    isConnected: boolean;
    config: {
        type: string;
        device: string | null;
        options: any;
    };
}

const PrinterManager = () => {
    const [devices, setDevices] = useState<PrinterDevice[]>([]);
    const [status, setStatus] = useState<PrinterStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [printHistory, setPrintHistory] = useState<any[]>([]);
    const [printerConfig, setPrinterConfig] = useState({
        type: 'usb',
        device: '',
        options: {}
    });

    useEffect(() => {
        // Test Supabase connection first
        testSupabaseConnection();

        loadPrinterStatus();
        loadAvailableDevices();
        loadPrintHistory();

        // Set up real-time status polling
        const statusInterval = setInterval(() => {
            loadPrinterStatus();
            loadPrintHistory();
        }, 5000); // Poll every 5 seconds

        return () => {
            clearInterval(statusInterval);
        };
    }, []);

    const loadPrinterStatus = async () => {
        try {
            const response = await printerApi.getStatus();
            console.log('Printer status response:', response);
            const statusData = response.data;

            const newStatus = {
                isConnected: statusData.isConnected || false,
                config: statusData.config || null
            };

            console.log('Setting printer status:', newStatus);
            setStatus(newStatus);
        } catch (error) {
            console.error('Failed to load printer status:', error);
            setStatus({
                isConnected: false,
                config: null
            });
        }
    };

    const loadAvailableDevices = async () => {
        try {
            const response = await printerApi.getDevices();
            const devicesData = response.data?.devices || response.data || [];
            setDevices(Array.isArray(devicesData) ? devicesData : []);
        } catch (error) {
            console.error('Failed to load devices:', error);
            toast.error('Failed to load available devices');
            setDevices([]); // Ensure devices is always an array
        }
    };

    const loadPrintHistory = async () => {
        try {
            const response = await printerApi.getPrintHistory(20);
            const history = response.data?.history || [];
            setPrintHistory(Array.isArray(history) ? history : []);
        } catch (error) {
            console.error('Failed to load print history:', error);
            setPrintHistory([]);
        }
    };

    const initializePrinter = async () => {
        setIsLoading(true);
        try {
            const response = await printerApi.initialize(printerConfig);
            console.log('Printer initialization response:', response);
            toast.success('Printer initialized successfully');

            // Immediately update status with the response data
            if (response.data) {
                setStatus({
                    isConnected: response.data.isConnected || true,
                    config: response.data.config || printerConfig
                });
            }

            // Also refresh status from API
            setTimeout(() => {
                loadPrinterStatus();
            }, 500);
        } catch (error: any) {
            console.error('Failed to initialize printer:', error);
            toast.error(error.response?.data?.message || 'Failed to initialize printer');
        } finally {
            setIsLoading(false);
        }
    };

    const testPrinter = async () => {
        setIsLoading(true);
        try {
            await printerApi.test();
            toast.success('Printer test successful');
        } catch (error: any) {
            console.error('Printer test failed:', error);
            toast.error(error.response?.data?.message || 'Printer test failed');
        } finally {
            setIsLoading(false);
        }
    };

    const printTestPage = async () => {
        setIsLoading(true);
        try {
            await printerApi.printTestPage();
            toast.success('Test page printed successfully');
        } catch (error: any) {
            console.error('Failed to print test page:', error);
            toast.error(error.response?.data?.message || 'Failed to print test page');
        } finally {
            setIsLoading(false);
        }
    };

    const disconnectPrinter = async () => {
        setIsLoading(true);
        try {
            await printerApi.disconnect();
            toast.success('Printer disconnected');
            loadPrinterStatus();
        } catch (error: any) {
            console.error('Failed to disconnect printer:', error);
            toast.error(error.response?.data?.message || 'Failed to disconnect printer');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusIcon = () => {
        if (!status) return <AlertCircle className="w-5 h-5 text-gray-500" />;
        if (status.isConnected) {
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        }
        return <XCircle className="w-5 h-5 text-red-500" />;
    };

    const getStatusText = () => {
        if (!status) return 'Unknown';
        if (status.isConnected) return 'Connected';
        if (status.config && !status.isConnected) return 'Device Not Found';
        return 'Disconnected';
    };

    const getStatusColor = () => {
        if (!status) return 'secondary';
        if (status.isConnected) return 'default';
        if (status.config && !status.isConnected) return 'destructive'; // Warning for configured but not detected
        return 'destructive';
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        Printer Management
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Configure and manage your thermal printer
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <Badge variant={getStatusColor()}>
                        {getStatusText()}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Printer Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Printer className="w-5 h-5" />
                            Printer Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="printer-type">Printer Type</Label>
                            <Select
                                value={printerConfig.type}
                                onValueChange={(value) => setPrinterConfig({ ...printerConfig, type: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select printer type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="usb">
                                        <div className="flex items-center gap-2">
                                            <Usb className="w-4 h-4" />
                                            USB Printer
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="network">
                                        <div className="flex items-center gap-2">
                                            <Wifi className="w-4 h-4" />
                                            Network Printer
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {printerConfig.type === 'network' && (
                            <div className="space-y-2">
                                <Label htmlFor="printer-address">Printer Address</Label>
                                <Input
                                    id="printer-address"
                                    placeholder="192.168.1.100:9100"
                                    value={printerConfig.device}
                                    onChange={(e) => setPrinterConfig({ ...printerConfig, device: e.target.value })}
                                />
                            </div>
                        )}

                        {printerConfig.type === 'usb' && (
                            <div className="space-y-2">
                                <Label htmlFor="printer-device">USB Device</Label>
                                {devices && devices.length > 0 ? (
                                    <Select
                                        value={printerConfig.device}
                                        onValueChange={(value) => setPrinterConfig({ ...printerConfig, device: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select USB device" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {devices.map((device, index) => (
                                                <SelectItem key={index} value={device.deviceAddress}>
                                                    {device.manufacturer} - {device.product}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="p-3 border border-yellow-200 rounded-md bg-yellow-50">
                                        <div className="flex items-center gap-2 text-yellow-800">
                                            <AlertCircle className="w-4 h-4" />
                                            <span className="text-sm font-medium">No USB printers detected</span>
                                        </div>
                                        <p className="text-xs text-yellow-700 mt-1">
                                            Please connect a USB printer and refresh the page, or use a network printer instead.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                onClick={initializePrinter}
                                disabled={isLoading}
                                className="flex-1"
                            >
                                {isLoading ? 'Initializing...' : 'Initialize Printer'}
                            </Button>

                            {printerConfig.type === 'usb' && (
                                <Button
                                    onClick={loadAvailableDevices}
                                    variant="outline"
                                    disabled={isLoading}
                                    className="px-3"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Printer Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TestTube className="w-5 h-5" />
                            Printer Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            onClick={testPrinter}
                            disabled={isLoading || !status?.isConnected}
                            variant="outline"
                            className="w-full"
                        >
                            Test Connection
                        </Button>

                        <Button
                            onClick={printTestPage}
                            disabled={isLoading || !status?.isConnected}
                            variant="outline"
                            className="w-full"
                        >
                            Print Test Page
                        </Button>

                        <Button
                            onClick={loadAvailableDevices}
                            disabled={isLoading}
                            variant="outline"
                            className="w-full"
                        >
                            Refresh Devices
                        </Button>

                        <Button
                            onClick={disconnectPrinter}
                            disabled={isLoading || !status?.isConnected}
                            variant="destructive"
                            className="w-full"
                        >
                            Disconnect Printer
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Available Devices */}
            {devices.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Available USB Devices</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {devices.map((device, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div>
                                        <p className="font-medium">{device.manufacturer} - {device.product}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Vendor ID: {device.vendorId} | Product ID: {device.productId}
                                        </p>
                                    </div>
                                    <Badge variant="outline">{device.deviceAddress}</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Printer Information */}
            {status && (
                <Card>
                    <CardHeader>
                        <CardTitle>Printer Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium">Status:</span>
                                <Badge variant={getStatusColor()} className="ml-2">
                                    {getStatusText()}
                                </Badge>
                            </div>
                            <div>
                                <span className="font-medium">Type:</span>
                                <span className="ml-2 capitalize">{status.config?.type || 'Not set'}</span>
                            </div>
                            <div>
                                <span className="font-medium">Device:</span>
                                <span className="ml-2">{status.config?.device || 'Not set'}</span>
                            </div>
                            <div>
                                <span className="font-medium">Options:</span>
                                <span className="ml-2">{status.config?.options ? JSON.stringify(status.config.options) : 'None'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Print History */}
            <Card>
                <CardHeader>
                    <CardTitle>Print History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {printHistory.length > 0 ? (
                            printHistory.map((job, index) => (
                                <div key={job.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                            <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}>
                                                {job.job_type.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                            <span className="text-sm text-muted-foreground">
                                                {job.status === 'completed' ? 'Completed' : job.status === 'failed' ? 'Failed' : 'Pending'}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium mt-1">
                                            Order: {job.order_id || 'N/A'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(job.created_at || job.attempted_at).toLocaleString()}
                                        </p>
                                        {job.error_message && (
                                            <p className="text-xs text-destructive mt-1">
                                                Error: {job.error_message}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        {job.status === 'completed' && (
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        )}
                                        {job.status === 'failed' && (
                                            <XCircle className="w-5 h-5 text-red-500" />
                                        )}
                                        {job.status === 'pending' && (
                                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <p className="text-sm">No print history available</p>
                                <p className="text-xs">Print jobs will appear here after you print receipts</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PrinterManager;
