// ============================================================
// CONSTANTS & ENUMS
// Construction Procurement & Payment Approval System
// ============================================================

/**
 * Vai trò người dùng trong hệ thống (RBAC)
 */
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

/**
 * Trạng thái Yêu cầu Cấp vật tư Kho (MaterialRequest)
 */
const MATERIAL_REQUEST_STATUS = Object.freeze({
  PENDING_WAREHOUSE: 'PENDING_WAREHOUSE',                 // Chờ Quản lý kho kiểm tra tồn kho
  WAITING_SITE_CONFIRMATION: 'WAITING_SITE_CONFIRMATION', // Đã xuất kho một phần hoặc toàn bộ, chờ công trường nhận
  FULFILLED_BY_STOCK: 'FULFILLED_BY_STOCK',               // Đã cấp đủ 100% từ kho và công trường đã xác nhận
  FORWARDED_TO_CEO: 'FORWARDED_TO_CEO',                   // Kho thiếu hàng, đã tự động chuyển CEO duyệt mua
  REJECTED: 'REJECTED',                                   // Từ chối cấp
});

/**
 * Trạng thái Yêu cầu Mua sắm (PurchaseRequest)
 */
const PURCHASE_REQUEST_STATUS = Object.freeze({
  DRAFT: 'DRAFT',                               // Nháp - Trưởng thi công đang soạn
  PENDING_CEO_APPROVAL: 'PENDING_CEO_APPROVAL', // Chờ CEO duyệt
  APPROVED_BY_CEO: 'APPROVED_BY_CEO',           // CEO đã duyệt
  REJECTED_BY_CEO: 'REJECTED_BY_CEO',           // CEO từ chối
  REJECTED: 'REJECTED',                         // Bị từ chối
});

/**
 * Trạng thái Khảo sát NCC (VendorComparison / VendorQuote)
 */
const VENDOR_COMPARISON_STATUS = Object.freeze({
  DRAFT: 'DRAFT',                               // Thu mua đang nhập NCC
  PENDING_APPROVAL: 'PENDING_APPROVAL',         // Chờ CEO & Chairman duyệt
  APPROVED_BY_CEO: 'APPROVED_BY_CEO',           // CEO đã duyệt, chờ Chairman
  APPROVED_BY_CHAIRMAN: 'APPROVED_BY_CHAIRMAN', // Chairman đã duyệt, chờ CEO
  VENDOR_APPROVED: 'VENDOR_APPROVED',           // Cả CEO & Chairman đã duyệt
  REJECTED: 'REJECTED',                         // Bị từ chối
});

/**
 * Trạng thái Hợp đồng (Contract)
 */
const CONTRACT_STATUS = Object.freeze({
  DRAFT: 'DRAFT',                               // Thu mua đang soạn
  UPLOADED: 'UPLOADED',                         // Đã upload file hợp đồng
  HANDED_TO_ACCOUNTANT: 'HANDED_TO_ACCOUNTANT', // Đã chuyển giao cho Kế toán
});

/**
 * Trạng thái Đề xuất Thanh toán (PaymentProposal)
 */
const PAYMENT_PROPOSAL_STATUS = Object.freeze({
  DRAFT: 'DRAFT',                                       // Kế toán đang soạn
  PENDING_CEO_APPROVAL: 'PENDING_CEO_APPROVAL',         // Chờ CEO duyệt
  PENDING_CHAIRMAN: 'PENDING_CHAIRMAN',                 // CEO duyệt sơ bộ (>= 50tr), chờ Chairman
  WAITING_CHAIRMAN_APPROVAL: 'PENDING_CHAIRMAN',       // Alias tương thích
  APPROVED_READY_TO_PAY: 'APPROVED_READY_TO_PAY',       // Đã duyệt, sẵn sàng chi tiền
  PAID: 'PAID',                                         // Thủ quỹ đã chi tiền - hoàn tất
  REJECTED: 'REJECTED',                                 // Bị từ chối
});

/**
 * Các trạng thái đề xuất thanh toán được tính là "đang chờ giải ngân"
 * (đang duyệt hoặc đã duyệt nhưng chưa chi) - dùng cho thống kê chi phí dự án
 */
const PAYMENT_PENDING_STATUSES = Object.freeze([
  PAYMENT_PROPOSAL_STATUS.PENDING_CEO_APPROVAL,
  PAYMENT_PROPOSAL_STATUS.PENDING_CHAIRMAN,
  PAYMENT_PROPOSAL_STATUS.APPROVED_READY_TO_PAY,
]);

/**
 * Trạng thái Dự án (Project)
 */
const PROJECT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',         // Đang thi công
  COMPLETED: 'COMPLETED',   // Đã hoàn thành
  ON_HOLD: 'ON_HOLD',       // Tạm dừng
});

/**
 * Trạng thái Chi quỹ (Disbursement)
 */
const DISBURSEMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',   // Chờ chi
  PAID: 'PAID',         // Đã chi tiền - hoàn tất
});

/**
 * Loại thanh toán
 */
const PAYMENT_TYPE = Object.freeze({
  ONE_TIME: 'ONE_TIME',       // Thanh toán 1 lần
  MILESTONE: 'MILESTONE',     // Thanh toán theo đợt
});

/**
 * Ngưỡng tài chính yêu cầu Chairman phê duyệt
 */
const CHAIRMAN_APPROVAL_THRESHOLD = 50_000_000; // 50,000,000 VNĐ

module.exports = {
  ROLES,
  ROLE_LABELS,
  MATERIAL_REQUEST_STATUS,
  PURCHASE_REQUEST_STATUS,
  VENDOR_COMPARISON_STATUS,
  CONTRACT_STATUS,
  PAYMENT_PROPOSAL_STATUS,
  PAYMENT_PENDING_STATUSES,
  PROJECT_STATUS,
  DISBURSEMENT_STATUS,
  PAYMENT_TYPE,
  CHAIRMAN_APPROVAL_THRESHOLD,
};

