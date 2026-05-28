/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Area, Customer, SalesEntry, AppUser } from "../types";
import { dbService } from "../lib/dbService";
import {
  NotebookTabs,
  Tags,
  CalendarDays,
  User,
  MapPin,
  ClipboardList,
  AlertTriangle,
  BadgeCent,
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
  AlertCircle
} from "lucide-react";

interface DailySalesViewProps {
  currentUser: AppUser;
  areas: Area[];
  customers: Customer[];
  sales: SalesEntry[];
  refreshData: () => void;
}

export default function DailySalesView({
  currentUser,
  areas,
  customers,
  sales,
  refreshData,
}: DailySalesViewProps) {
  const isAdmin = currentUser.role === "admin";

  // Form Fields
  const [date, setDate] = useState(() => {
    return new Date().toISOString().slice(0, 10); // Default YYYY-MM-DD
  });
  const [invoiceNo, setInvoiceNo] = useState("");
  const [year, setYear] = useState(() => new Date().getFullYear().toString());
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const [cash, setCash] = useState("");
  const [check, setCheck] = useState("");
  const [remarks, setRemarks] = useState("");

  // Submissions state
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Map area details
  const areaNameMap = useMemo(() => {
    const map: { [id: string]: string } = {};
    areas.forEach((a) => {
      map[a.id] = a.name;
    });
    return map;
  }, [areas]);

  // Selected customer data
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Auto invoice sequence generation on component layout mounting
  useEffect(() => {
    const countsInCurrentYear = sales.filter((s) => s.year === year).length;
    const nextSeq = String(countsInCurrentYear + 1).padStart(3, "0");
    setInvoiceNo(`INV-${year}-${nextSeq}`);
  }, [sales, year]);

  // Handle year alteration sync with date
  useEffect(() => {
    if (date) {
      setYear(date.slice(0, 4));
    }
  }, [date]);

  // Calculations Formula
  const calculatedStats = useMemo(() => {
    const previousDue = selectedCustomer ? selectedCustomer.currentDue : 0;
    const valSale = parseFloat(saleAmount) || 0;
    const valCash = parseFloat(cash) || 0;
    const valCheck = parseFloat(check) || 0;

    const collection = valCash + valCheck;
    const currentDue = previousDue + valSale - collection;

    return {
      previousDue,
      collection,
      currentDue,
    };
  }, [selectedCustomer, saleAmount, cash, check]);

  // Post entry
  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setValidationError("Please select a valid customer profile.");
      return;
    }
    if (!invoiceNo.trim()) {
      setValidationError("Invoice identifier number is required.");
      return;
    }

    const valSale = parseFloat(saleAmount) || 0;
    const valCash = parseFloat(cash) || 0;
    const valCheck = parseFloat(check) || 0;

    if (valSale < 0 || valCash < 0 || valCheck < 0) {
      setValidationError("Values for sales, cash, or checks cannot be negative numbers.");
      return;
    }

    setLoading(true);
    setValidationError(null);
    setSuccessMsg(null);

    const payload: Omit<SalesEntry, "id"> = {
      date,
      invoiceNo: invoiceNo.trim(),
      year,
      customerId: selectedCustomerId,
      areaId: selectedCustomer!.areaId,
      saleAmount: valSale,
      collection: calculatedStats.collection,
      cash: valCash,
      check: valCheck,
      previousDue: calculatedStats.previousDue,
      currentDue: calculatedStats.currentDue,
      remarks: remarks.trim() || undefined,
      salesmanId: currentUser.id,
      salesmanName: currentUser.name,
    };

    try {
      await dbService.addSalesEntry(payload);
      setSuccessMsg(`Invoice "${invoiceNo}" successfully committed to customer ledgers.`);
      
      // Reset variables (excluding date/year/customer for easy repeated entry)
      setSaleAmount("");
      setCash("");
      setCheck("");
      setRemarks("");
      refreshData();
    } catch (err: any) {
      setValidationError("Error posting ledger entry: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-adjust dues when delete
  const handleDeleteInvoice = async (sale: SalesEntry) => {
    if (!isAdmin) return;
    if (!confirm(`Warning: Deleting transaction "${sale.invoiceNo}" will permanently reverse its ledger balance additions of RM${sale.saleAmount - sale.collection} from the customer's profile! Proceed?`)) return;

    try {
      // Adjustment value = Sale - Collection
      const adjustment = sale.saleAmount - sale.collection;
      await dbService.deleteSalesEntry(sale.id, sale.customerId, adjustment);
      refreshData();
    } catch (err: any) {
      alert("Verification Exception deletion: " + err.message);
    }
  };  return (
    <div className="space-y-8 animate-fade-in font-sans">
      
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Daily Sales Portal</h1>
        <p className="text-sm text-slate-400 mt-1 font-light">
          Post purchase tickets, cash receipts, and check clearances inside the central ledger index.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Entry Form (Spans 3 cols) */}
        <div className="lg:col-span-3 bg-[#161618] border border-white/5 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
          
          <div className="bg-[#0A0A0B] px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-450 text-emerald-400" /> Transact Ledger Ticket
            </h2>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full capitalize">
              By: {currentUser.name}
            </span>
          </div>

          <form onSubmit={handleRecordTransaction} className="p-5 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-5">
              {successMsg && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-900 rounded-xl text-emerald-300 text-xs flex gap-2.5 items-start">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
                  <span>{successMsg}</span>
                </div>
              )}

              {validationError && (
                <div className="p-4 bg-red-950/40 border border-red-900 rounded-xl text-red-300 text-xs flex gap-2.5 items-start">
                  <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Grid: Date & Invoice No & Year */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1">
                    <CalendarDays className="w-3 h-3 text-slate-600" /> Transaction Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-white focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1">
                    Invoice Code No
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-2026-001"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-white focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1">
                    Calendar year
                  </label>
                  <input
                    type="text"
                    required
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-white focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                  />
                </div>

              </div>

              {/* Customer Dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-500 uppercase flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-600" /> Customer Account Profile
                </label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full h-10 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs px-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  <option value="" disabled>Select billing Customer portfolio...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({areaNameMap[c.areaId] || "Territory Load Error"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto Detected Area & Core Ledger Preview */}
              {selectedCustomer && (
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#0A0A0B]/60 border border-white/5">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="block text-[9px] text-slate-500 font-mono uppercase">Detected routing Area</span>
                      <span className="text-xs font-semibold text-slate-200">{areaNameMap[selectedCustomer.areaId] || "N/A"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Tags className="w-4 h-4 text-orange-400 shrink-0" />
                    <div>
                      <span className="block text-[9px] text-slate-500 font-mono uppercase">Ledger Previous Due</span>
                      <span className="text-xs font-mono font-bold text-orange-400">RM{calculatedStats.previousDue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid: Sale Amount & Collection Channels */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">Gross Sale Amount (RM)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={saleAmount}
                    onChange={(e) => setSaleAmount(e.target.value)}
                    className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-white focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-emerald-450 text-emerald-400 uppercase">Cash Collected (RM)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={cash}
                    onChange={(e) => setCash(e.target.value)}
                    className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-blue-450 text-blue-400 uppercase">Check/Bank credit (RM)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={check}
                    onChange={(e) => setCheck(e.target.value)}
                    className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-blue-400 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                  />
                </div>

              </div>

              {/* Formula Panel */}
              {selectedCustomer && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-white/5 pt-5 text-center">
                  <div className="bg-[#0A0A0B] p-3.5 rounded-xl border border-white/5">
                    <span className="block text-[8px] font-mono text-slate-500 uppercase">Aggregated Collection</span>
                    <span className="text-sm font-mono font-semibold text-emerald-400 mt-1 block">
                      RM{calculatedStats.collection.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-[#0A0A0B] p-3.5 rounded-xl border border-white/5 col-span-1 md:col-span-2">
                    <span className="block text-[8px] font-mono text-slate-500 uppercase">Forecast outstanding Current Due</span>
                    <span className={`text-sm font-mono font-bold mt-1 block ${calculatedStats.currentDue > 15000 ? "text-rose-400" : "text-emerald-400"}`}>
                      RM{calculatedStats.currentDue.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Remarks / Check Memo details</label>
                <textarea
                  placeholder="Ex: Maybank Check Details (No: XXXXX, Expiry: 2026/06) or goods delivery references"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={2}
                  className="w-full p-3 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-white focus:ring-1 focus:ring-emerald-500 transition-all font-sans resize-none"
                />
              </div>

              {calculatedStats.currentDue > 25000 && (
                <div className="p-3 bg-rose-950/20 border border-rose-900/30 text-rose-400 rounded-xl leading-relaxed text-[11px] flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p>
                    <strong>Dues Exposure Alert:</strong> Outstanding debt on this billing account will hover beyond the standard warning threshold. Double-check collection reserves!
                  </p>
                </div>
              )}
            </div>

            {/* Button */}
            <div className="pt-2 border-t border-white/5 mt-5">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#0A0A0B] disabled:text-slate-600 text-white transition-all font-semibold rounded-xl text-xs tracking-wide shadow-lg shadow-emerald-950/20 cursor-pointer disabled:cursor-not-allowed uppercase"
              >
                {loading ? "Recording Transaction..." : "Commit Bill To Ledgers"}
              </button>
            </div>

          </form>

        </div>

        {/* Latest entries (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-[#161618] border border-white/5 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
          
          <div className="bg-[#0A0A0B] px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xs font-mono font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <BadgeCent className="w-4 h-4 text-emerald-400" /> Recent Slips Feed
            </h2>
            <span className="text-[10px] font-mono bg-white/5 text-slate-400 px-2.5 py-0.5 rounded border border-white/5">
              Total {sales.length}
            </span>
          </div>

          <div className="p-5 flex-1 overflow-y-auto max-h-[500px] space-y-4 custom-scrollbar">
            {sales.length === 0 ? (
              <div className="text-center font-mono py-24 text-slate-500 text-xs">
                No ledger transactions recorded in this session.
              </div>
            ) : (
              // Order by descending date / ID
              [...sales]
                .reverse()
                .slice(0, 10)
                .map((sale) => {
                  const custObj = customers.find((c) => c.id === sale.customerId);
                  const clientName = custObj ? custObj.name : "Unknown Partner";

                  return (
                    <div
                      key={sale.id}
                      className="bg-[#0A0A0B] border border-white/5 rounded-xl p-4 space-y-2.5 transition-all hover:border-white/10 relative group"
                    >
                      
                      {/* Top Row */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="block text-xs font-semibold text-slate-200 truncate pr-5">{clientName}</span>
                          <span className="text-[9px] font-mono text-slate-500 mt-0.5 block">{sale.invoiceNo} • {sale.date}</span>
                        </div>

                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteInvoice(sale)}
                            title="Reverse ledger entry"
                            className="text-slate-600 hover:text-red-400 p-1 rounded-md hover:bg-white/5 md:opacity-0 group-hover:opacity-100 transition-all cursor-pointer animate-fade-in"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Cash Breakdown badges */}
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono border-t border-white/5 pt-2 bg-white/5 p-1 px-1.5 rounded-lg border border-white/5">
                        <div>
                          <span className="block text-slate-500 text-[8px] uppercase">Sale</span>
                          <span className="text-slate-300 font-semibold">RM{sale.saleAmount}</span>
                        </div>
                        <div>
                          <span className="block text-emerald-400 text-[8px] uppercase">Cash</span>
                          <span className="text-emerald-400 font-semibold">RM{sale.cash}</span>
                        </div>
                        <div>
                          <span className="block text-blue-400 text-[8px] uppercase">Check</span>
                          <span className="text-blue-400 font-semibold">RM{sale.check}</span>
                        </div>
                      </div>

                      {/* Bottom values */}
                      <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-white/5 pt-1.5 px-0.5 font-mono">
                        <div>
                          <span className="text-slate-500 text-[9px] mr-1">Prev:</span>
                          <strong>RM{sale.previousDue}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[9px] mr-1">Next:</span>
                          <strong className="text-emerald-400 font-bold">RM{sale.currentDue}</strong>
                        </div>
                      </div>

                      {sale.remarks && (
                        <div className="text-[10px] leading-relaxed text-slate-500 bg-white/5 rounded px-2.5 py-1.5 italic font-sans font-light border-l-2 border-slate-700">
                          {sale.remarks}
                        </div>
                      )}

                      {/* Salesman detail */}
                      <div className="text-[9px] font-mono text-slate-650 text-slate-550 text-right">
                        Logged by: {sale.salesmanName}
                      </div>

                    </div>
                  );
                })
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
