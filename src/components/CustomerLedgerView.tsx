/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
// @ts-ignore
import html2pdf from "html2pdf.js";
import { Area, Customer, SalesEntry } from "../types";
import {
  BookOpen,
  ArrowRightLeft,
  Coins,
  Printer,
  FileSpreadsheet,
  CalendarCheck,
  ChevronRight,
  TrendingDown,
  Contact2
} from "lucide-react";

interface CustomerLedgerViewProps {
  areas: Area[];
  customers: Customer[];
  sales: SalesEntry[];
}

export interface LedgerRow {
  date: string;
  reference: string;
  description: string;
  debit: number;      // sales increase dues
  credit: number;     // collections reduce dues
  runningBalance: number;
}

export default function CustomerLedgerView({ areas, customers, sales }: CustomerLedgerViewProps) {
  const currencySymbol = localStorage.getItem("duepilot_currency") || "RM";
  
  // Selected state
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const areaMap = useMemo(() => {
    const map: { [id: string]: string } = {};
    areas.forEach((a) => {
      map[a.id] = a.name;
    });
    return map;
  }, [areas]);

  // Selected customer
  const activeCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Generate Chronological Ledger with running balances
  const ledgerHistory = useMemo((): LedgerRow[] => {
    if (!activeCustomer) return [];

    // 1. Preload Opening Balance entry
    const rows: LedgerRow[] = [
      {
        date: "2026-01-01", // Or standard base setup date
        reference: "SYS-SETUP",
        description: "Initial Ledger Opening Dues",
        debit: activeCustomer.openingDue,
        credit: 0,
        runningBalance: activeCustomer.openingDue,
      },
    ];

    // 2. Fetch all sales & collections associated, sorted chronologically
    const customerSales = sales
      .filter((s) => s.customerId === activeCustomer.id)
      .sort((a, b) => a.date.localeCompare(b.date));

    // 3. Compute chronological running ledger balances
    let runningVal = activeCustomer.openingDue;

    customerSales.forEach((s) => {
      runningVal = runningVal + s.saleAmount - s.collection;
      rows.push({
        date: s.date,
        reference: s.invoiceNo,
        description: s.remarks || `Purchase invoice logged by ${s.salesmanName}`,
        debit: s.saleAmount,
        credit: s.collection,
        runningBalance: runningVal,
      });
    });

    return rows;
  }, [activeCustomer, sales]);

  // Programmatic PDF downloader using html2pdf.js
  const printLedger = () => {
    if (!activeCustomer) return;

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayDateStr = `${dd}-${mm}-${yyyy}`;

    // Clean customer name to be safe in filename
    const safeCustomerName = activeCustomer.name.replace(/[^a-zA-Z0-9\s-_]/g, '').trim().replace(/\s+/g, "_");
    const fileName = `${safeCustomerName}_Statement_${todayDateStr}.pdf`;

    // Reconstruct the statement completely in an elegant, offscreen Daylight layout
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-9999px";
    tempContainer.style.top = "-9999px";

    const ledgerRowsHTML = ledgerHistory.map((row) => {
      const isOpening = row.reference === "SYS-SETUP";
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; ${isOpening ? "background-color: #f8fafc; font-weight: 500; font-style: italic;" : ""}">
          <td style="padding: 10px 12px; font-family: monospace; font-size: 11px; color: #475569;">${row.date}</td>
          <td style="padding: 10px 12px; font-weight: 600; font-size: 11px; color: #0f172a; font-family: monospace;">
            ${isOpening ? '<span style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; color: #64748b;">LEDGER-OPEN</span>' : row.reference}
          </td>
          <td style="padding: 10px 12px; font-size: 11px; font-style: italic; color: #475569; max-width: 240px; word-wrap: break-word;">${row.description}</td>
          <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-size: 11px; color: #b91c1c; font-weight: 600;">
            ${row.debit > 0 ? `${currencySymbol} ${row.debit.toLocaleString()}` : "-"}
          </td>
          <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-size: 11px; color: #15803d; font-weight: 600;">
            ${row.credit > 0 ? `${currencySymbol} ${row.credit.toLocaleString()}` : "-"}
          </td>
          <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-size: 11px; font-weight: bold; color: #0f172a;">
            ${currencySymbol} ${row.runningBalance.toLocaleString()}
          </td>
        </tr>
      `;
    }).join("");

    tempContainer.innerHTML = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; background-color: #ffffff; padding: 32px; box-sizing: border-box; width: 800px;">
        <!-- Header Sheet -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #334155; padding-bottom: 18px; margin-bottom: 24px;">
          <div style="display: flex; gap: 16px; align-items: center;">
            ${activeCustomer.profilePicture ? `
              <img src="${activeCustomer.profilePicture}" style="width: 76px; height: 76px; border-radius: 50%; border: 2px solid #cbd5e1; object-fit: cover; margin-right: 12px;" />
            ` : `
              <div style="width: 76px; height: 76px; border-radius: 50%; border: 2px solid #cbd5e1; background-color: #f1f5f9; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #64748b; font-size: 22px; margin-right: 12px; font-family: sans-serif;">
                ${activeCustomer.name.substring(0, 2).toUpperCase()}
              </div>
            `}
            <div>
              <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #64748b; font-weight: 700;">DUEPILOT ERP SYSTEMS</span>
              <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0; letter-spacing: -0.02em;">CUSTOMER STATEMENT REPORT</h1>
              <h2 style="font-size: 13px; font-weight: 600; color: #334155; margin: 4px 0 0 0;">Account Name: ${activeCustomer.name}</h2>
              <div style="font-size: 11px; color: #475569; margin-top: 3px;"><strong>Shop Store:</strong> ${activeCustomer.shopName || "N/A"} | <strong>Email:</strong> ${activeCustomer.emailAddress || "N/A"}</div>
              <div style="font-size: 11px; color: #475569; margin-top: 1px;"><strong>Phone Contact:</strong> ${activeCustomer.phone} | <strong>Territory Route:</strong> ${areaMap[activeCustomer.areaId] || "N/A"}</div>
            </div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #475569; line-height: 1.6; min-width: 200px;">
            <div><strong>Report Date:</strong> ${today.toLocaleDateString('en-GB') || todayDateStr}</div>
            <div><strong>Status Indicator:</strong> Verified Ledger Book</div>
            <div style="margin-top: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 8px; display: inline-block; text-align: left;">
              <span style="font-size: 10px; color: #64748b; display: block; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Ledger Opening Due:</span>
              <strong style="color: #0f172a; font-size: 12px; font-family: monospace;">${currencySymbol} ${activeCustomer.openingDue.toLocaleString()}</strong>
              
              <span style="font-size: 10px; color: #64748b; display: block; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; margin-top: 4px;">Outsourcing Liability:</span>
              <strong style="color: #b91c1c; font-size: 13px; font-family: monospace;">${currencySymbol} ${activeCustomer.currentDue.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        <!-- Table Ledgers -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; text-align: left; text-transform: uppercase; font-size: 9px; letter-spacing: 0.06em; color: #475569;">
              <th style="padding: 10px 12px; font-weight: 700;">Date</th>
              <th style="padding: 10px 12px; font-weight: 700;">Ref Code</th>
              <th style="padding: 10px 12px; font-weight: 700;">Description / Remarks Memo</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 700; color: #b91c1c;">Purchase Debit</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 700; color: #15803d;">Collection Credit</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 700; color: #0f172a;">Outstanding Due</th>
            </tr>
          </thead>
          <tbody style="color: #334155;">
            ${ledgerRowsHTML}
          </tbody>
        </table>

        <!-- Audit Signatures -->
        <div style="margin-top: 50px; display: flex; justify-content: space-between; text-align: center; font-size: 10px; font-family: monospace; color: #475569; page-break-inside: avoid;">
          <div style="width: 180px; border-top: 1px solid #94a3b8; padding-top: 8px; font-weight: 600;">Authorised Auditor</div>
          <div style="width: 180px; border-top: 1px solid #94a3b8; padding-top: 8px; font-weight: 600;">Finance Stamp</div>
          <div style="width: 180px; border-top: 1px solid #94a3b8; padding-top: 8px; font-weight: 600;">Customer Signature</div>
        </div>

        <!-- Footer Info with Application metadata tag -->
        <div style="margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; font-family: monospace;">
          <span>Created By: ${localStorage.getItem("duepilot_profile_settings") ? JSON.parse(localStorage.getItem("duepilot_profile_settings")!).name : "Executive Admin"}</span>
          <span>App: Sales ERP SaaS • Version: v1.2.0 • Year: 2026</span>
        </div>
      </div>
    `;

    document.body.appendChild(tempContainer);

    const opt = {
      margin:       10,
      filename:     fileName,
      image:        { type: "jpeg" as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const }
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
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans">Customer Ledgers</h1>
          <p className="text-sm text-slate-400 mt-1 font-light">
            Search, select, and review rolling chronological liabilities and statement balances.
          </p>
        </div>

        {activeCustomer && (
          <button
            onClick={printLedger}
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-2.5 font-semibold text-xs cursor-pointer shadow-lg shadow-emerald-950/20 transition-all select-none self-start sm:self-auto"
          >
            <Printer className="w-4 h-4" /> Print Ledger Statement
          </button>
        )}
      </div>

      {/* Selector Area Column */}
      <div className="bg-[#161618] border border-white/5 p-5 rounded-xl print:hidden">
        <label className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1.5 mb-2.5">
          <Contact2 className="w-4 h-4 text-slate-500" /> Choose Customer Statement Directory
        </label>
        
        <select
          value={selectedCustomerId}
          onChange={(e) => setSelectedCustomerId(e.target.value)}
          className="w-full h-11 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs px-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
        >
          <option value="" className="bg-[#161618]">-- Choose active client roster profile --</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id} className="bg-[#161618]">
              {c.name} (Phone: {c.phone} | Territory: {areaMap[c.areaId] || "Load..."})
            </option>
          ))}
        </select>
      </div>

      {/* Ledger statement content */}
      {!activeCustomer ? (
        <div className="bg-[#161618]/40 border border-white/5 rounded-xl p-16 text-center text-slate-500 font-mono text-xs print:hidden">
          Please select a customer from the roster above to compute their rolling ledgers.
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Card: Client quick summaries */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
            
            <div className="bg-[#161618] border border-white/5 p-4.5 rounded-xl">
              <span className="text-[9px] font-mono text-slate-500 uppercase block">Roster Name</span>
              <h3 className="text-sm font-semibold text-slate-200 mt-1">{activeCustomer.name}</h3>
            </div>

            <div className="bg-[#161618] border border-white/5 p-4.5 rounded-xl">
              <span className="text-[9px] font-mono text-slate-500 uppercase block">Territory Route</span>
              <h3 className="text-sm font-semibold text-[#3b82f6] text-blue-405 text-blue-400 mt-1">
                {areaMap[activeCustomer.areaId] || "Unassigned"}
              </h3>
            </div>

            <div className="bg-[#161618] border border-white/5 p-4.5 rounded-xl">
              <span className="text-[9px] font-mono text-slate-500 uppercase block">Setup Opening Balance</span>
              <h3 className="text-sm font-mono font-bold text-slate-400 mt-1 block">
                {currencySymbol}{activeCustomer.openingDue.toLocaleString()}
              </h3>
            </div>

            <div className="bg-[#161618] border border-white/5 p-4.5 rounded-xl">
              <span className="text-[9px] font-mono text-slate-500 uppercase block">Outsourcing Net liability</span>
              <h3 className="text-sm font-mono font-extrabold text-rose-455 text-rose-400 mt-1 block">
                {currencySymbol}{activeCustomer.currentDue.toLocaleString()}
              </h3>
            </div>

          </div>

          {/* Table Container */}
          <div className="bg-[#161618] border border-white/5 rounded-xl overflow-hidden print:bg-white print:text-slate-950 print:border-none print:shadow-none">
            
            {/* Landscape Header ONLY visible in Print rendering */}
            <div className="hidden print:block p-8 border-b-2 border-slate-400 text-slate-950 mb-6 flex justify-between items-start">
              <div>
                <span className="text-xs uppercase font-mono tracking-widest text-slate-500">APEX SALES SYSTEMS</span>
                <h1 className="text-2xl font-bold tracking-tight">LEDGER ACCOUNT LEDGER SHEET</h1>
                <h2 className="text-sm mt-1 text-slate-700">Account: {activeCustomer.name} | Territory: {areaMap[activeCustomer.areaId] || "N/A"}</h2>
                <div className="text-xs text-slate-600 mt-1">Phone Contact: {activeCustomer.phone}</div>
              </div>
              <div className="text-right text-xs font-mono text-slate-500 leading-relaxed">
                <div>Print Date: {new Date().toLocaleDateString()}</div>
                <div>Status Indices: Verified Ledger</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse print:text-xs">
                <thead>
                  <tr className="bg-[#0A0A0B] text-[10px] font-mono text-slate-500 uppercase tracking-wider print:bg-slate-100 print:text-slate-700 print:font-semibold print:border-b-2 print:border-slate-400">
                    <th className="py-3 px-5">Date</th>
                    <th className="py-3 px-5">Ref Code</th>
                    <th className="py-3 px-5">Description / Remarks Memo</th>
                    <th className="py-3 px-5 text-right text-rose-400 print:text-slate-900">Purchase Debit ({currencySymbol})</th>
                    <th className="py-3 px-5 text-right text-emerald-450 text-emerald-400 print:text-slate-900">Collection Credit ({currencySymbol})</th>
                    <th className="py-3 px-5 text-right">Rolling Outstanding ({currencySymbol})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs print:divide-slate-300">
                  {ledgerHistory.map((row, idx) => {
                    const isOpening = row.reference === "SYS-SETUP";
                    
                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-white/5 text-slate-300 print:text-slate-800 ${
                          isOpening ? "bg-[#0A0A0B]/60 font-medium italic select-none" : ""
                        }`}
                      >
                        <td className="py-3.5 px-5 font-mono text-slate-500 print:text-slate-600 truncate">{row.date}</td>
                        <td className="py-3.5 px-5 font-mono text-slate-200 print:text-slate-900 font-medium">
                          {row.reference === "SYS-SETUP" ? (
                            <span className="px-2 py-0.5 rounded bg-[#0A0A0B] text-slate-500 text-[9px] border border-white/5">LEDGER-OPEN</span>
                          ) : (
                            row.reference
                          )}
                        </td>
                        <td className="py-3.5 px-5 italic max-w-sm truncate text-slate-400 print:text-slate-600">
                          {row.description}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-rose-400 font-medium print:text-slate-900">
                          {row.debit > 0 ? `${currencySymbol}${row.debit.toLocaleString()}` : "-"}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono text-emerald-400 font-medium print:text-slate-900">
                          {row.credit > 0 ? `${currencySymbol}${row.credit.toLocaleString()}` : "-"}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-200 print:text-slate-900">
                          {currencySymbol}{row.runningBalance.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Audit Signatures inside Print layouts ONLY */}
            <div className="hidden print:flex mt-24 p-8 justify-between text-center text-xs font-mono text-slate-600 print-signature">
              <div className="w-56 border-t border-slate-400 pt-3">Authorised Auditor</div>
              <div className="w-56 border-t border-slate-400 pt-3">Finance Stamp</div>
              <div className="w-56 border-t border-slate-400 pt-3">Customer Signature</div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
