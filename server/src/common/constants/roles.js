// ============================================================
// ROLE CONSTANTS & LABELS (RBAC)
// Flow Construction Procurement & Payment Approval System
// ============================================================

const ROLES = Object.freeze({
  SITE_MANAGER: 'SITE_MANAGER',           // Trưởng thi công
  WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER', // Quản lý kho
  PROCUREMENT: 'PROCUREMENT',             // Thu mua
  CEO: 'CEO',                             // Giám đốc
  CHAIRMAN: 'CHAIRMAN',                   // Chủ tịch
  ACCOUNTANT: 'ACCOUNTANT',               // Kế toán
  TREASURER: 'TREASURER',                 // Thủ quỹ
});

const ROLE_LABELS = Object.freeze({
  [ROLES.SITE_MANAGER]: 'Trưởng thi công',
  [ROLES.WAREHOUSE_MANAGER]: 'Quản lý kho',
  [ROLES.PROCUREMENT]: 'Thu mua',
  [ROLES.CEO]: 'Giám đốc',
  [ROLES.CHAIRMAN]: 'Chủ tịch',
  [ROLES.ACCOUNTANT]: 'Kế toán',
  [ROLES.TREASURER]: 'Thủ quỹ',
});

module.exports = {
  ROLES,
  ROLE_LABELS,
};
