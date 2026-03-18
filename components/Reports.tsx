import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { ChevronLeft, Download, FileText, TrendingUp, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import Button from './Button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getTransactions } from '../lib/database';

interface ReportsProps {
  onBack: () => void;
}

const Reports: React.FC<ReportsProps> = ({ onBack }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load transactions on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await getTransactions();
        setTransactions(data);
      } catch (err: any) {
        console.error("Error cargando transacciones:", err);
        setError("No se pudieron cargar las transacciones.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Error Boundary effect for rendering errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Error capturado en Reports:", event.error);
      setError(event.error?.message || "Error desconocido de renderizado");
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400 animate-pulse">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center text-center p-6">
        <AlertCircle className="text-red-500 w-16 h-16 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Algo salió mal en Reportes</h2>
        <p className="text-zinc-400 mb-6 max-w-md bg-zinc-900 p-4 rounded font-mono text-sm border border-red-900/50">
          {error}
        </p>
        <Button onClick={onBack}>Volver al Dashboard</Button>
      </div>
    );
  }

  try {
    // Calculate KPIs
    const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = transactions.length;

    const now = new Date();
    // Use local YYYY-MM-DD
    const todayLocalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const todaySales = transactions
      .filter(t => {
        const d = new Date(t.date); // Parses UTC date to local Date object
        const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return localDateStr === todayLocalStr;
      })
      .reduce((sum, t) => sum + t.total, 0);

    // Sales by Barber - Sorted alphabetically to maintain consistent charting colors
    const salesByBarberRaw = transactions.reduce((acc, t) => {
      acc[t.barber] = (acc[t.barber] || 0) + t.total;
      return acc;
    }, {} as Record<string, number>);

    const salesByBarber = Object.keys(salesByBarberRaw).sort().reduce(
      (obj, key) => { 
        obj[key] = salesByBarberRaw[key]; 
        return obj;
      }, 
      {} as Record<string, number>
    );

    const chartData = Object.keys(salesByBarber).map(key => ({
      name: key,
      value: salesByBarber[key]
    }));

    const downloadBlob = (blob: Blob, fileName: string) => {
      // Crear URL del blob
      const url = window.URL.createObjectURL(blob);

      // Crear elemento link invisible
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      // No ocultar el link para evitar bloqueos de seguridad en algunos navegadores
      document.body.appendChild(link);

      // Simular click
      link.click();

      // Limpiar después de un retraso mayor (5 segundos) para asegurar compatibilidad
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 1000);
    };

    const exportToPDF = () => {
      try {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('NERON BARBERSHOP', 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Reporte de Ventas', 105, 28, { align: 'center' });
        doc.text(new Date().toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }), 105, 34, { align: 'center' });

        // KPIs Section
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMEN GENERAL', 14, 45);

        doc.setFont('helvetica', 'normal');
        doc.text(`Ventas Totales: $${totalSales.toLocaleString()}`, 14, 52);
        doc.text(`Total Transacciones: ${totalTransactions}`, 14, 58);
        doc.text(`Ventas Hoy: $${todaySales.toLocaleString()}`, 14, 64);

        // Sales by Barber
        doc.setFont('helvetica', 'bold');
        doc.text('VENTAS POR BARBERO', 14, 75);
        doc.setFont('helvetica', 'normal');
        let yPos = 82;
        Object.entries(salesByBarber).forEach(([barber, total]) => {
          doc.text(`${barber}: $${total.toLocaleString()}`, 14, yPos);
          yPos += 6;
        });

        // Transactions Table
        autoTable(doc, {
          startY: yPos + 5,
          head: [['Fecha', 'Barbero', 'Items', 'Método', 'Total']],
          body: transactions.map(t => [
            new Date(t.date).toLocaleString('es-MX', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            }),
            t.barber,
            t.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
            t.paymentMethod,
            `$${t.total}`,
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [245, 158, 11], textColor: 0 },
          alternateRowStyles: { fillColor: [250, 250, 250] },
        });

        // Open PDF in new tab
        const pdfOutput = doc.output('bloburl');
        window.open(pdfOutput, '_blank');
      } catch (error: any) {
        console.error('Error generando PDF:', error);
        alert(`Error al generar PDF: ${error.message}`);
      }
    };

    const exportToExcel = () => {
      try {
        // Create workbook
        const wb = XLSX.utils.book_new();

        // Sheet 1: KPIs Summary
        const summaryData = [
          ['NERON BARBERSHOP - REPORTE DE VENTAS'],
          ['Fecha:', new Date().toLocaleDateString('es-MX')],
          [],
          ['RESUMEN GENERAL'],
          ['Ventas Totales', `$${totalSales.toLocaleString()}`],
          ['Total Transacciones', totalTransactions],
          ['Ventas Hoy', `$${todaySales.toLocaleString()}`],
          [],
          ['VENTAS POR BARBERO'],
          ...Object.entries(salesByBarber).map(([barber, total]) => [barber, `$${total.toLocaleString()}`]),
        ];

        const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

        // Sheet 2: Detailed Transactions
        const transactionsData = [
          ['ID', 'Fecha', 'Hora', 'Barbero', 'Método', 'Referencia', 'Total', 'Items'],
          ...transactions.map(t => [
            t.id.slice(0, 8),
            new Date(t.date).toLocaleDateString('es-MX'),
            new Date(t.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
            t.barber,
            t.paymentMethod,
            t.reference || '-',
            t.total,
            t.items.map(i => `${i.quantity}x ${i.name} ($${i.price})`).join(' | '),
          ]),
        ];

        const ws2 = XLSX.utils.aoa_to_sheet(transactionsData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Transacciones');

        // Save Excel file using standard method
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const url = window.URL.createObjectURL(excelBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'reporte_ventas.xlsx';
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 1000);
      } catch (error: any) {
        console.error('Error generando Excel:', error);
        alert(`Error al generar Excel: ${error.message}`);
      }
    };

    return (
      <div className="h-screen bg-zinc-950 flex flex-col p-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
              <ChevronLeft />
            </button>
            <div>
              <h2 className="text-3xl font-heading font-bold text-white uppercase tracking-wide">Reportes</h2>
              <p className="text-zinc-500">Análisis de ventas y rendimiento</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={exportToPDF} className="gap-2 bg-red-600 hover:bg-red-700 text-white border-red-800">
              <FileText size={18} /> Ver PDF
            </Button>
            <Button onClick={exportToExcel} className="gap-2 bg-green-600 hover:bg-green-700 text-white border-green-800">
              <Download size={18} /> Exportar Excel
            </Button>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-zinc-500 text-sm uppercase font-bold">Ventas Totales</p>
                <p className="text-3xl font-heading font-bold text-white">${totalSales.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-zinc-500 text-sm uppercase font-bold">Transacciones</p>
                <p className="text-3xl font-heading font-bold text-white">{totalTransactions}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-zinc-500 text-sm uppercase font-bold">Ventas Hoy</p>
                <p className="text-3xl font-heading font-bold text-white">${todaySales.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wide">Ventas por Barbero</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ fill: '#27272a' }}
                  />
                  <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#f59e0b' : '#d97706'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
            <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wide">Tendencia Mensual</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(() => {
                  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
                  const currentYear = new Date().getFullYear();
                  const currentMonth = new Date().getMonth();
                  
                  return Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    
                    const total = transactions
                      .filter(t => {
                         const d = new Date(t.date);
                         const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                         return localDateStr === dateStr;
                      })
                      .reduce((sum, t) => sum + t.total, 0);
                    return { day, total };
                  });
                })()}>
                  <XAxis dataKey="day" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: '#a1a1aa' }}
                  />
                  <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (e: any) {
    return (
      <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center text-center p-6">
        <AlertCircle className="text-red-500 w-16 h-16 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Error de Renderizado</h2>
        <p className="text-zinc-400 mb-6 max-w-md bg-zinc-900 p-4 rounded font-mono text-sm border border-red-900/50">
          {e.message}
        </p>
        <Button onClick={onBack}>Volver al Dashboard</Button>
      </div>
    );
  }
};

export default Reports;