// ============================================================================
// REPORTS COMPONENT - Sistema de reportes con PIN administrativo
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, PaymentMethod } from '../types';
import { 
  ChevronLeft, 
  Download, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Trash2,
  Lock,
  RefreshCw,
  Filter,
  Eye,
  EyeOff,
  AlertTriangle,
  Printer
} from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import Input from './Input';
import CorteDeCajaModal from './CorteDeCajaModal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getTransactions } from '../lib/database';
import { cancelTransactionWithPin } from '../lib/admin';
import { useToastNotifications } from './Toast';
import { useAuth } from '../contexts/AuthContext';

interface ReportsProps {
  onBack: () => void;
}

const Reports: React.FC<ReportsProps> = ({ onBack }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterBarber, setFilterBarber] = useState<string>('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('');
  
  // Estado para cancelación con PIN
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [corteModalOpen, setCorteModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [adminPin, setAdminPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  
  // Toast notifications
  const { showSuccess, showError, showWarning, showInfo } = useToastNotifications();
  
  // Autenticación
  const { user, profile } = useAuth();
  const isBarber = profile?.role === 'barber';

  // Touch target mínimo: 44px
  const TOUCH_TARGET = 'min-h-[44px] min-w-[44px]';

  // Cargar transacciones
  useEffect(() => {
    loadTransactions();
  }, [user, isBarber]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await getTransactions(100, isBarber ? user?.id : undefined);
      setTransactions(data);
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      showError('Error al cargar transacciones', 'Error de carga');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar transacciones
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Filtrar por fecha
      if (filterDate) {
        const transactionDate = new Date(t.date).toISOString().split('T')[0];
        if (transactionDate !== filterDate) return false;
      }
      
      // Filtrar por barbero
      if (filterBarber && t.barber !== filterBarber) return false;
      
      // Filtrar por método de pago
      if (filterPaymentMethod && t.paymentMethod !== filterPaymentMethod) return false;
      
      return true;
    });
  }, [transactions, filterDate, filterBarber, filterPaymentMethod]);

  // Estadísticas
  const stats = useMemo(() => {
    const totalSales = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = filteredTransactions.length;
    
    // Ventas de hoy
    const today = new Date().toISOString().split('T')[0];
    const todaySales = filteredTransactions
      .filter(t => new Date(t.date).toISOString().split('T')[0] === today)
      .reduce((sum, t) => sum + t.total, 0);
    
    // Ventas por barbero para el gráfico
    const salesByBarber = filteredTransactions.reduce((acc, t) => {
      acc[t.barber] = (acc[t.barber] || 0) + t.total;
      return acc;
    }, {} as Record<string, number>);
    
    const chartData = Object.keys(salesByBarber).map(key => ({
      name: key,
      value: salesByBarber[key]
    }));
    
    // Métodos de pago más usados
    const paymentMethods = filteredTransactions.reduce((acc, t) => {
      acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topPaymentMethod = Object.entries(paymentMethods)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A';
    
    return {
      totalSales,
      totalTransactions,
      todaySales,
      chartData,
      topPaymentMethod,
      barbers: Array.from(new Set(filteredTransactions.map(t => t.barber))),
      paymentMethods: Array.from(new Set(filteredTransactions.map(t => t.paymentMethod)))
    };
  }, [filteredTransactions]);

  // Exportar a CSV de forma amena para Excel (Español)
  const exportCSV = () => {
    try {
      const headers = ['ID', 'Fecha', 'Barbero', 'Método', 'Referencia', 'Total', 'Items'];
      const rows = filteredTransactions.map(t => [
        t.id.slice(0, 8).toUpperCase(),
        new Date(t.date).toLocaleString(),
        t.barber,
        t.paymentMethod,
        t.reference || '-',
        t.total.toFixed(2),
        `"${t.items.map(i => `${i.quantity}x ${i.name}`).join(' | ')}"`
      ]);

      // Totales
      const summaryRows = [
        [], // Línea en blanco
        ['', '', '', '', 'RESUMEN POR MÉTODO DE PAGO', '', ''],
      ];
      
      const paymentTotals = filteredTransactions.reduce((acc, t) => {
        acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + t.total;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(paymentTotals).forEach(([method, total]) => {
        summaryRows.push(['', '', '', '', method, (total as number).toFixed(2), '']);
      });

      summaryRows.push(['', '', '', '', 'TOTAL GENERAL', stats.totalSales.toFixed(2), '']);

      const BOM = '\uFEFF';
      const csvContent = BOM + [
        headers.join(';'), 
        ...rows.map(r => r.join(';')),
        ...summaryRows.map(r => r.join(';'))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `barberia_reporte_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showSuccess('Reporte exportado exitosamente', 'Exportación completa');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      showError('Error al exportar el reporte', 'Error de exportación');
    }
  };

  // Exportar a PDF detallado y profesional usando jsPDF
  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Header Banner (Estilo Premium Velo POS)
      doc.setFillColor(15, 23, 42); // bg-[#0f172a]
      doc.rect(0, 0, 210, 24, 'F');
      
      doc.setTextColor(226, 184, 8); // text-[#e2b808]
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text('VELO POS', 14, 16);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text('REPORTE DE VENTAS', 150, 15);
      
      // Info texto
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 34);
      if (filterDate) {
        doc.text(`Filtro de Fecha: ${filterDate}`, 14, 40);
      }
      
      // Tabla principal de transacciones
      const tableColumn = ["ID", "Fecha", "Barbero", "Método", "Total", "Items"];
      const tableRows = filteredTransactions.map(t => [
        t.id.slice(0, 8).toUpperCase(),
        new Date(t.date).toLocaleString(),
        t.barber,
        t.paymentMethod,
        `$${t.total.toFixed(2)}`,
        t.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 46,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [226, 184, 8], textColor: [15, 23, 42], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 46;

      // Cálculo de totales desglosados
      const paymentTotals = filteredTransactions.reduce((acc, t) => {
        acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + t.total;
        return acc;
      }, {} as Record<string, number>);

      const summaryRows = Object.entries(paymentTotals).map(([method, total]) => [
        method, 
        `$${(total as number).toFixed(2)}`
      ]);

      // Agregar fila de total general
      summaryRows.push(['TOTAL GENERAL', `$${stats.totalSales.toLocaleString()}`]);

      // Tabla secundaria de Resumen
      autoTable(doc, {
        head: [['Resumen por Método', 'Monto']],
        body: summaryRows,
        startY: finalY + 12,
        theme: 'grid',
        tableWidth: 80,
        margin: { left: 14 },
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        didParseCell: function(data) {
          // Resaltar Total General
          if (data.row.index === summaryRows.length - 1 && data.section === 'body') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [226, 184, 8];
            data.cell.styles.textColor = [15, 23, 42];
          }
        }
      });

      doc.save(`velo_pos_reporte_${new Date().toISOString().split('T')[0]}.pdf`);
      showSuccess('PDF generado exitosamente', 'Exportación completa');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showError('Error al generar PDF', 'Error de exportación');
    }
  };

  // Iniciar cancelación de transacción
  const handleCancelTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setAdminPin('');
    setShowPin(false);
    setCancelModalOpen(true);
  };

  // Confirmar cancelación con PIN
  const handleConfirmCancel = async () => {
    if (!selectedTransaction) return;
    
    try {
      setCancelling(true);
      
      // Obtener user_id del contexto de autenticación
      const userId = user?.id || 'demo-user-id';
      
      const result = await cancelTransactionWithPin({
        transaction_id: selectedTransaction.id,
        user_id: userId,
        admin_pin: adminPin
      });
      
      if (result.success) {
        showSuccess('Transacción cancelada exitosamente', 'Cancelación completa');
        
        // Actualizar lista de transacciones
        setTransactions(prev => prev.filter(t => t.id !== selectedTransaction.id));
        
        // Cerrar modal
        setCancelModalOpen(false);
        setSelectedTransaction(null);
        setAdminPin('');
      } else {
        showError(result.error || 'Error al cancelar transacción', 'Error de cancelación');
      }
    } catch (error: any) {
      console.error('Error cancelling transaction:', error);
      showError(error.message || 'Error al cancelar transacción', 'Error de cancelación');
    } finally {
      setCancelling(false);
    }
  };

  // Limpiar filtros
  const clearFilters = () => {
    setFilterDate('');
    setFilterBarber('');
    setFilterPaymentMethod('');
    showInfo('Filtros limpiados', 'Filtros');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#e2b808] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#94a3b8] animate-pulse">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0f172a] flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            onClick={onBack} 
            className={`p-2 hover:bg-[#334155] rounded-full text-[#94a3b8] hover:text-[#f8fafc] ${TOUCH_TARGET}`}
            aria-label="Volver al dashboard"
          >
            <ChevronLeft />
          </button>
          <div>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-[#e2b808] uppercase tracking-wide">
              {isBarber ? 'Mis Reportes' : 'Reportes'}
            </h2>
            <p className="text-[#94a3b8] text-sm md:text-base">
              Análisis financiero y operativo
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {!isBarber && (
            <>
              <Button 
                onClick={() => setCorteModalOpen(true)}
                className="gap-2 text-sm md:text-base bg-[#e2b808] hover:bg-[#d4a017] text-[#0f172a] print:hidden"
              >
                <Printer size={18} /> Corte de Caja
              </Button>
              <Button 
                onClick={exportCSV} 
                variant="secondary" 
                className="gap-2 text-sm md:text-base print:hidden"
              >
                <Download size={18} /> Exportar Excel
              </Button>
              <Button 
                onClick={exportPDF} 
                variant="secondary" 
                className="gap-2 text-sm md:text-base print:hidden"
              >
                <Printer size={18} /> Exportar PDF
              </Button>
            </>
          )}
          <Button 
            onClick={loadTransactions} 
            variant="secondary" 
            className="gap-2 text-sm md:text-base hidden print:hidden"
          >
            <RefreshCw size={18} /> Actualizar
          </Button>
        </div>
      </div>

      {/* Filtros - Responsivo */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl p-4 mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[#f8fafc] font-bold uppercase text-sm flex items-center gap-2">
            <Filter size={16} /> Filtros
          </h3>
          <button
            onClick={clearFilters}
            className="text-xs text-[#e2b808] hover:text-[#d4a017]"
          >
            Limpiar filtros
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtro por fecha */}
          <div>
            <label className="block text-xs text-[#94a3b8] mb-2">Fecha</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm text-[#f8fafc] focus:border-[#e2b808] focus:outline-none"
            />
          </div>
          
          {/* Filtro por barbero (Oculto para barberos) */}
          {!isBarber && (
            <div>
              <label className="block text-xs text-[#94a3b8] mb-2">Barbero</label>
              <select
                value={filterBarber}
                onChange={(e) => setFilterBarber(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm text-[#f8fafc] focus:border-[#e2b808] focus:outline-none"
              >
                <option value="">Todos los barberos</option>
                {stats.barbers.map(barber => (
                  <option key={barber} value={barber}>{barber}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Filtro por método de pago */}
          <div>
            <label className="block text-xs text-[#94a3b8] mb-2">Método de Pago</label>
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm text-[#f8fafc] focus:border-[#e2b808] focus:outline-none"
            >
              <option value="">Todos los métodos</option>
              {stats.paymentMethods.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Contador de resultados */}
        <div className="mt-4 pt-4 border-t border-[#334155] flex justify-between items-center">
          <span className="text-sm text-[#94a3b8]">
            {filteredTransactions.length} de {transactions.length} transacciones
          </span>
          <span className="text-[#e2b808] font-bold">
            Total filtrado: ${stats.totalSales.toLocaleString()}
          </span>
        </div>
      </div>

      {/* KPI Cards - Responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-[#1e293b] border border-[#334155] p-4 md:p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#94a3b8] text-xs uppercase font-bold tracking-wider mb-1">
                Ventas Totales
              </p>
              <h3 className="text-2xl md:text-3xl font-heading font-bold text-[#f8fafc]">
                ${stats.totalSales.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#e2b808]/10 flex items-center justify-center text-[#e2b808]">
              <DollarSign size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-[#1e293b] border border-[#334155] p-4 md:p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#94a3b8] text-xs uppercase font-bold tracking-wider mb-1">
                Transacciones
              </p>
              <h3 className="text-2xl md:text-3xl font-heading font-bold text-[#f8fafc]">
                {stats.totalTransactions}
              </h3>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#38bdf8]/10 flex items-center justify-center text-[#38bdf8]">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-[#1e293b] border border-[#334155] p-4 md:p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#94a3b8] text-xs uppercase font-bold tracking-wider mb-1">
                Ventas Hoy
              </p>
              <h3 className="text-2xl md:text-3xl font-heading font-bold text-[#f8fafc]">
                ${stats.todaySales.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Calendar size={20} />
            </div>
          </div>
        </div>
        
        <div className="bg-[#1e293b] border border-[#334155] p-4 md:p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#94a3b8] text-xs uppercase font-bold tracking-wider mb-1">
                Método Top
              </p>
              <h3 className="text-2xl md:text-3xl font-heading font-bold text-[#f8fafc] truncate">
                {stats.topPaymentMethod}
              </h3>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Lock size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal - Responsivo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Gráfico */}
        <div className="lg:col-span-1 bg-[#1e293b] border border-[#334155] rounded-xl p-4 md:p-6 flex flex-col">
          <h4 className="text-[#f8fafc] font-bold uppercase text-sm mb-4 md:mb-6">
            {isBarber ? 'Mi Rendimiento' : 'Rendimiento por Barbero'}
          </h4>
          <div className="flex-1 w-full min-h-[200px] md:min-h-[250px]">
            {stats.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData}>
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    cursor={{ fill: '#1e293b' }}
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderColor: '#334155', 
                      color: '#f8fafc' 
                    }}
                    itemStyle={{ color: '#e2b808' }}
                    formatter={(value) => [`$${value}`, 'Ventas']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {stats.chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index % 2 === 0 ? '#e2b808' : '#475569'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#64748b]">
                No hay datos para mostrar
              </div>
            )}
          </div>
        </div>

        {/* Tabla de transacciones */}
        <div className="lg:col-span-2 bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#334155] bg-[#0f172a]">
            <h4 className="text-[#f8fafc] font-bold uppercase text-sm">
              Historial de Transacciones
            </h4>
          </div>
          
          <div className="flex-1 overflow-auto">
            {filteredTransactions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-[#64748b]">
                <div className="w-16 h-16 bg-[#334155] rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <p className="text-center">No hay transacciones que coincidan con los filtros</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-[#1e293b] text-[#94a3b8] uppercase text-xs font-bold tracking-wider sticky top-0">
                    <tr>
                      <th className="p-3 md:p-4">Hora</th>
                      <th className="p-3 md:p-4">Barbero</th>
                      <th className="p-3 md:p-4">Detalle</th>
                      <th className="p-3 md:p-4">Pago</th>
                      <th className="p-3 md:p-4 text-right">Total</th>
                      <th className="p-3 md:p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155] text-sm">
                    {[...filteredTransactions].reverse().map(t => (
                      <tr key={t.id} className="hover:bg-[#334155]/30">
                        <td className="p-3 md:p-4 text-[#94a3b8]">
                          {new Date(t.date).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                          <div className="text-xs text-[#64748b]">
                            {new Date(t.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-3 md:p-4 text-[#f8fafc] font-medium">
                          {t.barber}
                        </td>
                        <td className="p-3 md:p-4 text-[#94a3b8] max-w-xs">
                          <div className="truncate" title={t.items.map(i => i.name).join(', ')}>
                            {t.items.map(i => i.name).join(', ')}
                          </div>
                          <div className="text-xs text-[#64748b] mt-1">
                            {t.items.length} items
                          </div>
                        </td>
                        <td className="p-3 md:p-4">
                          <span className="bg-[#334155] text-[#f8fafc] px-2 py-1 rounded text-xs font-bold uppercase inline-block">
                            {t.paymentMethod}
                          </span>
                          {t.reference && (
                            <div className="text-xs text-[#64748b] mt-1 truncate max-w-[120px]">
                              Ref: {t.reference}
                            </div>
                          )}
                        </td>
                        <td className="p-3 md:p-4 text-right">
                          <span className="font-bold text-[#e2b808] text-lg">
                            ${t.total.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-3 md:p-4 text-center">
                          <button
                            onClick={() => handleCancelTransaction(t)}
                            className={`p-2 text-[#64748b] hover:text-rose-500 transition-colors ${TOUCH_TARGET}`}
                            aria-label="Cancelar transacción"
                            title="Cancelar transacción (requiere PIN)"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Footer de la tabla */}
          {filteredTransactions.length > 0 && (
            <div className="p-3 md:p-4 border-t border-[#334155] bg-[#0f172a] text-xs text-[#94a3b8] flex justify-between items-center">
              <span>
                Mostrando {filteredTransactions.length} transacciones
              </span>
              <span className="text-[#e2b808] font-bold">
                Total: ${stats.totalSales.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modal de cancelación con PIN */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setSelectedTransaction(null);
          setAdminPin('');
        }}
        title="Cancelar Transacción"
      >
        {selectedTransaction && (
          <div className="space-y-6">
            {/* Información de la transacción */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-4">
              <h4 className="text-[#f8fafc] font-bold mb-3">Detalles de la transacción</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">ID:</span>
                  <span className="text-[#f8fafc] font-mono">
                    {selectedTransaction.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Fecha:</span>
                  <span className="text-[#f8fafc]">
                    {new Date(selectedTransaction.date).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Barbero:</span>
                  <span className="text-[#f8fafc]">{selectedTransaction.barber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Total:</span>
                  <span className="text-[#e2b808] font-bold">
                    ${selectedTransaction.total.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">Items:</span>
                  <span className="text-[#f8fafc]">
                    {selectedTransaction.items.length} productos/servicios
                  </span>
                </div>
              </div>
            </div>

            {/* Advertencia */}
            <div className="bg-[#e2b808]/10 border border-[#e2b808]/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-[#e2b808] mt-0.5" size={20} />
                <div>
                  <h5 className="text-[#e2b808] font-bold mb-1">¡Advertencia!</h5>
                  <p className="text-[#94a3b8] text-sm">
                    Esta acción cancelará la transacción y restaurará el stock de productos.
                    Se requiere PIN administrativo para continuar.
                  </p>
                </div>
              </div>
            </div>

            {/* Campo de PIN */}
            <div>
              <label className="block text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">
                PIN Administrativo (4 dígitos)
              </label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  value={adminPin}
                  onChange={(e) => {
                    // Solo permitir números y máximo 4 dígitos
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setAdminPin(value);
                  }}
                  placeholder="Ingresa el PIN"
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg pl-4 pr-12 py-3 text-[#f8fafc] focus:border-[#e2b808] focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#64748b] hover:text-[#94a3b8]"
                  aria-label={showPin ? "Ocultar PIN" : "Mostrar PIN"}
                >
                  {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-[#64748b] mt-2">
                El PIN administrativo es requerido para operaciones sensibles
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-4 border-t border-[#334155]">
              <Button
                onClick={() => {
                  setCancelModalOpen(false);
                  setSelectedTransaction(null);
                  setAdminPin('');
                }}
                variant="secondary"
                fullWidth
                className="min-h-[44px]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmCancel}
                disabled={adminPin.length !== 4 || cancelling}
                fullWidth
                className="min-h-[44px] bg-rose-500 hover:bg-rose-600 border-rose-500 text-white"
              >
                {cancelling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} className="mr-2" />
                    Confirmar Cancelación
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Corte de Caja */}
      <CorteDeCajaModal 
        isOpen={corteModalOpen} 
        onClose={() => setCorteModalOpen(false)} 
      />
    </div>
  );
};

export default Reports;