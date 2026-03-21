import React, { useState, useEffect, useMemo } from 'react';
import { Transaction } from '../types';
import { Download, FileText, TrendingUp, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import Button from './Button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getTransactions } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';

const Reports: React.FC = () => {
  const { user, profile } = useAuth();
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date Range State
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  // Load transactions on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await getTransactions();
        setAllTransactions(data);
      } catch (err: any) {
        console.error("Error cargando transacciones:", err);
        setError("No se pudieron cargar las transacciones.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Set default dates if empty
  useEffect(() => {
    if (!dateRange.start && !dateRange.end) {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const format = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      setDateRange({
        start: format(firstDayOfMonth),
        end: format(today)
      });
    }
  }, [dateRange]);

  // Apply filters
  const transactions = useMemo(() => {
    let filtered = allTransactions;

    // 1. Role-based isolation — barbers only see their own sales (matched by full_name)
    if (profile?.role === 'barber' && profile?.full_name) {
      filtered = filtered.filter(t => t.barber === profile.full_name);
    }

    // 2. Date Range filtering
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(t => {
        const d = new Date(t.date);
        const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return localDateStr >= dateRange.start && localDateStr <= dateRange.end;
      });
    }

    return filtered;
  }, [allTransactions, profile, user, dateRange]);

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
        <p className="text-zinc-400 max-w-md bg-zinc-900 p-4 rounded font-mono text-sm border border-red-900/50">
          {error}
        </p>
      </div>
    );
  }

  // Calculate KPIs
  const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalTransactions = transactions.length;

  const now = new Date();
  const todayLocalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const todaySales = allTransactions // always computed against all accessible transactions for today
    .filter(t => {
      // Keep isolation check
      if (profile?.role === 'barber' && t.userId !== user?.id) return false;
      const d = new Date(t.date); 
      const localDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return localDateStr === todayLocalStr;
    })
    .reduce((sum, t) => sum + t.total, 0);

  // Sales by Barber
  const salesByBarberRaw = transactions.reduce((acc, t) => {
    const b = t.barber.toString();
    acc[b] = (acc[b] || 0) + t.total;
    return acc;
  }, {} as Record<string, number>);

  const salesByBarber = Object.keys(salesByBarberRaw).sort().reduce((obj, key) => { 
    obj[key] = salesByBarberRaw[key]; 
    return obj;
  }, {} as Record<string, number>);

  const chartData = Object.keys(salesByBarber).map(key => ({
    name: key,
    value: salesByBarber[key]
  }));

  const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444'];

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 1000);
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();

      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('NERON BARBERSHOP', 105, 20, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Reporte de Ventas', 105, 28, { align: 'center' });
      doc.text(`Período: ${dateRange.start} al ${dateRange.end}`, 105, 34, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMEN GENERAL', 14, 45);

      const kpiData = [
        ['Total Ventas', `$${totalSales.toLocaleString()}`],
        ['Transacciones', totalTransactions.toString()]
      ];

      autoTable(doc, {
        startY: 50,
        body: kpiData,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [240, 240, 240] },
          1: { halign: 'right' }
        }
      });

      let listY = (doc as any).lastAutoTable.finalY + 15;

      if (profile?.role === 'owner') {
        doc.text('VENTAS POR BARBERO', 14, listY);
        const barberData = Object.keys(salesByBarber).map(b => [b, `$${salesByBarber[b].toLocaleString()}`]);
        autoTable(doc, {
          startY: listY + 5,
          head: [['Barbero', 'Total']],
          body: barberData,
          theme: 'striped',
          headStyles: { fillColor: [20, 20, 20], textColor: 255 },
          styles: { fontSize: 10 },
          columnStyles: { 1: { halign: 'right' } }
        });
        listY = (doc as any).lastAutoTable.finalY + 15;
      }

      doc.text('DESGLOSE DE TRANSACCIONES', 14, listY);

      // Always include Método de Pago column
      const txHeaders = profile?.role === 'owner'
        ? ['Fecha', 'Servicios / Productos', 'Barbero', 'Método de Pago', 'Total']
        : ['Fecha', 'Servicios / Productos', 'Método de Pago', 'Total'];

      const txData = transactions.map(t => {
        const fecha = new Date(t.date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
        const items = t.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
        const method = t.paymentMethod;
        const total = `$${t.total.toLocaleString()}`;
        return profile?.role === 'owner'
          ? [fecha, items, t.barber, method, total]
          : [fecha, items, method, total];
      });

      const totalColIdx = profile?.role === 'owner' ? 4 : 3;

      autoTable(doc, {
        startY: listY + 5,
        head: [txHeaders],
        body: txData,
        theme: 'striped',
        headStyles: { fillColor: [20, 20, 20], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { [totalColIdx]: { halign: 'right', fontStyle: 'bold', textColor: [0, 100, 0] } }
      });

      // ── Payment method subtotals ───────────────────────────────────────────
      const subtotals: Record<string, number> = {};
      transactions.forEach(t => {
        subtotals[t.paymentMethod] = (subtotals[t.paymentMethod] || 0) + t.total;
      });

      let subY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMEN POR MÉTODO DE PAGO', 14, subY);

      const subtotalRows = Object.keys(subtotals).map(m => [m, `$${subtotals[m].toLocaleString()}`]);
      subtotalRows.push(['TOTAL GENERAL', `$${totalSales.toLocaleString()}`]);

      autoTable(doc, {
        startY: subY + 5,
        head: [['Método de Pago', 'Subtotal']],
        body: subtotalRows,
        theme: 'grid',
        headStyles: { fillColor: [20, 20, 20], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        didParseCell: (data: any) => {
          if (data.row.index === subtotalRows.length - 1) {
            data.cell.styles.fillColor = [245, 158, 11];
            data.cell.styles.textColor = [0, 0, 0];
          }
        }
      });

      doc.save(`reporte_ventas_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Hubo un error al generar el PDF. Revisa la consola para más detalles.");
    }
  };

  const exportToExcel = () => {
    try {
      // ── Main transactions sheet ───────────────────────────────────────────
      const flatData = transactions.map(t => ({
        Fecha: new Date(t.date).toLocaleString('es-MX'),
        Barbero: t.barber,
        Metodo_Pago: t.paymentMethod,
        Total: t.total,
        Servicios_Productos: t.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
      }));

      // ── Payment subtotals ─────────────────────────────────────────────────
      const subtotals: Record<string, number> = {};
      transactions.forEach(t => {
        subtotals[t.paymentMethod] = (subtotals[t.paymentMethod] || 0) + t.total;
      });
      const subtotalData = [
        ...Object.keys(subtotals).map(m => ({ Metodo_Pago: m, Subtotal: subtotals[m] })),
        { Metodo_Pago: 'TOTAL GENERAL', Subtotal: totalSales }
      ];

      const ws = XLSX.utils.json_to_sheet(flatData);
      const wsSubtotals = XLSX.utils.json_to_sheet(subtotalData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
      XLSX.utils.book_append_sheet(wb, wsSubtotals, 'Resumen por Método');
      XLSX.writeFile(wb, `ventas_neron_${new Date().getTime()}.xlsx`);
    } catch (err) {
      console.error("Error generando Excel:", err);
      alert("Hubo un error al generar el Excel.");
    }
  };

  return (
    <div className="min-h-full bg-zinc-950 flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-heading font-bold text-white uppercase tracking-wider">
            {profile?.role === 'owner' ? 'Reportes' : 'Mis Estadísticas'}
          </h2>
          <p className="text-zinc-500">
            {profile?.role === 'owner' ? 'Análisis del negocio' : 'Seguimiento de tus ventas'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={exportToExcel} className="gap-2 text-sm border-zinc-700">
            <TrendingUp size={16} /> Excel
          </Button>
          <Button onClick={exportToPDF} className="gap-2 text-sm">
            <Download size={16} /> PDF
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl mb-6 flex flex-col sm:flex-row items-start sm:items-end gap-3 flex-wrap">
        <div className="w-full sm:w-auto">
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Desde
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full sm:w-auto bg-zinc-950 border border-zinc-800 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="w-full sm:w-auto">
           <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Hasta
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="date"
              value={dateRange.end}
              min={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full sm:w-auto bg-zinc-950 border border-zinc-800 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign size={64} />
          </div>
          <p className="text-zinc-400 text-sm font-bold uppercase tracking-wider mb-1 text-amber-500">Ventas (Rango)</p>
          <p className="text-4xl font-heading font-bold text-white">${totalSales.toLocaleString()}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <FileText size={64} />
          </div>
          <p className="text-zinc-400 text-sm font-bold uppercase tracking-wider mb-1">Tickets (Rango)</p>
          <p className="text-4xl font-heading font-bold text-white">{totalTransactions}</p>
        </div>

        <div className="bg-amber-500 p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-black">
            <TrendingUp size={64} />
          </div>
          <p className="text-amber-950 text-sm font-bold uppercase tracking-wider mb-1">Ventas Hoy</p>
          <p className="text-4xl font-heading font-bold text-black">${todaySales.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {profile?.role === 'owner' && (
          <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col">
            <h3 className="text-lg font-heading font-bold text-white mb-6 uppercase tracking-wider">
              Rendimiento (Rango)
            </h3>
            <div className="flex-1 min-h-[300px] w-full" style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    cursor={{fill: '#27272a'}}
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ventas']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className={`${profile?.role === 'owner' ? 'lg:col-span-2' : 'lg:col-span-3'} bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col`}>
          <h3 className="text-lg font-heading font-bold text-white mb-6 uppercase tracking-wider">
            Últimas Transacciones
          </h3>
          <div className="flex-1 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs font-bold tracking-wider sticky top-0">
                <tr>
                  <th className="p-4 border-b border-zinc-800">Fecha</th>
                  <th className="p-4 border-b border-zinc-800">Servicio/Producto</th>
                  {profile?.role === 'owner' && <th className="p-4 border-b border-zinc-800">Barbero</th>}
                  <th className="p-4 border-b border-zinc-800">Total</th>
                  <th className="p-4 border-b border-zinc-800">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {transactions.slice(0, 10).map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="p-4 text-zinc-300">
                      {new Date(t.date).toLocaleDateString('es-MX', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="p-4">
                      {t.items.map((item, i) => (
                        <div key={i} className="text-zinc-100 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                          {item.quantity}x {item.name}
                        </div>
                      ))}
                    </td>
                    {profile?.role === 'owner' && <td className="p-4 text-zinc-400">{t.barber}</td>}
                    <td className="p-4 font-bold text-emerald-400">${t.total}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-xs">
                        {t.paymentMethod}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <div className="p-8 text-center text-zinc-500">
                No hay ventas en este período.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;