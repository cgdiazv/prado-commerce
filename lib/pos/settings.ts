import {
  POS_ACCESS_MODULES,
  type PosAccessModule,
  type PosRole,
  type PosStoreSettings,
} from "@/types/dashboard";

const POS_ROLES: PosRole[] = ["MANAGER", "SUPERVISOR", "CASHIER"];

export function resolvePosRoleModules(rawModules: unknown): NonNullable<PosStoreSettings["roleModules"]> {
  if (!rawModules || typeof rawModules !== "object" || Array.isArray(rawModules)) {
    return {};
  }

  const source = rawModules as Record<string, unknown>;
  const roleModules: NonNullable<PosStoreSettings["roleModules"]> = {};

  for (const role of POS_ROLES) {
    const modules = source[role];
    if (!Array.isArray(modules)) continue;

    roleModules[role] = modules.filter(
      (module): module is PosAccessModule =>
        typeof module === "string" &&
        (POS_ACCESS_MODULES as readonly string[]).includes(module)
    );
  }

  return roleModules;
}

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
    roleModules: {},
    requireCashierPin: false,
    defaultTerminalId: "reg-1",
    allowCustomCashierName: true,
    allowManualDiscounts: true,
    receiptFooterText: "Thank you for shopping with us! Please retain this ticket.",
    holdDurationMinutes: 60,
    cardFeeEnabled: false,
    cardFeePercentage: 0,
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
    roleModules: resolvePosRoleModules(existing.roleModules),
    requireCashierPin: existing.requireCashierPin ?? defaults.requireCashierPin,
    defaultTerminalId: existing.defaultTerminalId ?? defaults.defaultTerminalId,
    receiptFooterText: existing.receiptFooterText ?? defaults.receiptFooterText,
    allowManualDiscounts: existing.allowManualDiscounts ?? defaults.allowManualDiscounts,
    allowCustomCashierName: existing.allowCustomCashierName ?? defaults.allowCustomCashierName,
    allowZeroInventorySales: existing.allowZeroInventorySales === true,
    defaultTaxRate: existing.defaultTaxRate !== undefined ? existing.defaultTaxRate : null,
    holdDurationMinutes: existing.holdDurationMinutes !== undefined ? existing.holdDurationMinutes : defaults.holdDurationMinutes,
    cardFeeEnabled: existing.cardFeeEnabled !== undefined ? existing.cardFeeEnabled : defaults.cardFeeEnabled,
    cardFeePercentage: existing.cardFeePercentage !== undefined ? existing.cardFeePercentage : defaults.cardFeePercentage,
  };
}
