export enum ItemType {
  SERVICE = 'SERVICE',
  PRODUCT = 'PRODUCT'
}

export interface CatalogItem {
  id: string;
  name: string;
  type: ItemType;
  price: number;
  brand?: string;
  stock?: number; // Infinite for services, finite for products
  cost?: number; // For profit calculation (optional in frontend view but good for data)
}

export interface CartItem extends CatalogItem {
  quantity: number;
}

export enum PaymentMethod {
  CASH = 'EFECTIVO',
  CARD = 'TARJETA',
  TRANSFER = 'TRANSFERENCIA'
}

export enum Barber {
  BARBER_1 = 'Barbero 1',
  BARBER_2 = 'Barbero 2'
}

export interface Transaction {
  id: string;
  date: string; // ISO string
  barber: Barber;
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  reference?: string; // For transfers
}

export interface Appointment {
  id: string;
  clientName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  barber: string;
  service: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  visits: number;
  totalSpent: number;
  lastVisit?: string; // ISO string
  notes?: string;
}

export type ViewState = 'DASHBOARD' | 'POS' | 'INVENTORY' | 'REPORTS' | 'CUSTOMERS' | 'APPOINTMENTS' | 'PERSONAL';