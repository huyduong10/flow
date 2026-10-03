require('dotenv').config();
const http = require('http');
const connectDB = require('../src/config/database');
const app = require('../src/index');

let server;
const PORT = 5002;

async function request(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    let reqBody = null;
    const reqHeaders = { ...headers };

    if (body) {
      reqBody = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(reqBody);
    }

    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: urlPath,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('\n===========================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG: WAREHOUSE MODULE & SPLIT-ORDER');
  console.log('===========================================================\n');

  await connectDB();
  server = app.listen(PORT);

  try {
    // ─── 1. Login Accounts ──────────────────────────────────────
    console.log('👉 [1/6] Kiểm tra Đăng nhập RBAC: Quản lý kho & Trưởng thi công');

    const khoLogin = await request('POST', '/api/auth/login', {}, {
      email: 'kho@company.com',
      password: 'Password123!',
    });
    assert(khoLogin.status === 200, 'Đăng nhập kho@company.com thành công');
    assert(khoLogin.body.data.user.role === 'WAREHOUSE_MANAGER', 'Role đúng là WAREHOUSE_MANAGER');
    const khoToken = khoLogin.body.data.token;

    const siteLogin = await request('POST', '/api/auth/login', {}, {
      email: 'thicong@flow.vn',
      password: '123456',
    });
    assert(siteLogin.status === 200, 'Đăng nhập thicong@flow.vn thành công');
    assert(siteLogin.body.data.user.role === 'SITE_MANAGER', 'Role đúng là SITE_MANAGER');
    const siteToken = siteLogin.body.data.token;

    // ─── 2. SITE_MANAGER tạo đơn MaterialRequest ───────────────
    console.log('\n👉 [2/6] Trưởng thi công gửi yêu cầu cấp vật tư (MaterialRequest)');
    const createRes = await request(
      'POST',
      '/api/material-requests',
      { Authorization: `Bearer ${siteToken}` },
      {
        project: 'Dự án Test Thử Nghiệm Kho',
        items: [
          { materialName: 'Thép D10', unit: 'Tấn', requestedQty: 10 },
          { materialName: 'Xi măng PCB40', unit: 'Bao', requestedQty: 100 },
          { materialName: 'Cát xây', unit: 'M3', requestedQty: 20 },
        ],
      }
    );
    assert(createRes.status === 201, 'Tạo đơn vật tư thành công (HTTP 201)');
    const createdMR = createRes.body.data;
    assert(createdMR.requestCode.startsWith('MR-'), 'Mã phiếu tự sinh đúng format MR-YYYY-XXXX');
    assert(createdMR.status === 'PENDING_WAREHOUSE', 'Trạng thái ban đầu là PENDING_WAREHOUSE');
    assert(createdMR.items.length === 3, 'Đủ 3 hạng mục vật tư');

    // ─── 3. Quản lý kho xem danh sách PENDING_WAREHOUSE ─────────
    console.log('\n👉 [3/6] Quản lý kho lấy danh sách đơn chờ kiểm tra');
    const pendingListRes = await request(
      'GET',
      '/api/warehouse/pending-requests',
      { Authorization: `Bearer ${khoToken}` }
    );
    assert(pendingListRes.status === 200, 'Lấy danh sách đơn chờ kho thành công');
    const foundInPending = pendingListRes.body.data.some((r) => r._id === createdMR._id);
    assert(foundInPending, 'Đơn vừa tạo có trong danh sách PENDING_WAREHOUSE của kho');

    // ─── 4. Kiểm thử KỊCH BẢN 2: Cấp 1 phần & Tự động tách đơn mua ───
    console.log('\n👉 [4/6] Quản lý kho kiểm tra tồn kho & Tự động tách đơn (Kịch bản 2)');
    const item1 = createdMR.items[0]; // Thép D10: yêu cầu 10 -> kho có 10 (đủ 100%)
    const item2 = createdMR.items[1]; // Xi măng: yêu cầu 100 -> kho chỉ có 60 (thiếu 40)
    const item3 = createdMR.items[2]; // Cát xây: yêu cầu 20 -> kho có 0 (hết sạch)

    // Test validation: stockSuppliedQty vượt quá requestedQty
    const invalidCheck = await request(
      'PATCH',
      `/api/warehouse/requests/${createdMR._id}/check`,
      { Authorization: `Bearer ${khoToken}` },
      {
        items: [
          { itemId: item1._id, stockSuppliedQty: 999 }, // quá số lượng
        ],
      }
    );
    assert(invalidCheck.status === 400, 'Chặn thành công số lượng xuất kho vượt quá yêu cầu (HTTP 400)');

    // Thực hiện kiểm kho hợp lệ (Kịch bản 2: cấp 1 phần)
    const validCheck = await request(
      'PATCH',
      `/api/warehouse/requests/${createdMR._id}/check`,
      { Authorization: `Bearer ${khoToken}` },
      {
        items: [
          { itemId: item1._id, stockSuppliedQty: 10 }, // Đủ
          { itemId: item2._id, stockSuppliedQty: 60 }, // Thiếu 40
          { itemId: item3._id, stockSuppliedQty: 0 },  // Thiếu 20
        ],
        notes: 'Kho chỉ còn 60 bao xi măng, cát xây đã hết.',
      }
    );

    assert(validCheck.status === 200, 'Quản lý kho kiểm tra và tách đơn thành công (HTTP 200)');
    const processedMR = validCheck.body.data.materialRequest;
    const createdPR = validCheck.body.data.purchaseRequest;

    assert(processedMR.status === 'WAITING_SITE_CONFIRMATION', 'Trạng thái chuyển thành WAITING_SITE_CONFIRMATION');
    assert(processedMR.deliveredAt !== null, 'Đã lưu mốc thời gian xuất kho deliveredAt');
    assert(createdPR !== null && createdPR !== undefined, 'Hệ thống đã tự động tạo PurchaseRequest');
    assert(createdPR.status === 'PENDING_CEO_APPROVAL', 'Đơn mua ngoài ở trạng thái PENDING_CEO_APPROVAL chờ CEO');
    assert(createdPR.items.length === 2, 'Đơn mua ngoài chỉ gồm đúng 2 món thiếu (Xi măng 40, Cát 20)');
    assert(createdPR.materialRequestId === createdMR._id, 'PurchaseRequest liên kết ngược về MaterialRequest gốc');
    assert(processedMR.procurementRequestId._id === createdPR._id, 'MaterialRequest lưu procurementRequestId trỏ tới PR');

    // ─── 5. Trưởng thi công xác nhận nhận hàng (Site confirm) ──
    console.log('\n👉 [5/6] Trưởng thi công (SITE_MANAGER) xác nhận đã nhận hàng');
    // Test quyền: Quản lý kho không được gọi site-confirm
    const forbiddenConfirm = await request(
      'PATCH',
      `/api/warehouse/requests/${createdMR._id}/site-confirm`,
      { Authorization: `Bearer ${khoToken}` }
    );
    assert(forbiddenConfirm.status === 403, 'Chặn thành công người không phải SITE_MANAGER gọi site-confirm (HTTP 403)');

    // Trưởng thi công gọi site-confirm
    const validConfirm = await request(
      'PATCH',
      `/api/warehouse/requests/${createdMR._id}/site-confirm`,
      { Authorization: `Bearer ${siteToken}` }
    );
    assert(validConfirm.status === 200, 'Trưởng thi công xác nhận nhận hàng thành công (HTTP 200)');
    assert(validConfirm.body.data.siteConfirmedAt !== null, 'Đã lưu mốc thời gian xác nhận siteConfirmedAt');

    // ─── 6. Kiểm thử KỊCH BẢN 1: Đủ 100% từ kho ──────────────────
    console.log('\n👉 [6/6] Kiểm thử Kịch bản 1: Kho đáp ứng đủ 100% vật tư');
    const mr2Res = await request(
      'POST',
      '/api/material-requests',
      { Authorization: `Bearer ${siteToken}` },
      {
        project: 'Dự án Cung Ứng Đủ 100%',
        items: [{ materialName: 'Sơn lót Dulux', unit: 'Thùng', requestedQty: 5 }],
      }
    );
    const mr2 = mr2Res.body.data;

    const checkFull = await request(
      'PATCH',
      `/api/warehouse/requests/${mr2._id}/check`,
      { Authorization: `Bearer ${khoToken}` },
      {
        items: [{ itemId: mr2.items[0]._id, stockSuppliedQty: 5 }],
        notes: 'Kho xuất đủ 100%.',
      }
    );
    assert(checkFull.status === 200, 'Kiểm kho đủ 100% thành công');
    assert(checkFull.body.data.purchaseRequest === null, 'Không tạo PurchaseRequest vì kho đã đủ 100%');
    assert(checkFull.body.data.materialRequest.status === 'WAITING_SITE_CONFIRMATION', 'Chờ công trường nhận');

    // Site Manager xác nhận nhận hàng cho đơn đủ 100%
    const confirmFull = await request(
      'PATCH',
      `/api/warehouse/requests/${mr2._id}/site-confirm`,
      { Authorization: `Bearer ${siteToken}` }
    );
    assert(confirmFull.status === 200, 'Xác nhận nhận hàng đơn đủ thành công');
    assert(confirmFull.body.data.status === 'FULFILLED_BY_STOCK', 'Trạng thái chuyển thành FULFILLED_BY_STOCK');

    console.log('\n===========================================================');
    console.log('🎉 TẤT CẢ TEST CASES ĐÃ PASS 100% THÀNH CÔNG VÀ CHÍNH XÁC!');
    console.log('===========================================================\n');

    server.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi ngoại lệ trong quá trình test:', error);
    if (server) server.close();
    process.exit(1);
  }
}

runTests();
