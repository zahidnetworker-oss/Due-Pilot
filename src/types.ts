/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "admin" | "salesman";
export type UserStatus = "active" | "inactive";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
}

export interface Area {
  id: string; // Document ID
  name: string;
  description?: string;
}

export interface Customer {
  id: string; // Document ID
  name: string;
  areaId: string; // References Area.id
  phone: string;
  openingDue: number; // Opening ledger balance due
  currentDue: number; // Automatically tracked balance
}

export interface SalesEntry {
  id: string; // Document ID
  date: string; // YYYY-MM-DD
  invoiceNo: string; // Manually editable
  year: string; // Year of transaction
  customerId: string; // References Customer.id
  areaId: string; // Auto-detected from customer's areaId
  saleAmount: number;
  collection: number; // cash + check
  cash: number;
  check: number;
  previousDue: number; // Previous customer due state
  currentDue: number; // Calculated: previousDue + saleAmount - collection
  remarks?: string;
  salesmanId: string; // UID of user completing entry
  salesmanName: string; // Name of logged-in user at transaction time
}

export interface DashboardStats {
  totalSale: number;
  totalCollection: number;
  totalDue: number;
  cashCollection: number;
  checkCollection: number;
  areaWiseDue: { [areaId: string]: { areaName: string; count: number; totalDue: number } };
  monthlyTrend: { [monthStr: string]: { month: string; sale: number; collection: number } };
}
