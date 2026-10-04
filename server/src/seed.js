/**
 * ============================================================
 * SEED SCRIPT - FlowBuild ERP
 * Tạo sẵn 7 tài khoản mẫu tương ứng 7 vai trò RBAC,
 * 3 Dự án mẫu kèm Ngân sách phân bổ (2 tỷ, 5 tỷ, 10 tỷ VNĐ),
 * và các dữ liệu liên kết (MaterialRequest, PurchaseRequest, Contract, PaymentProposal).
 *
 * Chạy: npm run seed   hoặc   node src/seed.js
 * ============================================================
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const User = require('./models/User');
const Project = require('./modules/projects/project.model');
const MaterialRequest = require('./modules/material-requests/material-request.model');
const PurchaseRequest = require('./modules/procurement/purchase-request.model');
const VendorQuote = require('./models/VendorQuote');
const Contract = require('./models/Contract');
const PaymentProposal = require('./models/PaymentProposal');

const {
  ROLES,
  ROLE_LABELS,
  PROJECT_STATUS,
  MATERIAL_REQUEST_STATUS,
  PURCHASE_REQUEST_STATUS,
  VENDOR_COMPARISON_STATUS,
  CONTRACT_STATUS,
  PAYMENT_PROPOSAL_STATUS,
  DISBURSEMENT_STATUS,
  PAYMENT_TYPE,
} = require('./utils/constants');

const seedUsers = [
  {
    fullName: 'Nguyễn Văn Thi Công',
    email: 'thicong@flow.vn',
    password: '123456',
    role: ROLES.SITE_MANAGER,
    phone: '0901000001',
    permissions: 'Tạo yêu cầu cấp vật tư (Material Request), Nhận hàng tại công trường',
  },
  {
    fullName: 'Phạm Văn Thủ Kho',
    email: 'kho@company.com',
    password: 'Password123!',
    role: ROLES.WAREHOUSE_MANAGER,
    phone: '0901000007',
    permissions: 'Kiểm tra tồn kho, nhập số lượng thực cấp, tự động tách đơn mua',
  },
  {
    fullName: 'Trần Thị Thu Mua',
    email: 'thumua@flow.vn',
    password: '123456',
    role: ROLES.PROCUREMENT,
    phone: '0901000002',
    permissions: 'Khảo sát báo giá NCC, Ký & Upload Hợp đồng',
  },
  {
    fullName: 'Lê Minh CEO',
    email: 'ceo@flow.vn',
    password: '123456',
    role: ROLES.CEO,
    phone: '0901000003',
    permissions: 'Duyệt PR, Duyệt NCC, Duyệt thanh toán (<50tr trực tiếp, >=50tr sơ bộ)',
  },
  {
    fullName: 'Phạm Hùng Chủ Tịch',
    email: 'chutich@flow.vn',
    password: '123456',
    role: ROLES.CHAIRMAN,
    phone: '0901000004',
    permissions: 'Duyệt NCC, Duyệt thanh toán bước cuối (hạn mức >=50tr)',
  },
  {
    fullName: 'Hoàng Lan Kế Toán',
    email: 'ketoan@flow.vn',
    password: '123456',
    role: ROLES.ACCOUNTANT,
    phone: '0901000005',
    permissions: 'Tiếp nhận HĐ, Lập đề xuất thanh toán & kiểm tra số dư',
  },
  {
    fullName: 'Đỗ Thanh Thủ Quỹ',
    email: 'thuquy@flow.vn',
    password: '123456',
    role: ROLES.TREASURER,
    phone: '0901000006',
    permissions: 'Chi tiền quỹ, Xuất Ủy nhiệm chi (UNC) và xác nhận PAID',
  },
];

const seed = async () => {
  try {
    await connectDB();

    // 1. Dọn sạch dữ liệu cũ
    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      MaterialRequest.deleteMany({}),
      PurchaseRequest.deleteMany({}),
      VendorQuote.deleteMany({}),
      Contract.deleteMany({}),
      PaymentProposal.deleteMany({}),
    ]);
    console.log('🗑️  Đã làm sạch dữ liệu cũ.');

    // 2. Tạo users mới
    const createdUsers = {};
    for (const u of seedUsers) {
      const created = await User.create({
        fullName: u.fullName,
        email: u.email,
        password: u.password,
        role: u.role,
        phone: u.phone,
      });
      createdUsers[u.role] = created;
    }
    console.log('✅ Đã tạo 7 tài khoản người dùng.');

    const siteManager = createdUsers[ROLES.SITE_MANAGER];
    const warehouseManager = createdUsers[ROLES.WAREHOUSE_MANAGER];
    const procurement = createdUsers[ROLES.PROCUREMENT];
    const ceo = createdUsers[ROLES.CEO];
    const chairman = createdUsers[ROLES.CHAIRMAN];
    const accountant = createdUsers[ROLES.ACCOUNTANT];
    const treasurer = createdUsers[ROLES.TREASURER];

    // 3. Tạo 3 Dự án mẫu (2 tỷ, 5 tỷ, 10 tỷ VNĐ)
    const project1 = await Project.create({
      code: 'DA-ECO01',
      name: 'Tòa nhà phức hợp EcoGreen Tower',
      allocatedBudget: 10000000000, // 10 tỷ VNĐ
      status: PROJECT_STATUS.ACTIVE,
      managerId: siteManager._id,
      description: 'Công trình tháp đôi phức hợp thương mại và căn hộ 35 tầng tại Nam Sài Gòn',
    });

    const project2 = await Project.create({
      code: 'DA-RIVER02',
      name: 'Khu đô thị ven sông RiverPark Village',
      allocatedBudget: 5000000000, // 5 tỷ VNĐ
      status: PROJECT_STATUS.ACTIVE,
      managerId: siteManager._id,
      description: 'Dự án khu biệt thự sinh thái ven sông và hạ tầng cảnh quan',
    });

    const project3 = await Project.create({
      code: 'DA-HOSP03',
      name: 'Bệnh viện Quốc tế Hạnh Phúc',
      allocatedBudget: 2000000000, // 2 tỷ VNĐ
      status: PROJECT_STATUS.ACTIVE,
      managerId: siteManager._id,
      description: 'Cải tạo và nâng cấp cơ sở hạ tầng khoa cấp cứu và phòng phẫu thuật cao cấp',
    });

    console.log('✅ Đã tạo 3 Dự án mẫu:');
    console.log(`   - [${project1.code}] ${project1.name}: 10,000,000,000 VNĐ`);
    console.log(`   - [${project2.code}] ${project2.name}: 5,000,000,000 VNĐ`);
    console.log(`   - [${project3.code}] ${project3.name}: 2,000,000,000 VNĐ`);

    // 4. Tạo dữ liệu mẫu MaterialRequest liên kết projectId
    await MaterialRequest.create({
      requestCode: 'MR-2026-0001',
      projectId: project1._id,
      requestedBy: siteManager._id,
      status: MATERIAL_REQUEST_STATUS.PENDING_WAREHOUSE,
      items: [
        {
          materialName: 'Thép cây vằn Hòa Phát D16 (CB400)',
          unit: 'Tấn',
          requestedQty: 15,
          stockSuppliedQty: 0,
          purchaseQty: 0,
        },
        {
          materialName: 'Xi măng poóc lăng Hà Tiên PCB40',
          unit: 'Bao',
          requestedQty: 250,
          stockSuppliedQty: 0,
          purchaseQty: 0,
        },
      ],
    });

    await MaterialRequest.create({
      requestCode: 'MR-2026-0002',
      projectId: project2._id,
      requestedBy: siteManager._id,
      status: MATERIAL_REQUEST_STATUS.PENDING_WAREHOUSE,
      items: [
        {
          materialName: 'Ống cấp nước PPR Tiền Phong D32 (PN20)',
          unit: 'Cây 4m',
          requestedQty: 100,
          stockSuppliedQty: 0,
          purchaseQty: 0,
        },
        {
          materialName: 'Van cổng đồng ren MIHA DN32',
          unit: 'Cái',
          requestedQty: 24,
          stockSuppliedQty: 0,
          purchaseQty: 0,
        },
      ],
    });

    await MaterialRequest.create({
      requestCode: 'MR-2026-0003',
      projectId: project3._id,
      requestedBy: siteManager._id,
      warehouseInspectorId: warehouseManager._id,
      status: MATERIAL_REQUEST_STATUS.WAITING_SITE_CONFIRMATION,
      deliveredAt: new Date(Date.now() - 3600 * 1000 * 2),
      warehouseNotes: 'Kho đã xuất đủ 100% dây cáp điện.',
      items: [
        {
          materialName: 'Dây cáp điện Cadivi Cu/PVC/PVC 2x4mm2',
          unit: 'Cuộn 100m',
          requestedQty: 10,
          stockSuppliedQty: 10,
          purchaseQty: 0,
        },
      ],
    });

    // 5. Tạo PurchaseRequest & Hợp đồng & Đề xuất thanh toán để test Cost Tracking
    // --- PurchaseRequest 1 (EcoGreen) ---
    const pr1 = await PurchaseRequest.create({
      code: 'PR-20260401-0001',
      projectId: project1._id,
      projectName: project1.name,
      note: 'Vật tư thi công móng tầng hầm',
      createdBy: siteManager._id,
      status: PURCHASE_REQUEST_STATUS.APPROVED_BY_CEO,
      items: [
        {
          name: 'Thép dự ứng lực Hòa Phát D20',
          quantity: 20,
          unit: 'Tấn',
          note: 'Thi công cọc nhồi móng',
        },
      ],
      approvedBy: ceo._id,
      approvedAt: new Date(),
    });

    // VendorQuote 1
    const vq1 = await VendorQuote.create({
      purchaseRequest: pr1._id,
      createdBy: procurement._id,
      status: VENDOR_COMPARISON_STATUS.VENDOR_APPROVED,
      vendors: [
        {
          vendorName: 'Công ty Cổ phần Thép Hòa Phát',
          quotedPrice: 350000000,
          deliveryDays: 3,
          contactInfo: '024.3974.7755 - info@hoaphat.com.vn',
          note: 'Hàng chính hãng tiêu chuẩn CB400, giao tận chân công trình',
          isRecommended: true,
        },
        {
          vendorName: 'Công ty TNHH Thép Việt Nhật (Vina Kyoei)',
          quotedPrice: 364000000,
          deliveryDays: 5,
          contactInfo: '028.3824.3725',
          note: 'Chất lượng cao, giá thành cao hơn',
          isRecommended: false,
        },
      ],
      ceoApprovedBy: ceo._id,
      ceoApprovedAt: new Date(),
      chairmanApprovedBy: chairman._id,
      chairmanApprovedAt: new Date(),
    });

    // Contract 1
    const contract1 = await Contract.create({
      code: 'CT-20260401-0001',
      projectId: project1._id,
      purchaseRequest: pr1._id,
      vendorQuote: vq1._id,
      vendorName: 'Công ty Cổ phần Thép Hòa Phát',
      totalValue: 350000000,
      status: CONTRACT_STATUS.HANDED_TO_ACCOUNTANT,
      createdBy: procurement._id,
      handedOverAt: new Date(),
      handedOverBy: procurement._id,
      files: [
        {
          originalName: 'HopDong_HoaPhat_D20.pdf',
          fileName: 'hopdong_hoaphat.pdf',
          filePath: '/uploads/hopdong_sample.pdf',
          fileSize: 1024000,
          mimeType: 'application/pdf',
        },
      ],
    });

    // PaymentProposal 1.1: 200tr (Đã chi PAID)
    await PaymentProposal.create({
      code: 'PP-20260401-0001',
      projectId: project1._id,
      contract: contract1._id,
      paymentType: PAYMENT_TYPE.MILESTONE,
      proposedAmount: 200000000, // 200 triệu
      bankAccount: {
        accountNumber: '19034567890012',
        accountName: 'CONG TY CP THEP HOA PHAT',
        bankName: 'Techcombank',
        branch: 'Hà Nội',
      },
      status: PAYMENT_PROPOSAL_STATUS.PAID,
      createdBy: accountant._id,
      ceoApprovedBy: ceo._id,
      ceoApprovedAt: new Date(Date.now() - 86400000 * 2),
      chairmanApprovedBy: chairman._id,
      chairmanApprovedAt: new Date(Date.now() - 86400000),
      disbursement: {
        status: DISBURSEMENT_STATUS.PAID,
        transactionCode: 'UNC-TECH-889922',
        note: 'Đã thanh toán tạm ứng đợt 1 thành công',
        paidBy: treasurer._id,
        paidAt: new Date(),
      },
    });

    // PaymentProposal 1.2: 100tr (Đang chờ Chủ tịch duyệt - PENDING_CHAIRMAN)
    await PaymentProposal.create({
      code: 'PP-20260401-0002',
      projectId: project1._id,
      contract: contract1._id,
      paymentType: PAYMENT_TYPE.MILESTONE,
      proposedAmount: 100000000, // 100 triệu
      bankAccount: {
        accountNumber: '19034567890012',
        accountName: 'CONG TY CP THEP HOA PHAT',
        bankName: 'Techcombank',
        branch: 'Hà Nội',
      },
      status: PAYMENT_PROPOSAL_STATUS.PENDING_CHAIRMAN,
      createdBy: accountant._id,
      ceoApprovedBy: ceo._id,
      ceoApprovedAt: new Date(),
    });

    // --- PurchaseRequest 2 (RiverPark) ---
    const pr2 = await PurchaseRequest.create({
      code: 'PR-20260402-0002',
      projectId: project2._id,
      projectName: project2.name,
      note: 'Vật tư cấp thoát nước khu biệt thự A',
      createdBy: siteManager._id,
      status: PURCHASE_REQUEST_STATUS.APPROVED_BY_CEO,
      items: [
        {
          name: 'Ống nước PPR D32 Tiền Phong',
          quantity: 200,
          unit: 'Cây',
          note: 'Thi công trục cấp chính',
        },
      ],
      approvedBy: ceo._id,
      approvedAt: new Date(),
    });

    const vq2 = await VendorQuote.create({
      purchaseRequest: pr2._id,
      createdBy: procurement._id,
      status: VENDOR_COMPARISON_STATUS.APPROVED_BY_CEO,
      vendors: [
        {
          vendorName: 'Công ty Nhựa Tiền Phong Miền Nam',
          quotedPrice: 48000000,
          deliveryDays: 2,
          contactInfo: '028.3755.9999',
          note: 'Chiết khấu tốt nhất thị trường miền Nam',
          isRecommended: true,
        },
      ],
      ceoApprovedBy: ceo._id,
      ceoApprovedAt: new Date(),
    });

    const contract2 = await Contract.create({
      code: 'CT-20260402-0002',
      projectId: project2._id,
      purchaseRequest: pr2._id,
      vendorQuote: vq2._id,
      vendorName: 'Công ty Nhựa Tiền Phong Miền Nam',
      totalValue: 48000000,
      status: CONTRACT_STATUS.HANDED_TO_ACCOUNTANT,
      createdBy: procurement._id,
      handedOverAt: new Date(),
      handedOverBy: procurement._id,
      files: [
        {
          originalName: 'HopDong_TienPhong.pdf',
          fileName: 'hopdong_tienphong.pdf',
          filePath: '/uploads/hopdong_sample.pdf',
          fileSize: 512000,
          mimeType: 'application/pdf',
        },
      ],
    });

    // PaymentProposal 2.1: 48tr (< 50tr, CEO đã duyệt, chờ Thủ quỹ chi tiền - APPROVED_READY_TO_PAY)
    await PaymentProposal.create({
      code: 'PP-20260402-0003',
      projectId: project2._id,
      contract: contract2._id,
      paymentType: PAYMENT_TYPE.ONE_TIME,
      proposedAmount: 48000000, // 48 triệu
      bankAccount: {
        accountNumber: '0071001234567',
        accountName: 'CONG TY NHUA TIEN PHONG MN',
        bankName: 'Vietcombank',
        branch: 'Bình Dương',
      },
      status: PAYMENT_PROPOSAL_STATUS.APPROVED_READY_TO_PAY,
      createdBy: accountant._id,
      ceoApprovedBy: ceo._id,
      ceoApprovedAt: new Date(),
    });

    console.log('✅ Đã tạo các Hợp đồng và Đề xuất thanh toán mẫu.');

    console.log('\n=============================================================================================');
    console.log('🔐 DANH SÁCH 7 TÀI KHOẢN MẪU DÙNG ĐỂ ĐĂNG NHẬP (RBAC AUTHENTICATION)');
    console.log('=============================================================================================');
    console.log('┌──────────────────────┬─────────────────┬──────────────┬─────────────────┬───────────────────────────────────────┐');
    console.log('│ Họ tên               │ Email           │ Mật khẩu     │ Vai trò         │ Quyền hạn chính                       │');
    console.log('├──────────────────────┼─────────────────┼──────────────┼─────────────────┼───────────────────────────────────────┤');

    for (const u of seedUsers) {
      const name = u.fullName.padEnd(20);
      const email = u.email.padEnd(17);
      const pass = u.password.padEnd(12);
      const role = `${ROLE_LABELS[u.role] || u.role}`.padEnd(15);
      const perm = u.permissions.padEnd(37);
      console.log(`│ ${name} │ ${email} │ ${pass} │ ${role} │ ${perm} │`);
    }

    console.log('└──────────────────────┴─────────────────┴──────────────┴─────────────────┴───────────────────────────────────────┘');
    console.log('\n📌 BẢO MẬT: Bắt buộc đăng nhập tại /login để nhận JWT Token. Không thể chuyển vai trò trực tiếp từ UI.');
    console.log('=============================================================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed lỗi:', error.message);
    process.exit(1);
  }
};

seed();
