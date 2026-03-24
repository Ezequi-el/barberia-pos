// ============================================================================
// POS COMPONENT - Refactorizado con componentes separados
// ============================================================================

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  CatalogItem, 
  CartItem, 
  ItemType, 
  PaymentMethod, 
  Transaction,
  ValidationResult
} from '../types';
import { Barber, SEED_CATALOG } from '../constants';
import { 
  ChevronLeft, 
  Printer, 
  CheckCircle, 
  RotateCcw,
  Loader2
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

    try {
      setProcessing(true);
      showInfo('Procesando transacción...', 'Procesando');

      // Crear transacción usando función RPC
      const transaction = await createTransaction({
        barber: selectedBarber!,
        items: cart,
        total: cartTotal,
        paymentMethod: paymentMethod!,
        reference: reference.trim() || undefined
      });

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
      <div className="md:hidden p-3 border-b border-[#334155] bg-[#0f172a]">
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
      <div className="flex-1 flex flex-col border-r border-[#334155]">
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
      <Cart
        items={cart}
        total={cartTotal}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        onCheckout={handleCheckoutStart}
        isLoading={processing}
      />

      {/* MODAL DE CHECKOUT */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={handleCloseModal}
        title={checkoutStep === 'payment' ? "Finalizar Venta" : "Venta Exitosa"}
      >
        {checkoutStep === 'payment' ? (
          <div className="space-y-6">
            {/* 1. Select Barber */}
            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">
                1. Barbero Responsable
              </label>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(Barber).map(barber => (
                  <button
                    key={barber}
                    onClick={() => setSelectedBarber(barber)}
                    className={`
                      p-4 border rounded-lg font-bold text-sm uppercase transition-all
                      min-h-[44px] flex items-center justify-center
                      ${selectedBarber === barber
                        ? 'border-[#e2b808] bg-[#e2b808]/10 text-[#e2b808]'
                        : 'border-[#475569] bg-[#1e293b] text-[#94a3b8] hover:border-[#64748b]'
                      }
                    `}
                  >
                    {barber}
                  </button>
                ))}
              </div>
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