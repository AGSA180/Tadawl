/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Calculator, Target, ArrowUpRight, Wallet, TrendingUp, AlertCircle, Calendar, Printer } from 'lucide-react';

export default function App() {
  const [initialCapital, setInitialCapital] = useState<number>(1000);
  const [targetCapital, setTargetCapital] = useState<number>(5000);
  const [profitPercentage, setProfitPercentage] = useState<number>(5);
  const [withdrawalPercentage, setWithdrawalPercentage] = useState<number>(50);
  const [calculationMode, setCalculationMode] = useState<'compounding' | 'fixed'>('compounding');
  const [goalMode, setGoalMode] = useState<'target_capital' | 'fixed_trades'>('target_capital');
  const [numberOfTrades, setNumberOfTrades] = useState<number>(50);
  const [tradesPerDay, setTradesPerDay] = useState<number>(1);

  const data = useMemo(() => {
    if (initialCapital <= 0 || profitPercentage <= 0 || withdrawalPercentage < 0 || withdrawalPercentage >= 100 || tradesPerDay <= 0) {
      return [];
    }
    if (goalMode === 'target_capital' && targetCapital <= initialCapital) {
      return [];
    }
    if (goalMode === 'fixed_trades' && numberOfTrades <= 0) {
      return [];
    }

    let currentCapital = initialCapital;
    let totalWithdrawn = 0;
    let trades = 0;
    const result = [];

    result.push({
      trade: 0,
      capital: currentCapital,
      profit: 0,
      withdrawn: 0,
      totalWithdrawn: 0,
    });

    const limit = goalMode === 'target_capital' ? 2000 : numberOfTrades;

    while ((goalMode === 'target_capital' ? currentCapital < targetCapital : trades < numberOfTrades) && trades < limit) {
      trades++;
      const profitBase = calculationMode === 'compounding' ? currentCapital : initialCapital;
      const profit = profitBase * (profitPercentage / 100);
      const withdrawn = profit * (withdrawalPercentage / 100);
      const reinvested = profit - withdrawn;
      
      currentCapital += reinvested;
      totalWithdrawn += withdrawn;

      result.push({
        trade: trades,
        capital: Number(currentCapital.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        withdrawn: Number(withdrawn.toFixed(2)),
        totalWithdrawn: Number(totalWithdrawn.toFixed(2)),
      });
    }

    return result;
  }, [initialCapital, targetCapital, profitPercentage, withdrawalPercentage, calculationMode, goalMode, numberOfTrades, tradesPerDay]);

  const isPossible = withdrawalPercentage < 100 && profitPercentage > 0;
  const reachedTarget = goalMode === 'target_capital' && data.length > 0 && data[data.length - 1].capital >= targetCapital;
  const maxTradesReached = goalMode === 'target_capital' && data.length >= 2000 && !reachedTarget;

  const totalTrades = data.length > 0 ? data.length - 1 : 0;
  const totalDays = Math.ceil(totalTrades / (tradesPerDay || 1));
  const months = Math.floor(totalDays / 30);
  const days = totalDays % 30;
  
  let durationText = '';
  if (months > 0) {
    durationText += `${months} شهر${days > 0 ? ' و ' : ''}`;
  }
  if (days > 0 || months === 0) {
    durationText += `${days} يوم`;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8 print:bg-white print:text-slate-900 print:p-0 selection:bg-indigo-500/30 relative overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none print:hidden" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none print:hidden" />

      <div className="max-w-6xl mx-auto space-y-8 print:space-y-4 relative z-10">
        
        {/* Header */}
        <header className="flex items-center gap-4 mb-8 print:mb-4">
          <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/25 print:bg-blue-100 print:text-blue-800 print:shadow-none">
            <span className="text-3xl font-bold">$</span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white print:text-slate-900 tracking-tight">تداول</h1>
            <p className="text-slate-400 print:text-slate-500 mt-1">احسب عدد الصفقات للوصول لهدفك مع تقسيم الأرباح</p>
          </div>
          <button
            onClick={() => window.print()}
            className="mr-auto print:hidden flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all backdrop-blur-md shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span className="font-medium text-sm">طباعة التقرير</span>
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block">
          
          {/* Inputs Panel */}
          <div className="lg:col-span-1 space-y-6 bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/5 print:hidden">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
              <Target className="w-5 h-5 text-indigo-400" />
              المدخلات
            </h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">الهدف من الحساب</label>
                <div className="flex bg-slate-950/50 p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setGoalMode('target_capital')}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${goalMode === 'target_capital' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    مبلغ مستهدف
                  </button>
                  <button
                    onClick={() => setGoalMode('fixed_trades')}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${goalMode === 'fixed_trades' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    عدد صفقات
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">طريقة حساب الربح</label>
                <div className="flex bg-slate-950/50 p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setCalculationMode('compounding')}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${calculationMode === 'compounding' ? 'bg-slate-800 text-white shadow-sm border border-white/10' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    تراكمي
                  </button>
                  <button
                    onClick={() => setCalculationMode('fixed')}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${calculationMode === 'fixed' ? 'bg-slate-800 text-white shadow-sm border border-white/10' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    ثابت (من الأساسي)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">مبلغ التداول الأساسي ($)</label>
                <input 
                  type="number" 
                  value={initialCapital} 
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                  min="1"
                />
              </div>
              
              {goalMode === 'target_capital' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">الهدف المراد الوصول إليه ($)</label>
                  <input 
                    type="number" 
                    value={targetCapital} 
                    onChange={(e) => setTargetCapital(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                    min="1"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">عدد الصفقات المستهدف</label>
                  <input 
                    type="number" 
                    value={numberOfTrades} 
                    onChange={(e) => setNumberOfTrades(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                    min="1"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">متوسط عدد الصفقات في اليوم</label>
                <input 
                  type="number" 
                  value={tradesPerDay} 
                  onChange={(e) => setTradesPerDay(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                  min="0.1"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">نسبة الربح لكل صفقة/يوم (%)</label>
                <input 
                  type="number" 
                  value={profitPercentage} 
                  onChange={(e) => setProfitPercentage(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                  min="0.1"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">نسبة السحب من الربح (%)</label>
                <input 
                  type="number" 
                  value={withdrawalPercentage} 
                  onChange={(e) => setWithdrawalPercentage(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                  min="0"
                  max="99"
                />
                <p className="text-xs text-slate-500 mt-2">
                  الباقي ({100 - withdrawalPercentage}%) سيتم إضافته لرأس المال (تراكمي)
                </p>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-8 print:space-y-6">
            
            {/* Print Only Summary */}
            <div className="hidden print:grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-900">
              <div><span className="text-slate-500">مبلغ التداول الأساسي:</span> <span className="font-bold">${initialCapital}</span></div>
              <div><span className="text-slate-500">الهدف:</span> <span className="font-bold">{goalMode === 'target_capital' ? `$${targetCapital}` : `${numberOfTrades} صفقة`}</span></div>
              <div><span className="text-slate-500">نسبة الربح:</span> <span className="font-bold">{profitPercentage}% ({calculationMode === 'compounding' ? 'تراكمي' : 'ثابت'})</span></div>
              <div><span className="text-slate-500">نسبة السحب:</span> <span className="font-bold">{withdrawalPercentage}%</span></div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 backdrop-blur-xl p-5 rounded-3xl shadow-lg border border-white/5 flex flex-col justify-center relative overflow-hidden print:bg-white print:border-slate-200 print:shadow-none">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl print:hidden"></div>
                <div className="flex items-center gap-2 text-slate-400 print:text-slate-500 mb-2 relative z-10">
                  <TrendingUp className="w-4 h-4 text-emerald-400 print:text-emerald-600" />
                  <h3 className="text-sm font-medium">عدد الصفقات</h3>
                </div>
                <div className="text-2xl font-bold text-white print:text-slate-900 relative z-10">
                  {totalTrades}
                </div>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-xl p-5 rounded-3xl shadow-lg border border-white/5 flex flex-col justify-center relative overflow-hidden print:bg-white print:border-slate-200 print:shadow-none">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-orange-500/10 rounded-full blur-xl print:hidden"></div>
                <div className="flex items-center gap-2 text-slate-400 print:text-slate-500 mb-2 relative z-10">
                  <Calendar className="w-4 h-4 text-orange-400 print:text-orange-600" />
                  <h3 className="text-sm font-medium">المدة المتوقعة</h3>
                </div>
                <div className="text-2xl font-bold text-white print:text-slate-900 relative z-10">
                  {durationText}
                </div>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-xl p-5 rounded-3xl shadow-lg border border-white/5 flex flex-col justify-center relative overflow-hidden print:bg-white print:border-slate-200 print:shadow-none">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl print:hidden"></div>
                <div className="flex items-center gap-2 text-slate-400 print:text-slate-500 mb-2 relative z-10">
                  <Wallet className="w-4 h-4 text-cyan-400 print:text-blue-600" />
                  <h3 className="text-sm font-medium">المسحوبات</h3>
                </div>
                <div className="text-2xl font-bold text-white print:text-slate-900 relative z-10">
                  ${data.length > 0 ? data[data.length - 1].totalWithdrawn.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) : 0}
                </div>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-xl p-5 rounded-3xl shadow-lg border border-white/5 flex flex-col justify-center relative overflow-hidden print:bg-white print:border-slate-200 print:shadow-none">
                <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl print:hidden"></div>
                <div className="flex items-center gap-2 text-slate-400 print:text-slate-500 mb-2 relative z-10">
                  <ArrowUpRight className="w-4 h-4 text-indigo-400 print:text-indigo-600" />
                  <h3 className="text-sm font-medium">رأس المال</h3>
                </div>
                <div className="text-2xl font-bold text-white print:text-slate-900 relative z-10">
                  ${data.length > 0 ? data[data.length - 1].capital.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0}) : 0}
                </div>
              </div>
            </div>

            {/* Warnings */}
            {!isPossible && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 print:bg-red-50 print:border-red-200 print:text-red-700 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold">إعدادات غير صالحة</h4>
                  <p className="text-sm mt-1 opacity-90">يجب أن تكون نسبة السحب أقل من 100% ونسبة الربح أكبر من 0% لكي ينمو رأس المال.</p>
                </div>
              </div>
            )}

            {maxTradesReached && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 print:bg-amber-50 print:border-amber-200 print:text-amber-700 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold">الهدف بعيد جداً</h4>
                  <p className="text-sm mt-1 opacity-90">تم إيقاف الحساب عند 2000 صفقة. يرجى تعديل النسب أو الهدف ليكون أكثر واقعية.</p>
                </div>
              </div>
            )}

            {/* Chart */}
            {data.length > 0 && (
              <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/5 print:bg-white print:border-slate-200 print:shadow-none">
                <h3 className="text-lg font-semibold mb-6 text-white print:text-slate-900">نمو رأس المال والمسحوبات</h3>
                <div className="h-80 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorWithdrawn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" className="print:stroke-slate-200" />
                      <XAxis dataKey="trade" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                        labelFormatter={(label) => `الصفقة: ${label}`}
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                        itemStyle={{ color: '#e2e8f0' }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ color: '#94a3b8' }} />
                      <Area type="monotone" dataKey="capital" name="رأس المال" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorCapital)" />
                      <Area type="monotone" dataKey="totalWithdrawn" name="إجمالي المسحوبات" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorWithdrawn)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Data Table */}
        {data.length > 0 && (
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/5 overflow-hidden print:bg-white print:shadow-none print:border-none">
            <div className="p-6 border-b border-white/5 print:border-slate-200">
              <h3 className="text-lg font-semibold text-white print:text-slate-900">تفاصيل الصفقات</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-950/50 print:bg-slate-50 text-slate-400 print:text-slate-500 text-sm">
                  <tr>
                    <th className="px-6 py-4 font-medium">رقم الصفقة</th>
                    <th className="px-6 py-4 font-medium">الربح</th>
                    <th className="px-6 py-4 font-medium">المسحوب</th>
                    <th className="px-6 py-4 font-medium">إجمالي المسحوبات</th>
                    <th className="px-6 py-4 font-medium">رأس المال الجديد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-slate-100 text-sm">
                  {data.map((row) => (
                    <tr key={row.trade} className="hover:bg-white/[0.02] print:hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-400 print:text-slate-500">{row.trade === 0 ? 'البداية' : row.trade}</td>
                      <td className="px-6 py-4 text-emerald-400 print:text-emerald-600 font-medium">
                        {row.trade === 0 ? '-' : `+$${row.profit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                      </td>
                      <td className="px-6 py-4 text-cyan-400 print:text-blue-600">
                        {row.trade === 0 ? '-' : `$${row.withdrawn.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                      </td>
                      <td className="px-6 py-4 text-slate-300 print:text-slate-700 font-medium">
                        ${row.totalWithdrawn.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-4 text-indigo-400 print:text-indigo-700 font-bold">
                        ${row.capital.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
