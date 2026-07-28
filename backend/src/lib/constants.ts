export const RoleCode = {
  ADMIN: 'ADMIN',
  DIRECTOR: 'DIRECTOR',
  MANAGER: 'MANAGER',
  PRODUCTION: 'PRODUCTION',
  WAREHOUSE: 'WAREHOUSE',
  DRIVER: 'DRIVER',
  ACCOUNTANT: 'ACCOUNTANT',
} as const;

export type RoleCode = (typeof RoleCode)[keyof typeof RoleCode];

export const ShiftType = {
  DAY: 'DAY',
  NIGHT: 'NIGHT',
} as const;

export type ShiftType = (typeof ShiftType)[keyof typeof ShiftType];

export const SalaryCalcType = {
  PER_BLOCK: 'PER_BLOCK',
  FIXED: 'FIXED',
} as const;

export type SalaryCalcType = (typeof SalaryCalcType)[keyof typeof SalaryCalcType];

export const StockMovementType = {
  PRODUCTION: 'PRODUCTION',
  SALE: 'SALE',
  ADJUSTMENT: 'ADJUSTMENT',
  RETURN: 'RETURN',
} as const;

export type StockMovementType = (typeof StockMovementType)[keyof typeof StockMovementType];
