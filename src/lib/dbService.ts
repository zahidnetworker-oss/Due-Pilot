/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  query,
  where,
  getDocFromServer
} from "firebase/firestore";
import { db, auth, isPlaceholderConfig } from "./firebase";
import { Area, Customer, SalesEntry, AppUser } from "../types";

// Operation Enum for Compliant Errors
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

// Global Custom Error Handler complying with Chapter 3 Rules
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path,
  };
  console.error("Firestore Error Exception: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// PRELOAD SEED DATA FOR DEMO MODE / EMPTY STATES
const defaultAreas: Area[] = [
  { id: "area-kl", name: "Kuala Lumpur Central", description: "Mid Valley, Bukit Bintang and Cheras territories" },
  { id: "area-selangor", name: "Selangor Region", description: "Petaling Jaya, Shah Alam and Puchong operations" },
  { id: "area-penang", name: "Penang Island", description: "George Town, Bayan Lepas and Butterworth outlets" },
  { id: "area-johor", name: "Johor Southern", description: "Johor Bahru and Skudai accounts" },
];

const defaultCustomers: Customer[] = [
  {
    id: "cust-tan",
    name: "Tan Enterprise",
    areaId: "area-kl",
    phone: "+60123456789",
    openingDue: 12000,
    currentDue: 15300,
  },
  {
    id: "cust-ramesh",
    name: "Ramesh Retail Agency",
    areaId: "area-selangor",
    phone: "+60139876543",
    openingDue: 5000,
    currentDue: 5000,
  },
  {
    id: "cust-penang",
    name: "Penang Allied Trade",
    areaId: "area-penang",
    phone: "+60142233445",
    openingDue: 25000,
    currentDue: 18000,
  },
  {
    id: "cust-jb",
    name: "JB Southern Trading",
    areaId: "area-johor",
    phone: "+60156677889",
    openingDue: 3500,
    currentDue: 8200,
  },
];

const defaultSales: SalesEntry[] = [
  {
    id: "sale-1",
    date: "2026-04-10",
    invoiceNo: "INV-2026-001",
    year: "2026",
    customerId: "cust-tan",
    areaId: "area-kl",
    saleAmount: 8500,
    collection: 5200,
    cash: 3000,
    check: 2200,
    previousDue: 12000,
    currentDue: 15300, // 12000 + 8500 - 5200
    remarks: "Direct delivery to Mid Valley branch",
    salesmanId: "demo-sales",
    salesmanName: "Jeffrey Lim",
  },
  {
    id: "sale-2",
    date: "2026-04-15",
    invoiceNo: "INV-2026-002",
    year: "2026",
    customerId: "cust-ramesh",
    areaId: "area-selangor",
    saleAmount: 4000,
    collection: 4000,
    cash: 4000,
    check: 0,
    previousDue: 5000,
    currentDue: 5000, // 5000 + 4000 - 4000
    remarks: "Cash payment received in full",
    salesmanId: "demo-sales",
    salesmanName: "Jeffrey Lim",
  },
  {
    id: "sale-3",
    date: "2026-05-02",
    invoiceNo: "INV-2026-003",
    year: "2026",
    customerId: "cust-penang",
    areaId: "area-penang",
    saleAmount: 12000,
    collection: 19000,
    cash: 9000,
    check: 10000,
    previousDue: 25000,
    currentDue: 18000, // 25000 + 12000 - 19000
    remarks: "Bulk due clearance via Maybank check",
    salesmanId: "demo-admin",
    salesmanName: "Ahmad Fauzi (Admin)",
  },
  {
    id: "sale-4",
    date: "2026-05-18",
    invoiceNo: "INV-2016-004",
    year: "2026",
    customerId: "cust-jb",
    areaId: "area-johor",
    saleAmount: 7200,
    collection: 2500,
    cash: 1500,
    check: 1000,
    previousDue: 3500,
    currentDue: 8200, // 3500 + 7200 - 2500
    remarks: "Transport delivery to Port of Tanjung Pelepas",
    salesmanId: "demo-sales",
    salesmanName: "Jeffrey Lim",
  },
];

// Helper to pre-populate local states
function initializeLocalStorage() {
  const gotAreas = localStorage.getItem("erp_areas");
  const isOldDb = gotAreas && (gotAreas.includes("dhaka") || gotAreas.includes("Dhaka") || gotAreas.includes("sylhet") || gotAreas.includes("ctg"));
  
  if (!gotAreas || isOldDb) {
    localStorage.removeItem("erp_areas");
    localStorage.removeItem("erp_customers");
    localStorage.removeItem("erp_sales");
    localStorage.removeItem("erp_users");
  }

  if (!localStorage.getItem("erp_areas")) {
    localStorage.setItem("erp_areas", JSON.stringify(defaultAreas));
  }
  if (!localStorage.getItem("erp_customers")) {
    localStorage.setItem("erp_customers", JSON.stringify(defaultCustomers));
  }
  if (!localStorage.getItem("erp_sales")) {
    localStorage.setItem("erp_sales", JSON.stringify(defaultSales));
  }
  if (!localStorage.getItem("erp_users") || localStorage.getItem("erp_users")?.includes("zahid.networker@gmail.com")) {
    const defaultUsers: AppUser[] = [
      { id: "demo-admin", email: "admin@duepilot.com", name: "Ahmad Fauzi", role: "admin", status: "active" },
      { id: "demo-sales", email: "salesman@example.com", name: "Jeffrey Lim", role: "salesman", status: "active" }
    ];
    localStorage.setItem("erp_users", JSON.stringify(defaultUsers));
  }
}

// Perform initial local setup
initializeLocalStorage();

export const dbService = {
  // Check Mode
  isFirebaseEnabled(): boolean {
    return !isPlaceholderConfig && db !== null;
  },

  isFirebaseActive(): boolean {
    if (isPlaceholderConfig || db === null) return false;
    
    // Check if Firebase Auth is currently logged in.
    // If we have an active non-demo cached session, we must also guarantee that firebase auth is actually initialized and has a user,
    // otherwise any Firestore call will crash with "Missing or insufficient permissions".
    if (auth && auth.currentUser !== null) return true;
    
    return false;
  },

  // Test client connection (Compliant check as per guidelines)
  async verifyFirebaseConnection(): Promise<boolean> {
    if (!this.isFirebaseEnabled()) return false;
    try {
      await getDocFromServer(doc(db, "test", "connection"));
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes("offline")) {
        console.warn("Client offline mode detected on Firestore connection attempt.");
      }
      return false;
    }
  },

  // ==================== AREA SERVICES ====================

  async getAreas(): Promise<Area[]> {
    if (this.isFirebaseActive()) {
      const colPath = "areas";
      try {
        const snap = await getDocs(collection(db, colPath));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Area);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    } else {
      const cached = localStorage.getItem("erp_areas");
      return cached ? JSON.parse(cached) : [];
    }
  },

  async addArea(name: string, description?: string): Promise<Area> {
    const payload = { name, description: description || "" };
    if (this.isFirebaseActive()) {
      const colPath = "areas";
      try {
        const ref = await addDoc(collection(db, colPath), payload);
        return { id: ref.id, ...payload };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, colPath);
      }
    } else {
      const list = await this.getAreas();
      const newArea: Area = {
        id: "area-" + Date.now().toString(),
        name,
        description,
      };
      list.push(newArea);
      localStorage.setItem("erp_areas", JSON.stringify(list));
      return newArea;
    }
  },

  async updateArea(id: string, name: string, description?: string): Promise<void> {
    const payload = { name, description: description || "" };
    if (this.isFirebaseActive()) {
      const docPath = `areas/${id}`;
      try {
        await updateDoc(doc(db, "areas", id), payload);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, docPath);
      }
    } else {
      const list = await this.getAreas();
      const itemIndex = list.findIndex((x) => x.id === id);
      if (itemIndex > -1) {
        list[itemIndex] = { ...list[itemIndex], ...payload };
        localStorage.setItem("erp_areas", JSON.stringify(list));
      }
    }
  },

  async deleteArea(id: string): Promise<void> {
    if (this.isFirebaseActive()) {
      const docPath = `areas/${id}`;
      try {
        await deleteDoc(doc(db, "areas", id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, docPath);
      }
    } else {
      const list = await this.getAreas();
      const filtered = list.filter((x) => x.id !== id);
      localStorage.setItem("erp_areas", JSON.stringify(filtered));
    }
  },

  // ==================== CUSTOMER SERVICES ====================

  async getCustomers(): Promise<Customer[]> {
    if (this.isFirebaseActive()) {
      const colPath = "customers";
      try {
        const snap = await getDocs(collection(db, colPath));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    } else {
      const cached = localStorage.getItem("erp_customers");
      return cached ? JSON.parse(cached) : [];
    }
  },

  async addCustomer(
    name: string,
    areaId: string,
    phone: string,
    openingDue: number,
    shopName?: string,
    address?: string,
    emailAddress?: string,
    profilePicture?: string
  ): Promise<Customer> {
    const payload = {
      name,
      areaId,
      phone,
      openingDue,
      currentDue: openingDue, // Initial state
      shopName: shopName || "",
      address: address || "",
      emailAddress: emailAddress || "",
      profilePicture: profilePicture || "",
    };
    if (this.isFirebaseActive()) {
      const colPath = "customers";
      try {
        const ref = await addDoc(collection(db, colPath), payload);
        return { id: ref.id, ...payload };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, colPath);
      }
    } else {
      const list = await this.getCustomers();
      const newCustomer: Customer = {
        id: "cust-" + Date.now().toString(),
        ...payload,
      };
      list.push(newCustomer);
      localStorage.setItem("erp_customers", JSON.stringify(list));
      return newCustomer;
    }
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<void> {
    if (this.isFirebaseActive()) {
      const docPath = `customers/${id}`;
      try {
        await updateDoc(doc(db, "customers", id), updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, docPath);
      }
    } else {
      const list = await this.getCustomers();
      const idx = list.findIndex((x) => x.id === id);
      if (idx > -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem("erp_customers", JSON.stringify(list));
      }
    }
  },

  async deleteCustomer(id: string): Promise<void> {
    if (this.isFirebaseActive()) {
      const docPath = `customers/${id}`;
      try {
        await deleteDoc(doc(db, "customers", id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, docPath);
      }
    } else {
      const list = await this.getCustomers();
      const filtered = list.filter((x) => x.id !== id);
      localStorage.setItem("erp_customers", JSON.stringify(filtered));
    }
  },

  // ==================== DAILY SALES & LEGER SERVICES ====================

  async getSales(): Promise<SalesEntry[]> {
    if (this.isFirebaseActive()) {
      const colPath = "sales";
      try {
        const snap = await getDocs(collection(db, colPath));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SalesEntry);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    } else {
      const cached = localStorage.getItem("erp_sales");
      return cached ? JSON.parse(cached) : [];
    }
  },

  async addSalesEntry(entry: Omit<SalesEntry, "id">): Promise<SalesEntry> {
    if (this.isFirebaseActive()) {
      const colPath = "sales";
      try {
        // Prepare doc write details 
        const docRef = await addDoc(collection(db, colPath), entry);
        
        // Relational Transaction Consistency: Synchronously update customer's current balance
        // Formula: Current Due = Previous Due + Sale - Collection
        const customerRef = doc(db, "customers", entry.customerId);
        await updateDoc(customerRef, {
          currentDue: entry.currentDue,
        });

        return { id: docRef.id, ...entry };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, colPath);
      }
    } else {
      const list = await this.getSales();
      const newSale: SalesEntry = {
        id: "sale-" + Date.now().toString(),
        ...entry,
      };
      list.push(newSale);
      localStorage.setItem("erp_sales", JSON.stringify(list));

      // Relational update in LocalStorage
      await this.updateCustomer(entry.customerId, { currentDue: entry.currentDue });

      return newSale;
    }
  },

  async deleteSalesEntry(id: string, customerId: string, balanceAdjustment: number): Promise<void> {
    if (this.isFirebaseActive()) {
      const docPath = `sales/${id}`;
      try {
        // Delete sale
        await deleteDoc(doc(db, "sales", id));
        
        // Re-adjust customer current due: Subtract saleAmount, add back collection
        const customerDoc = doc(db, "customers", customerId);
        // Better yet: we read current user snapshot, subtract balanceAdjustment
        const customers = await this.getCustomers();
        const found = customers.find(c => c.id === customerId);
        if (found) {
          await updateDoc(customerDoc, {
            currentDue: found.currentDue - balanceAdjustment
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, docPath);
      }
    } else {
      const list = await this.getSales();
      const filtered = list.filter((x) => x.id !== id);
      localStorage.setItem("erp_sales", JSON.stringify(filtered));

      // Adjust customer balance
      const customers = await this.getCustomers();
      const found = customers.find(c => c.id === customerId);
      if (found) {
        await this.updateCustomer(customerId, {
          currentDue: found.currentDue - balanceAdjustment
        });
      }
    }
  },

  // ==================== USER CONFIGURATIONS ====================

  async getUsers(): Promise<AppUser[]> {
    if (this.isFirebaseActive()) {
      const colPath = "users";
      try {
        const snap = await getDocs(collection(db, colPath));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppUser);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, colPath);
      }
    } else {
      const cached = localStorage.getItem("erp_users");
      return cached ? JSON.parse(cached) : [];
    }
  },

  async addUser(id: string, email: string, name: string, role: "admin" | "salesman", status: "active" | "inactive"): Promise<AppUser> {
    const payload = { email, name, role, status };
    if (this.isFirebaseActive()) {
      const docPath = `users/${id}`;
      try {
        await setDoc(doc(db, "users", id), payload);
        return { id, ...payload };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, docPath);
      }
    } else {
      const list = await this.getUsers();
      const user: AppUser = { id, ...payload };
      list.push(user);
      localStorage.setItem("erp_users", JSON.stringify(list));
      return user;
    }
  },

  async updateUser(id: string, updates: Partial<Omit<AppUser, "id">>): Promise<void> {
    if (this.isFirebaseActive()) {
      const docPath = `users/${id}`;
      try {
        await updateDoc(doc(db, "users", id), updates);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, docPath);
      }
    } else {
      const list = await this.getUsers();
      const idx = list.findIndex((x) => x.id === id);
      if (idx > -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem("erp_users", JSON.stringify(list));
      }
    }
  },

  async deleteUser(id: string): Promise<void> {
    if (this.isFirebaseActive()) {
      const docPath = `users/${id}`;
      try {
        await deleteDoc(doc(db, "users", id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, docPath);
      }
    } else {
      const list = await this.getUsers();
      const filtered = list.filter((x) => x.id !== id);
      localStorage.setItem("erp_users", JSON.stringify(filtered));
    }
  }
};
