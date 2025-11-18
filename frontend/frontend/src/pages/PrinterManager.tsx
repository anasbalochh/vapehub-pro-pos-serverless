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

            // Show message if permission is needed
            if (response.data?.needsPermission) {
                toast.info('Click "Request USB Device" to grant access to your printer');
            }
        } catch (error) {
            console.error('Failed to load devices:', error);
            toast.error('Failed to load available devices');
            setDevices([]); // Ensure devices is always an array
        }
    };

    const requestUsbDevice = async () => {
        setIsLoading(true);
        try {
            const response = await printerApi.requestUsbDevice();
            toast.success('USB device access granted!');

            // Refresh device list
            await loadAvailableDevices();

            // Auto-select the newly granted device
            if (response.data?.device) {
                setPrinterConfig({
                    ...printerConfig,
                    type: 'usb',
                    device: response.data.device.deviceAddress
                });
            }
        } catch (error: any) {
            console.error('Failed to request USB device:', error);
            toast.error(error.message || 'Failed to request USB device access');
        } finally {
            setIsLoading(false);
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

            if (response.data.isConnected) {
                toast.success(response.data.message || 'Printer connected successfully!');

                // Immediately update status with the response data
                setStatus({
                    isConnected: true,
                    config: response.data.config || printerConfig
                });
            } else {
                toast.error(response.data.error || 'Failed to connect printer');
                setStatus({
                    isConnected: false,
                    config: response.data.config || null
                });
            }

            // Also refresh status from API
            setTimeout(() => {
                loadPrinterStatus();
            }, 500);
        } catch (error: any) {
            console.error('Failed to initialize printer:', error);
            const errorMessage = error?.message || error?.response?.data?.message || 'Failed to initialize printer';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const testPrinter = async () => {
        setIsLoading(true);
        try {
            const response = await printerApi.test();
            toast.success(response.data?.message || 'Printer test successful');
        } catch (error: any) {
            console.error('Printer test failed:', error);
            const errorMessage = error?.message || error?.response?.data?.message || 'Printer test failed';
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const printTestPage = async () => {
        setIsLoading(true);
        try {
            const response = await printerApi.printTestPage();
            toast.success(response.data?.message || 'Test page printed successfully');
        } catch (error: any) {
            console.error('Failed to print test page:', error);
            const errorMessage = error?.message || error?.response?.data?.message || 'Failed to print test page';
            toast.error(errorMessage);
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
                            <Label htmlFor="printer-type" className="text-base font-semibold">Printer Type</Label>
                            <Select
                                value={printerConfig.type}
                                onValueChange={(value) => {
                                    setPrinterConfig({ ...printerConfig, type: value, device: '' });
                                }}
                            >
                                <SelectTrigger className="h-11">
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
                            <p className="text-xs text-muted-foreground">
                                Choose your printer connection type. USB printers work directly in the browser, while network printers require an IP address.
                            </p>
                        </div>

                        {/* Fixed height container to prevent layout shift */}
                        <div className="min-h-[280px] transition-all duration-200">
                            {printerConfig.type === 'network' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="printer-address" className="text-base font-semibold">
                                            Network Printer Address
                                        </Label>
                                        <Input
                                            id="printer-address"
                                            placeholder="192.168.1.100:9100"
                                            value={printerConfig.device}
                                            onChange={(e) => setPrinterConfig({ ...printerConfig, device: e.target.value })}
                                            className="h-11"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Enter the printer's IP address and port (usually 9100 for raw printing).
                                            <br />
                                            <strong>Example:</strong> 192.168.1.100:9100
                                        </p>
                                    </div>
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                            <div className="text-xs text-blue-800 dark:text-blue-200">
                                                <strong>Network Printing:</strong> Your printer address will be saved and receipts can be printed in real-time when the printer is accessible on your network.
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                                        <div className="flex items-start gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                            <div className="text-xs text-green-800 dark:text-green-200">
                                                <strong>Real-time Printing:</strong> Once connected, receipts will print automatically when orders are completed.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {printerConfig.type === 'usb' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="printer-device" className="text-base font-semibold">
                                            USB Device
                                        </Label>
                                        {devices && devices.length > 0 ? (
                                            <>
                                                <Select
                                                    value={printerConfig.device}
                                                    onValueChange={(value) => setPrinterConfig({ ...printerConfig, device: value })}
                                                >
                                                    <SelectTrigger className="h-11">
                                                        <SelectValue placeholder="Select USB device" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {devices.map((device, index) => (
                                                            <SelectItem key={index} value={device.deviceAddress}>
                                                                <div className="flex items-center gap-2">
                                                                    <Usb className="w-4 h-4" />
                                                                    <span>{device.manufacturer} - {device.product}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-xs text-muted-foreground">
                                                    Select your USB printer from the list above. Make sure your printer is connected and powered on.
                                                </p>
                                            </>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="p-4 border border-yellow-200 dark:border-yellow-800 rounded-md bg-yellow-50 dark:bg-yellow-900/20">
                                                    <div className="flex items-start gap-2">
                                                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                                        <div>
                                                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                                                No USB printers detected
                                                            </p>
                                                            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                                                Click the button below to grant browser access to your USB printer. Make sure your printer is connected via USB and powered on.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={requestUsbDevice}
                                                    variant="outline"
                                                    className="w-full h-11"
                                                    disabled={isLoading}
                                                >
                                                    <Usb className="w-4 h-4 mr-2" />
                                                    Request USB Device Access
                                                </Button>
                                                <p className="text-xs text-muted-foreground text-center">
                                                    <strong>Note:</strong> You'll need to grant permission when prompted by your browser.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    {devices && devices.length > 0 && (
                                        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                                            <div className="flex items-start gap-2">
                                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                                <div className="text-xs text-green-800 dark:text-green-200">
                                                    <strong>Real-time Printing:</strong> Once connected, receipts will print automatically when orders are completed.
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 pt-2 border-t">
                            <Button
                                onClick={initializePrinter}
                                disabled={isLoading || !printerConfig.device}
                                className="flex-1 h-11 font-semibold"
                            >
                                {isLoading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Connect Printer
                                    </>
                                )}
                            </Button>

                            {printerConfig.type === 'usb' && (
                                <Button
                                    onClick={loadAvailableDevices}
                                    variant="outline"
                                    disabled={isLoading}
                                    className="px-4 h-11"
                                    title="Refresh USB devices"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                </Button>
                            )}
                        </div>
                        {!printerConfig.device && (
                            <p className="text-xs text-muted-foreground text-center">
                                Please select a printer device or enter a network address to continue
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Printer Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TestTube className="w-5 h-5" />
                            Printer Actions & Testing
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {status?.isConnected ? (
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md mb-4">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    <div>
                                        <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                                            Printer Connected
                                        </p>
                                        <p className="text-xs text-green-700 dark:text-green-300">
                                            Receipts will print automatically when orders are completed
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md mb-4">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                    <div>
                                        <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                                            Printer Not Connected
                                        </p>
                                        <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                            Connect your printer first to enable real-time receipt printing
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Button
                                onClick={testPrinter}
                                disabled={isLoading || !status?.isConnected}
                                variant="outline"
                                className="w-full h-11"
                            >
                                <TestTube className="w-4 h-4 mr-2" />
                                Test Connection
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                Verify that your printer is responding correctly
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Button
                                onClick={printTestPage}
                                disabled={isLoading || !status?.isConnected}
                                variant="outline"
                                className="w-full h-11"
                            >
                                <Printer className="w-4 h-4 mr-2" />
                                Print Test Page
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                Print a sample receipt to verify printer setup
                            </p>
                        </div>

                        {printerConfig.type === 'usb' && (
                            <div className="space-y-2">
                                <Button
                                    onClick={loadAvailableDevices}
                                    disabled={isLoading}
                                    variant="outline"
                                    className="w-full h-11"
                                >
                                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                    Refresh USB Devices
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                    Scan for newly connected USB printers
                                </p>
                            </div>
                        )}

                        <div className="pt-2 border-t">
                            <Button
                                onClick={disconnectPrinter}
                                disabled={isLoading || !status?.isConnected}
                                variant="destructive"
                                className="w-full h-11"
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Disconnect Printer
                            </Button>
                        </div>
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
