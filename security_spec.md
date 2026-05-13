# Security Specification - Hemingways Jomtien

## Data Invariants
1. A **MenuItem** must belong to a valid category.
2. A **FinanceEntry** must link to a valid `FinanceCategory`.
3. **PayrollSummary** must reference a valid `Employee`.
4. Users cannot change their own `role` or `uid`.
5. Only admins can modify Finance, Payroll, and Employee data.
6. Menu items are public for reading, but restricted for writing.

## The Dirty Dozen Payloads

1. **Identity Spoofing (MenuItem)**: Creating a menu item with a `uid` that doesn't match the authenticated user.
2. **Privilege Escalation (User)**: A non-admin user trying to update their own `role` to `admin`.
3. **Ghost Field Injection (Category)**: Adding an `isSelected: true` field to a category document to bypass UI logic.
4. **ID Poisoning (Settings)**: Using a 1MB string as a `settingId`.
5. **Orphaned Finance Entry**: Creating a `FinanceEntry` with a non-existent `categoryId`.
6. **Immutable Field Tampering (Employee)**: Updating the `createdAt` timestamp on an existing employee record.
7. **Terminal State Bypass (Payroll)**: Updating a `PayrollSummary` after its status is set to `paid`.
8. **PII Leak (User)**: A non-admin user trying to read the full profile of another user.
9. **Resource Exhaustion (Menu)**: Sending a `MenuItem` with a 2MB `description`.
10. **Unverified Write**: Writing to the database with an unverified email (if strict verification is required).
11. **Relational Sync Failure**: Deleting an `Employee` while `PayrollSummary` records still point to them (handled by app logic usually, but rules can block if relational integrity is enforced).
12. **Query Scraper**: Attempting to list all users without providing a filter, hoping the rules delegate to the client.

## Test Strategy
The `firestore.rules.test.ts` will verify these payloads are rejected.
