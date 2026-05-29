/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AppUser } from "../types";
// @ts-ignore
import logoImg from "../assets/images/duepilot_logo_1779993143506.png";
import {
  LayoutDashboard,
  PlusCircle,
  Users2,
  MapPin,
  FileSpreadsheet,
  BookOpen,
  LogOut,
  ShieldAlert,
  Menu,
  Settings,
  X
} from "lucide-react";

interface SidebarProps {
  currentUser: AppUser;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export default function Sidebar({
  currentUser,
  activeTab,
  setActiveTab,
  onLogout,
  isMobileOpen,
  setIsMobileOpen,
}: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "sales-entry", label: "Daily Sales Entry", icon: PlusCircle },
    { id: "customers", label: "Customer List", icon: Users2 },
    { id: "areas", label: "Area Settings", icon: MapPin },
    { id: "ledger", label: "Customer Ledger", icon: BookOpen },
    { id: "reports", label: "Monthly Reports", icon: FileSpreadsheet },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileOpen(false); // Auto-close drawer on mobile selection
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#111113] border-r border-white/5 text-slate-100 p-5 select-none">
      
      {/* Brand Label */}
      <div className="flex items-center gap-3 mb-8 pb-5 border-b border-[#FFD700]/10">
        <img
          src={logoImg}
          alt="DuePilot CRM Logo"
          className="w-11 h-11 rounded-full object-cover border-2 border-[#FFD700]/30 shadow-[0_0_12px_rgba(255,215,0,0.15)] bg-[#0D0D0D] transition-transform hover:scale-105 duration-300"
          referrerPolicy="no-referrer"
        />
        <div>
          <h2 className="font-bold text-sm tracking-tight text-white flex items-center gap-1">
            <span className="text-slate-300">Sales</span>
            <span className="text-[#FFD700]">ERP</span>
          </h2>
          <span className="text-[9px] font-mono text-[#FFD700] uppercase tracking-wider block mt-0.5">SaaS Suite</span>
        </div>
      </div>

      {/* User Information */}
      <div className="mb-8 p-3 rounded-xl bg-[#161618] border border-white/5 flex items-center gap-3.5">
        <div className="w-8 h-8 rounded-full bg-[#0A0A0B] border border-white/10 flex items-center justify-center font-semibold text-xs text-emerald-400 uppercase">
          {currentUser.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-200 truncate">{currentUser.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${currentUser.role === 'admin' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
            <span className="text-[9px] font-mono text-slate-400 capitalize bg-[#0A0A0B] px-1.5 py-0.5 rounded border border-white/5">
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Options */}
      <nav className="flex-1 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full h-10 px-3.5 rounded-lg flex items-center gap-3 transition-all cursor-pointer font-medium text-xs ${
                isActive
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* System Admin Notice or Logout Button */}
      <div className="mt-auto pt-5 border-t border-white/5 space-y-4">
        {currentUser.role === "salesman" && (
          <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-[10px] text-emerald-400 font-mono leading-relaxed flex gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span>Employee View</span>
              <p className="text-slate-500 mt-0.5 font-light font-sans">Certain database registers are in read-only lock bounds.</p>
            </div>
          </div>
        )}

        <button
          onClick={onLogout}
          id="logout-nav-btn"
          className="w-full h-10 px-3.5 bg-[#161618] hover:bg-red-950/20 border border-white/10 hover:border-red-900/40 rounded-lg text-slate-400 hover:text-red-300 font-medium text-xs flex items-center gap-3 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit ERP Session</span>
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* Drawer Overlay for Mobile Screen Sizes */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar for Desktop Screen Viewports */}
      <aside className="hidden lg:block w-64 h-screen shrink-0 sticky top-0 z-30 print:hidden">
        {navContent}
      </aside>

      {/* Sidebar for Mobile Drawer Sliding Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 h-full z-50 transform lg:hidden transition-transform duration-300 ease-out print:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
