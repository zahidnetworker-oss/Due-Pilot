/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AppUser } from "../types";
import { dbService } from "../lib/dbService";
import {
  Save,
  Shield,
  Database,
  CloudLightning,
  Download,
  Upload,
  User,
  Target,
  Mail,
  UserCheck,
  Plus,
  Trash2,
  Camera,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Check
} from "lucide-react";
import { doc, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";

interface SettingsViewProps {
  currentUser: AppUser;
  refreshData: () => void;
}

interface BackupHistoryItem {
  id: string;
  timestamp: string;
  createdBy: string;
  recordCount: {
    areas: number;
    customers: number;
    sales: number;
  };
}

export default function SettingsView({ currentUser, refreshData }: SettingsViewProps) {
  const isAdmin = currentUser.role === "admin";

  // Form states for profile
  const [profileName, setProfileName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [useCustomProfile, setUseCustomProfile] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState(() => localStorage.getItem("duepilot_currency") || "RM");

  // Form states for monthly target
  const [salesTarget, setSalesTarget] = useState("30000");
  const [collectionTarget, setCollectionTarget] = useState("25000");
  const [lastMonthSalesTarget, setLastMonthSalesTarget] = useState("28000");
  const [lastMonthSalesActual, setLastMonthSalesActual] = useState("26500");

  // Form states for adding accounts
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");

  // Cloud Backups List
  const [cloudBackups, setCloudBackups] = useState<BackupHistoryItem[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  // UI feedback States
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  // Process settings load
  useEffect(() => {
    // 1. Load localized profile settings
    const savedProfile = localStorage.getItem("duepilot_profile_settings");
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setProfileName(parsed.name || currentUser.name);
        setProfilePhoto(parsed.photo || "");
        setUseCustomProfile(true);
      } catch (_) {}
    } else {
      setProfileName(currentUser.name);
    }

    // 2. Load Target Metrics settings
    const savedTargets = localStorage.getItem("duepilot_targets");
    if (savedTargets) {
      try {
        const parsed = JSON.parse(savedTargets);
        setSalesTarget(parsed.salesTarget || "30000");
        setCollectionTarget(parsed.collectionTarget || "25000");
        setLastMonthSalesTarget(parsed.lastMonthSalesTarget || "28000");
        setLastMonthSalesActual(parsed.lastMonthSalesActual || "26500");
      } catch (_) {}
    }

    // 3. Load permitted accounts listing
    const savedPermitted = localStorage.getItem("duepilot_permitted_users");
    const adminEmail = currentUser.email || "admin@example.com";
    if (savedPermitted) {
      try {
        let parsed = JSON.parse(savedPermitted) as string[];
        parsed = parsed.map(e => e === "zahid.networker@gmail.com" ? adminEmail : e);
        if (!parsed.includes(adminEmail)) {
          parsed.unshift(adminEmail);
        }
        const unique = Array.from(new Set(parsed));
        setAllowedEmails(unique);
      } catch (_) {}
    } else {
      const initialAllowed = [
        adminEmail,
        "salesman@example.com",
        "admin@duepilot.com"
      ];
      setAllowedEmails(initialAllowed);
      localStorage.setItem("duepilot_permitted_users", JSON.stringify(initialAllowed));
    }

    // Load active cloud backups if available
    fetchCloudBackups();
  }, [currentUser]);

  // Handle Fetch Cloud Backups registered
  const fetchCloudBackups = async () => {
    if (!dbService.isFirebaseActive()) return;
    setLoadingBackups(true);
    try {
      const q = query(collection(db, "backups"), orderBy("timestamp", "desc"), limit(10));
      const snap = await getDocs(q);
      const items: BackupHistoryItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          timestamp: data.timestamp || new Date().toISOString(),
          createdBy: data.createdBy || "System Manager",
          recordCount: data.recordCount || { areas: 0, customers: 0, sales: 0 }
        };
      });
      setCloudBackups(items);
    } catch (err) {
      console.warn("Failed retrieving backups index: ", err);
    } finally {
      setLoadingBackups(false);
    }
  };

  // Profile Save handler
  const handleSaveProfile = () => {
    const profileObj = {
      name: profileName.trim() || currentUser.name,
      photo: profilePhoto
    };
    localStorage.setItem("duepilot_profile_settings", JSON.stringify(profileObj));
    
    // Also sync the login session user name for invoice consistency
    const sessionUser = localStorage.getItem("erp_session_user");
    if (sessionUser) {
      try {
        const userObj = JSON.parse(sessionUser);
        userObj.name = profileObj.name;
        localStorage.setItem("erp_session_user", JSON.stringify(userObj));
        // Force refresh current user
        window.location.reload();
      } catch (_) {}
    }

    triggerSuccess();
  };

  // Save targets tracker metrics
  const handleSaveTargets = () => {
    const targetObj = {
      salesTarget: parseFloat(salesTarget) || 0,
      collectionTarget: parseFloat(collectionTarget) || 0,
      lastMonthSalesTarget: parseFloat(lastMonthSalesTarget) || 0,
      lastMonthSalesActual: parseFloat(lastMonthSalesActual) || 0
    };
    localStorage.setItem("duepilot_targets", JSON.stringify(targetObj));
    triggerSuccess();
  };

  // Add permitted emails list
  const handleAddEmail = () => {
    if (!newEmail.trim()) return;
    if (!newEmail.includes("@")) {
      setErrorText("Please use a genuine valid email.");
      return;
    }
    const normalized = newEmail.trim().toLowerCase();
    if (allowedEmails.includes(normalized)) {
      setErrorText("Email already holds access authorization.");
      return;
    }
    const updated = [...allowedEmails, normalized];
    setAllowedEmails(updated);
    localStorage.setItem("duepilot_permitted_users", JSON.stringify(updated));
    setNewEmail("");
    triggerSuccess();
  };

  // Remove email permission
  const handleRemoveEmail = (val: string) => {
    if (val === currentUser.email) {
      setErrorText("Owner email domain can't be truncated.");
      return;
    }
    const updated = allowedEmails.filter((e) => e !== val);
    setAllowedEmails(updated);
    localStorage.setItem("duepilot_permitted_users", JSON.stringify(updated));
    triggerSuccess();
  };

  const triggerSuccess = () => {
    setSaveSuccess(true);
    setErrorText(null);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // CAMERA PROFILE CAPTURING FUNCTIONS
  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 300, height: 300 } });
      setVideoStream(stream);
      const videoElement = document.getElementById("profileWebcam") as HTMLVideoElement;
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    } catch (err) {
      setErrorText("Error initialising camera: " + (err instanceof Error ? err.message : String(err)));
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
    const videoElement = document.getElementById("profileWebcam") as HTMLVideoElement;
    if (!videoElement) return;

    const canvas = document.createElement("canvas");
    canvas.width = 180;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoElement, 0, 0, 180, 180);
      const base64 = canvas.toDataURL("image/jpeg", 0.85);
      setProfilePhoto(base64);
    }
    stopCamera();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setProfilePhoto(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // BACKUP OPERATIONS
  const downloadBackupJSON = () => {
    const areas = localStorage.getItem("erp_areas") || "[]";
    const customers = localStorage.getItem("erp_customers") || "[]";
    const sales = localStorage.getItem("erp_sales") || "[]";
    const userSettings = localStorage.getItem("duepilot_profile_settings") || "{}";
    const targets = localStorage.getItem("duepilot_targets") || "{}";

    const payload = {
      app: "Sales ERP SaaS",
      version: "v1.2.0",
      backedUpAt: new Date().toISOString(),
      backedUpBy: profileName || currentUser.name,
      data: {
        areas: JSON.parse(areas),
        customers: JSON.parse(customers),
        sales: JSON.parse(sales),
        userSettings: JSON.parse(userSettings),
        targets: JSON.parse(targets)
      }
    };

    const str = JSON.stringify(payload, null, 2);
    const blob = new Blob([str], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SalesERPSaaS_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerSuccess();
  };

  // RESTORE FROM LOCAL FILE
  const handleRestoreBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const payload = JSON.parse(event.target?.result as string);
        if (payload.app !== "DuePilot ERP" && payload.app !== "Sales ERP SaaS" || !payload.data) {
          setErrorText("Invalid backup schema. App identifier must be 'Sales ERP SaaS' or 'DuePilot ERP'.");
          return;
        }

        const dataObj = payload.data;
        if (dataObj.areas) localStorage.setItem("erp_areas", JSON.stringify(dataObj.areas));
        if (dataObj.customers) localStorage.setItem("erp_customers", JSON.stringify(dataObj.customers));
        if (dataObj.sales) localStorage.setItem("erp_sales", JSON.stringify(dataObj.sales));
        if (dataObj.userSettings) localStorage.setItem("duepilot_profile_settings", JSON.stringify(dataObj.userSettings));
        if (dataObj.targets) localStorage.setItem("duepilot_targets", JSON.stringify(dataObj.targets));

        triggerSuccess();
        alert("Backup files restored successfully! The app will now reload.");
        window.location.reload();
      } catch (err) {
        setErrorText("Failed to parse JSON backup: " + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsText(file);
  };

  // CLOUD BACKUP TO FIRESTORE
  const triggerCloudBackup = async () => {
    setLoadingBackups(true);
    setErrorText(null);
    try {
      const areas = JSON.parse(localStorage.getItem("erp_areas") || "[]");
      const customers = JSON.parse(localStorage.getItem("erp_customers") || "[]");
      const sales = JSON.parse(localStorage.getItem("erp_sales") || "[]");
      const userSettings = JSON.parse(localStorage.getItem("duepilot_profile_settings") || "{}");
      const targets = JSON.parse(localStorage.getItem("duepilot_targets") || "{}");

      const payload = {
        app: "Sales ERP SaaS",
        version: "v1.2.0",
        timestamp: new Date().toISOString(),
        createdBy: profileName || currentUser.name,
        recordCount: {
          areas: areas.length,
          customers: customers.length,
          sales: sales.length
        },
        data: {
          areas,
          customers,
          sales,
          userSettings,
          targets
        }
      };

      if (dbService.isFirebaseActive()) {
        await addDoc(collection(db, "backups"), payload);
        triggerSuccess();
        fetchCloudBackups();
        alert("Premium cloud backup safely stored on secured Google Firestore database!");
      } else {
        setErrorText("Firestore offline sandbox is loaded. For secure automatic clouds, log in to Google Account.");
      }
    } catch (err) {
      setErrorText("Cloud upload rejected: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoadingBackups(false);
    }
  };

  // CLOUD RESTORE
  const handleCloudRestore = async (backupId: string) => {
    if (!confirm("Are you sure you want to restore this cloud backup? All current local customer modifications, opening dues, and transactions will be overwritten by this snapshot.")) {
      return;
    }

    setLoadingBackups(true);
    setErrorText(null);
    try {
      const snap = await getDoc(doc(db, "backups", backupId));
      if (snap.exists()) {
        const payload = snap.data();
        const dataObj = payload.data;
        
        if (dataObj.areas) localStorage.setItem("erp_areas", JSON.stringify(dataObj.areas));
        if (dataObj.customers) localStorage.setItem("erp_customers", JSON.stringify(dataObj.customers));
        if (dataObj.sales) localStorage.setItem("erp_sales", JSON.stringify(dataObj.sales));
        if (dataObj.userSettings) localStorage.setItem("duepilot_profile_settings", JSON.stringify(dataObj.userSettings));
        if (dataObj.targets) localStorage.setItem("duepilot_targets", JSON.stringify(dataObj.targets));

        alert(`Recovered snapshot from ${new Date(payload.timestamp).toLocaleString()} successfully. System reloading...`);
        window.location.reload();
      } else {
        setErrorText("Backup document not found on Google servers.");
      }
    } catch (err) {
      setErrorText("Failed to retrieve restore document: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoadingBackups(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      
      {/* Settings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#FFD700]" />
            <span>ERP Settings Panel</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-light">
            Configure target sales tracker, back up database, write user profiles, and give mages to employees.
          </p>
        </div>

        {saveSuccess && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium flex items-center gap-1.5 animate-pulse">
            <Check className="w-4 h-4" />
            <span>Success: Options Saved</span>
          </div>
        )}

        {errorText && (
          <div className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/20 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            <span>{errorText}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Profile & Target (Comp 1 & 2) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Box 1: Profile Customizing */}
          <div className="bg-[#161618] border border-white/5 rounded-xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 pb-3 border-b border-white/5">
              <User className="w-4 h-4 text-[#FFD700]" /> USER ACCOUNT SIGNATURE
            </h3>

            <div className="flex flex-col sm:flex-row gap-6">
              
              {/* Picture view */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-28 h-28 rounded-full overflow-hidden bg-[#0D0D0D] border-2 border-[#FFD700]/30 shadow-inner flex items-center justify-center">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Preview Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-slate-600 font-mono uppercase">{profileName.charAt(0) || "U"}</span>
                  )}

                  {cameraActive && (
                    <div className="absolute inset-0 bg-black flex items-center justify-center">
                      <video id="profileWebcam" autoPlay playsInline className="w-full h-full object-cover rounded-full" />
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {cameraActive ? (
                    <button
                      onClick={capturePhoto}
                      className="px-2.5 py-1 bg-[#FFD700] hover:bg-[#FFD700]/80 text-black rounded text-[10px] font-bold"
                    >
                      Capture Photo
                    </button>
                  ) : (
                    <button
                      onClick={startCamera}
                      className="px-2.5 py-1 bg-[#1A1A1C] border border-white/10 hover:border-[#FFD700]/30 text-slate-300 rounded text-[10px] font-medium flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3 text-[#FFD700]" /> Use Webcam
                    </button>
                  )}

                  <label className="px-2.5 py-1 bg-[#1A1A1C] border border-white/10 hover:border-emerald-500/30 text-slate-300 rounded text-[10px] font-medium cursor-pointer flex items-center">
                    Upload File
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Name fields */}
              <div className="flex-1 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">My Profile Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-[#FFD700] rounded-lg text-xs outline-none text-white transition-all"
                    placeholder="e.g. Zahid Hasan"
                  />
                  <p className="text-[10px] text-slate-500 font-light">
                    * This name will print as the creator metadata tag on reports: <strong className="text-slate-300">Created By {profileName || "Anonymous"}</strong>.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveProfile}
                    className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center gap-2 font-semibold text-xs transition-colors self-start cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" /> Apply Account Settings
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Box 1.5: Currency customisation */}
          <div className="bg-[#161618] border border-white/5 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 pb-3 border-b border-white/5">
              <Sparkles className="w-4 h-4 text-[#FFD700]" /> GLOBAL CURRENCY PREFERENCE
            </h3>
            <p className="text-xs text-slate-400 font-light leading-relaxed">
              Select your active trading coin or currency symbol. This preference will instantly update all KPIs, daily records, ledger statement Sheets, and PDF printouts across the entire app.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Select Active Currency</label>
                <select
                  value={currencySymbol}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCurrencySymbol(next);
                    localStorage.setItem("duepilot_currency", next);
                    triggerSuccess();
                    // Force refresh to update overall app state
                    setTimeout(() => {
                      window.location.reload();
                    }, 500);
                  }}
                  className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-[#FFD700] rounded-lg text-xs outline-none text-white transition-all font-mono"
                >
                  <option value="RM">RM - Malaysian Ringgit (Default)</option>
                  <option value="৳">৳ - Bangladeshi Taka (BDT)</option>
                  <option value="৳ ">৳ (Space) - Bangladeshi Taka</option>
                  <option value="$">$ - US Dollar (USD)</option>
                  <option value="€">€ - Euro (EUR)</option>
                  <option value="£">£ - British Pound (GBP)</option>
                  <option value="¥">¥ - Japanese Yen / Chinese Yuan</option>
                  <option value="₹">₹ - Indian Rupee (INR)</option>
                  <option value="S$">S$ - Singapore Dollar (SGD)</option>
                  <option value="A$">A$ - Australian Dollar (AUD)</option>
                  <option value="AED">AED - United Arab Emirates Dirham</option>
                  <option value="SAR">SAR - Saudi Riyal</option>
                  <option value="Rp">Rp - Indonesian Rupiah</option>
                  <option value="฿">฿ - Thai Baht</option>
                  <option value="₱">₱ - Philippine Peso</option>
                  <option value="kr">kr - Swedish/Norwegian/Danish Krone</option>
                  <option value="CHF">CHF - Swiss Franc</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                </select>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Current: <strong className="text-emerald-400">{currencySymbol}</strong> (Active Symbol)
              </div>
            </div>
          </div>

          {/* Box 2: Target settings */}
          <div className="bg-[#161618] border border-white/5 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 pb-3 border-b border-white/5">
              <Target className="w-4 h-4 text-[#FFD700]" /> MONTHLY TARGET CALCULATOR
            </h3>

            <p className="text-xs text-slate-400 font-light leading-relaxed">
              Define your monthly collection and sales goals. These numbers populate target indicators on the main Dashboard so you can examine percentage metrics.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Current Month Sales ({currencySymbol})</label>
                <input
                  type="number"
                  value={salesTarget}
                  onChange={(e) => setSalesTarget(e.target.value)}
                  className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-[#FFD700] rounded-lg text-xs outline-none text-white transition-all font-mono"
                  placeholder="30000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Current Month Collection ({currencySymbol})</label>
                <input
                  type="number"
                  value={collectionTarget}
                  onChange={(e) => setCollectionTarget(e.target.value)}
                  className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-[#FFD700] rounded-lg text-xs outline-none text-white transition-all font-mono"
                  placeholder="25000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Last Month Sales Target ({currencySymbol})</label>
                <input
                  type="number"
                  value={lastMonthSalesTarget}
                  onChange={(e) => setLastMonthSalesTarget(e.target.value)}
                  className="w-full h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-[#FFD700] rounded-lg text-xs outline-none text-white transition-all font-mono"
                  placeholder="28000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-500 uppercase">Last Month Sales Actual ({currencySymbol})</label>
                <input
                  type="number"
                  value={lastMonthSalesActual}
                  onChange={(e) => setLastMonthSalesActual(e.target.value)}
                  className="w-full h-15 h-10 px-3 bg-[#0A0A0B] border border-white/10 focus:border-[#FFD700] rounded-lg text-xs outline-none text-white transition-all font-mono"
                  placeholder="26500"
                />
              </div>

            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveTargets}
                className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center gap-2 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> Save Target Parameters
              </button>
            </div>
          </div>

          {/* Box 3: Access control (Yahoo/Google authorized list) */}
          <div className="bg-[#161618] border border-white/5 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 pb-3 border-b border-white/5">
              <Shield className="w-4 h-4 text-[#FFD700]" /> COLLABORATIVE USER PERMISSIONS
            </h3>
            <p className="text-xs text-slate-400 font-light leading-relaxed">
              Grant permissions to other Google or Yahoo mail accounts. They can authenticate securely to log sales or print ledgers without password configurations.
            </p>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. employee@yahoo.com"
                  className="w-full h-10 pl-9 pr-4 bg-[#0A0A0B] border border-white/10 focus:border-[#FFD700] rounded-lg text-xs outline-none text-white transition-all"
                />
              </div>
              <button
                onClick={handleAddEmail}
                className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 px-4 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Grant Access
              </button>
            </div>

            {/* List of granted emails */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase block">Permitted Gmail & Yahoo Accounts</span>
              <div className="divide-y divide-white/5 bg-[#0D0D0D] border border-white/5 rounded-lg overflow-hidden">
                {allowedEmails.map((email) => (
                  <div key={email} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-350">{email}</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-400 font-mono">
                        Allowed Auth
                      </span>
                      {email !== currentUser.email && (
                        <button
                          onClick={() => handleRemoveEmail(email)}
                          className="p-1 hover:bg-rose-950/20 rounded text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Database Backups & Recovery */}
        <div className="lg:col-span-5 space-y-8">
          
          <div className="bg-[#161618] border border-white/5 rounded-xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-[#FFD700] flex items-center gap-2 pb-3 border-b border-[#FFD700]/10">
              <Database className="w-4 h-4" /> RECOVERY & FILE BACKUPS
            </h3>

            <p className="text-xs text-slate-400 font-light leading-relaxed">
              If local files gets cleared, standard recovery keys prevent losing track of transactions. Keep dynamic downloads or store automatic cloud states.
            </p>

            {/* Local Backup Forms */}
            <div className="space-y-4">
              <div className="p-4 bg-[#0A0A0B] border border-white/5 rounded-xl space-y-3.5">
                <span className="text-xs font-semibold text-white block">Offline File Download Backup</span>
                
                <button
                  onClick={downloadBackupJSON}
                  className="w-full h-10 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/15 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download Statement Backup (.json)
                </button>

                <div className="relative">
                  <label className="w-full h-10 bg-[#161618] hover:bg-white/5 border border-white/10 rounded-lg flex items-center justify-center gap-2 text-xs font-bold text-slate-300 transition-all cursor-pointer">
                    <Upload className="w-4 h-4 text-emerald-500" /> Upload Statement Backup (.json)
                    <input type="file" accept=".json" onChange={handleRestoreBackupFile} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Cloud Backup (Firestore sync) */}
              <div className="p-4 bg-[#0A0A0B] border border-white/5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Automated Cloud Save</span>
                  <CloudLightning className="w-4.5 h-4.5 text-[#FFD700]" />
                </div>
                
                <p className="text-[10px] text-slate-500 font-light">
                  Direct state uploads to centralized cloud database with owner's identity validation. Perfect for restoring from crashes.
                </p>

                <button
                  onClick={triggerCloudBackup}
                  disabled={loadingBackups}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center gap-2 text-xs font-bold shadow-lg shadow-emerald-950/20 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {loadingBackups ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4" />
                  )}
                  <span>Store State in Cloud (Safe)</span>
                </button>

                {/* List of active Google backups */}
                <div className="pt-2 space-y-2">
                  <span className="text-[9px] font-mono text-slate-500 uppercase flex items-center justify-between">
                    <span>Cloud Backups Catalogue</span>
                    <button onClick={fetchCloudBackups} className="hover:text-emerald-400">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </span>

                  {cloudBackups.length === 0 ? (
                    <div className="text-[10px] font-mono text-slate-600 italic py-3 text-center bg-[#131315] rounded">
                      No cloud recovery states recorded.
                    </div>
                  ) : (
                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 divide-y divide-white/5">
                      {cloudBackups.map((bc) => (
                        <div key={bc.id} className="pt-2 text-[10px] flex items-center justify-between">
                          <div>
                            <div className="text-slate-350 font-mono font-semibold">
                              {new Date(bc.timestamp).toLocaleDateString()} at {new Date(bc.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            <div className="text-slate-500 mt-0.5">
                              Rows: {bc.recordCount.customers} Cust • {bc.recordCount.sales} Sale • by {bc.createdBy}
                            </div>
                          </div>
                          <button
                            onClick={() => handleCloudRestore(bc.id)}
                            className="bg-emerald-600/10 hover:bg-emerald-600/35 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold text-emerald-400 transition-colors cursor-pointer"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
