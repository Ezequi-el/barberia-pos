import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import { supabase } from '../lib/supabase';
import { Printer, Download, X, Calendar as CalendarIcon, DollarSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToastNotifications } from './Toast';

interface CorteDeCajaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CorteDeCajaModal: React.FC<CorteDeCajaModalProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const { showSuccess, showError } = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && profile?.business_id) {
      fetchTodayData();
    }
  }, [isOpen, profile]);

  const fetchTodayData = async () => {
    try {
      setLoading(true);
      const start = new Date(); 
      start.setHours(0, 0, 0, 0);
      const end = new Date(); 
      end.setHours(23, 59, 59, 999);

      const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select('*, variantes(*)')
        .eq('business_id', profile?.business_id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(pedidos || []);
    } catch (err) {
      console.error('Error fetching today data:', err);
      showError('No se pudo cargar la información del corte', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a5'); // Formato ticket/A5
      
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 20, 'F');
      
      doc.setTextColor(226, 184, 8);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text('CORTE DE CAJA', 14, 14);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 28);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text('Resumen por Método de Pago', 14, 40);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      let currentY = 48;
      Object.entries(totalsByMethod).forEach(([method, stat]) => {
        const s = stat as { total: number, count: number };
        doc.text(`${method}: $${s.total.toLocaleString()} (${s.count} transacciones)`, 14, currentY);
        currentY += 8;
      });
      
      doc.setDrawColor(200, 200, 200);
      doc.line(14, currentY + 2, 134, currentY + 2);
      
      currentY += 12;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`TOTAL DEL DÍA: $${totalDay.toLocaleString()}`, 14, currentY);
      
      currentY += 12;
      
      const tableRows = data.map(t => [
        new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        t.barber,
        t.payment_method,
        `$${Number(t.total).toFixed(2)}`
      ]);

      autoTable(doc, {
        head: [['Hora', 'Barbero', 'Método', 'Total']],
        body: tableRows,
        startY: currentY,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 41, 59] }
      });

      doc.save(`corte_caja_${new Date().toISOString().split('T')[0]}.pdf`);
      showSuccess('Corte exportado a PDF');
    } catch (err) {
      console.error(err);
      showError('Error al generar PDF');
    }
  };

  if (!isOpen) return null;

  // Calculos
  const totalDay = data.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
  const totalsByMethod = data.reduce((acc, curr) => {
    const method = curr.payment_method || 'OTRO';
    if (!acc[method]) acc[method] = { total: 0, count: 0 };
    acc[method].total += Number(curr.total || 0);
    acc[method].count += 1;
    return acc;
  }, {} as Record<string, { total: number, count: number }>);

  const formatLongDate = new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Corte de Caja Diario" maxWidth="max-w-2xl">
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-12 h-12 border-4 border-[#e2b808] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-8 flex flex-col h-auto max-h-[80vh] print:max-h-none print:h-auto overflow-hidden">
          
          {/* Header del corte */}
          <div className="flex items-center justify-between border-b border-[#334155] pb-4 print:border-black">
            <div className="flex items-center gap-3">
               <CalendarIcon className="text-[#e2b808] print:text-black" size={24} />
               <div>
                  <h3 className="text-xl font-bold text-[#f8fafc] print:text-black capitalize">Resumen del Día</h3>
                  <p className="text-[#94a3b8] print:text-gray-700 capitalize text-sm">{formatLongDate}</p>
               </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto pr-2 space-y-6 print:overflow-visible">
            {/* Resumen por metodos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'].map(method => {
                const stat = totalsByMethod[method] || { total: 0, count: 0 };
                return (
                  <div key={method} className="bg-[#0f172a] border border-[#334155] p-4 rounded-xl print:border-black print:bg-white text-center">
                     <p className="text-xs font-bold text-[#94a3b8] print:text-gray-600 mb-1">{method}</p>
                     <p className="text-xl font-bold text-[#f8fafc] print:text-black">${stat.total.toLocaleString()}</p>
                     <p className="text-xs text-[#64748b] mt-1">{stat.count} transacciones</p>
                  </div>
                );
              })}
            </div>

            {/* Total destacado */}
            <div className="bg-[#e2b808]/10 border border-[#e2b808]/30 rounded-2xl p-6 text-center print:border-black print:bg-white">
               <p className="text-sm font-bold text-[#e2b808] print:text-black uppercase tracking-widest mb-2">Total del Día</p>
               <p className="text-5xl font-heading font-bold text-[#e2b808] print:text-black">
                 ${totalDay.toLocaleString()}
               </p>
            </div>

            {/* Tabla de detalle */}
            <div>
              <h4 className="text-[#94a3b8] print:text-black text-sm font-bold uppercase tracking-wider mb-4 border-b border-[#334155] print:border-black pb-2">
                Detalle de Transacciones
              </h4>
              <div className="overflow-x-auto rounded-lg border border-[#334155] print:border-black">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#0f172a] print:bg-gray-100 text-[#f8fafc] print:text-black">
                    <tr>
                      <th className="p-3">Hora</th>
                      <th className="p-3">Barbero</th>
                      <th className="p-3">Items</th>
                      <th className="p-3">Método</th>
                      <th className="p-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155] print:divide-black text-[#cbd5e1] print:text-black">
                    {data.map(t => (
                      <tr key={t.id} className="hover:bg-[#1e293b] print:hover:bg-transparent transition-colors">
                        <td className="p-3">{new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-3 font-medium">{t.barber}</td>
                        <td className="p-3 truncate max-w-[150px]" title={t.variantes?.map((v:any) => v.name).join(', ')}>
                          {t.variantes?.map((v:any) => v.name).join(', ')}
                        </td>
                        <td className="p-3 text-xs">{t.payment_method}</td>
                        <td className="p-3 text-right font-bold text-[#f8fafc] print:text-black">${Number(t.total).toFixed(2)}</td>
                      </tr>
                    ))}
                    {data.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-[#64748b]">No hay ventas registradas el día de hoy</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-between gap-3 border-t border-[#334155] print:hidden">
            <Button variant="secondary" onClick={onClose} className="px-6">Cerrar</Button>
            <div className="flex gap-3">
               <Button variant="secondary" onClick={handleExportPDF} className="gap-2">
                 <Download size={18} /> Exportar PDF
               </Button>
               <Button onClick={handlePrint} className="gap-2 bg-[#e2b808] hover:bg-[#d4a017] text-[#0f172a] border-[#d4a017]">
                 <Printer size={18} /> Imprimir Corte
               </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CorteDeCajaModal;
