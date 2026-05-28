/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Area, Customer, AppUser } from "../types";
import { dbService } from "../lib/dbService";
import {
  Plus,
  Search,
  Filter,
  UserPlus,
  Trash2,
  Edit3,
  Phone,
  MapPin,
  Lock,
  X,
  UserCheck,
  AlertCircle
} from "lucide-react";

interface CustomerManagementProps {
  currentUser: AppUser;
  areas: Area[];
  customers: Customer[];
  refreshData: () => void;
}

export default function CustomerManagement({
  currentUser,
  areas,
  customers,
  refreshData,
}: CustomerManagementProps) {
  const isAdmin = currentUser.role === "admin";

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [areaId, setAreaId] = useState("");
  const [phone, setPhone] = useState("");
  const [openingDue, setOpeningDue] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  const areaMap = useMemo(() => {
    const map: { [id: string]: string } = {};
    areas.forEach((a) => {
      map[a.id] = a.name;
    });
    return map;
  }, [areas]);

  // Filtering list
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm);
      const matchArea = areaFilter === "" || c.areaId === areaFilter;
      return matchSearch && matchArea;
    });
  }, [customers, searchTerm, areaFilter]);

  // Save or Update Customer
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (!name.trim()) {
      setValidationError("Customer display name is required.");
      return;
    }
    if (!areaId) {
      setValidationError("Please select an active operational area.");
      return;
    }
    if (!phone.trim()) {
      setValidationError("Contact phone number is required.");
      return;
    }

    setSubmitting(true);
    setValidationError(null);

    try {
      const parsedOpeningDue = parseFloat(openingDue) || 0;

      if (editingId) {
        // Find existing to preserve differences in currentDue calculations if openings stayed equal
        const existing = customers.find((c) => c.id === editingId);
        const diffInOpening = parsedOpeningDue - (existing?.openingDue || 0);
        const nextCurrentDue = (existing?.currentDue || 0) + diffInOpening;

        await dbService.updateCustomer(editingId, {
          name: name.trim(),
          areaId,
          phone: phone.trim(),
          openingDue: parsedOpeningDue,
          currentDue: nextCurrentDue,
        });
      } else {
        await dbService.addCustomer(name.trim(), areaId, phone.trim(), parsedOpeningDue);
      }

      setIsModalOpen(false);
      resetForm();
      refreshData();
    } catch (err: any) {
      setValidationError("Operation failed. " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (cust: Customer) => {
    if (!isAdmin) return;
    setEditingId(cust.id);
    setName(cust.name);
    setAreaId(cust.areaId);
    setPhone(cust.phone);
    setOpeningDue(cust.openingDue.toString());
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, customerName: string) => {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to permanently delete customer "${customerName}" page? This might leave corresponding sales entries orphaned.`)) return;

    try {
      await dbService.deleteCustomer(id);
      refreshData();
    } catch (err: any) {
      alert("Error deleting customer: " + err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setAreaId(areas[0]?.id || "");
    setPhone("");
    setOpeningDue("0");
    setValidationError(null);
  };

  const openCreateModal = () => {
    if (!isAdmin) return;
    resetForm();
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Customer Accounts</h1>
          <p className="text-sm text-slate-400 mt-1 font-light">
            Manage billing profiles, phone indexes, territories, and balances.
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={openCreateModal}
            id="add-customer-btn"
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-2 font-semibold text-xs shadow-lg shadow-emerald-950/20 cursor-pointer self-start sm:self-auto transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Add Customer
          </button>
        ) : (
          <div className="px-3.5 py-1.5 rounded-xl bg-[#161618] border border-white/5 text-slate-500 text-xs font-mono flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" /> List Read-Only
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#161618] border border-white/5 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
        
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search customer name or mobile number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-slate-205 text-slate-200 transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Area Filter */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="w-full md:w-56 h-10 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs px-3 text-slate-305 text-slate-200 outline-none cursor-pointer"
          >
            <option value="" className="bg-[#161618]">All Operational Areas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id} className="bg-[#161618]">
                {a.name}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Customers Table List */}
      <div className="bg-[#161618] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0A0A0B] border-b border-white/5 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">Customer info</th>
                <th className="py-3 px-5">Territory Area</th>
                <th className="py-3 px-5">Contact Phone</th>
                <th className="py-3 px-5 text-right">Opening Dues</th>
                <th className="py-3 px-5 text-right">Current Dues</th>
                <th className="py-3 px-5 text-center">Status Index</th>
                {isAdmin && <th className="py-3 px-5 text-center w-28">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-slate-500 font-mono">
                    No customers found matched filter attributes.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const areaName = areaMap[cust.areaId] || "Unassigned";
                  const dueAlert = cust.currentDue > 10000;

                  return (
                    <tr key={cust.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-slate-205 text-slate-200">{cust.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {cust.id}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {areaName}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center gap-1 text-slate-400 font-mono">
                          <Phone className="w-3 h-3 text-slate-600" />
                          {cust.phone}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-[#94a3b8] text-slate-400">
                        RM{cust.openingDue.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono font-bold">
                        <span className={dueAlert ? "text-rose-450 bg-rose-950/20 px-2 py-0.5 rounded border border-rose-909/35" : "text-emerald-400 text-slate-300"}>
                          RM{cust.currentDue.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#0A0A0B] text-emerald-400 border border-white/5">
                          Active Account
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-5 text-center">
                          <div className="flex items-center justify-center gap-2.5">
                            <button
                              onClick={() => handleEdit(cust)}
                              title="Edit Details"
                              className="p-1 px-2.5 bg-[#0A0A0B] hover:bg-white/5 text-slate-400 hover:text-emerald-400 border border-white/5 rounded-lg transition-all cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(cust.id, cust.name)}
                              title="Delete Record"
                              className="p-1 px-2.5 bg-[#0A0A0B] hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 border border-white/5 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Modal Drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-[#161618] border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="bg-[#0A0A0B] p-5 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-white">
                {editingId ? "Edit Customer Record" : "Add New Customer"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-355 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1">
              {validationError && (
                <div className="p-3.5 bg-rose-955/20 border border-rose-900/30 rounded-xl text-rose-300 text-xs flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Customer Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-slate-500 uppercase">Customer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Al-Amin Traders"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-white transition-all"
                />
              </div>

              {/* Area select */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-slate-500 uppercase">Sales Area / Route</label>
                <select
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className="w-full h-10 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs px-3 text-slate-300 outline-none cursor-pointer"
                >
                  <option value="" disabled className="bg-[#161618]">Select geographic area...</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id} className="bg-[#161618]">
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-slate-500 uppercase">Mobile Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +601XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-white transition-all font-mono"
                />
              </div>

              {/* Opening Due */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-slate-500 uppercase">Opening Due Balance (RM)</label>
                <input
                  type="number"
                  placeholder="0"
                  disabled={editingId !== null} // Opening due setup is immutable after create to defend ledger integrity
                  value={openingDue}
                  onChange={(e) => setOpeningDue(e.target.value)}
                  className="w-full h-10 px-3 bg-[#0A0A0B] disabled:bg-[#0A0A0B]/40 disabled:text-slate-600 border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-white transition-all font-mono"
                />
                {editingId !== null && (
                  <span className="text-[10px] text-slate-500 block leading-normal mt-0.5">
                    * Opening due setup is locked. To modify historic dues, enter a corrections ledger ticket or update with Admin privs.
                  </span>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex justify-end gap-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 h-10 border border-white/10 hover:bg-white/5 rounded-xl text-xs text-slate-400 font-medium transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4.5 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs shadow-lg shadow-emerald-950/20 cursor-pointer disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? "Processing..." : editingId ? "Update Ledger" : "Register Customer"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
