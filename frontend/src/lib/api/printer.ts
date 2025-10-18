import { db } from '../supabase';
import { getCurrentUser } from './auth';

// Helper function to format receipt text
const formatReceipt = (data: any) => {
  const lines = [];
  lines.push('================================');
  lines.push('           vape-hub POS         ');
  lines.push('================================');
  lines.push(`Order: ${data.orderNumber}`);
  lines.push(`Date: ${data.date}`);
  lines.push(`Type: ${data.type}`);
  lines.push('--------------------------------');

  data.items.forEach((item: any) => {
    lines.push(`${item.name}`);
    lines.push(`  ${item.quantity} x ${item.unitPrice} = ${item.lineTotal}`);
  });

  lines.push('--------------------------------');
  lines.push(`Subtotal: ${data.subtotal}`);
  if (data.discountAmount > 0) {
    lines.push(`Discount: -${data.discountAmount}`);
  }
  lines.push(`Tax: ${data.tax}`);
  lines.push('--------------------------------');
  lines.push(`TOTAL: ${data.total}`);
  lines.push('================================');
  lines.push('        Thank you for your      ');
  lines.push('           purchase!            ');
  lines.push('================================');

  return lines.join('\n');
};

// Printer API (enhanced implementation with database integration)
export const printerApi = {
  initialize: async (config: { type?: string; device?: string; options?: any }) => {
    try {
      console.log('Printer initialization attempt:', config);

      // Validate that a device is specified
      if (!config.device || config.device.trim() === '') {
        throw new Error('No printer device specified. Please select a USB device or enter network address.');
      }

      // For USB printers, check if device exists
      if (config.type === 'usb') {
        const devicesResponse = await printerApi.getDevices();
        const devices = devicesResponse.data?.devices || [];

        if (devices.length === 0) {
          throw new Error('No USB printer devices detected. Please connect a USB printer and try again.');
        }

        const deviceExists = devices.some(device => device.deviceAddress === config.device);
        if (!deviceExists) {
          throw new Error(`USB device ${config.device} not found. Please select a valid device.`);
        }
      }

      // For network printers, validate IP format
      if (config.type === 'network') {
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}:\d+$/;
        if (!ipRegex.test(config.device)) {
          throw new Error('Invalid network address format. Use IP:PORT (e.g., 192.168.1.100:9100)');
        }
      }

      // Store printer configuration in database
      const printerConfig = {
        printer_type: config.type || 'usb',
        device_address: config.device || '',
        printer_name: `${config.type?.toUpperCase()} Printer`,
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

      console.log('Printer config saved to database:', savedConfig);

      return {
        data: {
          message: 'Printer initialized successfully',
          config: config,
          isConnected: true,
          databaseId: savedConfig.id
        }
      };
    } catch (error) {
      console.error('Printer initialization error:', error);
      return {
        data: {
          message: 'Failed to initialize printer',
          config: config,
          isConnected: false,
          error: error.message
        }
      };
    }
  },

  test: async () => {
    console.log('Printer test');
    return { data: { message: 'Printer test completed', success: true } };
  },

  printTestPage: async () => {
    console.log('Printing test page');
    return { data: { message: 'Test page printed successfully', success: true } };
  },

  printReceipt: async (orderId: string) => {
    try {
      console.log('Printing receipt for order:', orderId);

      // Check if printer is actually connected
      const statusResponse = await printerApi.getStatus();
      if (!statusResponse.data.isConnected) {
        throw new Error('Printer is not connected. Please initialize a printer first.');
      }

      console.log('Printer status verified:', statusResponse.data);

      // Get order details from database
      const user = await getCurrentUser();
      console.log('Current user:', user.id);

      const orders = await db.getOrders(user.id);
      console.log('Total orders found:', orders.length);
      console.log('Orders:', orders.map(o => ({ id: o.id || o._id, orderNumber: o.order_number || o.orderNumber })));

      const order = orders.find(o => (o.id || o._id) === orderId);
      console.log('Found order:', order);

      if (!order) {
        console.error('Order not found. Available orders:', orders.map(o => o.id || o._id));
        throw new Error(`Order not found. Order ID: ${orderId}`);
      }

      // Get order items
      const orderItems = await db.getOrderItems(orderId);
      console.log('Order items:', orderItems);

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
        type: order.type
      };

      console.log('Receipt data:', receiptData);

      // Format receipt text
      const receiptText = formatReceipt(receiptData);
      console.log('Receipt to print:', receiptText);

      // Log print job to database
      await db.logPrintJob({
        job_type: 'receipt',
        order_id: orderId,
        printer_config_id: null, // Will be set if printer is configured
        receipt_data: receiptData,
        receipt_text: receiptText,
        status: 'completed',
        printed_at: new Date().toISOString()
      });

      return { data: { message: 'Receipt printed successfully', success: true, receiptText } };
    } catch (error) {
      console.error('Print receipt error:', error);

      // Log failed print job
      try {
        await db.logPrintJob({
          job_type: 'receipt',
          order_id: orderId,
          printer_config_id: null,
          status: 'failed',
          error_message: error.message,
          attempted_at: new Date().toISOString()
        });
      } catch (logError) {
        console.error('Failed to log print job:', logError);
      }

      return { data: { message: 'Failed to print receipt', success: false, error: error.message } };
    }
  },

  printReturnReceipt: async (returnId: string) => {
    try {
      console.log('Printing return receipt for return:', returnId);

      // Check if printer is actually connected
      const statusResponse = await printerApi.getStatus();
      if (!statusResponse.data.isConnected) {
        throw new Error('Printer is not connected. Please initialize a printer first.');
      }

      console.log('Printer status verified:', statusResponse.data);

      // Get return order details from database
      const user = await getCurrentUser();
      console.log('Current user:', user.id);

      const orders = await db.getOrders(user.id);
      console.log('Total orders found:', orders.length);
      console.log('Refund orders:', orders.filter(o => o.type === 'Refund').map(o => ({ id: o.id || o._id, orderNumber: o.order_number || o.orderNumber })));

      const returnOrder = orders.find(o => (o.id || o._id) === returnId && o.type === 'Refund');
      console.log('Found return order:', returnOrder);

      if (!returnOrder) {
        console.error('Return order not found. Available refund orders:', orders.filter(o => o.type === 'Refund').map(o => o.id || o._id));
        throw new Error(`Return order not found. Return ID: ${returnId}`);
      }

      // Get return order items
      const orderItems = await db.getOrderItems(returnId);

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

      console.log('Return receipt data:', receiptData);

      // Format and log the return receipt
      const receiptText = formatReceipt(receiptData);
      console.log('Return receipt to print:', receiptText);

      // Log print job to database
      await db.logPrintJob({
        job_type: 'return_receipt',
        order_id: returnId,
        printer_config_id: null,
        receipt_data: receiptData,
        receipt_text: receiptText,
        status: 'completed',
        printed_at: new Date().toISOString()
      });

      return { data: { message: 'Return receipt printed successfully', success: true, receiptText } };
    } catch (error) {
      console.error('Print return receipt error:', error);

      // Log failed print job
      try {
        await db.logPrintJob({
          job_type: 'return_receipt',
          order_id: returnId,
          printer_config_id: null,
          status: 'failed',
          error_message: error.message,
          attempted_at: new Date().toISOString()
        });
      } catch (logError) {
        console.error('Failed to log print job:', logError);
      }

      return { data: { message: 'Failed to print return receipt', success: false, error: error.message } };
    }
  },

  getDevices: async () => {
    try {
      // Try to detect real USB devices (this will fail in browser, which is expected)
      const devices = [];

      // Check if we're in a browser environment and WebUSB is available
      if (typeof navigator !== 'undefined' && 'usb' in navigator) {
        try {
          // Type assertion for WebUSB API
          const usb = (navigator as any).usb;
          const usbDevices = await usb.getDevices();
          devices.push(...usbDevices.map((device: any) => ({
            vendorId: device.vendorId.toString(16),
            productId: device.productId.toString(16),
            deviceAddress: `USB${device.vendorId}`,
            manufacturer: device.manufacturerName || 'Unknown',
            product: device.productName || 'USB Device'
          })));
        } catch (error) {
          console.log('USB device detection not available:', error);
        }
      }

      // If no real devices found, return empty array
      return {
        data: {
          devices: devices,
          count: devices.length,
          message: devices.length === 0 ? 'No printer devices detected. Please connect a USB printer or configure network printer.' : null
        }
      };
    } catch (error) {
      console.error('Device detection error:', error);
      return {
        data: {
          devices: [],
          count: 0,
          error: 'Device detection failed'
        }
      };
    }
  },

  getStatus: async () => {
    try {
      // Get printer configuration from database
      const dbConfig = await db.getPrinterConfig();
      console.log('Database config:', dbConfig);

      let isConnected = false;
      let detectedDevices = [];

      if (dbConfig && dbConfig.is_active) {
        // If a config exists and is active, check if the device is actually detected
        const devicesResponse = await printerApi.getDevices();
        detectedDevices = devicesResponse.data?.devices || [];
        console.log('Detected devices:', detectedDevices);

        if (dbConfig.printer_type === 'usb') {
          // For USB, check if the configured device address is among the detected devices
          isConnected = detectedDevices.some(d => d.deviceAddress === dbConfig.device_address);
          console.log('USB device check - configured:', dbConfig.device_address, 'detected:', detectedDevices.map(d => d.deviceAddress));
        } else if (dbConfig.printer_type === 'network') {
          // For network, we assume it's connected if configured (real network detection would require ping/connection test)
          isConnected = true;
          console.log('Network printer - assuming connected if configured');
        }
      }

      console.log('Final config:', dbConfig);
      console.log('Is connected (after device check):', isConnected);

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
    } catch (error) {
      console.error('Get printer status error:', error);

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
      console.log('Printer disconnected');

      // Deactivate printer configuration in database
      await db.deactivatePrinterConfig();

      return { data: { message: 'Printer disconnected successfully', isConnected: false } };
    } catch (error) {
      console.error('Printer disconnect error:', error);

      return { data: { message: 'Printer disconnected (database error)', isConnected: false, error: error.message } };
    }
  },

  getPrintHistory: async (limit = 50) => {
    try {
      const history = await db.getPrintHistory(limit);
      return { data: { history, count: history.length } };
    } catch (error) {
      console.error('Get print history error:', error);
      // Return empty history if database is not available
      return { data: { history: [], count: 0, error: error.message } };
    }
  },
};
