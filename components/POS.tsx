import React, { useState, useMemo, useEffect } from 'react';
import { CatalogItem, CartItem, ItemType, Barber, PaymentMethod, Transaction } from '../types';
import { Search, Trash2, Plus, Minus, CreditCard, Banknote, Smartphone, ChevronLeft, Printer, CheckCircle, RotateCcw } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import Input from './Input';
import { getCatalogItems, createTransaction, seedCatalog } from '../lib/database';
import { SEED_CATALOG } from '../constants';

interface POSProps {
  onBack: () => void;
}

const POS: React.FC<POSProps> = ({ onBack }) => {
  // State
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ItemType>(ItemType.SERVICE);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'payment' | 'success'>('payment');
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [processing, setProcessing] = useState(false);

  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [reference, setReference] = useState('');
  const [cashAmount, setCashAmount] = useState('');

  // Load catalog on mount
  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const items = await getCatalogItems();

      // If no items, seed the catalog
      if (items.length === 0) {
        await seedCatalog(SEED_CATALOG);
        const seededItems = await getCatalogItems();
        setCatalog(seededItems);
      } else {
        setCatalog(items);
      }
    } catch (error) {
      console.error('Error loading catalog:', error);
      alert('Error al cargar el catálogo');
    } finally {
      setLoading(false);
    }
  };

  // Filtering
  const filteredCatalog = useMemo(() => {
    return catalog.filter(item =>
      item.type === activeTab &&
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [catalog, activeTab, searchQuery]);

  // Cart Logic
  const addToCart = (item: CatalogItem) => {
    if (item.type === ItemType.PRODUCT && (item.stock || 0) <= 0) {
      alert("Sin stock disponible");
      return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        // Check stock limit for products
        if (item.type === ItemType.PRODUCT && existing.quantity >= (item.stock || 0)) {
          return prev;
        }
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;

        // Stock check
        if (delta > 0 && item.type === ItemType.PRODUCT && newQty > (item.stock || 0)) {
          return item;
        }

        return { ...item, quantity: Math.max(0, newQty) };
      }
      return item;
    }).filter(i => i.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);

  // Checkout Logic
  const handleCheckoutStart = () => {
    if (cart.length === 0) return;
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
    if (!selectedBarber) {
      alert("Por favor selecciona un barbero.");
      return;
    }
    if (!paymentMethod) {
      alert("Por favor selecciona un método de pago.");
      return;
    }
    if (paymentMethod === PaymentMethod.TRANSFER && !reference) {
      alert("La referencia es obligatoria para transferencias.");
      return;
    }

    try {
      setProcessing(true);

      const transaction = await createTransaction({
        barber: selectedBarber,
        items: cart,
        total: cartTotal,
        paymentMethod,
        reference: reference || undefined
      });

      // Reload catalog to reflect updated stock
      await loadCatalog();

      // Show success
      setLastTransaction(transaction);
      setCheckoutStep('success');
      setCart([]);
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Error al procesar la venta. Por favor intenta de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleCloseModal = () => {
    setIsCheckoutOpen(false);
    setCheckoutStep('payment');
    setLastTransaction(null);
  };

  // Calculations for Cash
  const changeAmount = useMemo(() => {
    if (!cashAmount) return 0;
    const cash = parseFloat(cashAmount);
    return Math.max(0, cash - cartTotal);
  }, [cashAmount, cartTotal]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400 animate-pulse">Cargando catálogo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen md:flex-row bg-zinc-950 overflow-hidden">

      {/* LEFT PANEL: Catalog */}
      <div className="flex-1 flex flex-col border-r border-zinc-800">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex gap-4 items-center">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
            <ChevronLeft />
          </button>
          <h2 className="text-xl font-heading font-bold text-white uppercase tracking-wider">Catálogo</h2>
          <div className="flex-1 max-w-md ml-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-2 bg-zinc-900/50">
          <button
            onClick={() => setActiveTab(ItemType.SERVICE)}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors ${activeTab === ItemType.SERVICE ? 'bg-amber-500 text-black shadow-lg shadow-amber-900/20' : 'text-zinc-400 hover:bg-zinc-800'}`}
          >
            Servicios
          </button>
          <button
            onClick={() => setActiveTab(ItemType.PRODUCT)}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider rounded-lg transition-colors ${activeTab === ItemType.PRODUCT ? 'bg-amber-500 text-black shadow-lg shadow-amber-900/20' : 'text-zinc-400 hover:bg-zinc-800'}`}
          >
            Productos
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-950">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCatalog.map(item => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                disabled={item.type === ItemType.PRODUCT && (item.stock || 0) <= 0}
                className="group flex flex-col p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-amber-500/50 transition-all text-left relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex-1 mb-2">
                  <h3 className="font-bold text-zinc-100 group-hover:text-amber-500 transition-colors">{item.name}</h3>
                  {item.brand && <p className="text-xs text-zinc-500 uppercase">{item.brand}</p>}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-lg font-heading font-bold text-white">${item.price}</span>
                  {item.type === ItemType.PRODUCT && (
                    <span className={`text-xs px-2 py-1 rounded bg-zinc-950 ${(item.stock || 0) < 5 ? 'text-red-500' : 'text-zinc-400'}`}>
                      Stock: {item.stock}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Cart */}
      <div className="w-full md:w-[400px] flex flex-col bg-zinc-900 border-l border-zinc-800 shadow-2xl z-10">
        <div className="p-6 border-b border-zinc-800 bg-zinc-900">
          <h2 className="text-xl font-heading font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Orden Actual
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 opacity-50">
              <Plus size={48} className="mb-2" />
              <p className="uppercase tracking-widest text-sm">Carrito Vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-zinc-950 p-3 rounded-lg border border-zinc-800 animate-in slide-in-from-right-4 duration-300">
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
                  <p className="text-amber-500 text-sm">${item.price * item.quantity}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-zinc-900 rounded-lg border border-zinc-800">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-white text-zinc-400">
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-white text-zinc-400">
                      <Plus size={14} />
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-zinc-950 border-t border-zinc-800">
          <div className="flex justify-between items-end mb-6">
            <span className="text-zinc-400 uppercase tracking-wider text-sm">Total a Pagar</span>
            <span className="text-4xl font-heading font-bold text-white">${cartTotal}</span>
          </div>
          <Button
            onClick={handleCheckoutStart}
            fullWidth
            disabled={cart.length === 0}
            className="h-14 text-lg tracking-widest"
          >
            COBRAR
          </Button>
        </div>
      </div>

      {/* CHECKOUT MODAL */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={handleCloseModal}
        title={checkoutStep === 'payment' ? "Finalizar Venta" : "Venta Exitosa"}
      >
        {checkoutStep === 'payment' ? (
          <div className="space-y-6">
            {/* 1. Select Barber */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">1. Barbero Responsable</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(Barber).map(barber => (
                  <button
                    key={barber}
                    onClick={() => setSelectedBarber(barber)}
                    className={`p-4 border rounded-lg font-bold text-sm uppercase transition-all ${selectedBarber === barber
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'
                      }`}
                  >
                    {barber}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Payment Method */}
            {selectedBarber && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">2. Método de Pago</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: PaymentMethod.CASH, icon: Banknote, label: 'Efectivo' },
                    { id: PaymentMethod.CARD, icon: CreditCard, label: 'Tarjeta' },
                    { id: PaymentMethod.TRANSFER, icon: Smartphone, label: 'Transf.' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex flex-col items-center gap-2 p-3 border rounded-lg transition-all ${paymentMethod === method.id
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500'
                        }`}
                    >
                      <method.icon size={20} />
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
                <div className="flex justify-between items-center bg-zinc-950 p-3 rounded border border-zinc-800">
                  <span className="text-zinc-400 text-sm">Cambio:</span>
                  <span className={`font-bold font-heading text-xl ${changeAmount < 0 ? 'text-red-500' : 'text-amber-500'}`}>
                    ${changeAmount}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-zinc-800">
              <Button
                fullWidth
                onClick={handleProcessPayment}
                disabled={
                  processing ||
                  !selectedBarber ||
                  !paymentMethod ||
                  (paymentMethod === PaymentMethod.TRANSFER && !reference) ||
                  (paymentMethod === PaymentMethod.CASH && (!cashAmount || parseFloat(cashAmount) < cartTotal))
                }
              >
                {processing ? 'Procesando...' : `Confirmar Pago ($${cartTotal})`}
              </Button>
            </div>
          </div>
        ) : (
          // SUCCESS VIEW
          <div className="flex flex-col items-center text-center space-y-6 py-6 animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-2">
              <CheckCircle size={48} />
            </div>
            <div>
              <h3 className="text-2xl font-heading font-bold text-white uppercase">¡Cobro Exitoso!</h3>
              <p className="text-zinc-400 mt-2">La transacción ha sido registrada.</p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <Button onClick={handlePrint} variant="secondary" fullWidth className="gap-2">
                <Printer size={18} /> Imprimir Ticket
              </Button>
              <Button onClick={handleCloseModal} fullWidth className="gap-2">
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