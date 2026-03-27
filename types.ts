// ============================================================================
// TYPES REPOSITORY PATTERN - Separación de interfaces de DB y UI
// ============================================================================

// ============================================================================
// 1. ENUMS - Valores constantes del sistema
// ============================================================================

export enum ItemType {
  SERVICE = 'SERVICE',
  PRODUCT = 'PRODUCT'
}

export enum PaymentMethod {
  CASH = 'EFECTIVO',
  CARD = 'TARJETA',
  TRANSFER = 'TRANSFERENCIA'
}

export enum TransactionStatus {
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING'
}

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum UserRole {
  ADMIN = 'ADMIN',
  BARBER = 'BARBER',
  CASHIER = 'CASHIER'
}

// ============================================================================
// 2. INTERFACES DE BASE DE DATOS (Tablas Supabase)
// ============================================================================

// Tabla: productos
export interface DBProducto {
  id: string;
  created_at: string;
  user_id: string;
  business_id: string;
  name: string;
  type: ItemType;
  price: number;
  brand?: string;
  stock?: number;
  cost?: number;
}

// Tabla: pedidos
export interface DBPedido {
  id: string;
  created_at: string;
  user_id: string;
  business_id: string;
  barber: string;
  total: number;
  payment_method: PaymentMethod;
  reference?: string;
  customer_id?: string | null;
}

// Tabla: variantes
export interface DBVariante {
  id: string;
  pedido_id: string;
  producto_id: string;
  business_id: string;
  name: string;
  type: ItemType;
  price: number;
  quantity: number;
  subtotal: number;
}

// Tabla: profiles
export interface DBProfile {
  id: string;
  created_at: string;
  business_id: string;
  role: 'owner' | 'barber';
  full_name: string | null;
  activo?: boolean;
  password_changed?: boolean;
}

// Tabla: citas
export interface DBCita {
  id: string;
  created_at: string;
  user_id: string;
  business_id: string;
  clientName: string;
  date: string;
  time: string;
  barber: string;
  service: string;
  status: AppointmentStatus;
  notes?: string;
}

// Tabla: admin_config
export interface DBAdminConfig {
  id: string;
  created_at: string;
  business_id: string;
  admin_pin: string;
  created_by: string;
}

// ============================================================================
// 3. INTERFACES DE UI/APLICACIÓN
// ============================================================================

// Para el catálogo en el POS
export interface CatalogItem {
  id: string;
  name: string;
  type: ItemType;
  price: number;
  brand?: string;
  stock?: number;
  cost?: number;
}

// Para el carrito de compras
export interface CartItem extends CatalogItem {
  quantity: number;
}

// Para transacciones completas
export interface Transaction {
  id: string;
  date: string;
  barber: string;
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  status?: TransactionStatus;
  customerId?: string;
}

// Para citas/agendamiento
export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  barberId: string;
  barberName?: string;
  service: string;
  status: AppointmentStatus;
  notes?: string;
}

// Para barberos/staff - El enum Barber está definido en constants.ts
// Esta interfaz es para datos completos de barbero
export interface BarberStaff {
  id: string;
  name: string;
  birthDate?: string;
  chairNumber?: number;
  role: UserRole;
  isActive: boolean;
}

// Interfaz para compatibilidad con Staff.tsx existente
export interface BarberSession {
  id: string;
  name: string;
  birthDate: string;
  chairNumber: number;
}

// Para clientes (Customers)
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  visits: number;
  totalSpent: number;
  lastVisit?: string;
  notes?: string;
}

// Para reportes y estadísticas
export interface SalesReport {
  period: string;
  totalSales: number;
  transactionCount: number;
  averageTicket: number;
  topBarber: string;
  topProduct: string;
}

export interface InventoryAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  needsReorder: boolean;
}

// ============================================================================
// 4. DTOs (Data Transfer Objects) para operaciones
// ============================================================================

// DTO para crear transacción vía RPC
export interface CreateTransactionDTO {
  user_id: string;
  business_id: string;
  barber: string;
  total: number;
  payment_method: PaymentMethod;
  reference?: string;
  items: Array<{
    producto_id: string;
    name: string;
    type: ItemType;
    price: number;
    quantity: number;
  }>;
}

// DTO para cancelar transacción
export interface CancelTransactionDTO {
  transaction_id: string;
  user_id: string;
  admin_pin?: string;
}

// DTO para validación de PIN
export interface ValidatePinDTO {
  business_id: string;
  admin_pin: string;
  user_id: string;
}

// DTO para actualizar inventario
export interface UpdateInventoryDTO {
  product_id: string;
  quantity: number;
  operation: 'ADD' | 'SUBTRACT' | 'SET';
  reason: string;
  user_id: string;
}

// ============================================================================
// 5. RESPONSE TYPES para operaciones
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface TransactionResponse extends ApiResponse<{
  transactionId: string;
  total: number;
  itemsCount: number;
  timestamp: string;
}> {}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// 6. STATE TYPES para componentes React
// ============================================================================

export type ViewState = 
  | 'WELCOME' 
  | 'DASHBOARD' 
  | 'POS' 
  | 'INVENTORY' 
  | 'REPORTS' 
  | 'STAFF' 
  | 'APPOINTMENTS'
  | 'PERSONAL'
  | 'CUSTOMERS';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: string;
}

export interface POSState {
  cart: CartItem[];
  selectedBarber: string | null;
  paymentMethod: PaymentMethod | null;
  reference: string;
  cashAmount: string;
  isProcessing: boolean;
}

// ============================================================================
// 7. UTILITY TYPES
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// Helper para extraer tipos de arrays
export type ArrayElement<ArrayType extends readonly unknown[]> = 
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

// Type guard para validación
export function isCatalogItem(item: any): item is CatalogItem {
  return (
    item &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    Object.values(ItemType).includes(item.type) &&
    typeof item.price === 'number' &&
    item.price >= 0
  );
}

export function isCartItem(item: any): item is CartItem {
  return (
    isCatalogItem(item) &&
    typeof item.quantity === 'number' &&
    item.quantity > 0
  );
}

// ============================================================================
// 8. CONSTANTS TYPES
// ============================================================================

export interface SystemConstants {
  MIN_TOUCH_TARGET: number; // 44px
  MOBILE_BREAKPOINT: number; // 768px
  MAX_CATALOG_ITEMS_FOR_LAZY_LOAD: number; // 50
  SESSION_TIMEOUT_MINUTES: number; // 30
  MAX_STOCK_ALERT: number; // 5
  MIN_PASSWORD_LENGTH: number; // 8
  PIN_LENGTH: number; // 4
}