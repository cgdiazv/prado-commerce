import type { PosStoreSettings } from "@/types/dashboard";

export function getDefaultPosSettings(user?: { name?: string | null; email?: string | null }): PosStoreSettings {
  const now = new Date().toISOString();
  return {
    terminals: [
      {
        id: "reg-1",
        name: "Register 01 - Main",
        code: "REG-01",
        location: "Front Counter",
        receiptPrefix: "T1-",
        status: "ACTIVE",
        notes: "Primary checkout terminal",
        createdAt: now,
      },
      {
        id: "reg-2",
        name: "Register 02 - Counter",
        code: "REG-02",
        location: "Side Counter",
        receiptPrefix: "T2-",
        status: "ACTIVE",
        notes: "Secondary lane",
        createdAt: now,
      },
      {
        id: "reg-3",
        name: "Register 03 - Express",
        code: "REG-03",
        location: "Express Lane",
        receiptPrefix: "EXP-",
        status: "ACTIVE",
        notes: "Quick basket checkout",
        createdAt: now,
      },
      {
        id: "reg-4",
        name: "Register 04 - Kiosk",
        code: "REG-04",
        location: "Customer Kiosk / Tablet",
        receiptPrefix: "KSK-",
        status: "ACTIVE",
        notes: "Self-service mobile terminal",
        createdAt: now,
      },
    ],
    cashiers: [
      {
        id: "csh-1",
        name: user?.name || "Main Cashier",
        email: user?.email || null,
        phone: null,
        pin: "1234",
        role: "MANAGER",
        status: "ACTIVE",
        assignedTerminalId: "reg-1",
        createdAt: now,
      },
      {
        id: "csh-2",
        name: "Evening Cashier",
        email: null,
        phone: null,
        pin: "0000",
        role: "CASHIER",
        status: "ACTIVE",
        assignedTerminalId: null,
        createdAt: now,
      },
    ],
    requireCashierPin: false,
    defaultTerminalId: "reg-1",
    allowCustomCashierName: true,
    allowManualDiscounts: true,
    receiptFooterText: "Thank you for shopping with us! Please retain this ticket.",
  };
}

export function resolvePosSettings(
  rawSettings: unknown,
  user?: { name?: string | null; email?: string | null }
): PosStoreSettings {
  const defaults = getDefaultPosSettings(user);
  const existing = (rawSettings && typeof rawSettings === "object" ? rawSettings : null) as PosStoreSettings | null;

  if (!existing) {
    return defaults;
  }

  return {
    terminals: Array.isArray(existing.terminals) && existing.terminals.length > 0 ? existing.terminals : defaults.terminals,
    cashiers: Array.isArray(existing.cashiers) && existing.cashiers.length > 0 ? existing.cashiers : defaults.cashiers,
    requireCashierPin: existing.requireCashierPin ?? defaults.requireCashierPin,
    defaultTerminalId: existing.defaultTerminalId ?? defaults.defaultTerminalId,
    receiptFooterText: existing.receiptFooterText ?? defaults.receiptFooterText,
    allowManualDiscounts: existing.allowManualDiscounts ?? defaults.allowManualDiscounts,
    allowCustomCashierName: existing.allowCustomCashierName ?? defaults.allowCustomCashierName,
    defaultTaxRate: existing.defaultTaxRate !== undefined ? existing.defaultTaxRate : null,
  };
}
