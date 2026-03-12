/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Calculator, Target, ArrowUpRight, Wallet, TrendingUp, TrendingDown, AlertCircle, Calendar, Printer, Table as TableIcon, ChevronDown, ChevronUp, BrainCircuit, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';

interface RealTrade {
  capital: number;
  profit: number;
  loss: number;
  date?: string;
  withdrawn?: number;
  kept?: number;
  total?: number;
}

export default function App() {
  const [initialCapital, setInitialCapital] = useState<number>(1000);
  const [targetCapital, setTargetCapital] = useState<number>(5000);
  const [profitPercentage, setProfitPercentage] = useState<number>(5);
  const [withdrawalPercentage, setWithdrawalPercentage] = useState<number>(50);
  const [calculationMode, setCalculationMode] = useState<'compounding' | 'fixed'>('compounding');
  const [goalMode, setGoalMode] = useState<'target_capital' | 'fixed_trades'>('target_capital');
  const [numberOfTrades, setNumberOfTrades] = useState<number>(50);
  const [tradesPerDay, setTradesPerDay] = useState<number>(1);
  const [showTable, setShowTable] = useState<boolean>(false);

  // Real Trades & AI State
  const [actualTrades, setActualTrades] = useState<RealTrade[]>([]);
  const [newTradeDate, setNewTradeDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newTradeCapital, setNewTradeCapital] = useState<string>('');
  const [newTradeProfit, setNewTradeProfit] = useState<string>('');
  const [newTradeLoss, setNewTradeLoss] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const realMetrics = useMemo(() => {
    if (actualTrades.length === 0) {
      return {
        total: 0,
        wins: 0,
        losses: 0,
        winRate: '0.0',
        totalProfit: '0.00',
        avgWin: '0.00',
        avgLoss: '0.00'
      };
    }
    const wins = actualTrades.filter(t => t.profit > t.loss);
    const losses = actualTrades.filter(t => t.loss > t.profit);
    const totalProfit = actualTrades.reduce((a, b) => a + b.profit - b.loss, 0);
    const winRate = (wins.length / actualTrades.length) * 100;
    return {
      total: actualTrades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: winRate.toFixed(1),
      totalProfit: totalProfit.toFixed(2),
      avgWin: wins.length ? (wins.reduce((a, b) => a + (b.profit - b.loss), 0) / wins.length).toFixed(2) : '0.00',
      avgLoss: losses.length ? (Math.abs(losses.reduce((a, b) => a + (b.profit - b.loss), 0)) / losses.length).toFixed(2) : '0.00',
    };
  }, [actualTrades]);

  const [tradeInputError, setTradeInputError] = useState<string>('');
  const [tradeToDelete, setTradeToDelete] = useState<number | null>(null);
  const [showRealTradesTable, setShowRealTradesTable] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<number>(3.75);
  const [inputCurrency, setInputCurrency] = useState<'USD' | 'SAR'>('USD');
  const [displayCapitalStr, setDisplayCapitalStr] = useState<string>('1000');
  const isLoaded = useRef(false);

  useEffect(() => {
    if (inputCurrency === 'USD') {
      setDisplayCapitalStr(initialCapital.toString());
    } else {
      setDisplayCapitalStr((initialCapital * exchangeRate).toFixed(2).replace(/\.00$/, ''));
    }
  }, [inputCurrency, exchangeRate]);

  const handleCapitalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setDisplayCapitalStr(valStr);
    const val = parseFloat(valStr);
    if (!isNaN(val)) {
      setInitialCapital(inputCurrency === 'USD' ? val : val / exchangeRate);
    }
  };

  // Load saved trades on mount
  useEffect(() => {
    const saved = localStorage.getItem('trading_actual_trades');
    if (saved) {
      try {
        setActualTrades(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved trades');
      }
    }
    const savedRate = localStorage.getItem('trading_exchange_rate');
    if (savedRate) {
      setExchangeRate(parseFloat(savedRate) || 3.75);
    }
    isLoaded.current = true;
  }, []);

  // Auto-save trades when they change
  useEffect(() => {
    if (isLoaded.current) {
      localStorage.setItem('trading_actual_trades', JSON.stringify(actualTrades));
    }
  }, [actualTrades]);

  useEffect(() => {
    if (isLoaded.current) {
      localStorage.setItem('trading_exchange_rate', exchangeRate.toString());
    }
  }, [exchangeRate]);

  const handleSaveTrades = () => {
    localStorage.setItem('trading_actual_trades', JSON.stringify(actualTrades));
    setSaveMessage('تم حفظ الصفقات بنجاح!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const enrichedActualTrades = useMemo(() => {
    let currentCap = initialCapital;
    return actualTrades.map((trade, index) => {
      const net = trade.profit - trade.loss;
      let withdrawn = 0;
      let kept = net;
      
      const isGoalReached = goalMode === 'target_capital' 
        ? currentCap >= targetCapital 
        : index >= numberOfTrades;

      if (trade.withdrawn !== undefined || trade.kept !== undefined) {
        withdrawn = trade.withdrawn || 0;
        kept = trade.kept || 0;
      } else if (net > 0) {
        if (!isGoalReached) {
          withdrawn = net * (withdrawalPercentage / 100);
          kept = net * (1 - withdrawalPercentage / 100);
        } else {
          withdrawn = net;
          kept = 0;
        }
      }

      currentCap = trade.total !== undefined ? trade.total : currentCap + kept;

      return {
        ...trade,
        net,
        withdrawn,
        kept,
        currentCap,
        isGoalReached
      };
    });
  }, [actualTrades, initialCapital, targetCapital, numberOfTrades, goalMode, withdrawalPercentage]);

  // Auto-fill capital with the last currentCap
  useEffect(() => {
    if (enrichedActualTrades.length > 0) {
      setNewTradeCapital(enrichedActualTrades[enrichedActualTrades.length - 1].currentCap.toString());
    } else {
      setNewTradeCapital(initialCapital.toString());
    }
  }, [enrichedActualTrades, initialCapital]);

  // Calculate preview values for the new trade
  const previewCapital = parseFloat(newTradeCapital) || 0;
  const previewProfit = parseFloat(newTradeProfit) || 0;
  const previewLoss = parseFloat(newTradeLoss) || 0;
  const previewNet = previewProfit - previewLoss;
  
  let previewWithdrawn = 0;
  let previewKept = previewNet;
  
  const isGoalReachedPreview = goalMode === 'target_capital' 
    ? previewCapital >= targetCapital 
    : actualTrades.length >= numberOfTrades;

  if (previewNet > 0) {
    if (!isGoalReachedPreview) {
      previewWithdrawn = previewNet * (withdrawalPercentage / 100);
      previewKept = previewNet * (1 - withdrawalPercentage / 100);
    } else {
      previewWithdrawn = previewNet;
      previewKept = 0;
    }
  }
  const previewTotal = previewCapital + previewKept;

  // Calculate remaining trades based on current inputs
  let estimatedRemainingTrades: number | null = null;
  if (goalMode === 'target_capital' && previewKept > 0 && previewCapital < targetCapital) {
    estimatedRemainingTrades = Math.ceil((targetCapital - previewCapital) / previewKept);
  }

  const handleAddTrade = () => {
    if (newTradeCapital === '' || (newTradeProfit === '' && newTradeLoss === '')) {
      setTradeInputError('الرجاء إدخال رأس المال وقيمة الربح أو الخسارة');
      return;
    }

    const capital = parseFloat(newTradeCapital) || 0;
    const profit = parseFloat(newTradeProfit) || 0;
    const loss = parseFloat(newTradeLoss) || 0;
    const date = newTradeDate || new Date().toISOString().split('T')[0];
    
    setActualTrades([...actualTrades, { capital, profit, loss, date }]);
    setNewTradeProfit('');
    setNewTradeLoss('');
    setTradeInputError('');
    setNewTradeDate(new Date().toISOString().split('T')[0]);
  };

  const handleRemoveTrade = (index: number) => {
    setTradeToDelete(index);
  };

  const confirmRemoveTrade = () => {
    if (tradeToDelete !== null) {
      setActualTrades(actualTrades.filter((_, i) => i !== tradeToDelete));
      setTradeToDelete(null);
    }
  };

  const cancelRemoveTrade = () => {
    setTradeToDelete(null);
  };

  const analyzePerformance = async () => {
    if (actualTrades.length === 0) return;
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const theoreticalSubset = data.slice(1, actualTrades.length + 1);
      
      const prompt = `
      أنا متداول أستخدم خطة تداول.
      رأس المال الأساسي: ${initialCapital}$
      الهدف: ${goalMode === 'target_capital' ? targetCapital + '$' : numberOfTrades + ' صفقة'}
      نسبة الربح المستهدفة لكل صفقة: ${profitPercentage}%
      نسبة سحب الأرباح: ${withdrawalPercentage}%

      إليك مقارنة بين الصفقات النظرية (المخطط لها) والصفقات الحقيقية التي قمت بها:
      ${actualTrades.map((actual, i) => {
        const theo = theoreticalSubset[i];
        const net = actual.profit - actual.loss;
        return `الصفقة ${i + 1}: المخطط (ربح ${theo?.profit || 0}$)، الحقيقي (رأس المال: ${actual.capital}$، ${net >= 0 ? 'ربح' : 'خسارة'} ${Math.abs(net)}$)`;
      }).join('\n')}

      بناءً على هذه البيانات، قم بتحليل أدائي كمتداول. 
      هل أنا أتبع الخطة؟ ما هي الأخطاء التي أقع فيها؟ 
      أعطني 3 نصائح عملية (Tips) ومختصرة لتحسين أدائي والالتزام بإدارة المخاطر.
      تحدث معي باللغة العربية بأسلوب مشجع واحترافي.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      setAiAnalysis(response.text || 'لم يتم استلام تحليل.');
    } catch (error) {
      console.error(error);
      setAiAnalysis('حدث خطأ أثناء تحليل البيانات. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsAnalyzing(false);
    }
  };

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
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur opacity-50 print:hidden"></div>
            <img 
              src="https://img.lovepik.com/photo/20211208/medium/lovepik-stock-market-finance-stock-investment-wealth-picture_501598281.jpg" 
              alt="Trading App Logo" 
              className="relative w-14 h-14 rounded-2xl object-cover border-2 border-white/10 print:border-slate-200 print:shadow-none"
              referrerPolicy="no-referrer"
            />
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
                <label className="block text-sm font-medium text-slate-300 mb-1.5">مبلغ التداول الأساسي</label>
                <div className="flex bg-slate-950/50 border border-white/10 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all">
                  <input 
                    type="number" 
                    value={displayCapitalStr} 
                    onChange={handleCapitalChange}
                    className="w-full px-4 py-3 bg-transparent text-white outline-none"
                    min="1"
                    step="any"
                  />
                  <select
                    value={inputCurrency}
                    onChange={(e) => setInputCurrency(e.target.value as 'USD' | 'SAR')}
                    className="bg-slate-900 text-slate-300 px-3 py-3 border-r border-white/10 outline-none cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="SAR">SAR (ر.س)</option>
                  </select>
                </div>
              </div>
              
              {goalMode === 'target_capital' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">الهدف المراد الوصول إليه ($)</label>
                  <input 
                    type="number" 
                    value={targetCapital || ''} 
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
                    value={numberOfTrades || ''} 
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
                  value={tradesPerDay || ''} 
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
                  value={profitPercentage || ''} 
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

        {/* Real Trades & AI Analysis */}
        {data.length > 0 && (
          <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/5 print:bg-white print:shadow-none print:border-none print:p-0 print:mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h3 className="text-lg font-semibold text-white print:text-slate-900 flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-purple-400 print:text-purple-600" />
                تتبع الصفقات الحقيقية وتحليل الذكاء الاصطناعي
              </h3>
              <div className="flex items-center gap-2 print:hidden bg-slate-950/50 p-2 rounded-xl border border-white/5">
                <label className="text-xs font-medium text-slate-400">سعر الصرف (ر.س):</label>
                <input 
                  type="number" 
                  value={exchangeRate || ''}
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 bg-slate-900 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-white outline-none transition-all text-sm text-center"
                  step="0.01"
                />
              </div>
            </div>
            
            {/* Summary Section */}
            {realMetrics && (
              <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-slate-950/50 p-5 rounded-2xl border border-white/5 print:bg-slate-50 print:border-slate-200 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl print:hidden"></div>
                    <div className="text-slate-400 print:text-slate-500 text-sm mb-1 relative z-10">الإيداع</div>
                    <div className="flex flex-col gap-1 relative z-10">
                      <div className="text-2xl font-bold text-white print:text-slate-900">${initialCapital.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                      <div className="text-sm font-medium text-slate-500 print:text-slate-400">{(initialCapital * exchangeRate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ر.س</div>
                    </div>
                  </div>
                  <div className="bg-slate-950/50 p-5 rounded-2xl border border-white/5 print:bg-slate-50 print:border-slate-200 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl print:hidden"></div>
                    <div className="text-slate-400 print:text-slate-500 text-sm mb-1 relative z-10">السحب</div>
                    <div className="flex flex-col gap-1 relative z-10">
                      <div className="text-2xl font-bold text-cyan-400 print:text-cyan-600">
                        ${enrichedActualTrades.reduce((sum, t) => sum + (t.withdrawn || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                      <div className="text-sm font-medium text-cyan-700/70 print:text-cyan-500/70">
                        {(enrichedActualTrades.reduce((sum, t) => sum + (t.withdrawn || 0), 0) * exchangeRate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ر.س
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-950/50 p-5 rounded-2xl border border-white/5 print:bg-slate-50 print:border-slate-200 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl print:hidden"></div>
                    <div className="text-slate-400 print:text-slate-500 text-sm mb-1 relative z-10">المتوفر</div>
                    <div className="flex flex-col gap-1 relative z-10">
                      <div className="text-2xl font-bold text-emerald-400 print:text-emerald-600">
                        ${(enrichedActualTrades.length > 0 ? enrichedActualTrades[enrichedActualTrades.length - 1].currentCap : initialCapital).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                      <div className="text-sm font-medium text-emerald-700/70 print:text-emerald-500/70">
                        {((enrichedActualTrades.length > 0 ? enrichedActualTrades[enrichedActualTrades.length - 1].currentCap : initialCapital) * exchangeRate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ر.س
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 print:grid-cols-5 print:gap-4">
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 print:bg-slate-50 print:border-slate-200">
                    <div className="text-slate-400 print:text-slate-500 text-sm mb-1">إجمالي الصفقات</div>
                    <div className="text-xl font-bold text-white print:text-slate-900">{realMetrics.total}</div>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 print:bg-slate-50 print:border-slate-200">
                    <div className="text-slate-400 print:text-slate-500 text-sm mb-1">إجمالي الربح/الخسارة</div>
                    <div className={`text-xl font-bold ${Number(realMetrics.totalProfit) >= 0 ? 'text-emerald-400 print:text-emerald-600' : 'text-blue-500 print:text-blue-600'}`}>
                      {Number(realMetrics.totalProfit) >= 0 ? '+' : ''}{realMetrics.totalProfit}$
                    </div>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 print:bg-slate-50 print:border-slate-200">
                    <div className="text-slate-400 print:text-slate-500 text-sm mb-1">نسبة النجاح</div>
                    <div className="text-xl font-bold text-white print:text-slate-900">{realMetrics.winRate}%</div>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 print:bg-slate-50 print:border-slate-200">
                    <div className="text-slate-400 print:text-slate-500 text-sm mb-1">متوسط الربح</div>
                    <div className="text-xl font-bold text-emerald-400 print:text-emerald-600">+{realMetrics.avgWin}$</div>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 print:bg-slate-50 print:border-slate-200">
                    <div className="text-slate-400 print:text-slate-500 text-sm mb-1">متوسط الخسارة</div>
                    <div className="text-xl font-bold text-blue-500 print:text-blue-600">{realMetrics.avgLoss}$</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8 print:block print:space-y-8">
              {/* Input Section */}
              <div className="space-y-4 w-full lg:w-1/2">
                <div className="print:hidden">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-slate-300">إضافة نتيجة صفقة حقيقية ($)</label>
                    {saveMessage && (
                      <span className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                        {saveMessage}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-400">التاريخ</label>
                      <input 
                        type="date" 
                        value={newTradeDate} 
                        onChange={(e) => { setNewTradeDate(e.target.value); setTradeInputError(''); }}
                        className="w-full px-3 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-white outline-none transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-400">رأس المال</label>
                      <input 
                        type="number" 
                        value={newTradeCapital} 
                        onChange={(e) => { setNewTradeCapital(e.target.value); setTradeInputError(''); }}
                        placeholder="0"
                        className="w-full px-3 py-2.5 bg-slate-950/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 text-white outline-none transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-emerald-400">الربح</label>
                      <input 
                        type="number" 
                        value={newTradeProfit} 
                        onChange={(e) => { setNewTradeProfit(e.target.value); setNewTradeLoss(''); setTradeInputError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTrade()}
                        placeholder="0"
                        className="w-full px-3 py-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-emerald-400 outline-none transition-all text-sm placeholder:text-emerald-700/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-red-400">الخسارة</label>
                      <input 
                        type="number" 
                        value={newTradeLoss} 
                        onChange={(e) => { setNewTradeLoss(e.target.value); setNewTradeProfit(''); setTradeInputError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTrade()}
                        placeholder="0"
                        className="w-full px-3 py-2.5 bg-red-950/20 border border-red-500/20 rounded-xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 text-red-400 outline-none transition-all text-sm placeholder:text-red-700/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-cyan-400">السحب</label>
                      <input 
                        type="text" 
                        value={previewWithdrawn > 0 ? previewWithdrawn.toFixed(2) : ''} 
                        readOnly
                        placeholder="تلقائي"
                        className="w-full px-3 py-2.5 bg-cyan-950/10 border border-cyan-500/10 rounded-xl text-cyan-500/50 outline-none text-sm cursor-not-allowed placeholder:text-cyan-800/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-indigo-400">الأبقاء</label>
                      <input 
                        type="text" 
                        value={previewKept !== 0 ? previewKept.toFixed(2) : ''} 
                        readOnly
                        placeholder="تلقائي"
                        className="w-full px-3 py-2.5 bg-indigo-950/10 border border-indigo-500/10 rounded-xl text-indigo-500/50 outline-none text-sm cursor-not-allowed placeholder:text-indigo-800/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-400">المجموع</label>
                      <input 
                        type="text" 
                        value={previewTotal > 0 ? previewTotal.toFixed(2) : ''} 
                        readOnly
                        placeholder="تلقائي"
                        className="w-full px-3 py-2.5 bg-slate-950/30 border border-white/5 rounded-xl text-slate-500 outline-none text-sm cursor-not-allowed placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                  
                  {(previewProfit > 0 || previewLoss > 0) && previewCapital > 0 && (
                    <div className={`mt-3 border rounded-xl p-3 flex items-center gap-3 ${
                      previewProfit > 0 
                        ? ((previewProfit / previewCapital) * 100) >= profitPercentage 
                          ? 'bg-emerald-500/10 border-emerald-500/20' 
                          : 'bg-yellow-500/10 border-yellow-500/20'
                        : 'bg-red-500/10 border-red-500/20'
                    }`}>
                      <div className={`p-2 rounded-lg ${
                        previewProfit > 0 
                          ? ((previewProfit / previewCapital) * 100) >= profitPercentage 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {previewProfit > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>
                      <div className="text-sm text-slate-300">
                        {previewProfit > 0 ? (
                          <>
                            نسبة الربح المحققة: <span className={`font-bold ${((previewProfit / previewCapital) * 100) >= profitPercentage ? 'text-emerald-400' : 'text-yellow-400'}`}>{((previewProfit / previewCapital) * 100).toFixed(2)}%</span>
                            {' '}
                            {((previewProfit / previewCapital) * 100) >= profitPercentage ? (
                              <span className="text-emerald-400/80">(متوافق مع الهدف الأساسي {profitPercentage}%)</span>
                            ) : (
                              <span className="text-yellow-400/80">(أقل من الهدف الأساسي {profitPercentage}%)</span>
                            )}
                          </>
                        ) : (
                          <>
                            نسبة الخسارة المحققة: <span className="font-bold text-red-400">{((previewLoss / previewCapital) * 100).toFixed(2)}%</span>
                            {' '}
                            <span className="text-red-400/80">(عكس الهدف الأساسي للربح {profitPercentage}%)</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {estimatedRemainingTrades !== null && (
                    <div className="mt-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 flex items-center gap-3">
                      <div className="bg-indigo-500/20 p-2 rounded-lg">
                        <Target className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="text-sm text-slate-300">
                        بناءً على هذه المعطيات، تحتاج إلى <span className="font-bold text-indigo-400">{estimatedRemainingTrades}</span> صفقات إضافية للوصول إلى الهدف ({targetCapital}$).
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <button 
                      onClick={handleAddTrade}
                      className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-medium"
                      title="إضافة الصفقة"
                    >
                      <Plus className="w-5 h-5" />
                      <span>إضافة</span>
                    </button>
                    <button 
                      onClick={handleSaveTrades}
                      className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-medium"
                      title="حفظ الصفقات"
                    >
                      <Save className="w-5 h-5" />
                      <span>حفظ</span>
                    </button>
                  </div>
                  {tradeInputError && (
                    <p className="text-red-400 text-xs mt-2">{tradeInputError}</p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between print:hidden">
                  <button
                    onClick={() => setShowRealTradesTable(!showRealTradesTable)}
                    className="flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-2 rounded-lg"
                  >
                    <TableIcon className="w-4 h-4" />
                    <span>سجل الصفقات الحقيقية</span>
                    {showRealTradesTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {enrichedActualTrades.length > 0 && (
                    <span className="text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded-md border border-white/5">
                      {enrichedActualTrades.length} صفقة
                    </span>
                  )}
                </div>

                {(showRealTradesTable || typeof window !== 'undefined' && window.matchMedia('print').matches) && (
                  <div className="mt-4 max-h-80 overflow-y-auto overflow-x-auto custom-scrollbar print:max-h-none print:overflow-visible rounded-xl border border-white/5 print:border-slate-200 shadow-inner bg-slate-950/20">
                    <table className="w-full text-right text-sm whitespace-nowrap">
                      <thead className="bg-slate-900/90 print:bg-slate-100 text-slate-400 print:text-slate-500 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                      <tr>
                        <th className="px-5 py-4 font-semibold">الصفقة</th>
                        <th className="px-5 py-4 font-semibold">التاريخ</th>
                        <th className="px-5 py-4 font-semibold">رأس المال</th>
                        <th className="px-5 py-4 font-semibold">الربح</th>
                        <th className="px-5 py-4 font-semibold">الخسارة</th>
                        <th className="px-5 py-4 font-semibold">السحب</th>
                        <th className="px-5 py-4 font-semibold">الأبقاء</th>
                        <th className="px-5 py-4 font-semibold">المجموع</th>
                        <th className="px-5 py-4 font-semibold print:hidden"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 print:divide-slate-200 bg-transparent print:bg-white">
                      {enrichedActualTrades.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-5 py-10 text-center text-slate-500 print:hidden">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <TableIcon className="w-8 h-8 opacity-20" />
                              <span>لم تقم بإضافة أي صفقات حقيقية بعد.</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        enrichedActualTrades.map((trade, index) => {
                          return (
                            <tr key={index} className="even:bg-slate-900/30 odd:bg-slate-950/50 hover:bg-white/[0.04] print:even:bg-slate-50 print:odd:bg-white transition-colors">
                              <td className="px-5 py-3.5 text-slate-400 print:text-slate-500">{index + 1}</td>
                              <td className="px-5 py-3.5 text-slate-400 print:text-slate-500">{trade.date || '-'}</td>
                              <td className="px-5 py-3.5 text-slate-300 print:text-slate-700">${trade.capital}</td>
                              <td className="px-5 py-3.5 text-emerald-400 print:text-emerald-600 font-bold text-lg">
                                {trade.profit > 0 ? `+${trade.profit}$` : '-'}
                              </td>
                              <td className="px-5 py-3.5 text-blue-500 print:text-blue-600 font-bold text-lg">
                                {trade.loss > 0 ? `-${trade.loss}$` : '-'}
                              </td>
                              <td className="px-5 py-3.5 text-cyan-400 print:text-cyan-600">
                                {trade.net > 0 ? `$${trade.withdrawn}` : '-'}
                              </td>
                              <td className="px-5 py-3.5 text-indigo-400 print:text-indigo-600">
                                {trade.net > 0 ? `$${trade.kept}` : '-'}
                              </td>
                              <td className="px-5 py-3.5 text-slate-200 print:text-slate-800 font-bold text-lg">
                                ${trade.currentCap}
                              </td>
                              <td className="px-5 py-3.5 print:hidden text-left">
                                <button onClick={() => handleRemoveTrade(index)} className="text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors p-2">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                )}

                {/* Progress Bar */}
                {realMetrics && (
                  <div className="bg-slate-950/50 p-5 rounded-2xl border border-white/5 print:bg-slate-50 print:border-slate-200 mt-6">
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <div className="text-slate-400 print:text-slate-500 text-sm mb-1">
                          التقدم نحو الهدف ({goalMode === 'target_capital' ? 'رأس المال' : 'عدد الصفقات'})
                        </div>
                        <div className="text-xl font-bold text-white print:text-slate-900">
                          {goalMode === 'target_capital' 
                            ? `${(enrichedActualTrades.length > 0 ? enrichedActualTrades[enrichedActualTrades.length - 1].currentCap : initialCapital).toFixed(2)}$ / ${targetCapital}$`
                            : `${actualTrades.length} / ${numberOfTrades} صفقة`
                          }
                        </div>
                      </div>
                      <div className="text-lg font-bold text-indigo-400 print:text-indigo-600">
                        {goalMode === 'target_capital'
                          ? Math.max(0, Math.min(100, (((enrichedActualTrades.length > 0 ? enrichedActualTrades[enrichedActualTrades.length - 1].currentCap : initialCapital) - initialCapital) / (targetCapital - initialCapital)) * 100)).toFixed(1)
                          : Math.max(0, Math.min(100, (actualTrades.length / numberOfTrades) * 100)).toFixed(1)
                        }%
                      </div>
                    </div>
                    <div className="h-3 bg-slate-900 print:bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
                        style={{ 
                          width: `${goalMode === 'target_capital'
                            ? Math.max(0, Math.min(100, (((enrichedActualTrades.length > 0 ? enrichedActualTrades[enrichedActualTrades.length - 1].currentCap : initialCapital) - initialCapital) / (targetCapital - initialCapital)) * 100))
                            : Math.max(0, Math.min(100, (actualTrades.length / numberOfTrades) * 100))
                          }%` 
                        }}
                      />
                    </div>
                  </div>
                )}

                {actualTrades.length > 0 && (
                  <button 
                    onClick={analyzePerformance}
                    disabled={isAnalyzing}
                    className="print:hidden w-full mt-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 disabled:opacity-70"
                  >
                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                    {isAnalyzing ? 'جاري التحليل...' : 'حلل أدائي بالذكاء الاصطناعي'}
                  </button>
                )}
              </div>

              {/* AI Result Section */}
              <div className="w-full lg:w-1/2 bg-slate-950/50 rounded-2xl p-5 border border-white/5 min-h-[250px] overflow-y-auto max-h-[400px] print:max-h-none print:overflow-visible print:bg-transparent print:border-none print:p-0 flex flex-col">
                {aiAnalysis ? (
                  <div className="prose prose-invert print:prose-slate prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-purple-300 print:prose-headings:text-purple-700 prose-a:text-purple-400 print:text-slate-800">
                    <Markdown>{aiAnalysis}</Markdown>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3 print:hidden py-10">
                    <BrainCircuit className="w-10 h-10 opacity-20" />
                    <p className="text-sm text-center max-w-[250px]">
                      أضف صفقاتك الحقيقية واضغط على زر التحليل للحصول على نصائح مخصصة من الذكاء الاصطناعي.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        {data.length > 0 && (
          <div className="space-y-4">
            <button
              onClick={() => setShowTable(!showTable)}
              className="w-full flex items-center justify-between bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-white/5 hover:bg-slate-800/50 transition-all print:hidden"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                  <TableIcon className="w-5 h-5" />
                </div>
                <span className="text-lg font-semibold text-white">جدول تفاصيل الصفقات</span>
              </div>
              {showTable ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            <div className={`${showTable ? 'block' : 'hidden print:block'} bg-slate-900/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/5 overflow-hidden print:bg-white print:shadow-none print:border-none`}>
              <div className="p-6 border-b border-white/5 print:border-slate-200 hidden print:block">
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
          </div>
        )}

        {/* Footer Attribution */}
        <footer className="mt-12 pb-8 text-center text-slate-500 print:text-slate-400 text-sm font-medium flex items-center justify-center gap-2">
          <span>فكرة وتصميم</span>
          <span className="text-indigo-400 print:text-indigo-600 font-bold">عبدالله الشهري</span>
        </footer>

      </div>

      {/* Delete Confirmation Modal */}
      {tradeToDelete !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:hidden">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">حذف الصفقة</h3>
              <p className="text-slate-400 text-sm">
                هل أنت متأكد من أنك تريد حذف هذه الصفقة؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="bg-slate-950/50 px-6 py-4 flex items-center justify-end gap-3 border-t border-white/5">
              <button
                onClick={cancelRemoveTrade}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmRemoveTrade}
                className="px-4 py-2 text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
