// ============================================================================
// POS COMPONENT - Refactorizado con componentes separados
// ============================================================================

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  CatalogItem, 
  CartItem, 
  ItemType, 
  PaymentMethod, 
  Transaction,
  ValidationResult,
  Customer
} from '../types';
import { Barber, SEED_CATALOG } from '../constants';
import { 
  ChevronLeft, 
  Printer, 
  CheckCircle, 
  RotateCcw,
  Loader2,
  User,
  X,
  ShoppingCart
} from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import Input from './Input';
import Cart from './Cart';
import ProductGrid from './ProductGrid';
import { 
  getCatalogItems, 
  createTransaction, 
  validateCartItems,
  getCatalogCount 
} from '../lib/database';
import { useToastNotifications } from './Toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface POSProps {
  onBack: () => void;
}

const POS: React.FC<POSProps> = ({ onBack }) => {
  // ============================================================================
  // 1. ESTADOS PRINCIPALES
  // ============================================================================
  
  // Catálogo y carga
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogTotalCount, setCatalogTotalCount] = useState(0);
  
  // Filtros y búsqueda
  const [activeTab, setActiveTab] = useState<ItemType>(ItemType.SERVICE);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Carrito
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Modal de checkout
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'payment' | 'success'>('payment');
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Datos de checkout
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [reference, setReference] = useState('');
  const [cashAmount, setCashAmount] = useState('');

  // Selector de cliente
  const [customerQuery, setCustomerQuery] = useState('');
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  // Barberos activos
  const [activeBarbers, setActiveBarbers] = useState<{id: string, nombre: string, numero_silla?: number}[]>([]);
  const [barbersLoading, setBarbersLoading] = useState(false);
  
  // Vista móvil: tabs
  const [viewMode, setViewMode] = useState<'catalog' | 'cart'>('catalog');
  
  // Paginación para lazy loading
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(20);
  const [isLoadMoreLoading, setIsLoadMoreLoading] = useState(false);
  
  // Toast notifications
  const { showSuccess, showError, showWarning, showInfo } = useToastNotifications();
  const { user } = useAuth();

  // ============================================================================
  // 2. EFECTOS Y CARGA DE DATOS
  // ============================================================================
  
  useEffect(() => {
    loadCatalog();
    loadCatalogCount();
  }, []);


  // Cerrar dropdown al click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cargar catálogo con paginación
  const loadCatalog = async (page: number = 0) => {
    try {
      if (page === 0) {
        setLoading(true);
      } else {
        setIsLoadMoreLoading(true);
      }
      
      const items = await getCatalogItems(
        itemsPerPage,
        page * itemsPerPage,
        activeTab
      );

      if (page === 0) {
        setCatalog(items);
      } else {
        setCatalog(prev => [...prev, ...items]);
      }
      
      setCurrentPage(page);
      
    } catch (error: any) {
      console.error('Error loading catalog:', error);
      showError('Error al cargar el catálogo', 'Error de carga');
    } finally {
      setLoading(false);
      setIsLoadMoreLoading(false);
    }
  };

  // Contar total de items para paginación
  const loadCatalogCount = async () => {
    try {
      const count = await getCatalogCount(activeTab);
      setCatalogTotalCount(count);
    } catch (error) {
      console.error('Error counting catalog:', error);
    }
  };

  // Recargar catálogo cuando cambia la pestaña
  useEffect(() => {
    if (!loading) {
      loadCatalog(0);
      loadCatalogCount();
    }
  }, [activeTab]);

  // Cargar TODOS los clientes del negocio (una sola vez al abrir checkout)
  const loadAllCustomers = async () => {
    if (!supabase || allCustomers.length > 0) return; // ya cargados
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();
      if (!profile) return;
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone, email, visits, total_spent, last_visit, notes')
        .eq('business_id', profile.business_id)
        .order('name', { ascending: true });
      setAllCustomers((data || []).map((c: any): Customer => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        visits: c.visits ?? 0,
        totalSpent: c.total_spent ?? 0,
        lastVisit: c.last_visit,
        notes: c.notes
      })));
    } catch (e) {
      console.error('Error cargando clientes:', e);
    }
  };

  // Cargar barberos activos (una sola vez al abrir checkout)
  const loadActiveBarbers = async () => {
    if (!supabase || activeBarbers.length > 0) return;
    setBarbersLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single();
      if (!profile) return;
      const { data } = await supabase
        .from('barberos')
        .select('id, nombre, numero_silla')
        .eq('business_id', profile.business_id)
        .eq('activo', true)
        .order('nombre', { ascending: true });
        
      setActiveBarbers(data || []);
    } catch (e) {
      console.error('Error cargando barberos:', e);
    } finally {
      setBarbersLoading(false);
    }
  };

  // Lista filtrada localmente (sin queries adicionales)
  const filteredCustomers = useMemo(() => {
    if (!customerQuery.trim()) return allCustomers;
    const q = customerQuery.toLowerCase();
    return allCustomers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(customerQuery))
    );
  }, [allCustomers, customerQuery]);


  // ============================================================================
  // 3. LÓGICA DEL CARRITO (CON VALIDACIONES)
  // ============================================================================
  
  const addToCart = (item: CatalogItem) => {
    // Validar stock para productos
    if (item.type === ItemType.PRODUCT && (item.stock || 0) <= 0) {
      showWarning('Sin stock disponible', 'Stock agotado');
      return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      
      if (existing) {
        // Validar límite de stock para productos
        if (item.type === ItemType.PRODUCT) {
          const availableStock = item.stock || 0;
          if (existing.quantity >= availableStock) {
            showWarning(
              `Stock máximo alcanzado: ${availableStock} unidades`,
              'Límite de stock'
            );
            return prev;
          }
        }
        
        return prev.map(i => 
          i.id === item.id 
            ? { ...i, quantity: i.quantity + 1 } 
            : i
        );
      }
      
      return [...prev, { ...item, quantity: 1 }];
    });
    
    showInfo(`${item.name} agregado al carrito`, 'Producto agregado');
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;

        // Validar stock para productos
        if (delta > 0 && item.type === ItemType.PRODUCT) {
          const catalogItem = catalog.find(c => c.id === id);
          const availableStock = catalogItem?.stock || 0;
          
          if (newQty > availableStock) {
            showWarning(
              `Stock disponible: ${availableStock} unidades`,
              'Límite de stock'
            );
            return item;
          }
        }

        // No permitir cantidades negativas
        const finalQty = Math.max(1, newQty);
        return { ...item, quantity: finalQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    const item = cart.find(i => i.id === id);
    setCart(prev => prev.filter(item => item.id !== id));
    
    if (item) {
      showInfo(`${item.name} removido del carrito`, 'Producto removido');
    }
  };

  const clearCart = () => {
    if (cart.length > 0) {
      setCart([]);
      showInfo('Carrito vaciado', 'Carrito limpio');
    }
  };

  // ============================================================================
  // 4. CÁLCULOS Y VALIDACIONES
  // ============================================================================
  
  const cartTotal = useMemo(() => 
    cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), 
    [cart]
  );

  const changeAmount = useMemo(() => {
    if (!cashAmount || !paymentMethod || paymentMethod !== PaymentMethod.CASH) {
      return 0;
    }
    
    const cash = parseFloat(cashAmount);
    if (isNaN(cash)) return 0;
    
    return Math.max(0, cash - cartTotal);
  }, [cashAmount, cartTotal, paymentMethod]);

  const validateCheckoutData = (): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!selectedBarber) {
      errors.push('Selecciona un barbero responsable');
    }

    if (!paymentMethod) {
      errors.push('Selecciona un método de pago');
    }

    if (paymentMethod === PaymentMethod.TRANSFER && !reference.trim()) {
      errors.push('La referencia es obligatoria para transferencias');
    }

    if (paymentMethod === PaymentMethod.CASH) {
      const cash = parseFloat(cashAmount);
      if (isNaN(cash) || cash <= 0) {
        errors.push('Ingresa un monto válido en efectivo');
      } else if (cash < cartTotal) {
        errors.push(`El monto recibido ($${cash}) es menor al total ($${cartTotal})`);
      }
    }

    // Validar carrito
    const cartValidation = validateCartItems(cart);
    if (!cartValidation.isValid) {
      errors.push(...cartValidation.errors);
    }
    warnings.push(...cartValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  // ============================================================================
  // 5. CHECKOUT Y PROCESAMIENTO DE PAGO (USANDO RPC)
  // ============================================================================
  
  const handleCheckoutStart = () => {
    if (cart.length === 0) {
      showWarning('Agrega productos al carrito primero', 'Carrito vacío');
      return;
    }

    // Validar carrito antes de abrir modal
    const validation = validateCartItems(cart);
    if (!validation.isValid) {
      showError(validation.errors.join(', '), 'Error en carrito');
      return;
    }

    if (validation.warnings.length > 0) {
      showWarning(validation.warnings.join(', '), 'Advertencias');
    }

    setCheckoutStep('payment');
    setIsCheckoutOpen(true);
    
    // Reset modal state
    setSelectedBarber(null);
    setPaymentMethod(null);
    setReference('');
    setCashAmount('');
    setLastTransaction(null);
    // Reset cliente
    setSelectedCustomer(null);
    setCustomerQuery('');
    setShowCustomerDropdown(false);
    // Cargar clientes (una sola vez)
    loadAllCustomers();
    // Cargar barberos
    loadActiveBarbers();
  };

  const handleProcessPayment = async () => {
    // Validar datos antes de procesar
    const validation = validateCheckoutData();
    
    if (!validation.isValid) {
      showError(validation.errors.join(', '), 'Error en datos');
      return;
    }

    if (validation.warnings.length > 0) {
      showWarning(validation.warnings.join(', '), 'Verifica los datos');
    }

    const saleData = {
      barber: selectedBarber!,
      items: cart,
      total: cartTotal,
      paymentMethod: paymentMethod!,
      reference: reference.trim() || undefined,
      customerId: selectedCustomer?.id || undefined,
    };

    // Modo OFFLINE: guardar en localStorage
    if (!navigator.onLine) {
      try {
        const PENDING_KEY = 'velo_pending_sales';
        const existing = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
        existing.push({ ...saleData, _savedAt: new Date().toISOString() });
        localStorage.setItem(PENDING_KEY, JSON.stringify(existing));

        // Simular éxito para UI
        const mockTransaction = {
          id: `offline-${Date.now()}`,
          date: new Date().toISOString(),
          ...saleData,
          status: undefined,
        };
        setLastTransaction(mockTransaction as any);
        setCheckoutStep('success');
        setCart([]);
        showInfo(
          'Sin conexión. La venta se guardó localmente y se sincronizará cuando vuelva la conexión.',
          'Venta guardada offline'
        );
      } catch (err) {
        showError('Error al guardar la venta localmente.', 'Error offline');
      }
      return;
    }

    try {
      setProcessing(true);
      showInfo('Procesando transacción...', 'Procesando');

      // Crear transacción usando función RPC
      const transaction = await createTransaction(saleData);

      // Actualizar catálogo para reflejar stock actualizado
      await loadCatalog(0);

      // Mostrar éxito
      setLastTransaction(transaction);
      setCheckoutStep('success');
      setCart([]);
      
      showSuccess(
        `Transacción #${transaction.id.slice(0, 8).toUpperCase()} completada`,
        '¡Venta exitosa!'
      );

    } catch (error: any) {
      console.error('Error creating transaction:', error);
      
      // Mostrar error específico si está disponible
      const errorMessage = error.message.includes('stock')
        ? 'Error de stock: ' + error.message
        : 'Error al procesar la venta. Por favor intenta de nuevo.';
      
      showError(errorMessage, 'Error en transacción');
      
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
      showInfo('Preparando impresión...', 'Imprimir ticket');
    }, 100);
  };

  const handleCloseModal = () => {
    setIsCheckoutOpen(false);
    setCheckoutStep('payment');
    setLastTransaction(null);
  };

  const handleLoadMore = () => {
    if (hasMoreItems && !isLoadMoreLoading) {
      loadCatalog(currentPage + 1);
    }
  };

  // ============================================================================
  // 6. CALCULOS AUXILIARES
  // ============================================================================
  
  const hasMoreItems = useMemo(() => {
    return catalog.length < catalogTotalCount;
  }, [catalog.length, catalogTotalCount]);

  // ============================================================================
  // 7. RENDERIZADO PRINCIPAL
  // ============================================================================
  
  return (
    <div className="flex flex-col h-screen md:flex-row bg-[#0f172a] overflow-hidden">
      {/* Botón de volver en móvil */}
      <div className="md:hidden shrink-0 p-3 border-b border-[#334155] bg-[#0f172a]">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-[#94a3b8] hover:text-[#f8fafc] p-2"
          aria-label="Volver al dashboard"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">Volver</span>
        </button>
      </div>

      {/* Panel izquierdo: Catálogo de productos */}
      <div className={`flex-1 flex flex-col min-h-0 border-r border-[#334155] ${viewMode === 'catalog' ? 'flex' : 'hidden md:flex'}`}>
        {/* TABS MÓVIL */}
        <div className="md:hidden shrink-0 flex border-b border-[#334155] bg-[#1e293b]">
          <button
            onClick={() => setViewMode('catalog')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
              viewMode === 'catalog' ? 'text-[#e2b808] border-b-2 border-[#e2b808]' : 'text-[#94a3b8]'
            }`}
          >
            Servicios / Productos
          </button>
          <button
            onClick={() => setViewMode('cart')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
              viewMode === 'cart' ? 'text-[#e2b808] border-b-2 border-[#e2b808]' : 'text-[#94a3b8]'
            }`}
          >
            Carrito
            {cart.length > 0 && (
              <span className="bg-[#e2b808] text-[#0f172a] text-[10px] px-1.5 py-0.5 rounded-full">
                {cart.length}
              </span>
            )}
          </button>
        </div>

        <ProductGrid
          items={catalog}
          activeTab={activeTab}
          searchQuery={searchQuery}
          onAddToCart={addToCart}
          onTabChange={setActiveTab}
          onSearchChange={setSearchQuery}
          isLoading={loading && catalog.length === 0}
          hasMoreItems={hasMoreItems}
          onLoadMore={handleLoadMore}
          isLoadMoreLoading={isLoadMoreLoading}
        />
      </div>

      {/* Panel derecho: Carrito */}
      <div className={`w-full md:w-[400px] flex-col ${viewMode === 'cart' ? 'flex' : 'hidden md:flex'}`}>
        {/* TAB BACK BUTTON (Para volver al catálogo desde carrito en móvil) */}
        <div className="md:hidden flex flex-col items-stretch p-3 border-b border-[#334155] bg-[#1e293b] w-full gap-2">
          <div className="text-center py-1">
            <span className="text-sm font-bold uppercase tracking-widest text-[#e2b808]">
               🛒 Orden Actual ({cart.length} items)
            </span>
          </div>
          <button
            onClick={() => setViewMode('catalog')}
            className="w-full py-3 px-4 text-sm font-bold uppercase tracking-wider text-[#94a3b8] border border-[#334155] rounded-lg hover:bg-[#334155] transition-colors"
          >
            ← Volver al Catálogo
          </button>
        </div>

        <Cart
          items={cart}
          total={cartTotal}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeFromCart}
          onClearCart={clearCart}
          onCheckout={handleCheckoutStart}
          isLoading={processing}
        />
        
        {/* Padding bottom para no tapar contenido con el botón fijo */}
        {cart.length > 0 && <div className="h-32 md:hidden"></div>}
      </div>

      {/* BOTÓN FIJO BOTTOM - SOLO MÓVIL Y SI HAY ITEMS */}
      {cart.length > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-[#1e293b]/95 backdrop-blur-sm border-t border-[#334155] z-50 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} className="text-[#e2b808]" />
              <span className="text-sm font-bold text-[#f8fafc]">{cart.length} items</span>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-[#e2b808]">${cartTotal.toFixed(2)}</span>
            </div>
          </div>
          <Button
            fullWidth
            onClick={handleCheckoutStart}
            className="h-14 text-lg font-bold tracking-widest bg-[#e2b808] hover:bg-[#d4a017] text-[#0f172a] border-[#d4a017] shadow-xl"
          >
            COBRAR
          </Button>
        </div>
      )}

      {/* MODAL DE CHECKOUT */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={handleCloseModal}
        title={checkoutStep === 'payment' ? "Finalizar Venta" : "Venta Exitosa"}
      >
        {checkoutStep === 'payment' ? (
          <div className="space-y-6">
            {/* 0. Cliente (Opcional) */}
            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">
                0. Cliente (Opcional)
              </label>
              <div ref={customerSearchRef} className="relative">
                {selectedCustomer ? (
                  /* Cliente seleccionado — chip */
                  <div className="flex items-center justify-between p-3 border border-[#e2b808]/60 rounded-lg bg-[#e2b808]/10">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-[#e2b808]" />
                      <div>
                        <p className="text-sm font-bold text-[#f8fafc]">{selectedCustomer.name}</p>
                        <p className="text-xs text-[#94a3b8]">
                          {selectedCustomer.phone && `${selectedCustomer.phone} · `}
                          {selectedCustomer.visits} visitas · ${selectedCustomer.totalSpent.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedCustomer(null); setCustomerQuery(''); }}
                      className="text-[#94a3b8] hover:text-rose-400 transition-colors p-1"
                      aria-label="Quitar cliente"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  /* Sin cliente — input + dropdown */
                  <>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                      <input
                        type="text"
                        placeholder="Buscar cliente o dejar vacío para venta anónima"
                        value={customerQuery}
                        onChange={e => setCustomerQuery(e.target.value)}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className="w-full pl-8 pr-4 py-2.5 text-sm bg-[#1e293b] border border-[#475569] rounded-lg text-[#f8fafc] placeholder-[#475569] focus:outline-none focus:border-[#e2b808] transition-colors"
                      />
                    </div>
                    {showCustomerDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-[#1e293b] border border-[#334155] rounded-lg shadow-xl overflow-hidden">
                        {/* Opción: sin cliente */}
                        <button
                          onClick={() => { setSelectedCustomer(null); setCustomerQuery(''); setShowCustomerDropdown(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#94a3b8] hover:bg-[#334155] transition-colors border-b border-[#334155]"
                        >
                          <User size={14} />
                          <span>Sin cliente / Venta anónima</span>
                        </button>
                        {/* Lista filtrada con scroll */}
                        <div className="overflow-y-auto" style={{ maxHeight: '264px' }}>
                          {filteredCustomers.length === 0 ? (
                            <p className="px-3 py-4 text-sm text-[#475569] text-center">No se encontraron clientes</p>
                          ) : (
                            filteredCustomers.map(c => (
                              <button
                                key={c.id}
                                onClick={() => { setSelectedCustomer(c); setCustomerQuery(''); setShowCustomerDropdown(false); }}
                                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#334155] transition-colors text-left border-b border-[#334155]/50 last:border-0"
                              >
                                <div>
                                  <p className="text-sm font-medium text-[#f8fafc]">{c.name}</p>
                                  <p className="text-xs text-[#64748b] mt-0.5">
                                    {c.phone || 'Sin teléfono'} · {c.visits} visitas · ${c.totalSpent.toLocaleString()}
                                  </p>
                                </div>
                                <span className="text-xs text-[#475569] ml-2 shrink-0">
                                  {c.visits > 0 ? `${c.visits}x` : 'Nuevo'}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 1. Select Barber */}
            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">
                1. Barbero Responsable
              </label>
              
              {barbersLoading ? (
                <div className="flex justify-center p-8">
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : activeBarbers.length === 0 ? (
                <div className="p-4 border border-rose-500/30 bg-rose-500/10 rounded-lg text-center">
                  <p className="text-sm text-rose-400">No hay barberos activos. Registra barberos en Gestión de Personal.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {activeBarbers.map(barber => (
                    <button
                      key={barber.id}
                      onClick={() => setSelectedBarber(barber.nombre)}
                      className={`
                        p-3 border rounded-lg transition-all flex flex-col items-center justify-center min-h-[56px]
                        ${selectedBarber === barber.nombre
                          ? 'border-[#e2b808] bg-[#e2b808]/10 text-[#e2b808]'
                          : 'border-[#475569] bg-[#1e293b] text-[#94a3b8] hover:border-[#64748b]'
                        }
                      `}
                    >
                      <span className="font-bold text-sm uppercase">{barber.nombre}</span>
                      {barber.numero_silla && (
                        <span className="text-xs opacity-70 mt-0.5 normal-case font-medium">Silla #{barber.numero_silla}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Payment Method */}
            {selectedBarber && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">
                  2. Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: PaymentMethod.CASH, icon: '💰', label: 'Efectivo' },
                    { id: PaymentMethod.CARD, icon: '💳', label: 'Tarjeta' },
                    { id: PaymentMethod.TRANSFER, icon: '📱', label: 'Transf.' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`
                        flex flex-col items-center gap-2 p-3 border rounded-lg transition-all
                        min-h-[44px] justify-center
                        ${paymentMethod === method.id
                          ? 'border-[#e2b808] bg-[#e2b808]/10 text-[#e2b808]'
                          : 'border-[#475569] bg-[#1e293b] text-[#94a3b8] hover:border-[#64748b]'
                        }
                      `}
                    >
                      <span className="text-xl">{method.icon}</span>
                      <span className="text-xs font-bold uppercase">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Details (Conditional) */}
            {paymentMethod === PaymentMethod.TRANSFER && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <Input
                  label="Referencia de Transferencia (Obligatorio)"
                  placeholder="Ej: 123456"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {paymentMethod === PaymentMethod.CASH && (
              <div className="animate-in fade-in slide-in-from-top-2 space-y-2">
                <Input
                  label="Monto Recibido"
                  type="number"
                  placeholder="0.00"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  autoFocus
                />
                <div className="flex justify-between items-center bg-[#0f172a] p-3 rounded border border-[#334155]">
                  <span className="text-[#94a3b8] text-sm">Cambio:</span>
                  <span className={`font-bold font-heading text-xl ${changeAmount < 0 ? 'text-rose-500' : 'text-[#e2b808]'}`}>
                    ${changeAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-[#334155]">
              <Button
                fullWidth
                onClick={handleProcessPayment}
                disabled={
                  processing ||
                  !selectedBarber ||
                  !paymentMethod ||
                  (paymentMethod === PaymentMethod.TRANSFER && !reference.trim()) ||
                  (paymentMethod === PaymentMethod.CASH && (!cashAmount || parseFloat(cashAmount) < cartTotal))
                }
                className="min-h-[44px] bg-[#e2b808] hover:bg-[#d4a017] text-[#0f172a] border-[#d4a017]"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Procesando...
                  </>
                ) : `Confirmar Pago ($${cartTotal.toFixed(2)})`}
              </Button>
            </div>
          </div>
        ) : (
          // SUCCESS VIEW
          <div className="flex flex-col items-center text-center space-y-6 py-6 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-2">
              <CheckCircle size={48} />
            </div>
            <div>
              <h3 className="text-2xl font-heading font-bold text-[#f8fafc] uppercase">¡Cobro Exitoso!</h3>
              <p className="text-[#94a3b8] mt-2">La transacción ha sido registrada.</p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <Button 
                onClick={handlePrint} 
                variant="secondary" 
                fullWidth 
                className="gap-2 min-h-[44px]"
              >
                <Printer size={18} /> Imprimir Ticket
              </Button>
              <Button 
                onClick={handleCloseModal} 
                fullWidth 
                className="gap-2 min-h-[44px] bg-[#e2b808] hover:bg-[#d4a017] text-[#0f172a] border-[#d4a017]"
              >
                <RotateCcw size={18} /> Nueva Venta
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Hidden Printable Receipt */}
      {lastTransaction && (
        <div id="printable-receipt" className="hidden print:block">
          <div style={{ padding: '40px 20px', fontFamily: '"Courier New", monospace', width: '300px', margin: '0 auto', textAlign: 'center', backgroundColor: 'white', color: 'black' }}>

            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0', textTransform: 'uppercase', letterSpacing: '2px' }}>LA BARBERÍA</h1>
              <p style={{ margin: '5px 0 0 0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '4px' }}>Cortes y Estilo</p>
            </div>

            <div style={{ borderTop: '2px dashed black', borderBottom: '2px dashed black', padding: '10px 0', margin: '15px 0' }}>
              <p style={{ margin: '4px 0', fontSize: '12px', textAlign: 'left' }}><strong>FECHA:</strong> {new Date(lastTransaction.date).toLocaleString()}</p>
              <p style={{ margin: '4px 0', fontSize: '12px', textAlign: 'left' }}><strong>FOLIO:</strong> {lastTransaction.id.slice(0, 8).toUpperCase()}</p>
              <p style={{ margin: '4px 0', fontSize: '12px', textAlign: 'left' }}><strong>BARBERO:</strong> {lastTransaction.barber}</p>
            </div>

            {/* Items */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>
                <span>Cant/Desc</span>
                <span>Importe</span>
              </div>
              {lastTransaction.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                  <span style={{ textAlign: 'left' }}>{item.quantity} x {item.name}</span>
                  <span style={{ textAlign: 'right' }}>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{ borderTop: '2px solid black', paddingTop: '10px', marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '20px', marginBottom: '5px' }}>
                <span>TOTAL:</span>
                <span>${lastTransaction.total.toFixed(2)}</span>
              </div>

              <p style={{ textAlign: 'left', margin: '10px 0 2px 0', fontSize: '12px' }}>METODO DE PAGO: <strong>{lastTransaction.paymentMethod}</strong></p>
              {lastTransaction.reference && <p style={{ textAlign: 'left', margin: '2px 0', fontSize: '12px' }}>REF: {lastTransaction.reference}</p>}
            </div>

            {/* Footer */}
            <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '10px', textTransform: 'uppercase' }}>
              <p style={{ margin: '0' }}>¡Gracias por su preferencia!</p>
              <p style={{ margin: '5px 0 0 0' }}>Vuelve pronto</p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default POS;