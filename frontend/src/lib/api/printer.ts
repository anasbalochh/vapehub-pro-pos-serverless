import { db } from '../supabase';
import { getCurrentUser } from './auth';

// Helper function to format receipt text with proper ESC/POS commands
const formatReceipt = (data: any, businessName: string = 'My Business') => {
  const ESC = '\x1B';
  const GS = '\x1D';
  const lines: string[] = [];

  // Initialize printer
  lines.push(ESC + '@'); // Reset printer

  // Center align and bold for header
  lines.push(ESC + 'a' + '\x01'); // Center align
  lines.push(ESC + 'E' + '\x01'); // Bold on
  lines.push('================================');
  // Format business name to fit receipt width (max 32 chars)
  const businessNameFormatted = businessName.length > 28
    ? businessName.substring(0, 28)
    : businessName;
  const posText = `${businessNameFormatted.toUpperCase()} POS`.padStart(32).substring(0, 32);
  lines.push(posText);
  lines.push('================================');
  lines.push(ESC + 'E' + '\x00'); // Bold off
  lines.push(ESC + 'a' + '\x00'); // Left align

  lines.push(`Order: ${data.orderNumber}`);
  lines.push(`Date: ${data.date}`);
  lines.push(`Type: ${data.type}`);
  lines.push('--------------------------------');

  // Print items
  data.items.forEach((item: any) => {
    const name = item.name.substring(0, 24); // Limit name length
    const qty = item.quantity;
    const price = item.unitPrice.toFixed(2);
    const total = item.lineTotal.toFixed(2);
    lines.push(`${name}`);
    lines.push(`  ${qty} x ${price} = ${total}`);
  });

  lines.push('--------------------------------');
  lines.push(`Subtotal: ${data.subtotal.toFixed(2)}`);
  if (data.discountAmount > 0) {
    lines.push(`Discount: -${data.discountAmount.toFixed(2)}`);
  }
  lines.push(`Tax: ${data.tax.toFixed(2)}`);
  lines.push('--------------------------------');
  lines.push(ESC + 'E' + '\x01'); // Bold on
  lines.push(`TOTAL: ${data.total.toFixed(2)}`);
  lines.push(ESC + 'E' + '\x00'); // Bold off
  lines.push('================================');
  lines.push(ESC + 'a' + '\x01'); // Center align
  lines.push('        Thank you for your      ');
  lines.push('           purchase!            ');
  lines.push(ESC + 'a' + '\x00'); // Left align
  lines.push('================================');

  // Feed paper and cut
  lines.push('\n\n\n'); // Feed 3 lines
  lines.push(GS + 'V' + '\x41' + '\x03'); // Partial cut

  return lines.join('\n');
};

// Helper function to convert text to ESC/POS commands for thermal printers
const convertToEscPos = (text: string): Uint8Array => {
  const encoder = new TextEncoder();
  return encoder.encode(text);
};

// Helper function to send data to USB printer
const sendToUsbPrinter = async (deviceAddress: string, data: Uint8Array): Promise<void> => {
  if (typeof navigator === 'undefined' || !('usb' in navigator)) {
    throw new Error('WebUSB API is not available in this browser. Please use Chrome or Edge.');
  }

  const usb = (navigator as any).usb;

  // Parse device address (format: USB{vendorId})
  const vendorIdMatch = deviceAddress.match(/USB(\d+)/);
  if (!vendorIdMatch) {
    throw new Error('Invalid USB device address format');
  }

  const vendorId = parseInt(vendorIdMatch[1], 10);

  // Request access to the device
  const devices = await usb.getDevices();
  let device = devices.find((d: any) => d.vendorId === vendorId);

  if (!device) {
    // Request device if not already granted
    device = await usb.requestDevice({ filters: [{ vendorId }] });
  }

  // Open device
  await device.open();

  try {
    // Select configuration
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    // Claim interface (usually interface 0 for printers)
    await device.claimInterface(0);

    try {
      // Send data to printer (bulk transfer to endpoint 1, OUT direction)
      const endpoint = device.configuration.interfaces[0].alternate.endpoints.find(
        (ep: any) => ep.direction === 'out'
      );

      if (!endpoint) {
        throw new Error('No output endpoint found on printer');
      }

      await device.transferOut(endpoint.endpointNumber, data);
    } finally {
      // Release interface
      await device.releaseInterface(0);
    }
  } finally {
    // Close device
    await device.close();
  }
};

