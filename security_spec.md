# Security Specification - Sales ERP Backend

This document specifies the Security Architecture, Data Invariants, and Defensive Rules designed to guard the Sales ERP.

## 1. Data Invariants

- **User Privilege Integrity**: Users cannot change their own roles or status. Only designated administrators can promote/demote accounts.
- **Reference Integrity**: A `Customer` must reference a valid `Area`. A `SalesEntry` must reference both a valid `Customer` and the customer's matching `Area`.
- **Identity Matching**: The `salesmanId` in a `SalesEntry` must match the authenticated user's Firebase UID.
- **Timestamp Veracity**: Audit timestamps must remain immutable after creation, using server-authoritative context.
- **Transaction immutability**: Once entered, sales entries cannot be changed or deleted by standard Salesmen. They are editable only by the Admin to correct historical logging errors.

## 2. The "Dirty Dozen" Threat Payloads (Blocked)

Below are twelve malicious payloads tested and rejected by our Firestore Security Rules:

1. **Privilege Escalation**: Salesman attempts to register with `role: "admin"`.
2. **Ghost User Injection**: Unsigned user attempts to write to the `users/{uid}` path.
3. **Impersonated Author**: Salesman A attempts to log a transaction under `salesmanId: "salesmanB_uid"`.
4. **Orphaned Customer**: Admin attempts to create a customer referencing `areaId: "nonexistent_area_id"`.
5. **Orphaned Sale**: Salesman attempts to record a sale referencing `customerId: "nonexistent_customer_id"`.
6. **Bypassing Fields (Vandals)**: Salesman attempts to update `phone` or `openingDue` on a customer.
7. **Bypassing Fields (Negative Dues)**: Salesman attempts to set a negative `saleAmount` or negative dues.
8. **Shadow Field Injection**: User attempts to inject a `ghostField` inside `areas` to test for Map-key leakage.
9. **Faux Admin Claim**: Authenticated user attempts to modify their role field inside `/users/userId`.
10. **ID Poisoning**: User tries to create an Area with a `1.5KB` long string ID containing special terminal command chars.
11. **Historical Erasure**: Salesman attempts to call `delete()` on a past invoice or sales ticket.
12. **Blanket Query Scraping**: Signed-in anonymous visitor tries to perform a list query on all customers without a specific salesperson assignment or context.
