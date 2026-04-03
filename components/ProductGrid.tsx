// ============================================================================
// PRODUCT GRID COMPONENT - Catálogo responsivo optimizado para móvil
// ============================================================================

import React from 'react';
import { CatalogItem, ItemType } from '../types';
import { Loader2 } from 'lucide-react';
import Button from './Button';

interface ProductGridProps {
  items: CatalogItem[];
  activeTab: ItemType;
  searchQuery: string;
  onAddToCart: (item: CatalogItem) => void;
  onTabChange: (tab: ItemType) => void;
  onSearchChange: (query: string) => void;
  isLoading?: boolean;
  hasMoreItems?: boolean;
  onLoadMore?: () => void;
  isLoadMoreLoading?: boolean;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  items,
  activeTab,
  searchQuery,
  onAddToCart,
  onTabChange,
  onSearchChange,
  isLoading = false,
  hasMoreItems = false,
  onLoadMore,
  isLoadMoreLoading = false
}) => {
  // Touch target mínimo: 44px = 2.75rem
  const TOUCH_TARGET = 'min-h-[44px]';

  // Filtrar items basado en búsqueda
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    item.type === activeTab
  );

  // Grid responsivo: 2 columnas en móvil, 3-4 en desktop
  const gridClasses = `
    grid grid-cols-2 
    sm:grid-cols-2 
    md:grid-cols-3 
    lg:grid-cols-4 
    gap-3 md:gap-4
  `;

  // Empty-state inline: no reemplaza el layout para que los tabs sigan visibles
  const showEmptyState = !isLoading && filteredItems.length === 0;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header con búsqueda - Optimizado para móvil */}
      <div className="shrink-0 p-3 md:p-4 border-b border-[#334155] bg-[#0f172a]">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Título */}
          <h2 className="text-lg md:text-xl font-heading font-bold text-[#e2b808] uppercase tracking-wider">
            Catálogo
          </h2>

          {/* Barra de búsqueda */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar producto o servicio..."
              className="w-full bg-[#1e293b] border border-[#334155] rounded-lg pl-10 pr-4 py-2 md:py-3 text-sm text-[#f8fafc] focus:border-[#e2b808] focus:outline-none"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Buscar en catálogo"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748b]">
              🔍
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - Touch targets grandes */}
      <div className="shrink-0 flex p-2 gap-2 bg-[#1e293b]/50">
        <button
          onClick={() => onTabChange(ItemType.SERVICE)}
          className={`flex-1 py-3 px-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-all ${TOUCH_TARGET} ${
            activeTab === ItemType.SERVICE
              ? 'bg-[#e2b808] text-[#0f172a] shadow-lg shadow-[#e2b808]/20'
              : 'text-[#94a3b8] hover:bg-[#334155]'
          }`}
          aria-label="Ver servicios"
        >
          Servicios
        </button>
        <button
          onClick={() => onTabChange(ItemType.PRODUCT)}
          className={`flex-1 py-3 px-2 text-sm font-bold uppercase tracking-wider rounded-lg transition-all ${TOUCH_TARGET} ${
            activeTab === ItemType.PRODUCT
              ? 'bg-[#e2b808] text-[#0f172a] shadow-lg shadow-[#e2b808]/20'
              : 'text-[#94a3b8] hover:bg-[#334155]'
          }`}
          aria-label="Ver productos"
        >
          Productos
        </button>
      </div>

      {/* Loading State */}
      {isLoading && filteredItems.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#e2b808] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[#94a3b8] animate-pulse">Cargando catálogo...</p>
          </div>
        </div>
      ) : (
        /* Grid de productos */
        <div 
          className="flex-1 overflow-y-auto overscroll-contain p-3 md:p-4 bg-[#0f172a] pb-40"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {showEmptyState ? (
            /* Empty state inline — las tabs siguen visibles */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 bg-[#334155] rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">📦</span>
              </div>
              <h3 className="text-xl font-bold text-[#f8fafc] mb-2">
                {searchQuery ? 'Sin resultados' : 'Sin ítems en esta categoría'}
              </h3>
              <p className="text-[#94a3b8] max-w-sm text-sm">
                {searchQuery
                  ? `No hay coincidencias para "${searchQuery}"`
                  : activeTab === 'SERVICE'
                    ? 'No hay servicios. Agrégalos desde Gestión del Catálogo.'
                    : 'No hay productos. Agrégalos desde Gestión del Catálogo.'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Contador de resultados */}
              <div className="mb-4 flex justify-between items-center">
                <span className="text-sm text-[#94a3b8]">
                  {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} encontrados
                </span>
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="text-xs text-[#e2b808] hover:text-[#d4a017]"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>

              {/* Grid responsivo */}
              <div className={gridClasses}>
                {filteredItems.map(item => {
                  const isOutOfStock = item.type === ItemType.PRODUCT && (item.stock || 0) <= 0;
                  const isLowStock = item.type === ItemType.PRODUCT && (item.stock || 0) > 0 && (item.stock || 0) < 5;

                  return (
                    <button
                      key={item.id}
                      onClick={() => !isOutOfStock && onAddToCart(item)}
                      disabled={isOutOfStock}
                      className={`
                        relative p-3 bg-[#1e293b] rounded-xl border border-[#334155] 
                        cursor-pointer min-h-[120px] flex flex-col justify-between
                        hover:border-[#e2b808]/50 transition-all text-left
                        ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                      aria-label={`Agregar ${item.name}`}
                    >
                      {/* Nombre y marca */}
                      <div>
                        <h3 className="font-bold text-sm leading-tight text-[#f8fafc] line-clamp-2">
                          {item.name}
                        </h3>
                        {item.brand && (
                          <p className="text-[10px] text-[#64748b] uppercase mt-0.5">
                            {item.brand}
                          </p>
                        )}
                      </div>

                      {/* Precio y stock — en la parte inferior, bien separados */}
                      <div className="flex items-end justify-between mt-2">
                        <div>
                          <p className="text-[#e2b808] font-bold text-base md:text-lg">
                            ${item.price.toFixed(2)}
                          </p>
                        </div>
                        {item.type === ItemType.PRODUCT && item.stock !== undefined && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            item.stock <= 5 
                              ? 'bg-rose-500/20 text-rose-400' 
                              : 'bg-[#0f172a] text-[#94a3b8]'
                          }`}>
                            {item.stock} un.
                          </span>
                        )}
                      </div>

                      {/* Indicador de tipo discreto */}
                      <div className="absolute top-1 right-2 opacity-30">
                        <span className="text-[8px] uppercase tracking-tighter text-[#64748b]">
                          {item.type === ItemType.SERVICE ? 'SVC' : 'PRD'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Load More Button */}
          {hasMoreItems && onLoadMore && (
            <div className="mt-6 md:mt-8 text-center">
              <Button
                onClick={onLoadMore}
                variant="secondary"
                disabled={isLoadMoreLoading}
                className="gap-2 min-w-[200px]"
                size="lg"
              >
                {isLoadMoreLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  'Cargar más productos'
                )}
              </Button>
              <p className="text-xs text-[#64748b] mt-2">
                Mostrando {filteredItems.length} de {items.length} productos
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductGrid;