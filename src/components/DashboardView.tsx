/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { Area, Customer, SalesEntry } from "../types";
import {
  TrendingUp,
  Coins,
  Receipt,
  PiggyBank,
  FolderLock,
  ArrowUpRight,
  ArrowDownLeft,
  CirclePercent
} from "lucide-react";

interface DashboardViewProps {
  areas: Area[];
  customers: Customer[];
  sales: SalesEntry[];
}

export default function DashboardView({ areas, customers, sales }: DashboardViewProps) {
  
  // Aggregate stats using analytical memoization
  const stats = useMemo(() => {
    let totalSale = 0;
    let totalCollection = 0;
    let cashCollection = 0;
    let checkCollection = 0;

    // Calculate sum of transactions
    sales.forEach((s) => {
      totalSale += s.saleAmount || 0;
      totalCollection += s.collection || 0;
      cashCollection += s.cash || 0;
      checkCollection += s.check || 0;
    });

    // Calculate total actual outstanding due across all customers records
    let totalDue = 0;
    customers.forEach((c) => {
      totalDue += c.currentDue || 0;
    });

    // Group area-wise due structure
    const areaMap: { [id: string]: { areaName: string; count: number; totalDue: number } } = {};
    
    // Seed all active areas
    areas.forEach((a) => {
      areaMap[a.id] = { areaName: a.name, count: 0, totalDue: 0 };
    });
    // Fallback area if any orphaned customer
    areaMap["orphaned"] = { areaName: "Unassigned/Other", count: 0, totalDue: 0 };

    customers.forEach((c) => {
      const areaKey = c.areaId || "orphaned";
      if (!areaMap[areaKey]) {
        areaMap[areaKey] = { areaName: "Unknown Area", count: 0, totalDue: 0 };
      }
      areaMap[areaKey].count += 1;
      areaMap[areaKey].totalDue += c.currentDue || 0;
    });

    // Strip out areas with no customers or dues to keep dashboard visual layout tidy
    const areaWiseDue = Object.values(areaMap).filter(
      (a) => a.count > 0 || a.totalDue > 0
    );

    // Group monthly trends over past months
    const monthlyMap: { [m: string]: { label: string; raw: string; sale: number; collection: number } } = {};
    
    sales.forEach((s) => {
      if (!s.date) return;
      const monthKey = s.date.slice(0, 7); // "YYYY-MM"
      
      if (!monthlyMap[monthKey]) {
        // Human label "Apr '26" or similar
        const [yr, mn] = monthKey.split("-");
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const label = `${monthNames[parseInt(mn, 10) - 1]} '${yr.slice(2)}`;
        
        monthlyMap[monthKey] = {
          label,
          raw: monthKey,
          sale: 0,
          collection: 0,
        };
      }

      monthlyMap[monthKey].sale += s.saleAmount || 0;
      monthlyMap[monthKey].collection += s.collection || 0;
    });

    // Convert and sort chronologically
    const monthlyTrend = Object.values(monthlyMap).sort(
      (a, b) => a.raw.localeCompare(b.raw)
    );

    // Default trend filler if data is empty so graphs don't collapse
    if (monthlyTrend.length === 0) {
      monthlyTrend.push(
        { label: "Current", raw: "1", sale: 0, collection: 0 }
      );
    }

    return {
      totalSale,
      totalCollection,
      totalDue,
      cashCollection,
      checkCollection,
      areaWiseDue,
      monthlyTrend,
    };
  }, [areas, customers, sales]);

  // Derived Collection Rate Percentage
  const collectionRate = useMemo(() => {
    if (stats.totalSale === 0) return 0;
    return Math.round((stats.totalCollection / (stats.totalSale)) * 100);
  }, [stats]);

  // Maximum value for scaling the beautiful trend graph
  const maxTrendVal = useMemo(() => {
    let max = 1000;
    stats.monthlyTrend.forEach((m) => {
      if (m.sale > max) max = m.sale;
      if (m.collection > max) max = m.collection;
    });
    return max * 1.15; // 15% padding for header clearance inside SVG
  }, [stats]);

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Executive Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1 font-light">
          Consolidated sales activity, collection ledgers, and territorial accounts metrics.
        </p>
      </div>

      {/* Grid: High-level KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card: Total Outstanding Dues */}
        <div className="bg-[#161618] border border-white/5 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono font-medium tracking-wider text-slate-500 uppercase">Total Dues Liability</span>
              <h3 className="text-2xl font-bold text-rose-455 text-rose-400 mt-1">
                RM{stats.totalDue.toLocaleString()}
              </h3>
            </div>
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
              <FolderLock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
            <span>Uncollected Balance Outstanding</span>
          </div>
        </div>

        {/* Card: Total Sales */}
        <div className="bg-[#161618] border border-white/5 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono font-medium tracking-wider text-slate-500 uppercase">Total Sales Generated</span>
              <h3 className="text-2xl font-bold text-slate-100 mt-1">
                RM{stats.totalSale.toLocaleString()}
              </h3>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cumulative gross revenue tickets</span>
          </div>
        </div>

        {/* Card: Total Collections */}
        <div className="bg-[#161618] border border-white/5 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono font-medium tracking-wider text-slate-500 uppercase">Total Collections</span>
              <h3 className="text-2xl font-bold text-[#3b82f6] text-blue-400 mt-1">
                RM{stats.totalCollection.toLocaleString()}
              </h3>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-405 text-blue-400">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
            <ArrowDownLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>Cash and Check aggregates</span>
          </div>
        </div>

        {/* Card: Collection Rate */}
        <div className="bg-[#161618] border border-white/5 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono font-medium tracking-wider text-slate-500 uppercase">Gross Collection Rate</span>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                {collectionRate}%
              </h3>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <CirclePercent className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="w-full bg-[#0A0A0B] rounded-full h-1.5 mt-2 overflow-hidden border border-white/5">
            <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${Math.min(collectionRate, 100)}%` }}></div>
          </div>
        </div>

      </div>

      {/* Grid: Liquid Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[#161618]/60 border border-white/5 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 rounded-xl">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Liquid Cash Collected</span>
            <p className="text-lg font-bold text-slate-200">RM{stats.cashCollection.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-[#161618]/60 border border-white/5 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/10 rounded-xl">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Check/Bank Clearance</span>
            <p className="text-lg font-bold text-slate-200">RM{stats.checkCollection.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales vs Collections Monthly Trend */}
        <div className="lg:col-span-2 bg-[#161618] border border-white/5 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Monthly Revenue Trend</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Chronological sales against collection receipts</p>
            </div>
            
            {/* Custom Chart Legend */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                <span className="text-slate-400">Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-blue-500"></span>
                <span className="text-slate-400">Collections</span>
              </div>
            </div>
          </div>

          {/* SVG Responsive Bar Graph */}
          <div className="w-full h-64 relative bg-[#0A0A0B] rounded-lg p-4 border border-white/5">
            <svg viewBox="0 0 500 200" className="w-full h-full text-slate-700">
              {/* Y-Axis Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                <line
                  key={i}
                  x1="40"
                  y1={160 - p * 130}
                  x2="480"
                  y2={160 - p * 130}
                  stroke="#1b1b1e"
                  strokeDasharray="4"
                  strokeWidth="1"
                />
              ))}

              {/* Trend Plotting */}
              {stats.monthlyTrend.map((m, index) => {
                const totalBars = stats.monthlyTrend.length;
                const columnWidth = 400 / totalBars;
                const pivotX = 40 + index * columnWidth + columnWidth / 2;

                // Scale values
                const saleH = (m.sale / maxTrendVal) * 130;
                const collH = (m.collection / maxTrendVal) * 130;

                const saleY = 160 - saleH;
                const collY = 160 - collH;

                return (
                  <g key={index} className="group cursor-pointer">
                    {/* Sales Bar (Emerald) */}
                    <rect
                      x={pivotX - 12}
                      y={saleY}
                      width="8"
                      height={Math.max(saleH, 2)}
                      rx="2"
                      className="fill-emerald-500 hover:fill-emerald-400 transition-all duration-200"
                    />

                    {/* Collection Bar (Blue) */}
                    <rect
                      x={pivotX + 2}
                      y={collY}
                      width="8"
                      height={Math.max(collH, 2)}
                      rx="2"
                      className="fill-blue-500 hover:fill-blue-400 transition-all duration-200"
                    />

                    {/* Month Label */}
                    <text
                      x={pivotX}
                      y="180"
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {m.label}
                    </text>

                    {/* Tooltip on hovering grouping (CSS triggers or simple display) */}
                    <title>{`${m.label} -> Sale: RM${m.sale.toLocaleString()} | Collection: RM${m.collection.toLocaleString()}`}</title>
                  </g>
                );
              })}

              {/* Bottom Baseline */}
              <line x1="30" y1="160" x2="480" y2="160" stroke="#2c2c31" strokeWidth="1.5" />
            </svg>
          </div>

        </div>

        {/* Area Wise Due liabilities */}
        <div className="bg-[#161618] border border-white/5 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Area Wise Dues</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Aggregated pending balances grouped by area</p>
          </div>

          <div className="space-y-4 my-5 overflow-y-auto max-h-56 pr-1 custom-scrollbar">
            {stats.areaWiseDue.length === 0 ? (
              <p className="text-xs text-slate-500 text-center font-mono py-10">No accounts logged yet</p>
            ) : (
              stats.areaWiseDue.map((a, idx) => {
                // Calculate percentage based on total dues liabilities
                const totalDueBase = stats.totalDue || 1;
                const ratio = Math.min((a.totalDue / totalDueBase) * 100, 100);

                return (
                  <div key={idx} className="space-y-1.5 group">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-300 group-hover:text-emerald-400 transition-all">{a.areaName}</span>
                      <span className="font-mono text-slate-400 font-medium">RM{a.totalDue.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-[#0A0A0B] h-2 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="bg-gradient-to-r from-red-500 to-amber-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${ratio}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0 w-8 text-right">
                        {a.count} C
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-white/5 text-center text-[10px] font-mono text-slate-500">
            C = Customer Accounts in Area
          </div>

        </div>

      </div>

      {/* Grid: Overview Information & Help Manual */}
      <div className="bg-[#161618] border border-white/5 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-4">Core Operational Guidelines</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-400 font-light leading-relaxed">
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Daily Sales Tickets
            </h4>
            <p>
              Salesmen use the Day Entry portal to record purchase receipts. Entering a transaction automatically recalculates previous ledger dues into live client liabilities.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Double Entry Calculations
            </h4>
            <p>
              Dues strictly observe: <br />
              <code className="bg-[#0A0A0B] px-1.5 py-0.5 rounded border border-white/5 text-amber-400 text-[10px] font-mono">Current Due = Previous Balance + Sale - Collection</code>
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span> Client Ledger Syncing
            </h4>
            <p>
              Deleting an invoice or altering records immediately offsets the corresponding customer ledger entries, ensuring strict financial integrity across the system.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
