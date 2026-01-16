import { CatalogItem, ItemType } from './types';

export const SEED_CATALOG: CatalogItem[] = [
  // Services
  { id: 's1', name: 'Corte de Cabello', type: ItemType.SERVICE, price: 150 },
  { id: 's2', name: 'Corte de Barba', type: ItemType.SERVICE, price: 120 },
  { id: 's3', name: 'Corte + Barba', type: ItemType.SERVICE, price: 250 },
  { id: 's4', name: 'Perfilado de Cejas', type: ItemType.SERVICE, price: 50 },
  { id: 's5', name: 'Limpieza Facial', type: ItemType.SERVICE, price: 180 },
  { id: 's6', name: 'Paquete Premier (Corte, Barba, Exfoliación)', type: ItemType.SERVICE, price: 400 },
  { id: 's7', name: 'Paquete Infantil', type: ItemType.SERVICE, price: 130 },

  // Products - Professional
  { id: 'p1', name: 'Pomada Premium', type: ItemType.PRODUCT, price: 200, brand: 'Professional', stock: 15, cost: 100 },
  { id: 'p2', name: 'Cera Mate', type: ItemType.PRODUCT, price: 180, brand: 'Professional', stock: 12, cost: 90 },
  { id: 'p3', name: 'Aceite para Barba', type: ItemType.PRODUCT, price: 220, brand: 'Professional', stock: 8, cost: 110 },
  { id: 'p4', name: 'Shampoo Tonificante', type: ItemType.PRODUCT, price: 150, brand: 'Professional', stock: 20, cost: 75 },
  { id: 'p5', name: 'After Shave Balsam', type: ItemType.PRODUCT, price: 120, brand: 'Professional', stock: 10, cost: 60 },

  // Otros
  { id: 'p8', name: 'Agua Refrescante', type: ItemType.PRODUCT, price: 0, brand: 'General', stock: 100, cost: 5 },
];