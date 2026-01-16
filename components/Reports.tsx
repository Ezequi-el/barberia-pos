import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { ChevronLeft, Download, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import Button from './Button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getTransactions } from '../lib/database';

interface ReportsProps {
  onBack: () => void;
}

const Reports: React.FC<ReportsProps> = ({ onBack }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await getTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400 animate-pulse">Cargando reportes...</p>
        </div>
      </div>
    );
  }


  // Stats
  const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalTransactions = transactions.length;
  const todaySales = transactions
    .filter(t => new Date(t.date).toDateString() === new Date().toDateString())
    .reduce((sum, t) => sum + t.total, 0);

  // Chart Data: Sales by Barber
  const salesByBarber = transactions.reduce((acc, t) => {
    acc[t.barber] = (acc[t.barber] || 0) + t.total;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(salesByBarber).map(key => ({
    name: key,
    value: salesByBarber[key]
  }));

  const exportCSV = () => {
    const headers = ['ID', 'Fecha', 'Barbero', 'Metodo', 'Referencia', 'Total', 'Items'];
    const rows = transactions.map(t => [
      t.id,
      new Date(t.date).toLocaleString(),
      t.barber,
      t.paymentMethod,
      t.reference || '-',
      t.total,
      t.items.map(i => `${i.quantity}x ${i.name}`).join(' | ')
    ]);

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `barberia_reporte_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="h-screen bg-zinc-950 flex flex-col p-6 max-w-7xl mx-auto w-full overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
            <ChevronLeft />
          </button>
          <div>
            <h2 className="text-3xl font-heading font-bold text-white uppercase tracking-wide">Reportes</h2>
            <p className="text-zinc-500">Análisis financiero y operativo</p>
          </div>
        </div>
        <Button onClick={exportCSV} variant="secondary" className="gap-2">
          <Download size={18} /> Exportar Excel
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider mb-1">Ventas Totales</p>
            <h3 className="text-3xl font-heading font-bold text-white">${totalSales.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <DollarSign />
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider mb-1">Transacciones</p>
            <h3 className="text-3xl font-heading font-bold text-white">{totalTransactions}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
            <TrendingUp />
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-zinc-500 text-xs uppercase font-bold tracking-wider mb-1">Ventas Hoy</p>
            <h3 className="text-3xl font-heading font-bold text-white">${todaySales.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
            <Calendar />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

        {/* Chart */}
        <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col">
          <h4 className="text-white font-bold uppercase text-sm mb-6">Rendimiento por Barbero</h4>
          <div className="flex-1 w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  cursor={{ fill: '#27272a' }}
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                  itemStyle={{ color: '#fbbf24' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#f59e0b' : '#3f3f46'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-800 bg-zinc-950">
            <h4 className="text-white font-bold uppercase text-sm">Historial Reciente</h4>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-zinc-900 text-zinc-500 uppercase text-xs font-bold tracking-wider sticky top-0">
                <tr>
                  <th className="p-4">Hora</th>
                  <th className="p-4">Barbero</th>
                  <th className="p-4">Detalle</th>
                  <th className="p-4">Pago</th>
                  <th className="p-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-sm">
                {[...transactions].reverse().map(t => (
                  <tr key={t.id} className="hover:bg-zinc-800/30">
                    <td className="p-4 text-zinc-400">
                      {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 text-zinc-300 font-medium">{t.barber}</td>
                    <td className="p-4 text-zinc-400 max-w-xs truncate">
                      {t.items.map(i => i.name).join(', ')}
                    </td>
                    <td className="p-4">
                      <span className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs font-bold uppercase">
                        {t.paymentMethod}
                      </span>
                      {t.reference && <span className="block text-xs text-zinc-500 mt-1">Ref: {t.reference}</span>}
                    </td>
                    <td className="p-4 text-right font-bold text-amber-500">${t.total}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">Sin movimientos registrados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Reports;