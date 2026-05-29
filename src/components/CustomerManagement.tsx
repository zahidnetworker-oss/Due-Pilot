/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from "react";
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
  AlertCircle,
  MessageSquare,
  Store,
  Mail,
  Camera,
  Upload,
  User,
  ExternalLink,
  CheckCircle2
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
  const currencySymbol = localStorage.getItem("duepilot_currency") || "RM";

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Custom states matching requested customer forms
  const [name, setName] = useState("");
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [areaId, setAreaId] = useState("");
  const [openingDue, setOpeningDue] = useState("0");
  const [profilePicture, setProfilePicture] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  // Webcam states inside modal
  const [cameraActive, setCameraActive] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
        (c.shopName && c.shopName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
      setValidationError("Customer full name is required.");
      return;
    }
    if (!areaId) {
      setValidationError("Please select an active operational area/route.");
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
        const existing = customers.find((c) => c.id === editingId);
        const diffInOpening = parsedOpeningDue - (existing?.openingDue || 0);
        const nextCurrentDue = (existing?.currentDue || 0) + diffInOpening;

        await dbService.updateCustomer(editingId, {
          name: name.trim(),
          areaId,
          phone: phone.trim(),
          openingDue: parsedOpeningDue,
          currentDue: nextCurrentDue,
          shopName: shopName.trim(),
          address: address.trim(),
          emailAddress: emailAddress.trim(),
          profilePicture: profilePicture
        });
      } else {
        await dbService.addCustomer(
          name.trim(),
          areaId,
          phone.trim(),
          parsedOpeningDue,
          shopName.trim(),
          address.trim(),
          emailAddress.trim(),
          profilePicture
        );
      }

      setIsModalOpen(false);
      stopCamera();
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
    setShopName(cust.shopName || "");
    setAddress(cust.address || "");
    setPhone(cust.phone);
    setEmailAddress(cust.emailAddress || "");
    setAreaId(cust.areaId);
    setOpeningDue(cust.openingDue.toString());
    setProfilePicture(cust.profilePicture || "");
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
    setShopName("");
    setAddress("");
    setPhone("");
    setEmailAddress("");
    setAreaId(areas[0]?.id || "");
    setOpeningDue("0");
    setProfilePicture("");
    setValidationError(null);
    stopCamera();
  };

  const openCreateModal = () => {
    if (!isAdmin) return;
    resetForm();
    setIsModalOpen(true);
  };

  // WEBCAM PORTAL FUNCTIONS
  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300 } });
      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setValidationError("Failed initializing webcam: verify permissions.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
    }
    setVideoStream(null);
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 160, 160);
      const base64 = canvas.toDataURL("image/jpeg", 0.85);
      setProfilePicture(base64);
    }
    stopCamera();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setProfilePicture(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // AUTOMATED WHATSAPP MESSAGE COMPILES
  const sendWhatsAppMessage = (cust: Customer) => {
    const savedProfile = localStorage.getItem("duepilot_profile_settings");
    let creatorName = currentUser.name;
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed.name) creatorName = parsed.name;
      } catch (_) {}
    }

    const bold = (txt: string) => `*${txt}*`;
    const message = `Dear ${bold(cust.name)},\n\nHope you are doing well. This is ${bold(creatorName)} from ${bold("Sales ERP")}.\n\nYour shop ${bold(cust.shopName || "account")} has currently an outstanding credit balance liability of ${bold(`${currencySymbol} ${cust.currentDue.toLocaleString()}`)}.\n\nWe kindly request you to perform payment or settle this balance at your earliest convenience. Thank you or feel free to contact us for concerns!\n\nBest Regards,\nSales ERP SaaS`;

    const encoded = encodeURIComponent(message);
    const cleanPhone = cust.phone.replace(/[^0-9]/g, ""); // strip formatting
    const wsUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
    window.open(wsUrl, "_blank");
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Customer Portfolios</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-light">
            Manage store owners, profile snaps, addresses, WhatsApp request links, and liabilities.
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={openCreateModal}
            id="add-customer-btn"
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-2 font-semibold text-xs shadow-lg shadow-emerald-950/20 cursor-pointer self-start sm:self-auto transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Add Customer Profile
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
            placeholder="Search customer name, shop store, address, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-slate-200 transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Area Filter */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="w-full md:w-56 h-10 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs px-3 text-slate-200 outline-none cursor-pointer"
          >
            <option value="" className="bg-[#161618]">All Areas & Routes</option>
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
                <th className="py-3 px-5">Customer Owner</th>
                <th className="py-3 px-5">Shop Entity Details</th>
                <th className="py-3 px-5">Route Area</th>
                <th className="py-3 px-5">Contact Details</th>
                <th className="py-3 px-5 text-right w-28">Opening Due</th>
                <th className="py-3 px-5 text-right w-28">Current Due</th>
                <th className="py-3 px-5 text-center">Alert / Ping</th>
                {isAdmin && <th className="py-3 px-5 text-center w-36">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="py-12 text-center text-slate-500 font-mono">
                    No matching customer ledger details verified.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const areaName = areaMap[cust.areaId] || "Unassigned";
                  const dueAlert = cust.currentDue > 10000;

                  return (
                    <tr key={cust.id} className="hover:bg-white/5 transition-colors">
                      
                      {/* Avatar Profile Picture Column */}
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-[#0D0D0D] border border-white/10 shrink-0 flex items-center justify-center">
                            {cust.profilePicture ? (
                              <img src={cust.profilePicture} alt={cust.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-slate-400 uppercase font-mono">
                                {cust.name.substring(0, 2)}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-205 text-slate-200">{cust.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {cust.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Shop details */}
                      <td className="py-3 px-5">
                        <div className="space-y-0.5 max-w-[180px]">
                          <div className="text-slate-300 font-medium flex items-center gap-1.5 truncate">
                            <Store className="w-3.5 h-3.5 text-[#FFD700] shrink-0" />
                            <span>{cust.shopName || "Unnamed Store"}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate" title={cust.address}>
                            {cust.address || "No address log"}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-5">
                        <span className="inline-flex items-center gap-1 text-slate-305 font-mono">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {areaName}
                        </span>
                      </td>

                      {/* Contact column */}
                      <td className="py-3 px-5">
                        <div className="space-y-0.5">
                          <div className="text-slate-300 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#3b82f6]" />
                            <span>{cust.phone}</span>
                          </div>
                          {cust.emailAddress && (
                            <div className="text-[10px] text-slate-550 font-mono text-slate-500 flex items-center gap-1 truncate max-w-[140px]">
                              <Mail className="w-3 h-3 text-slate-600" />
                              <span>{cust.emailAddress}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-5 text-right font-mono text-slate-400">
                        {currencySymbol}{cust.openingDue.toLocaleString()}
                      </td>

                      <td className="py-3 px-5 text-right font-mono font-bold">
                        <span className={dueAlert ? "text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/10" : "text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10"}>
                          {currencySymbol}{cust.currentDue.toLocaleString()}
                        </span>
                      </td>

                      {/* Status Ping WhatsApp trigger */}
                      <td className="py-3 px-5 text-center">
                        <button
                          onClick={() => sendWhatsAppMessage(cust)}
                          className="h-7 px-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-lg inline-flex items-center gap-1.5 font-bold text-[10px] transition-all cursor-pointer"
                          title="Send direct WhatsApp Payment ping"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                          <span>WhatsApp Ping</span>
                        </button>
                      </td>

                      {isAdmin && (
                        <td className="py-3 px-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(cust)}
                              title="Edit Ledger Portfolio"
                              className="p-1 px-2.5 bg-[#0A0A0B] hover:bg-white/5 text-slate-400 hover:text-emerald-400 border border-white/5 rounded-lg transition-all cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(cust.id, cust.name)}
                              title="Delete Portfolio"
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
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-[#161618] border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col my-8">
            
            {/* Header */}
            <div className="bg-[#0A0A0B] p-5 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-white">
                {editingId ? "Edit Customer Record Statement" : "Register Store Portfolio"}
              </h2>
              <button
                onClick={() => { setIsModalOpen(false); stopCamera(); }}
                className="p-1 text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {validationError && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/15 rounded-xl text-rose-400 text-xs flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* SECTION: Snapshot Capture */}
              <div className="bg-[#0A0A0B] p-3.5 border border-white/5 rounded-xl space-y-3.5 flex flex-col sm:flex-row items-center gap-4">
                
                <div className="relative w-20 h-20 rounded-full overflow-hidden bg-[#161618] border border-white/10 shrink-0 flex items-center justify-center">
                  {profilePicture ? (
                    <img src={profilePicture} alt="Preview Snap" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-600" />
                  )}

                  {cameraActive && (
                    <div className="absolute inset-0 bg-black">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover rounded-full" />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 flex-1 w-full text-center sm:text-left">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Customer Profile Snap</span>
                  
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {cameraActive ? (
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-2.5 h-7 bg-[#FFD700] hover:bg-[#FFD700]/80 text-black rounded text-[10px] font-bold"
                      >
                        Snap Customer Picture
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-2.5 h-7 bg-[#161618] border border-white/10 hover:border-emerald-500/30 text-slate-300 rounded text-[10px] font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#FFD700]" /> Use Laptop Camera
                      </button>
                    )}

                    <label className="px-2.5 h-7 bg-[#161618] border border-white/10 hover:border-emerald-500/30 text-slate-300 rounded text-[10px] font-medium cursor-pointer flex items-center justify-center">
                      <Upload className="w-3.5 h-3.5 text-emerald-400 mr-1.5" /> Upload Image File
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>

                    {profilePicture && (
                      <button
                        type="button"
                        onClick={() => setProfilePicture("")}
                        className="px-2 h-7 bg-rose-500/10 hover:bg-rose-500/20 text-rose-455 text-rose-400 border border-rose-500/10 rounded text-[10px] font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Customer Owner Name & Shop Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase">Customer Owner Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Al-Amin Traders"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-emerald-555 focus:border-emerald-500 rounded-lg text-xs outline-none text-white transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase">Shop Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Al-Amin Grocery Store"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-white transition-all"
                  />
                </div>
              </div>

              {/* Area select / Route */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-slate-500 uppercase">Sales Route Territory</label>
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

              {/* Physical Address */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-slate-500 uppercase">Shop / Delivery Address</label>
                <textarea
                  placeholder="e.g. Plot-12, Sector-3, Mid Valley Central, Kuala Lumpur"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full min-h-16 p-3 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-white transition-all resize-none"
                />
              </div>

              {/* Phone & Email Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase">WhatsApp Mobile Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +601XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-white transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. owner@example.com"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-emerald-500 rounded-lg text-xs outline-none text-white transition-all font-mono"
                  />
                </div>
              </div>

              {/* Opening Due */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono text-slate-500 uppercase">Opening Balance Due ({currencySymbol})</label>
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
                  onClick={() => { setIsModalOpen(false); stopCamera(); }}
                  className="px-4 h-10 border border-white/10 hover:bg-white/5 rounded-xl text-xs text-slate-400 font-medium transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4.5 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs shadow-lg shadow-emerald-950/20 cursor-pointer disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? "Processing..." : editingId ? "Update Portfolio" : "Register Store Portfolio"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
