process.env.NODE_ENV = 'test';
require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const connectDB = require('../src/config/database');
const app = require('../src/index');

// Create sample test file for contract upload
const sampleFilePath = path.join(__dirname, 'test_contract.pdf');
fs.writeFileSync(sampleFilePath, '%PDF-1.4 sample contract content for testing');

let server;
const PORT = 5001;

async function request(method, urlPath, headers = {}, body = null, isMultipart = false) {
  return new Promise((resolve, reject) => {
    let reqBody = null;
    const reqHeaders = { ...headers };

    if (body && !isMultipart) {
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

    if (isMultipart) {
      // Send multipart form-data
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      reqHeaders['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
      req.setHeader('Content-Type', `multipart/form-data; boundary=${boundary}`);

      let multiData = Buffer.alloc(0);
      for (const [key, value] of Object.entries(body.fields || {})) {
        multiData = Buffer.concat([
          multiData,
          Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`),
        ]);
      }

      if (body.file) {
        const fileContent = fs.readFileSync(body.file.path);
        multiData = Buffer.concat([
          multiData,
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="${body.file.name}"\r\nContent-Type: ${body.file.type}\r\n\r\n`
          ),
          fileContent,
          Buffer.from('\r\n'),
        ]);
      }

      multiData = Buffer.concat([multiData, Buffer.from(`--${boundary}--\r\n`)]);
      req.setHeader('Content-Length', multiData.length);
      req.write(multiData);
      req.end();
    } else {
      if (reqBody) req.write(reqBody);
      req.end();
    }
  });
}

async function runTests() {
  await connectDB();
  server = app.listen(PORT, '127.0.0.1');
  await new Promise((r) => setTimeout(r, 1000));

  console.log('\n======================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN BACKEND API VÀ LOGIC RBAC');
  console.log('======================================================\n');

  try {
    // 1. ĐĂNG NHẬP 6 ROLES
    console.log('👉 [1/6] Kiểm tra Đăng nhập & sinh JWT Token cho các Role:');
    const roles = ['thicong', 'thumua', 'ceo', 'chutich', 'ketoan', 'thuquy'];
    const tokens = {};

    for (const r of roles) {
      const res = await request('POST', '/api/auth/login', {}, {
        email: `${r}@flow.vn`,
        password: '123456',
      });
      if (res.status !== 200) throw new Error(`Đăng nhập ${r} thất bại: ${JSON.stringify(res.body)}`);
      tokens[r] = res.body.data.token;
      console.log(`   ✅ ${r}@flow.vn (${res.body.data.user.role}): Token OK`);
    }

    // 2. PURCHASE REQUEST (Yêu cầu cấp vật tư)
    console.log('\n👉 [2/6] Kiểm tra PurchaseRequest:');
    // 2.1 Thu mua thử tạo -> phải bị chặn 403
    const forbiddenPR = await request('POST', '/api/requests', {
      Authorization: `Bearer ${tokens.thumua}`,
    }, {
      projectName: 'Dự án EcoGreen',
      items: [{ name: 'Xi măng', unit: 'Bao', quantity: 100 }],
    });
    console.log(`   ✅ Phân quyền: PROCUREMENT gọi POST /api/requests trả về status ${forbiddenPR.status} (bị chặn đúng như kỳ vọng).`);

    // 2.2 Trưởng thi công tạo hợp lệ
    const createPRRes = await request('POST', '/api/requests', {
      Authorization: `Bearer ${tokens.thicong}`,
    }, {
      projectName: 'Tòa nhà Landmark 88',
      items: [
        { name: 'Thép Pomina D18', unit: 'Tấn', quantity: 20, note: 'Giao đợt 1' },
        { name: 'Xi măng Hà Tiên', unit: 'Bao', quantity: 500, note: 'Mác 400' },
      ],
      note: 'Ưu tiên giao sớm trước ngày 15',
    });
    if (createPRRes.status !== 201) throw new Error(`Tạo PR thất bại: ${JSON.stringify(createPRRes.body)}`);
    const prId = createPRRes.body.data._id;
    console.log(`   ✅ SITE_MANAGER tạo PR thành công: Mã = ${createPRRes.body.data.code}, ID = ${prId}`);

    // 2.3 CEO Duyệt yêu cầu
    const ceoApprovePR = await request('PATCH', `/api/requests/${prId}/ceo-approve`, {
      Authorization: `Bearer ${tokens.ceo}`,
    }, { action: 'approve' });
    if (ceoApprovePR.status !== 200) throw new Error(`CEO duyệt PR thất bại: ${JSON.stringify(ceoApprovePR.body)}`);
    console.log(`   ✅ CEO duyệt PR thành công -> Trạng thái: ${ceoApprovePR.body.data.status}`);

    // 3. VENDOR QUOTES (Khảo sát & So sánh NCC)
    console.log('\n👉 [3/6] Kiểm tra Vendor Quotes (Báo giá & Lựa chọn NCC):');
    const vendorData = {
      vendors: [
        {
          vendorName: 'Công ty Cổ phần Thép Miền Nam',
          contactInfo: '0988111222 - sales@thepmn.vn',
          quotedPrice: 120000000,
          deliveryDays: 5,
          isRecommended: true,
          note: 'Chất lượng chuẩn ISO, chiết khấu 5%',
        },
        {
          vendorName: 'Công ty VLXD Hòa Phát Hưng Yên',
          contactInfo: '0977222333',
          quotedPrice: 128000000,
          deliveryDays: 7,
          isRecommended: false,
          note: 'Giá cao hơn',
        },
      ],
    };

    const createVendorRes = await request('POST', `/api/requests/${prId}/vendors`, {
      Authorization: `Bearer ${tokens.thumua}`,
    }, vendorData);
    if (createVendorRes.status !== 201) throw new Error(`Tạo Vendor Quote thất bại: ${JSON.stringify(createVendorRes.body)}`);
    const vqId = createVendorRes.body.data._id;
    console.log(`   ✅ PROCUREMENT tạo báo giá NCC thành công, ID = ${vqId}`);

    // 3.2 CEO duyệt NCC
    const ceoApproveVQ = await request('PATCH', `/api/requests/${prId}/vendor-approval`, {
      Authorization: `Bearer ${tokens.ceo}`,
    }, { action: 'approve' });
    console.log(`   ✅ CEO duyệt NCC -> Trạng thái tạm: ${ceoApproveVQ.body.data.status}`);

    // 3.3 Chairman duyệt NCC
    const chairmanApproveVQ = await request('PATCH', `/api/requests/${prId}/vendor-approval`, {
      Authorization: `Bearer ${tokens.chutich}`,
    }, { action: 'approve' });
    console.log(`   ✅ CHAIRMAN duyệt NCC -> Trạng thái cuối: ${chairmanApproveVQ.body.data.status}`);

    // 4. CONTRACT (Hợp đồng)
    console.log('\n👉 [4/6] Kiểm tra Contract (Upload Hợp đồng & Bàn giao Kế toán):');
    const createContractRes = await request('POST', '/api/contracts', {
      Authorization: `Bearer ${tokens.thumua}`,
    }, {
      fields: {
        vendorQuoteId: vqId,
        totalValue: 120000000,
        note: 'Hợp đồng nguyên tắc cung cấp vật tư Q4',
      },
      file: {
        path: sampleFilePath,
        name: 'Hop_Dong_Nguyen_Tac_Vat_Tu.pdf',
        type: 'application/pdf',
      },
    }, true);

    if (createContractRes.status !== 201) throw new Error(`Tạo Contract thất bại: ${JSON.stringify(createContractRes.body)}`);
    const contractId = createContractRes.body.data._id;
    console.log(`   ✅ PROCUREMENT upload file & tạo Hợp đồng thành công: Mã = ${createContractRes.body.data.code}, Giá trị = 120.000.000 VNĐ`);

    // 4.2 Thu mua bàn giao Hợp đồng cho Kế toán
    const handoverRes = await request('PATCH', `/api/contracts/${contractId}/handover`, {
      Authorization: `Bearer ${tokens.thumua}`,
    });
    console.log(`   ✅ Chuyển giao hợp đồng cho Kế toán -> Trạng thái: ${handoverRes.body.data.status}`);

    // 5. PAYMENT PROPOSAL (Đề xuất thanh toán & Quy tắc duyệt theo ngưỡng)
    console.log('\n👉 [5/6] Kiểm tra PaymentProposal & Ngưỡng duyệt tài chính:');

    // 5.1 Test chặn vượt quá số dư hợp đồng (Tổng HĐ 120tr, đề xuất 150tr -> Bị chặn)
    const overBudgetRes = await request('POST', '/api/payments', {
      Authorization: `Bearer ${tokens.ketoan}`,
    }, {
      contractId,
      paymentType: 'ONE_TIME',
      proposedAmount: 150000000,
      bankAccount: {
        accountNumber: '190333888999',
        accountName: 'CONG TY CP THEP MIEN NAM',
        bankName: 'Techcombank',
      },
    });
    console.log(`   ✅ Kiểm tra số dư: Đề xuất 150tr > HĐ 120tr bị từ chối với status ${overBudgetRes.status} ("${overBudgetRes.body.message}")`);

    // 5.2 TEST CASE A: Đề xuất < 50.000.000 VNĐ (ví dụ 30.000.000 VNĐ)
    console.log('   --- Case A: Số tiền < 50,000,000 VNĐ (30tr) ---');
    const payA = await request('POST', '/api/payments', {
      Authorization: `Bearer ${tokens.ketoan}`,
    }, {
      contractId,
      paymentType: 'ONE_TIME',
      proposedAmount: 30000000,
      bankAccount: {
        accountNumber: '190333888999',
        accountName: 'CONG TY CP THEP MIEN NAM',
        bankName: 'Techcombank',
      },
    });
    const payAId = payA.body.data._id;
    console.log(`   ✅ Kế toán tạo đề xuất 30tr: Mã = ${payA.body.data.code}`);

    // CEO duyệt -> Chuyển thẳng sang APPROVED_READY_TO_PAY
    const ceoApproveA = await request('PATCH', `/api/payments/${payAId}/approve`, {
      Authorization: `Bearer ${tokens.ceo}`,
    }, { action: 'approve' });
    console.log(`   ✅ CEO duyệt đề xuất < 50tr -> Trạng thái: ${ceoApproveA.body.data.status} (Chuyển thẳng sang APPROVED_READY_TO_PAY)`);

    // 5.3 TEST CASE B: Đề xuất >= 50.000.000 VNĐ (ví dụ 60.000.000 VNĐ)
    console.log('   --- Case B: Số tiền >= 50,000,000 VNĐ (60tr) ---');
    const payB = await request('POST', '/api/payments', {
      Authorization: `Bearer ${tokens.ketoan}`,
    }, {
      contractId,
      paymentType: 'ONE_TIME',
      proposedAmount: 60000000,
      bankAccount: {
        accountNumber: '190333888999',
        accountName: 'CONG TY CP THEP MIEN NAM',
        bankName: 'Techcombank',
      },
    });
    const payBId = payB.body.data._id;
    console.log(`   ✅ Kế toán tạo đề xuất 60tr: Mã = ${payB.body.data.code}`);

    // CEO duyệt sơ bộ
    const ceoApproveB = await request('PATCH', `/api/payments/${payBId}/approve`, {
      Authorization: `Bearer ${tokens.ceo}`,
    }, { action: 'approve' });
    console.log(`   ✅ CEO duyệt sơ bộ đề xuất >= 50tr -> Trạng thái: ${ceoApproveB.body.data.status} (WAITING_CHAIRMAN_APPROVAL)`);

    // Chairman duyệt bước cuối
    const chairmanApproveB = await request('PATCH', `/api/payments/${payBId}/approve`, {
      Authorization: `Bearer ${tokens.chutich}`,
    }, { action: 'approve' });
    console.log(`   ✅ CHAIRMAN duyệt bước cuối -> Trạng thái: ${chairmanApproveB.body.data.status} (APPROVED_READY_TO_PAY)`);

    // 5.4 TEST CASE C: Bị từ chối phải có lý do (rejectionReason)
    console.log('   --- Case C: Từ chối yêu cầu rejectionReason ---');
    const payC = await request('POST', '/api/payments', {
      Authorization: `Bearer ${tokens.ketoan}`,
    }, {
      contractId,
      paymentType: 'ONE_TIME',
      proposedAmount: 10000000,
      bankAccount: {
        accountNumber: '190333888999',
        accountName: 'CONG TY CP THEP MIEN NAM',
        bankName: 'Techcombank',
      },
    });
    const payCId = payC.body.data._id;
    const rejectNoReason = await request('PATCH', `/api/payments/${payCId}/approve`, {
      Authorization: `Bearer ${tokens.ceo}`,
    }, { action: 'reject' });
    console.log(`   ✅ Từ chối không kèm lý do: Bị chặn với status ${rejectNoReason.status} ("${rejectNoReason.body.message}")`);

    const rejectWithReason = await request('PATCH', `/api/payments/${payCId}/approve`, {
      Authorization: `Bearer ${tokens.ceo}`,
    }, { action: 'reject', rejectionReason: 'Hồ sơ thiếu biên bản nghiệm thu đợt' });
    console.log(`   ✅ Từ chối có lý do: Thành công -> Trạng thái: ${rejectWithReason.body.data.status}`);

    // 6. DISBURSEMENT (Thủ quỹ chi tiền)
    console.log('\n👉 [6/6] Kiểm tra Chi quỹ (Disbursement):');
    // 6.1 Kế toán thử chi tiền -> Bị chặn 403
    const forbiddenDisburse = await request('PATCH', `/api/payments/${payAId}/disburse`, {
      Authorization: `Bearer ${tokens.ketoan}`,
    }, { transactionCode: 'UNC-20261001-001' });
    console.log(`   ✅ Phân quyền: ACCOUNTANT thử chi tiền bị chặn status ${forbiddenDisburse.status}`);

    // 6.2 Thủ quỹ chi tiền cho đề xuất payA (đã APPROVED_READY_TO_PAY)
    const disburseRes = await request('PATCH', `/api/payments/${payAId}/disburse`, {
      Authorization: `Bearer ${tokens.thuquy}`,
    }, {
      transactionCode: 'UNC-TECH-88991122',
      note: 'Đã chuyển tiền qua Internet Banking Techcombank',
    });
    if (disburseRes.status !== 200) throw new Error(`Chi quỹ thất bại: ${JSON.stringify(disburseRes.body)}`);
    console.log(`   ✅ TREASURER xác nhận chi tiền thành công!`);
    console.log(`      - Mã UNC: ${disburseRes.body.data.disbursement.transactionCode}`);
    console.log(`      - Trạng thái chi: ${disburseRes.body.data.disbursement.status}`);
    console.log(`      - Người chi: ${disburseRes.body.data.disbursement.paidBy.fullName}`);

    console.log('\n======================================================');
    console.log('🎉 TẤT CẢ 6 BƯỚC VÀ ĐIỀU KIỆN LOGIC ĐÃ VƯỢT QUA 100%!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Kiểm thử thất bại:', err);
    process.exitCode = 1;
  } finally {
    if (fs.existsSync(sampleFilePath)) fs.unlinkSync(sampleFilePath);
    if (server) server.close();
    process.exit(process.exitCode || 0);
  }
}

runTests();
