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

export interface BarberSession {
  id: string;
  name: string;
  birthDate: string;
  chairNumber: number;
}

export enum Barber {
  DEMO = 'Barbero Demo',
  STAFF_1 = 'Personal 1',
  STAFF_2 = 'Personal 2'
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
  customerName: string;
  customerPhone: string;
  date: string; // ISO Date
  time: string; // HH:mm
  barberId: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export type ViewState = 'WELCOME' | 'DASHBOARD' | 'POS' | 'INVENTORY' | 'REPORTS' | 'STAFF' | 'APPOINTMENTS';