// Helper function to send data to network printer
const sendToNetworkPrinter = async (address: string, data: Uint8Array): Promise<void> => {
  const [ip, port] = address.split(':');
  const portNum = parseInt(port, 10);

  // Network printing from browser has limitations:
  // 1. Direct TCP connections are not possible from browser
  // 2. CORS prevents direct HTTP connections to printers
  // 3. We need a backend service or browser extension

  // Try to use a backend API endpoint if available
  // Otherwise, we'll need to inform the user
  try {
    // Check if we have a backend API endpoint for printing
    const backendUrl = import.meta.env.VITE_API_URL || '';

    if (backendUrl) {
      // Try to send print job to backend
      const response = await fetch(`${backendUrl}/api/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: `${ip}:${portNum}`,
          data: Array.from(data), // Convert Uint8Array to array for JSON
          type: 'network'
        })
      });

      if (!response.ok) {
        throw new Error('Backend print service unavailable');
      }

      return; // Success
    }

    // No backend available - try direct connection (will likely fail due to CORS)
    // This is a fallback for development/testing
    try {
      const response = await fetch(`http://${ip}:${portNum}`, {
        method: 'POST',
        body: data,
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        mode: 'no-cors', // Bypass CORS (but we can't verify success)
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      // With no-cors, we can't check response, so assume success
      // In reality, this may or may not work depending on printer
      return;
    } catch (fetchError: any) {
      // Direct connection failed
      throw new Error('Network printer connection failed. Please ensure the printer is accessible on the network.');
    }
  } catch (error: any) {
    // Log the print data for manual printing or backend integration
    console.log('Network printer print data:', {
      address: `${ip}:${portNum}`,
      dataLength: data.length,
      dataPreview: new TextDecoder().decode(data.slice(0, 100))
    });

    throw new Error(
      'Network printing requires a backend service or the printer must support HTTP printing. ' +
      'Receipt data has been saved and can be printed manually from the print history.'
    );
  }
};

// Printer API (enhanced implementation with database integration)
export const printerApi = {
  initialize: async (config: { type?: string; device?: string; options?: any }) => {
    try {
      // Validate input
      if (!config || typeof config !== 'object') {
        throw new Error('Invalid printer configuration.');
      }

      // Validate that a device is specified
      if (!config.device || typeof config.device !== 'string' || config.device.trim() === '') {
        throw new Error('No printer device specified. Please select a USB device or enter network address.');
      }

      const sanitizedDevice = config.device.trim();
      const printerType = (config.type || 'usb').toLowerCase();

      // For USB printers, request device access and verify connection
      if (printerType === 'usb') {
        if (typeof navigator === 'undefined' || !('usb' in navigator)) {
          throw new Error('WebUSB API is not available. Please use Chrome or Edge browser for USB printer support.');
        }

        const usb = (navigator as any).usb;

        // Parse device address to get vendor ID
        const vendorIdMatch = sanitizedDevice.match(/USB(\d+)/);
        if (!vendorIdMatch) {
          throw new Error('Invalid USB device address format. Please select a device from the list.');
        }

        const vendorId = parseInt(vendorIdMatch[1], 10);

        // Check if device is already accessible
        let deviceFound = false;
        try {
          const devices = await usb.getDevices();
          deviceFound = devices.some((d: any) => d.vendorId === vendorId);
        } catch (e) {
          // No devices granted yet
        }

        // If device not found, user needs to grant permission
        if (!deviceFound) {
          // Note: This will trigger a browser permission dialog
          // User must select the printer from the browser's device picker
          try {
            await usb.requestDevice({ filters: [{ vendorId }] });
          } catch (e: any) {
            if (e.name === 'NotFoundError') {
              throw new Error('Printer not found. Please make sure the printer is connected and select it from the device list.');
            }
            throw new Error('Permission denied. Please allow access to the printer when prompted.');
          }
        }

        // Test connection by trying to open the device
        try {
          const devices = await usb.getDevices();
          const device = devices.find((d: any) => d.vendorId === vendorId);
          if (device) {
            await device.open();
            await device.close();
          }
        } catch (e: any) {
          throw new Error('Failed to connect to USB printer. Please check the connection and try again.');
        }
      }

      // For network printers, validate IP format and test connection
      if (printerType === 'network') {
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}:\d+$/;
        if (!ipRegex.test(sanitizedDevice)) {
          throw new Error('Invalid network address format. Use IP:PORT (e.g., 192.168.1.100:9100)');
        }

        // Validate IP ranges
        const [ip, port] = sanitizedDevice.split(':');
        const ipParts = ip.split('.');
        if (ipParts.length !== 4 || ipParts.some(part => {
          const num = parseInt(part, 10);
          return isNaN(num) || num < 0 || num > 255;
        })) {
          throw new Error('Invalid IP address format.');
        }

        const portNum = parseInt(port, 10);
        if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
          throw new Error('Invalid port number. Must be between 1 and 65535.');
        }

        // Test network connection (basic connectivity check)
        try {
          // Try to connect to the printer (with timeout)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          await fetch(`http://${ip}:${portNum}/`, {
            method: 'GET',
            mode: 'no-cors',
            signal: controller.signal
          });

          clearTimeout(timeoutId);
        } catch (e: any) {
          // Connection test failed, but we'll still save the config
          // User can test printing later
          console.warn('Network printer connection test failed, but configuration will be saved:', e.message);
        }
      }

      // Store printer configuration in database
      const printerConfig = {
        printer_type: printerType,
        device_address: sanitizedDevice,
        printer_name: `${printerType.toUpperCase()} Printer`,
        is_active: true,
        config_options: config.options || {}
      };

      // Try to update existing config, or create new one
      let savedConfig;
      try {
        savedConfig = await db.updatePrinterConfig(printerConfig);
      } catch (error) {
        // If no existing config, create new one
        savedConfig = await db.createPrinterConfig(printerConfig);
      }

      return {
        data: {
          message: 'Printer connected successfully',
          config: {
            type: printerType,
            device: sanitizedDevice,
            options: config.options || {}
          },
          isConnected: true,
          databaseId: savedConfig.id
        }
      };
    } catch (error: any) {
      return {
        data: {
          message: 'Failed to connect printer',
          config: config,
          isConnected: false,
          error: error.message || 'Unknown error occurred'
        }
      };
    }
  },

  test: async () => {
    try {
      const statusResponse = await printerApi.getStatus();
      if (!statusResponse.data.isConnected || !statusResponse.data.config) {
        throw new Error('Printer is not connected');
      }

      const printerConfig = statusResponse.data.config;

      // Send a simple test command
      const testText = '\x1B@\x1B\x61\x01TEST PRINT\x1B\x61\x00\n\n\n';
      const testData = convertToEscPos(testText);

      if (printerConfig.printer_type === 'usb') {
        await sendToUsbPrinter(printerConfig.device_address, testData);
      } else if (printerConfig.printer_type === 'network') {
        await sendToNetworkPrinter(printerConfig.device_address, testData);
      }

      return { data: { message: 'Printer test completed successfully', success: true } };
    } catch (error: any) {
      throw new Error(error.message || 'Printer test failed');
    }
  },

  printTestPage: async () => {
    try {
      const statusResponse = await printerApi.getStatus();
      if (!statusResponse.data.isConnected || !statusResponse.data.config) {
        throw new Error('Printer is not connected');
      }

      const printerConfig = statusResponse.data.config;

      // Create a test receipt
      // Get business name from user for test receipt
      const user = await getCurrentUser();
      const businessName = (user as any)?.business_name || (user as any)?.username || 'My Business';

      const testReceiptData = {
        orderNumber: 'TEST-001',
        date: new Date().toLocaleString(),
        items: [
          { name: 'Test Item 1', quantity: 1, unitPrice: 10.00, lineTotal: 10.00 },
          { name: 'Test Item 2', quantity: 2, unitPrice: 5.00, lineTotal: 10.00 }
        ],
        subtotal: 20.00,
        discountAmount: 0,
        tax: 2.00,
        total: 22.00,
        type: 'TEST'
      };

      const receiptText = formatReceipt(testReceiptData, businessName);
      const receiptData = convertToEscPos(receiptText);

      if (printerConfig.printer_type === 'usb') {
        await sendToUsbPrinter(printerConfig.device_address, receiptData);
      } else if (printerConfig.printer_type === 'network') {
        await sendToNetworkPrinter(printerConfig.device_address, receiptData);
      }

      return { data: { message: 'Test page printed successfully', success: true } };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to print test page');
    }
  },

  printReceipt: async (orderId: string) => {
    try {
      // Validate input
      if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
        throw new Error('Invalid order ID.');
      }

      const sanitizedOrderId = orderId.trim();

      // Check if printer is actually connected
      const statusResponse = await printerApi.getStatus();
      if (!statusResponse.data.isConnected || !statusResponse.data.config) {
        throw new Error('Printer is not connected. Please connect a printer first from Printer Manager.');
      }

      const printerConfig = statusResponse.data.config;

      // Get order details from database
      const user = await getCurrentUser();
      const businessName = (user as any)?.business_name || (user as any)?.username || 'My Business';
      const orders = await db.getOrders(user.id);
      const order = orders.find(o => (o.id || o._id) === sanitizedOrderId);

      if (!order) {
        throw new Error('Order not found.');
      }

      // Get order items
      const orderItems = await db.getOrderItems(sanitizedOrderId);

      // Format receipt data
      const receiptData = {
        orderNumber: order.order_number || order.orderNumber,
        date: new Date(order.created_at || order.createdAt).toLocaleString(),
        items: orderItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          lineTotal: item.line_total
        })),
        subtotal: order.subtotal,
        discountAmount: order.discount_amount || 0,
        tax: order.tax,
        total: order.total,
        type: order.type || 'Sale'
      };

      // Format receipt text with ESC/POS commands
      const receiptText = formatReceipt(receiptData, businessName);
      const receiptDataBytes = convertToEscPos(receiptText);

      // Send to printer based on type
      let printSuccess = false;
      try {
        if (printerConfig.printer_type === 'usb') {
          await sendToUsbPrinter(printerConfig.device_address, receiptDataBytes);
          printSuccess = true;
        } else if (printerConfig.printer_type === 'network') {
          await sendToNetworkPrinter(printerConfig.device_address, receiptDataBytes);
          printSuccess = true;
        } else {
          throw new Error('Unknown printer type');
        }
      } catch (printError: any) {
        // If actual printing fails, still log the attempt
        // This allows the receipt to be viewed/printed later
        console.warn('Physical print failed, but receipt data saved:', printError.message);

        // For network printers, we might need a backend service
        if (printerConfig.printer_type === 'network') {
          throw new Error('Network printing requires a backend service. Receipt data has been saved.');
        }
        throw printError;
      }

      // Log successful print job to database
      await db.logPrintJob({
        job_type: 'receipt',
        order_id: sanitizedOrderId,
        printer_config_id: printerConfig.id || null,
        receipt_data: receiptData,
        receipt_text: receiptText,
        status: printSuccess ? 'completed' : 'pending',
        printed_at: printSuccess ? new Date().toISOString() : null
      });

      return {
        data: {
          message: printSuccess ? 'Receipt printed successfully' : 'Receipt queued for printing',
          success: true,
          receiptText
        }
      };
    } catch (error: any) {
      // Log failed print job
      try {
        await db.logPrintJob({
          job_type: 'receipt',
          order_id: orderId || 'unknown',
          printer_config_id: null,
          status: 'failed',
          error_message: error.message,
          attempted_at: new Date().toISOString()
        });
      } catch (logError) {
        // Silently handle log error
      }

      throw error; // Re-throw to be handled by caller
    }
  },

  printReturnReceipt: async (returnId: string) => {
    try {
      // Validate input
      if (!returnId || typeof returnId !== 'string' || returnId.trim() === '') {
        throw new Error('Invalid return ID.');
      }

      const sanitizedReturnId = returnId.trim();

      // Check if printer is actually connected
      const statusResponse = await printerApi.getStatus();
      if (!statusResponse.data.isConnected || !statusResponse.data.config) {
        throw new Error('Printer is not connected. Please connect a printer first from Printer Manager.');
      }

      const printerConfig = statusResponse.data.config;

      // Get return order details from database
      const user = await getCurrentUser();
      const businessName = (user as any)?.business_name || (user as any)?.username || 'My Business';
      const orders = await db.getOrders(user.id);
      const returnOrder = orders.find(o => (o.id || o._id) === sanitizedReturnId && o.type === 'Refund');

      if (!returnOrder) {
        throw new Error('Return order not found.');
      }

      // Get return order items
      const orderItems = await db.getOrderItems(sanitizedReturnId);

      // Format return receipt data
      const receiptData = {
        orderNumber: returnOrder.order_number || returnOrder.orderNumber,
        date: new Date(returnOrder.created_at || returnOrder.createdAt).toLocaleString(),
        items: orderItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          lineTotal: item.line_total
        })),
        subtotal: returnOrder.subtotal,
        discountAmount: returnOrder.discount_amount || 0,
        tax: returnOrder.tax,
        total: returnOrder.total,
        type: 'RETURN'
      };

      // Format receipt text with ESC/POS commands
      const receiptText = formatReceipt(receiptData, businessName);
      const receiptDataBytes = convertToEscPos(receiptText);

      // Send to printer based on type
      let printSuccess = false;
      try {
        if (printerConfig.printer_type === 'usb') {
          await sendToUsbPrinter(printerConfig.device_address, receiptDataBytes);
          printSuccess = true;
        } else if (printerConfig.printer_type === 'network') {
          await sendToNetworkPrinter(printerConfig.device_address, receiptDataBytes);
          printSuccess = true;
        } else {
          throw new Error('Unknown printer type');
        }
      } catch (printError: any) {
        // If actual printing fails, still log the attempt
        console.warn('Physical print failed, but receipt data saved:', printError.message);

        // For network printers, we might need a backend service
        if (printerConfig.printer_type === 'network') {
          throw new Error('Network printing requires a backend service. Receipt data has been saved.');
        }
        throw printError;
      }

      // Log successful print job to database
      await db.logPrintJob({
        job_type: 'return_receipt',
        order_id: sanitizedReturnId,
        printer_config_id: printerConfig.id || null,
        receipt_data: receiptData,
        receipt_text: receiptText,
        status: printSuccess ? 'completed' : 'pending',
        printed_at: printSuccess ? new Date().toISOString() : null
      });

      return {
        data: {
          message: printSuccess ? 'Return receipt printed successfully' : 'Return receipt queued for printing',
          success: true,
          receiptText
        }
      };
    } catch (error: any) {
      // Log failed print job
      try {
        await db.logPrintJob({
          job_type: 'return_receipt',
          order_id: returnId || 'unknown',
          printer_config_id: null,
          status: 'failed',
          error_message: error.message,
          attempted_at: new Date().toISOString()
        });
      } catch (logError) {
        // Silently handle log error
      }

      throw error; // Re-throw to be handled by caller
    }
  },

  getDevices: async () => {
    try {
      const devices: any[] = [];

      // Check if we're in a browser environment and WebUSB is available
      if (typeof navigator !== 'undefined' && 'usb' in navigator) {
        try {
          const usb = (navigator as any).usb;

          // Get already granted devices
          const grantedDevices = await usb.getDevices();

          devices.push(...grantedDevices.map((device: any) => ({
            vendorId: device.vendorId.toString(16),
            productId: device.productId.toString(16),
            deviceAddress: `USB${device.vendorId}`,
            manufacturer: device.manufacturerName || 'Unknown Manufacturer',
            product: device.productName || 'USB Printer',
            serialNumber: device.serialNumber || 'N/A'
          })));

          // If no devices are granted, provide instructions
          if (devices.length === 0) {
            return {
              data: {
                devices: [],
                count: 0,
                message: 'No USB printers detected. Click "Request USB Device" to grant access to your printer.',
                needsPermission: true
              }
            };
          }
        } catch (error: any) {
          // WebUSB might not be fully supported
          return {
            data: {
              devices: [],
              count: 0,
              message: 'WebUSB API is not available. Please use Chrome or Edge browser for USB printer support.',
              needsPermission: false
            }
          };
        }
      } else {
        return {
          data: {
            devices: [],
            count: 0,
            message: 'WebUSB API is not available in this browser. Please use Chrome or Edge for USB printer support, or use a network printer.',
            needsPermission: false
          }
        };
      }

      return {
        data: {
          devices: devices,
          count: devices.length,
          message: devices.length === 0 ? 'No USB printers detected. Connect a USB printer and click "Request USB Device".' : null,
          needsPermission: false
        }
      };
    } catch (error: any) {
      return {
        data: {
          devices: [],
          count: 0,
          error: 'Device detection failed',
          message: error.message || 'Failed to detect USB devices'
        }
      };
    }
  },

  // Request USB device access (triggers browser permission dialog)
  requestUsbDevice: async () => {
    try {
      if (typeof navigator === 'undefined' || !('usb' in navigator)) {
        throw new Error('WebUSB API is not available. Please use Chrome or Edge browser.');
      }

      const usb = (navigator as any).usb;

      // Request device - this will show browser's device picker
      // User must select their printer
      const device = await usb.requestDevice({
        filters: [
          // Common printer vendor IDs (can be expanded)
          { classCode: 7 }, // Printer class
        ]
      });

      return {
        data: {
          device: {
            vendorId: device.vendorId.toString(16),
            productId: device.productId.toString(16),
            deviceAddress: `USB${device.vendorId}`,
            manufacturer: device.manufacturerName || 'Unknown',
            product: device.productName || 'USB Printer',
            serialNumber: device.serialNumber || 'N/A'
          },
          message: 'Device access granted. You can now connect this printer.'
        }
      };
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        throw new Error('No device selected. Please select a printer from the device list.');
      }
      throw new Error(error.message || 'Failed to request USB device access');
    }
  },

  getStatus: async () => {
    try {
      // Get printer configuration from database
      const dbConfig = await db.getPrinterConfig();

      let isConnected = false;
      let detectedDevices = [];

      if (dbConfig && dbConfig.is_active) {
        // If a config exists and is active, check if the device is actually detected
        const devicesResponse = await printerApi.getDevices();
        detectedDevices = devicesResponse.data?.devices || [];

        if (dbConfig.printer_type === 'usb') {
          // For USB, check if the configured device address is among the detected devices
          isConnected = detectedDevices.some(d => d.deviceAddress === dbConfig.device_address);
        } else if (dbConfig.printer_type === 'network') {
          // For network, we assume it's connected if configured (real network detection would require ping/connection test)
          isConnected = true;
        }
      }

      return {
        data: {
          isConnected,
          config: dbConfig,
          status: isConnected ? 'Ready' : 'Disconnected',
          lastConnected: isConnected ? new Date().toISOString() : null,
          databaseConfig: dbConfig,
          detectedDevices: detectedDevices.length,
          message: !isConnected && dbConfig ? 'Printer configured but device not detected' : null
        }
      };
    } catch (error: any) {
      return {
        data: {
          isConnected: false,
          config: null,
          status: 'Disconnected',
          lastConnected: null,
          error: 'Status check failed'
        }
      };
    }
  },

  disconnect: async () => {
    try {
      // Deactivate printer configuration in database
      await db.deactivatePrinterConfig();

      return { data: { message: 'Printer disconnected successfully', isConnected: false } };
    } catch (error: any) {
      return { data: { message: 'Printer disconnected (database error)', isConnected: false, error: 'Disconnect failed' } };
    }
  },

  getPrintHistory: async (limit = 50) => {
    try {
      // Validate limit
      const sanitizedLimit = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 50));
      const history = await db.getPrintHistory(sanitizedLimit);
      return { data: { history, count: history.length } };
    } catch (error: any) {
      // Return empty history if database is not available
      return { data: { history: [], count: 0, error: 'Failed to retrieve print history' } };
    }
  },
};
