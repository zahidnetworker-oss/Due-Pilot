/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
// @ts-ignore
import html2pdf from "html2pdf.js";
import { Area, Customer, SalesEntry } from "../types";
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  MapPin,
  FileCheck,
  TrendingUp,
  Coins,
  ChevronDown,
  Filter
} from "lucide-react";

interface MonthlyReportViewProps {
  areas: Area[];
  customers: Customer[];
  sales: SalesEntry[];
}

export default function MonthlyReportView({ areas, customers, sales }: MonthlyReportViewProps) {
  const currentMonthStr = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedAreaId, setSelectedAreaId] = useState("");

  const areaMap = useMemo(() => {
    const map: { [id: string]: string } = {};
    areas.forEach((a) => {
      map[a.id] = a.name;
    });
    return map;
  }, [areas]);

  const customerMap = useMemo(() => {
    const map: { [id: string]: Customer } = {};
    customers.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [customers]);

  // Extract all distinct months from the transactions to populate chronological drop-down options
  const monthOptions = useMemo(() => {
    const monthsSet = new Set<string>();
    // Make sure current month is available
    monthsSet.add(currentMonthStr);

    sales.forEach((s) => {
      if (s.date) {
        monthsSet.add(s.date.slice(0, 7));
      }
    });

    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [sales, currentMonthStr]);

  // Filter Sales list based on selection criteria
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchMonth = selectedMonth === "" || s.date.startsWith(selectedMonth);
      const matchArea = selectedAreaId === "" || s.areaId === selectedAreaId;
      return matchMonth && matchArea;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [sales, selectedMonth, selectedAreaId]);

  // Calculate sum of active matches
  const reportTotals = useMemo(() => {
    let salesAmount = 0;
    let collections = 0;
    let cash = 0;
    let check = 0;

    filteredSales.forEach((s) => {
      salesAmount += s.saleAmount || 0;
      collections += s.collection || 0;
      cash += s.cash || 0;
      check += s.check || 0;
    });

    return {
      salesAmount,
      collections,
      cash,
      check,
      outstanding: salesAmount - collections,
    };
  }, [filteredSales]);

  // Trigger Client-side download of CSV sheet (Opens directly inside Microsoft Excel or Google Sheets)
  const exportCSV = () => {
    const headers = [
      "Date",
      "Invoice No",
      "Customer",
      "Phone",
      "Area",
      "Previous Due",
      "Sale Amount",
      "Cash Collection",
      "Check Collection",
      "Total Collection",
      "Current Due",
      "Remarks",
      "Salesperson"
    ];

    const rows = filteredSales.map((s) => {
      const custName = customerMap[s.customerId]?.name || "N/A";
      const custPhone = customerMap[s.customerId]?.phone || "N/A";
      const area = areaMap[s.areaId] || "N/A";
      const remarksText = s.remarks ? s.remarks.replace(/"/g, '""') : "";
      return [
        s.date,
        s.invoiceNo,
        `"${custName}"`,
        `"${custPhone}"`,
        `"${area}"`,
        s.previousDue,
        s.saleAmount,
        s.cash,
        s.check,
        s.collection,
        s.currentDue,
        `"${remarksText}"`,
        `"${s.salesmanName}"`
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const fileMonth = selectedMonth || "All_Time";
    const fileArea = selectedAreaId ? areaMap[selectedAreaId]?.replace(/\s+/g, "_") : "All_Areas";
    
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Apex_ERP_Report_${fileMonth}_${fileArea}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Programmatic PDF downloader using html2pdf.js
  const printReport = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayDateStr = `${dd}-${mm}-${yyyy}`;

    const reportMonth = selectedMonth || "All_Time";
    const reportArea = selectedAreaId ? (areaMap[selectedAreaId] || "Area").replace(/[^a-zA-Z0-9\s-_]/g, '').trim().replace(/\s+/g, "_") : "All_Areas";
    const fileName = `Monthly_Report_${reportMonth}_${reportArea}_${todayDateStr}.pdf`;

    // Reconstruct the spreadsheet report completely in an elegant, offscreen Daylight layout
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-9999px";
    tempContainer.style.top = "-9999px";

    const ledgerRowsHTML = filteredSales.map((sale) => {
      const custName = customerMap[sale.customerId]?.name || "N/A";
      const aName = areaMap[sale.areaId] || "N/A";
      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; font-family: monospace; font-size: 11px; color: #475569;">${sale.date}</td>
          <td style="padding: 10px 12px; font-weight: 600; font-size: 11px; color: #0f172a; font-family: monospace;">${sale.invoiceNo}</td>
          <td style="padding: 10px 12px; font-size: 11px; font-weight: 500; color: #1e293b; max-width: 150px; word-wrap: break-word;">${custName}</td>
          <td style="padding: 10px 12px; font-size: 11px; color: #475569;">${aName}</td>
          <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-size: 11px; color: #64748b;">RM ${sale.previousDue.toLocaleString()}</td>
          <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-size: 11px; color: #0f172a; font-weight: 600;">RM ${sale.saleAmount.toLocaleString()}</td>
          <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-size: 11px; color: #15803d; font-weight: 600;">RM ${sale.collection.toLocaleString()}</td>
          <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-size: 11px; color: #475569; font-size: 10px;">RM ${sale.cash.toLocaleString()} C / RM ${sale.check.toLocaleString()} Chk</td>
          <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-size: 11px; color: #b91c1c; font-weight: bold;">RM ${sale.currentDue.toLocaleString()}</td>
        </tr>
      `;
    }).join("");

    tempContainer.innerHTML = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; background-color: #ffffff; padding: 32px; box-sizing: border-box; width: 1120px;">
        <!-- Header Sheet -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #334155; padding-bottom: 18px; margin-bottom: 24px;">
          <div>
            <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #64748b; font-weight: 700;">APEX SALES SYSTEMS</span>
            <h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0; letter-spacing: -0.02em;">MONTHLY SALES & COLLECTIONS STATEMENT</h1>
            <h2 style="font-size: 14px; font-weight: 600; color: #334155; margin: 4px 0 0 0;">Territory Route: ${selectedAreaId ? (areaMap[selectedAreaId] || "Area") : "All Operational Territories"}</h2>
            <div style="font-size: 11px; color: #475569; margin-top: 3px;"><strong>Statement Month:</strong> ${selectedMonth ? selectedMonth : "Accumulated (All Time)"}</div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #475569; line-height: 1.6; min-width: 320px;">
            <div><strong>Report Date:</strong> ${today.toLocaleDateString('en-GB') || todayDateStr}</div>
            <div><strong>Status Indicator:</strong> Verified Operational Report</div>
            <div style="margin-top: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; display: inline-block; text-align: left; width: 100%;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase;">Filtered Sales:</span>
                <strong style="color: #0f172a; font-size: 11px; font-family: monospace;">RM ${reportTotals.salesAmount.toLocaleString()}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase;">Total Collections:</span>
                <strong style="color: #166534; font-size: 11px; font-family: monospace;">RM ${reportTotals.collections.toLocaleString()}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; border-t: 1px solid #e2e8f0; padding-top: 3px; margin-top: 3px;">
                <span style="font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase;">Net Outstanding Delta:</span>
                <strong style="color: ${reportTotals.outstanding >= 0 ? '#b91c1c' : '#166534'}; font-size: 12px; font-family: monospace;">
                  ${reportTotals.outstanding >= 0 ? "+" : ""}RM ${reportTotals.outstanding.toLocaleString()}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Spreadsheet Table Ledgers -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left; text-transform: uppercase; font-size: 9px; letter-spacing: 0.06em; color: #475569;">
              <th style="padding: 10px 12px; font-weight: 700;">Date</th>
              <th style="padding: 10px 12px; font-weight: 700;">Inv Code</th>
              <th style="padding: 10px 12px; font-weight: 700;">Customer Info</th>
              <th style="padding: 10px 12px; font-weight: 700;">Route Area</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 700;">Prev Due</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 700; color: #020617;">Sale Hiked</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 700; color: #15803d;">Collection</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 700; color: #475569;">Cash / Chk</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 700; color: #b91c1c;">Post Due</th>
            </tr>
          </thead>
          <tbody style="color: #334155;">
            ${ledgerRowsHTML}
            
            <!-- Summary Totals Row -->
            <tr style="background-color: #f8fafc; border-top: 2px solid #cbd5e1; font-weight: bold; color: #0f172a;">
              <td colspan="4" style="padding: 12px 12px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase;">SUMMARY REPORT TOTALS</td>
              <td style="padding: 12px 12px; text-align: right; font-family: monospace; font-size: 11px; color: #64748b;">-</td>
              <td style="padding: 12px 12px; text-align: right; font-family: monospace; font-size: 11px; color: #0f172a; font-weight: bold;">RM ${reportTotals.salesAmount.toLocaleString()}</td>
              <td style="padding: 12px 12px; text-align: right; font-family: monospace; font-size: 11px; color: #166534; font-weight: bold;">RM ${reportTotals.collections.toLocaleString()}</td>
              <td style="padding: 12px 12px; text-align: right; font-family: monospace; font-size: 11px; color: #475569; font-size: 10px;">RM ${reportTotals.cash.toLocaleString()} C / RM ${reportTotals.check.toLocaleString()} Chk</td>
              <td style="padding: 12px 12px; text-align: right; font-family: monospace; font-size: 11px; color: #b91c1c; font-weight: bold;">Delta: RM ${reportTotals.outstanding.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <!-- Audit Signatures -->
        <div style="margin-top: 80px; display: flex; justify-content: space-between; text-align: center; font-size: 10px; font-family: monospace; color: #475569; page-break-inside: avoid;">
          <div style="width: 240px; border-top: 1px solid #94a3b8; padding-top: 8px; font-weight: 600;">Prepared by Staff</div>
          <div style="width: 240px; border-top: 1px solid #94a3b8; padding-top: 8px; font-weight: 600;">Authorised Auditor Stamp</div>
          <div style="width: 240px; border-top: 1px solid #94a3b8; padding-top: 8px; font-weight: 600;">Signature (Ahmad Fauzi)</div>
        </div>
      </div>
    `;

    document.body.appendChild(tempContainer);

    const opt = {
      margin:       10,
      filename:     fileName,
      image:        { type: "jpeg" as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: "mm" as const, format: "a4" as const, orientation: "landscape" as const }
    };

    html2pdf()
      .from(tempContainer)
      .set(opt)
      .save()
      .then(() => {
        document.body.removeChild(tempContainer);
      })
      .catch((err: any) => {
        console.error("PDF generation failed:", err);
        document.body.removeChild(tempContainer);
      });
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Monthly Statements</h1>
          <p className="text-sm text-slate-400 mt-1 font-light">
            Generate, filter, and audit sales activities across operational areas.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={exportCSV}
            disabled={filteredSales.length === 0}
            className="h-10 px-4 bg-[#161618] border border-white/5 hover:text-emerald-450 hover:bg-white/5 focus:border-emerald-500 text-slate-300 rounded-xl flex items-center justify-center gap-2.5 font-medium text-xs cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed select-none"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export CSV/Excel
          </button>
          
          <button
            onClick={printReport}
            disabled={filteredSales.length === 0}
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-2.5 font-semibold text-xs cursor-pointer shadow-lg shadow-emerald-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed select-none"
          >
            <Printer className="w-4 h-4" /> Print PDF Report
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-[#161618] border border-white/5 p-5 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
        
        {/* Month Dropdown */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1.5 leading-normal">
            <Calendar className="w-3.5 h-3.5 text-slate-600" /> Filter Month
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full h-10 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs px-3 text-slate-300 outline-none cursor-pointer"
          >
            <option value="" className="bg-[#161618]">Accumulated (All Months)</option>
            {monthOptions.map((m) => {
              const [yr, mn] = m.split("-");
              const mnNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
              const label = `${mnNames[parseInt(mn, 10) - 1]} ${yr}`;
              return (
                <option key={m} value={m} className="bg-[#161618]">
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Area dropdown */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1.5 leading-normal">
            <MapPin className="w-3.5 h-3.5 text-slate-600" /> Filter operational Area
          </label>
          <select
            value={selectedAreaId}
            onChange={(e) => setSelectedAreaId(e.target.value)}
            className="w-full h-10 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs px-3 text-slate-300 outline-none cursor-pointer"
          >
            <option value="" className="bg-[#161618]">All Operational Territories</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id} className="bg-[#161618]">
                {a.name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Aggregate Cards on filtered matches */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 print:hidden">
        
        <div className="bg-[#161618] border border-white/5 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <TrendingUp className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] font-mono text-slate-500 uppercase block">Filtered Gross Sales</span>
            <p className="text-lg font-bold text-white">RM{reportTotals.salesAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-[#161618] border border-white/5 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-mono text-slate-500 uppercase block">Filtered Collections</span>
            <p className="text-lg font-bold text-white">
              RM{reportTotals.collections.toLocaleString()} 
              <span className="text-[10px] text-slate-400 font-mono font-normal block mt-0.5">
                (RM{reportTotals.cash} Cash / RM{reportTotals.check} Check)
              </span>
            </p>
          </div>
        </div>

        <div className="bg-[#161618] border border-white/5 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-mono text-slate-500 uppercase block">Net Dues Delta</span>
            <p className="text-lg font-bold text-rose-400">
              {reportTotals.outstanding >= 0 ? "+" : ""}
              RM{reportTotals.outstanding.toLocaleString()}
            </p>
          </div>
        </div>

      </div>

      {/* Audit Sheet print design element */}
      <div className="bg-[#161618] border border-white/5 rounded-xl overflow-hidden print:bg-white print:text-slate-950 print:border-none print:shadow-none">
        
        {/* Landscape Header ONLY visible in Print rendering */}
        <div className="hidden print:block p-8 border-b border-slate-300 text-slate-950 mb-6 flex justify-between items-start">
          <div>
            <span className="text-xs uppercase font-mono tracking-widest text-slate-500">Sales Auditor Document</span>
            <h1 className="text-2xl font-bold tracking-tight">APEX SALES ERP STATEMENT</h1>
            <p className="text-xs text-slate-600 mt-1">
              Active Scope: {selectedMonth ? `Month: ${selectedMonth}` : "All historic logs"} | Territory: {selectedAreaId ? areaMap[selectedAreaId] : "All Territories"}
            </p>
          </div>
          <div className="text-right text-xs font-mono text-slate-500 leading-relaxed">
            <div>Dump Date: {new Date().toLocaleDateString()}</div>
            <div>Database Instance: Fire-Active Stack</div>
          </div>
        </div>

        <div className="overflow-x-auto font-sans">
          <table className="w-full text-left border-collapse print:text-xs">
            <thead>
              <tr className="bg-[#0A0A0B] border-b border-white/5 text-[10px] font-mono text-slate-500 uppercase tracking-wider print:bg-slate-100 print:text-slate-700 print:font-semibold print:border-b-2 print:border-slate-400">
                <th className="py-3 px-5">Date</th>
                <th className="py-3 px-5">Inv Code</th>
                <th className="py-3 px-5">Customer info</th>
                <th className="py-3 px-5">Area Sector</th>
                <th className="py-3 px-5 text-right">Prev Due</th>
                <th className="py-3 px-5 text-right text-emerald-400 print:text-slate-700">Sale Hiked</th>
                <th className="py-3 px-5 text-right text-emerald-400 print:text-slate-700">Collection</th>
                <th className="py-3 px-5 text-right">Cash / Chk</th>
                <th className="py-3 px-5 text-right">Post Due</th>
                <th className="py-3 px-5 text-right print:hidden">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs print:divide-slate-300">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 font-mono print:text-slate-600 font-light">
                    No sales entries matched selected parameters.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => {
                  const custName = customerMap[s.customerId]?.name || "N/A";
                  const aName = areaMap[s.areaId] || "N/A";

                  return (
                    <tr key={s.id} className="hover:bg-white/5 print:hover:bg-white text-slate-300 print:text-slate-800">
                      <td className="py-3 px-5 font-mono text-slate-400 print:text-slate-600 truncate">{s.date}</td>
                      <td className="py-3 px-5 font-mono text-slate-100 print:text-slate-900 font-medium">{s.invoiceNo}</td>
                      <td className="py-3 px-5 font-semibold text-slate-200 print:text-slate-900 truncate max-w-[120px]">{custName}</td>
                      <td className="py-3 px-5 text-slate-400 print:text-slate-600 truncate max-w-[100px]">{aName}</td>
                      <td className="py-3 px-5 text-right font-mono text-slate-500 print:text-slate-500">RM{s.previousDue.toLocaleString()}</td>
                      <td className="py-3 px-5 text-right font-mono text-white font-semibold print:text-slate-900">RM{s.saleAmount.toLocaleString()}</td>
                      <td className="py-3 px-5 text-right font-mono text-emerald-400 font-semibold print:text-slate-900">RM{s.collection.toLocaleString()}</td>
                      <td className="py-3 px-5 text-right font-mono text-slate-500 text-[10px] print:text-slate-500">
                        RM{s.cash} / RM{s.check}
                      </td>
                      <td className="py-3 px-5 text-right font-mono font-bold text-slate-300 print:text-slate-900">RM{s.currentDue.toLocaleString()}</td>
                      <td className="py-3 px-5 text-right text-slate-500 print:hidden max-w-[120px] truncate text-[10px]" title={s.remarks}>
                        {s.remarks || "-"}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Total Aggregate Bottom Footer Row */}
              {filteredSales.length > 0 && (
                <tr className="bg-[#0A0A0B]/80 font-semibold text-white border-t border-white/5 print:bg-slate-100 print:text-slate-950 print:border-t-2 print:border-slate-800">
                  <td colSpan={4} className="py-4.5 px-5 font-bold font-sans text-right print:text-slate-900">SUMMARY REPORT TOTAL</td>
                  <td className="py-4 px-5 text-right font-mono print:text-slate-900">-</td>
                  <td className="py-4 px-5 text-right font-mono text-white font-bold print:text-slate-950">RM{reportTotals.salesAmount.toLocaleString()}</td>
                  <td className="py-4 px-5 text-right font-mono text-emerald-400 font-bold print:text-slate-950">RM{reportTotals.collections.toLocaleString()}</td>
                  <td className="py-4 px-5 text-right font-mono text-[10px] text-slate-400 print:text-slate-950">
                    RM{reportTotals.cash} C / RM{reportTotals.check} Chk
                  </td>
                  <td className="py-4 px-5 text-right font-mono font-bold text-amber-500 print:text-slate-950">
                    Delta Dues: RM{reportTotals.outstanding.toLocaleString()}
                  </td>
                  <td className="py-4 px-5 print:hidden"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Audit Signatures inside Print layout ONLY */}
        <div className="hidden print:flex mt-24 p-8 justify-between text-center text-xs font-mono text-slate-600 print-signature">
          <div className="w-56 border-t border-slate-400 pt-3">Prepared by Staff</div>
          <div className="w-56 border-t border-slate-400 pt-3">Authorised Auditor Stamp</div>
          <div className="w-56 border-t border-slate-400 pt-3">Signature (Ahmad Fauzi)</div>
        </div>

      </div>

    </div>
  );
}
