/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AppUser, Area, Customer, SalesEntry } from "./types";
import { dbService } from "./lib/dbService";
import { auth, signOut } from "./lib/firebase";

// Components
import AuthScreen from "./components/AuthScreen";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import CustomerManagement from "./components/CustomerManagement";
import AreaManagement from "./components/AreaManagement";
import DailySalesView from "./components/DailySalesView";
import MonthlyReportView from "./components/MonthlyReportView";
import CustomerLedgerView from "./components/CustomerLedgerView";

import {
  Menu,
  Globe,
  Database,
  Calendar,
  Sparkles,
  RefreshCw,
  Bell,
  Lock,
  UserCheck
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Core Data States
  const [areas, setAreas] = useState<Area[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<SalesEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync mode notifications
  const [isFirebaseLinked, setIsFirebaseLinked] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // 1. Initial State Auto-Sync Load
  useEffect(() => {
    // Check if user session has existing local authorization token persistence
    const cachedUser = localStorage.getItem("erp_session_user");
    let userParsed: AppUser | null = null;
    if (cachedUser) {
      try {
        userParsed = JSON.parse(cachedUser);
      } catch (err) {
        console.warn("Invalid cached session payload discarded.", err);
      }
    }

    // Verify raw Firebase client link state
    const linkStatus = dbService.isFirebaseEnabled();
    setIsFirebaseLinked(linkStatus);

    if (linkStatus && auth) {
      const unsubscribe = auth.onAuthStateChanged((fbUser: any) => {
        if (fbUser) {
          if (userParsed && !userParsed.id.startsWith("demo-")) {
            setCurrentUser(userParsed);
          } else {
            // Firebase has logged in user but local store is missing or demo, clear and let user login
            setCurrentUser(null);
          }
        } else {
          // No active Firebase login. Fall back to demo if cached user is demo
          if (userParsed && userParsed.id.startsWith("demo-")) {
            setCurrentUser(userParsed);
          } else {
            setCurrentUser(null);
            localStorage.removeItem("erp_session_user");
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Offline/sandbox local bypass mode only
      if (userParsed) {
        setCurrentUser(userParsed);
      }
      setLoading(false);
    }
  }, []);

  // 2. Load operational records when user signs in
  useEffect(() => {
    if (currentUser) {
      fetchERPDatabase();
    }
  }, [currentUser]);

  const fetchERPDatabase = async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      // Pull fields asynchronously in parallel
      const [allAreas, allCustomers, allSales] = await Promise.all([
        dbService.getAreas(),
        dbService.getCustomers(),
        dbService.getSales(),
      ]);

      setAreas(allAreas);
      setCustomers(allCustomers);
      setSales(allSales);
    } catch (err: any) {
      console.error(err);
      setErrorBanner("Critical Error Syncing ERP Database: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (user: AppUser) => {
    setCurrentUser(user);
    localStorage.setItem("erp_session_user", JSON.stringify(user));
  };

  const handleLogout = async () => {
    if (dbService.isFirebaseEnabled() && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn("Firebase sign out failed", err);
      }
    }
    setCurrentUser(null);
    localStorage.removeItem("erp_session_user");
  };

  // Render sub views based on router selected tabs
  const renderActiveView = () => {
    if (loading) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center py-24 font-sans space-y-4">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
          <p className="text-sm font-mono text-slate-500">Retrieving operational registers...</p>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return <DashboardView areas={areas} customers={customers} sales={sales} />;
      case "sales-entry":
        return (
          <DailySalesView
            currentUser={currentUser!}
            areas={areas}
            customers={customers}
            sales={sales}
            refreshData={fetchERPDatabase}
          />
        );
      case "customers":
        return (
          <CustomerManagement
            currentUser={currentUser!}
            areas={areas}
            customers={customers}
            refreshData={fetchERPDatabase}
          />
        );
      case "areas":
        return (
          <AreaManagement
            currentUser={currentUser!}
            areas={areas}
            customers={customers}
            refreshData={fetchERPDatabase}
          />
        );
      case "ledger":
        return <CustomerLedgerView areas={areas} customers={customers} sales={sales} />;
      case "reports":
        return <MonthlyReportView areas={areas} customers={customers} sales={sales} />;
      default:
        return <DashboardView areas={areas} customers={customers} sales={sales} />;
    }
  };

  // If unauthenticated, divert to authenticating screen
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 font-sans flex selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Sidebar Panel Navigation */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Panel Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Navigation bar (Print Hidden) */}
        <header className="flex h-16 shrink-0 items-center justify-between px-6 bg-[#111113] border-b border-white/5 sticky top-0 z-20 print:hidden select-none">
          
          <div className="flex items-center gap-3">
            {/* Hamburger for mobile drawer */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-1 px-2.5 bg-[#161618] border border-white/10 rounded-lg text-slate-400 hover:text-slate-100 lg:hidden cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* System Status Display Indicator */}
            <div className="hidden sm:flex items-center gap-2">
              {isFirebaseLinked ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono rounded-full font-medium">
                  <Globe className="w-3.5 h-3.5 animate-pulse" />
                  <span>Cloud Synced</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono rounded-full font-medium">
                  <Database className="w-3.5 h-3.5" />
                  <span>Offline Sandboxing</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Date Tag */}
            <div className="hidden md:flex items-center gap-1.5 text-slate-400 text-xs font-mono">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{new Date().toISOString().slice(0, 10)} (Server Time)</span>
            </div>

            {/* Manual refresh button */}
            <button
              onClick={fetchERPDatabase}
              className="p-2 bg-[#161618] border border-white/10 hover:bg-slate-805 hover:bg-white/5 rounded-xl text-slate-400 hover:text-slate-100 transition-all cursor-pointer"
              title="Reload ledger tables"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

        </header>

        {/* Global Warnings Panel Banners */}
        {errorBanner && (
          <div className="m-6 p-4 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-xs flex gap-2.5 print:hidden">
            <Lock className="w-4.5 h-4.5 shrink-0 text-red-400 mt-0.5" />
            <span>{errorBanner}</span>
          </div>
        )}

        {/* Dynamic Context Frame View */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto print:p-0 print:m-0 print:max-w-none">
          {renderActiveView()}
        </main>

      </div>
    </div>
  );
}
