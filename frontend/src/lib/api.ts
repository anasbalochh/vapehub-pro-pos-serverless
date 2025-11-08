// Re-export all API modules for backward compatibility
export { authApi } from './api/auth';
export { productsApi } from './api/products';
export { ordersApi } from './api/orders';
export { reportsApi } from './api/reports';
export { printerApi } from './api/printer';

// Re-export types
export type { Product } from './api/products';
export type { Order } from './api/orders';
export type { ReportSummary, Transaction, OrderItem } from './api/reports';