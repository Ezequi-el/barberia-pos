// ============================================================================
// CART COMPONENT - Carrito de compras optimizado para móvil
// ============================================================================

import React from 'react';
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';
import { CartItem, ItemType } from '../types';
import Button from './Button';

interface CartProps {
  items: CartItem[];
  total: number;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  isLoading?: boolean;
}

const Cart: React.FC<CartProps> = ({
  items,
  total,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  isLoading = false
}) => {
  // Touch target mínimo: 44px = 2.75rem
  const TOUCH_TARGET = 'min-h-[44px] min-w-[44px]';

  return (
    <div className="w-full md:w-[400px] flex flex-col bg-[#1e293b] border-l border-[#334155] shadow-2xl z-10 h-full">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-[#334155] bg-[#1e293b]">
        <h2 className="text-lg md:text-xl font-heading font-bold text-[#e2b808] uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#e2b808] animate-pulse"></span>
          Orden Actual
          {items.length > 0 && (
            <span className="ml-2 bg-[#e2b808] text-[#0f172a] text-xs font-bold px-2 py-1 rounded-full">
              {items.length}
            </span>
          )}
        </h2>
      </div>

      {/* Cart Items - Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#64748b] opacity-50 p-8">
            <ShoppingCart size={64} className="mb-4" />
            <p className="uppercase tracking-widest text-sm md:text-base text-center">
              Carrito Vacío
            </p>
            <p className="text-xs text-[#475569] mt-2 text-center">
              Agrega productos o servicios para comenzar
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: List View */}
            <div className="md:hidden space-y-2">
              {items.map(item => (
                <div 
                  key={item.id} 
                  className="bg-[#0f172a] p-3 rounded-lg border border-[#334155]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-bold text-sm text-[#f8fafc] truncate">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[#e2b808] text-sm font-bold">
                          ${item.price.toFixed(2)}
                        </span>
                        {item.type === ItemType.PRODUCT && item.stock !== undefined && (
                          <span className="text-xs text-[#64748b]">
                            • Stock: {item.stock}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Quantity Controls - Mobile */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-[#1e293b] rounded-lg border border-[#334155]">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className={`p-2 hover:text-[#f8fafc] text-[#94a3b8] ${TOUCH_TARGET}`}
                          aria-label="Reducir cantidad"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-10 text-center text-sm font-bold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className={`p-2 hover:text-[#f8fafc] text-[#94a3b8] ${TOUCH_TARGET}`}
                          aria-label="Aumentar cantidad"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className={`p-2 text-[#64748b] hover:text-rose-500 transition-colors ${TOUCH_TARGET}`}
                        aria-label="Eliminar del carrito"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Subtotal */}
                  <div className="flex justify-between items-center pt-2 border-t border-[#334155]">
                    <span className="text-xs text-[#94a3b8]">Subtotal:</span>
                    <span className="text-[#e2b808] font-bold">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Compact View */}
            <div className="hidden md:block space-y-3">
              {items.map(item => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between bg-[#0f172a] p-3 rounded-lg border border-[#334155]"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="font-bold text-sm text-[#f8fafc] truncate">
                      {item.name}
                    </h4>
                    <p className="text-[#e2b808] text-sm">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-[#1e293b] rounded-lg border border-[#334155]">
                      <button
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className={`p-2 hover:text-[#f8fafc] text-[#94a3b8] ${TOUCH_TARGET}`}
                        aria-label="Reducir cantidad"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className={`p-2 hover:text-[#f8fafc] text-[#94a3b8] ${TOUCH_TARGET}`}
                        aria-label="Aumentar cantidad"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className={`p-2 text-[#64748b] hover:text-rose-500 transition-colors ${TOUCH_TARGET}`}
                      aria-label="Eliminar del carrito"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Clear Cart Button */}
            {items.length > 0 && (
              <div className="pt-3 md:pt-4 border-t border-[#334155]">
                <Button
                  onClick={onClearCart}
                  variant="secondary"
                  fullWidth
                  className="text-sm"
                >
                  Vaciar Carrito
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer with Total and Checkout */}
      <div className="p-4 md:p-6 bg-[#0f172a] border-t border-[#334155]">
        {/* Items Count */}
        {items.length > 0 && (
          <div className="flex justify-between items-center mb-3">
            <span className="text-[#94a3b8] text-sm">Items:</span>
            <span className="text-[#f8fafc] font-bold">{items.length}</span>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between items-end mb-4 md:mb-6">
          <span className="text-[#94a3b8] uppercase tracking-wider text-sm">
            Total a Pagar
          </span>
          <div className="text-right">
            <span className="text-2xl md:text-4xl font-heading font-bold text-[#f8fafc] block">
              ${total.toFixed(2)}
            </span>
            {items.length > 0 && (
              <span className="text-xs text-[#64748b] block mt-1">
                {items.reduce((sum, item) => sum + item.quantity, 0)} unidades
              </span>
            )}
          </div>
        </div>

        {/* Checkout Button */}
        <Button
          onClick={onCheckout}
          fullWidth
          disabled={items.length === 0 || isLoading}
          className={`h-12 md:h-14 text-base md:text-lg tracking-widest ${TOUCH_TARGET} bg-[#e2b808] hover:bg-[#d4a017] text-[#0f172a] border-[#d4a017]`}
          isLoading={isLoading}
        >
          {isLoading ? 'PROCESANDO...' : 'COBRAR'}
        </Button>

        {/* Mobile: Quick Actions */}
        <div className="md:hidden mt-4 grid grid-cols-2 gap-2">
          <Button
            onClick={onClearCart}
            variant="secondary"
            disabled={items.length === 0}
            className="text-sm h-10"
          >
            Vaciar
          </Button>
          <Button
            onClick={onCheckout}
            variant="primary"
            disabled={items.length === 0}
            className="text-sm h-10 bg-[#e2b808] hover:bg-[#d4a017] text-[#0f172a] border-[#d4a017]"
          >
            Pagar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Cart;