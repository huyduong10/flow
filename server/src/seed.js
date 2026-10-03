/**
 * ============================================================
 * SEED SCRIPT - FlowBuild ERP
 * Tạo sẵn 7 tài khoản mẫu tương ứng 7 vai trò RBAC (bao gồm Quản lý kho)
 * và tạo các bản ghi mẫu cho Module Quản lý kho.
 *
 * Chạy: npm run seed   hoặc   node src/seed.js
 * ============================================================
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const User = require('./models/User');
const MaterialRequest = require('./modules/material-requests/material-request.model');
const { ROLES, ROLE_LABELS, MATERIAL_REQUEST_STATUS } = require('./utils/constants');

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

    // Xóa toàn bộ users cũ
    await User.deleteMany({});
    console.log('🗑️  Đã làm sạch dữ liệu người dùng cũ.');

    // Tạo users mới (qua save/create để kích hoạt bcrypt hash password)
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

    // Xóa và tạo dữ liệu mẫu cho MaterialRequest
    await MaterialRequest.deleteMany({});
    console.log('🗑️  Đã làm sạch dữ liệu yêu cầu vật tư cũ.');

    const siteManager = createdUsers[ROLES.SITE_MANAGER];
    const warehouseManager = createdUsers[ROLES.WAREHOUSE_MANAGER];

    // Đơn 1: PENDING_WAREHOUSE (chờ kho kiểm tra)
    await MaterialRequest.create({
      requestCode: 'MR-2026-0001',
      project: 'Tòa nhà phức hợp Flow Tower (Giai đoạn 2)',
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
        {
          materialName: 'Cát vàng xây tô sàng lọc tiêu chuẩn',
          unit: 'M3',
          requestedQty: 45,
          stockSuppliedQty: 0,
          purchaseQty: 0,
        },
        {
          materialName: 'Sơn lót chống kiềm ngoại thất Dulux Weathershield',
          unit: 'Thùng 18L',
          requestedQty: 30,
          stockSuppliedQty: 0,
          purchaseQty: 0,
        },
      ],
    });

    // Đơn 2: PENDING_WAREHOUSE (đơn khác để kho kiểm tra)
    await MaterialRequest.create({
      requestCode: 'MR-2026-0002',
      project: 'Khu biệt thự ven sông RiverPark Village',
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

    // Đơn 3: WAITING_SITE_CONFIRMATION (đã xuất kho, chờ công trường bấm xác nhận)
    await MaterialRequest.create({
      requestCode: 'MR-2026-0003',
      project: 'Bệnh viện Đa khoa Quốc tế Hạnh Phúc',
      requestedBy: siteManager._id,
      warehouseInspectorId: warehouseManager._id,
      status: MATERIAL_REQUEST_STATUS.WAITING_SITE_CONFIRMATION,
      deliveredAt: new Date(Date.now() - 3600 * 1000 * 2),
      warehouseNotes: 'Kho xuất đủ 100% dây cáp điện và ống ghen theo số lượng yêu cầu.',
      items: [
        {
          materialName: 'Dây cáp điện Cadivi Cu/PVC/PVC 2x4mm2',
          unit: 'Cuộn 100m',
          requestedQty: 10,
          stockSuppliedQty: 10,
          purchaseQty: 0,
        },
        {
          materialName: 'Ống luồn dây điện chống cháy Sino D20',
          unit: 'Cây 2.92m',
          requestedQty: 150,
          stockSuppliedQty: 150,
          purchaseQty: 0,
        },
      ],
    });

    // Đơn 4: FULFILLED_BY_STOCK (đã cấp đủ từ kho và công trường đã xác nhận)
    await MaterialRequest.create({
      requestCode: 'MR-2026-0004',
      project: 'Tòa nhà phức hợp Flow Tower (Giai đoạn 1)',
      requestedBy: siteManager._id,
      warehouseInspectorId: warehouseManager._id,
      status: MATERIAL_REQUEST_STATUS.FULFILLED_BY_STOCK,
      deliveredAt: new Date(Date.now() - 3600 * 1000 * 48),
      siteConfirmedAt: new Date(Date.now() - 3600 * 1000 * 24),
      warehouseNotes: 'Đã xuất kho đầy đủ đinh bê tông và lưới thép.',
      items: [
        {
          materialName: 'Đinh bê tông chịu lực 5cm',
          unit: 'Hộp 1kg',
          requestedQty: 50,
          stockSuppliedQty: 50,
          purchaseQty: 0,
        },
        {
          materialName: 'Lưới thép hàn D4 mắt 100x100mm',
          unit: 'Cuộn',
          requestedQty: 12,
          stockSuppliedQty: 12,
          purchaseQty: 0,
        },
      ],
    });

    console.log('✅ Đã tạo dữ liệu mẫu MaterialRequest thành công.');

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
