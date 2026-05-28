/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Area, Customer, AppUser } from "../types";
import { dbService } from "../lib/dbService";
import {
  MapPin,
  Plus,
  Trash2,
  Edit3,
  X,
  AlertCircle,
  Users2,
  Lock
} from "lucide-react";

interface AreaManagementProps {
  currentUser: AppUser;
  areas: Area[];
  customers: Customer[];
  refreshData: () => void;
}

export default function AreaManagement({
  currentUser,
  areas,
  customers,
  refreshData,
}: AreaManagementProps) {
  const isAdmin = currentUser.role === "admin";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Stats: count how many customers are situated in each area
  const areaClientCount = useMemo(() => {
    const map: { [id: string]: number } = {};
    customers.forEach((c) => {
      map[c.areaId] = (map[c.areaId] || 0) + 1;
    });
    return map;
  }, [customers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    if (!name.trim()) {
      setValidationError("Area name identifier is required.");
      return;
    }

    setSubmitting(true);
    setValidationError(null);

    try {
      if (editingId) {
        await dbService.updateArea(editingId, name.trim(), description.trim());
      } else {
        await dbService.addArea(name.trim(), description.trim());
      }

      setIsModalOpen(false);
      resetForm();
      refreshData();
    } catch (err: any) {
      setValidationError("Could not complete area operation. " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (area: Area) => {
    if (!isAdmin) return;
    setEditingId(area.id);
    setName(area.name);
    setDescription(area.description || "");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!isAdmin) return;
    if (areaClientCount[id] > 0) {
      alert(`Cannot delete territory "${name}" because it currently contains ${areaClientCount[id]} registered billing customers. Reassign those customers first!`);
      return;
    }
    if (!confirm(`Are you sure you want to delete sales area "${name}"?`)) return;

    try {
      await dbService.deleteArea(id);
      refreshData();
    } catch (err: any) {
      alert("Error deleting area: " + err.message);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setValidationError(null);
  };

  const openCreateModal = () => {
    if (!isAdmin) return;
    resetForm();
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Area & Territory Settings</h1>
          <p className="text-sm text-slate-400 mt-1 font-light">
            Create and adjust custom geographic territories and salesman routes (unlimited).
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={openCreateModal}
            id="add-area-btn"
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-2 font-semibold text-xs shadow-lg shadow-emerald-950/20 cursor-pointer self-start sm:self-auto transition-all select-none"
          >
            <MapPin className="w-4 h-4" />
            Create Area
          </button>
        ) : (
          <div className="px-3.5 py-1.5 rounded-xl bg-[#161618] border border-white/5 text-slate-500 text-xs font-mono flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" /> Read-Only Settings
          </div>
        )}
      </div>

      {/* Grid: Areas Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {areas.length === 0 ? (
          <div className="col-span-full bg-[#161618] border border-white/5 p-12 text-center text-slate-500 font-mono text-sm rounded-xl">
            No operating areas recorded yet. Create one to register billing accounts.
          </div>
        ) : (
          areas.map((area) => {
            const count = areaClientCount[area.id] || 0;
            return (
              <div
                key={area.id}
                className="bg-[#161618] border border-white/5 hover:border-white/10 rounded-xl p-5 flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                      <MapPin className="w-4.5 h-4.5" />
                    </span>

                    {/* Stats */}
                    <div className="flex items-center gap-1 bg-[#0A0A0B] font-mono text-[10px] text-slate-400 px-2.5 py-1 rounded-md border border-white/5">
                      <Users2 className="w-3 h-3 text-slate-500" />
                      <span>{count} Accounts</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-205 mt-4">{area.name}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed font-light font-sans line-clamp-3">
                    {area.description || "No description provided for this operational sector."}
                  </p>
                </div>

                {isAdmin && (
                  <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-end gap-2.5">
                    <button
                      onClick={() => handleEdit(area)}
                      title="Edit Area"
                      className="p-1 px-2.5 bg-[#0A0A0B] hover:bg-white/5 text-slate-400 hover:text-emerald-400 border border-white/5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(area.id, area.name)}
                      title="Delete Area"
                      className="p-1 px-2.5 bg-[#0A0A0B] hover:bg-rose-950/20 text-slate-500 hover:text-rose-450 border border-white/5 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm bg-[#161618] border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="bg-[#0A0A0B] p-5 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-white font-sans">
                {editingId ? "Modify Sales Area" : "Register Custom Area"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-355 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {validationError && (
                <div className="p-3.5 bg-rose-955/20 border border-rose-900/30 rounded-xl text-rose-300 text-xs flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Area Name */}
              <div className="space-y-1.5 font-sans">
                <label className="block text-[10px] font-mono text-slate-500 uppercase">Operational Territory Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kuala Lumpur Central"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-white transition-all font-sans"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5 font-sans">
                <label className="block text-[10px] font-mono text-slate-500 uppercase">Description / Coverage</label>
                <textarea
                  placeholder="Describe delivery hubs, boundaries, or specific salesmen allocations"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-white transition-all font-sans resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex justify-end gap-3 border-t border-white/5 font-sans">
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
                  className="px-5 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs shadow-lg shadow-emerald-950/20 cursor-pointer disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? "Processing..." : editingId ? "Update Area" : "Establish Area"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
