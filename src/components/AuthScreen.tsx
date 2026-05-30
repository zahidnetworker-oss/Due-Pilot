/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { auth, googleProvider, signInWithPopup, isPlaceholderConfig } from "../lib/firebase";
// @ts-ignore
import logoImg from "../assets/images/duepilot_logo_1779993143506.png";
import { dbService } from "../lib/dbService";
import { AppUser } from "../types";
import { Shield, User, Globe, AlertCircle, Sparkles } from "lucide-react";

interface AuthScreenProps {
  onLoginSuccess: (user: AppUser) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isFirebaseMode = !isPlaceholderConfig;

  // Sign in as Demo Account (No Setup required)
  const handleDemoLogin = async (role: "admin" | "salesman") => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Find the corresponding user in local db
      const users = await dbService.getUsers();
      let selected = users.find((u) => u.role === role);
      if (!selected) {
        // Fallback fallback
        selected = {
          id: role === "admin" ? "demo-admin" : "demo-sales",
          email: role === "admin" ? "admin@duepilot.com" : "salesman@example.com",
          name: role === "admin" ? "Ahmad Fauzi (Admin)" : "Jeffrey Lim (Salesman)",
          role,
          status: "active",
        };
      }
      onLoginSuccess(selected);
    } catch (err: any) {
      setErrorMsg("Failed to initialize demo session. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth flow for production Firebase
  const handleGoogleLogin = async () => {
    if (!isFirebaseMode || !auth) {
      setErrorMsg("Cloud Sync is not fully configured yet. Please use the Demo login bypass.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const gUser = result.user;
      if (!gUser) throw new Error("No user profile returned from Google Auth.");

      const userEmail = gUser.email || "";
      
      // Load permitted emails list
      let allowed = ["admin@duepilot.com", "salesman@example.com"];
      try {
        const saved = localStorage.getItem("duepilot_permitted_users");
        if (saved) {
          allowed = JSON.parse(saved);
        }
      } catch (_) {}

      // Query registered user list
      const users = await dbService.getUsers();

      let matchedUser = users.find((u) => u.email.toLowerCase() === userEmail.toLowerCase());

      if (!matchedUser) {
        // Automatically assign new signups with 'admin' privileges as requested. Logged-in admins can update roles in Settings afterwards.
        matchedUser = await dbService.addUser(
          gUser.uid,
          userEmail,
          gUser.displayName || "Unknown User",
          "admin",
          "active"
        );
      }

      if (matchedUser.status === "inactive") {
        throw new Error("Your profile is marked as 'inactive'. Contact administrative staff to restore access.");
      }

      onLoginSuccess(matchedUser);
    } catch (err: any) {
      console.error(err);
      let errorText = err.message || "Unknown error during Google Authentication.";
      if (err.message?.includes("auth/popup-blocked")) {
        errorText = "Sign-in popup blocked by the browser. Please allow popups or open in a new tab.";
      }
      setErrorMsg(errorText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-black font-sans relative overflow-hidden">
      
      {/* Dynamic Ambient Background Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-950/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-900/10 rounded-full blur-3xl -z-10 animate-pulse duration-5000"></div>

      <div className="w-full max-w-md bg-[#161618] border border-white/5 rounded-2xl p-8 shadow-2xl flex flex-col relative">
        
        {/* Banner Indicating Mode */}
        <div className="flex items-center gap-2 justify-center mb-6 self-center">
          {isFirebaseMode ? (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-semibold bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.12)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>ENTERPRISE CLOUD SYNC LIVE</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#0A0A0B] text-emerald-400 border border-white/5">
              <Sparkles className="w-3.5 h-3.5" /> Local Demo Sandbox Mode
            </span>
          )}
        </div>

        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <img
            src={logoImg}
            alt="Sales ERP Logo"
            className="w-28 h-28 mb-5 rounded-full object-cover shadow-[0_0_24px_rgba(255,215,0,0.25)] border-2 border-[#FFD700]/40 bg-[#0D0D0D] transition-transform hover:rotate-6 duration-500"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-3xl font-sans tracking-tight font-extrabold text-white flex items-center justify-center gap-1">
            <span className="text-slate-300">Sales</span>
            <span className="text-[#FFD700]">ERP</span>
          </h1>
          <p className="text-[#FFD700] text-[10px] font-mono uppercase tracking-widest mt-1.5 font-semibold">
            Take Control of Every Collection
          </p>
          <p className="text-slate-400 text-xs mt-3 font-light max-w-sm">
            Premium Accounts Bookkeeping, Debt Automation & ERP Ledger Management
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-955/20 border border-rose-900/30 text-rose-300 text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-450 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Authentication Issue</span>
              {errorMsg}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="space-y-4 flex flex-col">
          
          {/* Real Google OAuth Button (Visible when Firebase is active) */}
          {isFirebaseMode && (
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              id="google-login-btn"
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 transition-all font-semibold text-sm text-white rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/10 cursor-pointer disabled:cursor-not-allowed select-none"
            >
              <Globe className="w-4 h-4" />
              {loading ? "Authorizing..." : "Log In with Google"}
            </button>
          )}

          {/* Separation indicator if both options might show */}
          {isFirebaseMode && (
            <div className="flex items-center my-2">
              <div className="flex-1 h-px bg-white/5"></div>
              <span className="px-3 text-[10px] font-mono text-slate-500 uppercase tracking-wider">or bypass with demo</span>
              <div className="flex-1 h-px bg-white/5"></div>
            </div>
          )}

          {/* Quick-Access Dev Bypass */}
          <div className="grid grid-cols-2 gap-3.5">
            <button
              onClick={() => handleDemoLogin("admin")}
              disabled={loading}
              id="demo-admin-login"
              className="h-28 bg-[#0A0A0B] hover:bg-white/5 transition-all duration-200 border border-white/5 rounded-xl p-4 flex flex-col justify-between items-start text-left cursor-pointer group"
            >
              <div className="p-2 bg-rose-500/10 rounded-lg group-hover:bg-rose-500/20 text-rose-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-mono text-rose-455 font-medium">Role: Admin</span>
                <span className="block text-slate-300 font-medium text-xs mt-0.5">Ahmad Fauzi</span>
              </div>
            </button>

            <button
              onClick={() => handleDemoLogin("salesman")}
              disabled={loading}
              id="demo-salesman-login"
              className="h-28 bg-[#0A0A0B] hover:bg-white/5 transition-all duration-200 border border-white/5 rounded-xl p-4 flex flex-col justify-between items-start text-left cursor-pointer group"
            >
              <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 text-emerald-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-xs font-mono text-emerald-400 font-medium">Role: Staff</span>
                <span className="block text-slate-300 font-medium text-xs mt-0.5">Jeffrey Lim</span>
              </div>
            </button>
          </div>
          
        </div>

        {/* Instructions Footer */}
        <div className="mt-8 pt-6 border-t border-white/5 text-center text-[11px] text-slate-500 font-mono">
          {!isFirebaseMode ? (
            <p className="leading-snug font-light">
              To wire real live cloud databases & Google Auth logins, accept the project terms in your AI Studio dashboard framework wrapper.
            </p>
          ) : (
            <p className="font-light">
              Managed accounts role privileges can be altered inside the ERP Admin Console.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
