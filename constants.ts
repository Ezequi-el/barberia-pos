import { CatalogItem, ItemType } from './types';

export const SEED_CATALOG: CatalogItem[] = [
  // Services
  { id: 's1', name: 'Corte', type: ItemType.SERVICE, price: 120 },
  { id: 's2', name: 'Barba', type: ItemType.SERVICE, price: 110 },
  { id: 's3', name: 'Paquete Oro', type: ItemType.SERVICE, price: 390 },
  { id: 's4', name: 'Paquete VIP', type: ItemType.SERVICE, price: 290 },
  
  // Products - Barberlife
  { id: 'p1', name: 'Premium Pomade', type: ItemType.PRODUCT, price: 180, brand: 'Barberlife', stock: 20, cost: 90 },
  { id: 'p2', name: 'Matte Clay', type: ItemType.PRODUCT, price: 180, brand: 'Barberlife', stock: 15, cost: 90 },
  { id: 'p3', name: 'Ice Blue Pomade', type: ItemType.PRODUCT, price: 180, brand: 'Barberlife', stock: 12, cost: 90 },
  { id: 'p4', name: 'Red Pomade', type: ItemType.PRODUCT, price: 180, brand: 'Barberlife', stock: 10, cost: 90 },
  { id: 'p5', name: 'Luxury Pomade', type: ItemType.PRODUCT, price: 180, brand: 'Barberlife', stock: 8, cost: 90 },
  { id: 'p6', name: 'Platinum Pomade (Minoxidil)', type: ItemType.PRODUCT, price: 180, brand: 'Barberlife', stock: 25, cost: 90 },
  { id: 'p7', name: 'Coconut Pomade', type: ItemType.PRODUCT, price: 180, brand: 'Barberlife', stock: 18, cost: 90 },
  
  // Cortesía
  { id: 'p8', name: 'Agua de Cortesía', type: ItemType.PRODUCT, price: 0, brand: 'General', stock: 100, cost: 5 },
];