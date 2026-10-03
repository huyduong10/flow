import React, { useState, useEffect } from 'react';
import { warehouseApi } from '../../services/api';
import {
  X,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
  Package,
  Layers,
  FileText,
  User,
  Building,
  Calendar,
  Send,
  Loader2,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

const WarehouseInspectionModal = ({ isOpen, onClose, request, onSuccess }) => {
  // Map of itemId -> stockSuppliedQty
  const [suppliedQuantities, setSuppliedQuantities] = useState({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Khi modal mở hoặc request thay đổi, khởi tạo giá trị
  useEffect(() => {
    if (request && request.items) {
      const initialMap = {};
      request.items.forEach((item) => {
        // Mặc định khởi tạo bằng stockSuppliedQty sẵn có hoặc 0
        initialMap[item._id] = item.stockSuppliedQty !== undefined ? item.stockSuppliedQty : 0;
      });
      setSuppliedQuantities(initialMap);
      setNotes(request.warehouseNotes || '');
      setError('');
    }
  }, [request]);

  if (!isOpen || !request) return null;

  // Xử lý thay đổi số lượng từng món
  const handleQuantityChange = (itemId, val, maxQty) => {
    setError('');
    let numVal = val === '' ? '' : Number(val);
    if (numVal !== '' && numVal < 0) numVal = 0;
    if (numVal !== '' && numVal > maxQty) numVal = maxQty;

    setSuppliedQuantities((prev) => ({
      ...prev,
      [itemId]: numVal,
    }));
  };

  // Nút thao tác nhanh: Xuất đủ
  const handleSetFull = (itemId, maxQty) => {
    setSuppliedQuantities((prev) => ({
      ...prev,
      [itemId]: maxQty,
    }));
  };

  // Nút thao tác nhanh: Hết hàng (0)
  const handleSetZero = (itemId) => {
    setSuppliedQuantities((prev) => ({
      ...prev,
      [itemId]: 0,
    }));
  };

  // Nút hàng loạt: Xuất đủ tất cả
  const handleSetAllFull = () => {
    const updated = {};
    request.items.forEach((item) => {
      updated[item._id] = item.requestedQty;
    });
    setSuppliedQuantities(updated);
  };

  // Nút hàng loạt: Hết hàng tất cả
  const handleSetAllZero = () => {
    const updated = {};
    request.items.forEach((item) => {
      updated[item._id] = 0;
    });
    setSuppliedQuantities(updated);
  };

  // Tính toán số liệu thống kê realtime
  let totalRequested = 0;
  let totalStockSupplied = 0;
  let totalPurchaseNeeded = 0;
  let shortageItemsCount = 0;
  let isAnyEmpty = false;

  request.items.forEach((item) => {
    const requested = item.requestedQty;
    const suppliedRaw = suppliedQuantities[item._id];
    if (suppliedRaw === '' || suppliedRaw === undefined) {
      isAnyEmpty = true;
    }
    const supplied = Number(suppliedRaw) || 0;
    const purchase = Math.max(0, requested - supplied);

    totalRequested += requested;
    totalStockSupplied += supplied;
    totalPurchaseNeeded += purchase;
    if (purchase > 0) {
      shortageItemsCount++;
    }
  });

  // Xác định kịch bản hiện tại
  // Kịch bản 1: Đủ 100% (purchaseQty === 0 toàn bộ)
  // Kịch bản 2: Cấp 1 phần (có stockSuppliedQty > 0 và có purchaseQty > 0)
  // Kịch bản 3: Hết sạch (stockSuppliedQty === 0 toàn bộ)
  let scenarioType = 'FULL_STOCK';
  if (totalPurchaseNeeded > 0) {
    scenarioType = totalStockSupplied > 0 ? 'PARTIAL_STOCK' : 'ZERO_STOCK';
  }

  // Gửi dữ liệu kiểm kho lên server
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isAnyEmpty) {
      setError('Vui lòng nhập đầy đủ số lượng xuất kho cho tất cả các dòng vật tư.');
      return;
    }

    const payloadItems = request.items.map((item) => ({
      itemId: item._id,
      stockSuppliedQty: Number(suppliedQuantities[item._id]) || 0,
    }));

    setLoading(true);
    try {
      const res = await warehouseApi.checkStock(request._id, {
        items: payloadItems,
        notes: notes.trim(),
      });

      if (res.data && res.data.success) {
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        setError(res.data?.message || 'Có lỗi xảy ra khi xử lý đơn kiểm kho.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Không thể kết nối đến máy chủ để xử lý đơn.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Module Quản lý kho
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Kiểm tra tồn kho & Tách đơn cấp vật tư
              </h2>
            </div>
          </div>

          {/* Request Header Info Card */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/5 border border-white/10 rounded-xl p-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px]">Mã phiếu vật tư:</span>
                <span className="font-bold text-white font-mono text-sm">{request.requestCode}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Building className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400 block text-[10px]">Công trình / Dự án:</span>
                <span className="font-semibold text-white truncate block">{request.project}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px]">Trưởng công trình yêu cầu:</span>
                <span className="font-semibold text-white">
                  {request.requestedBy?.fullName || 'Trưởng thi công'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-shake">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Bulk Action Tools */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Danh sách vật tư yêu cầu ({request.items?.length || 0} món)</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Thao tác nhanh cả đơn:</span>
              <button
                type="button"
                onClick={handleSetAllFull}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-medium transition"
              >
                ✓ Xuất đủ tất cả
              </button>
              <button
                type="button"
                onClick={handleSetAllZero}
                className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-medium transition"
              >
                ✕ Hết hàng tất cả
              </button>
            </div>
          </div>

          {/* Interactive Inspection Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-4">Tên vật tư</th>
                  <th className="py-3 px-3 text-center">ĐVT</th>
                  <th className="py-3 px-4 text-right">Số lượng yêu cầu</th>
                  <th className="py-3 px-4 w-64 text-center">Số lượng kho xuất</th>
                  <th className="py-3 px-4 text-center">Thiếu cần mua ngoài</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {request.items?.map((item, index) => {
                  const supplied = suppliedQuantities[item._id];
                  const numericSupplied = supplied === '' ? 0 : Number(supplied);
                  const shortage = Math.max(0, item.requestedQty - numericSupplied);
                  const isFull = numericSupplied >= item.requestedQty;

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-3 text-center font-mono text-slate-400">
                        {index + 1}
                      </td>

                      {/* Cột 1: Tên vật tư */}
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {item.materialName}
                      </td>

                      {/* Cột 2: Đơn vị tính */}
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-mono font-medium">
                          {item.unit}
                        </span>
                      </td>

                      {/* Cột 3: Số lượng yêu cầu (Chỉ đọc) */}
                      <td className="py-3 px-4 text-right font-bold text-slate-800 font-mono text-sm">
                        {item.requestedQty}
                      </td>

                      {/* Cột 4: Số lượng kho xuất (Input tương tác + Nút nhanh) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 justify-center">
                          <input
                            type="number"
                            min="0"
                            max={item.requestedQty}
                            step="any"
                            value={supplied}
                            onChange={(e) =>
                              handleQuantityChange(item._id, e.target.value, item.requestedQty)
                            }
                            className={`w-24 px-2.5 py-1.5 rounded-lg border text-right font-mono font-bold text-sm focus:outline-none focus:ring-2 transition ${
                              isFull
                                ? 'border-emerald-300 bg-emerald-50/50 text-emerald-800 focus:ring-emerald-400'
                                : numericSupplied === 0
                                ? 'border-rose-300 bg-rose-50/40 text-rose-800 focus:ring-rose-400'
                                : 'border-amber-300 bg-amber-50/40 text-amber-900 focus:ring-amber-400'
                            }`}
                          />

                          {/* Nút bấm nhanh Xuất đủ */}
                          <button
                            type="button"
                            onClick={() => handleSetFull(item._id, item.requestedQty)}
                            title="Xuất đủ 100%"
                            className="px-2 py-1 text-[11px] rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-medium transition"
                          >
                            Đủ
                          </button>

                          {/* Nút bấm nhanh Hết hàng */}
                          <button
                            type="button"
                            onClick={() => handleSetZero(item._id)}
                            title="Kho hết hàng (0)"
                            className="px-2 py-1 text-[11px] rounded-md bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 font-medium transition"
                          >
                            Hết
                          </button>
                        </div>
                      </td>

                      {/* Cột 5: Thiếu cần mua ngoài */}
                      <td className="py-3 px-4 text-center">
                        {shortage > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              Thiếu: {shortage} {item.unit}
                            </span>
                            <span className="text-[10px] text-rose-600 font-medium mt-0.5">
                              Cần chuyển CEO duyệt mua
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Đủ từ kho
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Ghi chú của thủ kho */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Ghi chú của thủ kho (Lý do thiếu hàng, thời gian bàn giao, lưu ý đặc biệt):
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Xi măng sẵn có tại kho 1, thép D16 đang tạm hết phải chờ nhập thêm..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
            />
          </div>

          {/* Khu vực thông báo tóm tắt kịch bản trước khi bấm Submit */}
          <div
            className={`p-4 rounded-xl border transition-all duration-300 ${
              scenarioType === 'FULL_STOCK'
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                : scenarioType === 'PARTIAL_STOCK'
                ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                : 'bg-rose-50/90 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl mt-0.5 ${
                  scenarioType === 'FULL_STOCK'
                    ? 'bg-emerald-100 text-emerald-700'
                    : scenarioType === 'PARTIAL_STOCK'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {scenarioType === 'FULL_STOCK' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 text-xs space-y-1">
                <div className="font-bold text-sm tracking-tight flex items-center justify-between">
                  <span>
                    {scenarioType === 'FULL_STOCK' && 'KỊCH BẢN 1: ĐÁP ỨNG ĐỦ 100% TỒN KHO'}
                    {scenarioType === 'PARTIAL_STOCK' &&
                      `KỊCH BẢN 2: CẤP MỘT PHẦN & TỰ ĐỘNG TÁCH ĐƠN MUA (${shortageItemsCount} MÓN THIẾU)`}
                    {scenarioType === 'ZERO_STOCK' &&
                      `KỊCH BẢN 3: KHO HẾT HÀNG - CHUYỂN TOÀN BỘ ${shortageItemsCount} MÓN CHO CEO`}
                  </span>

                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/70 shadow-sm border">
                    Xuất: {totalStockSupplied} / Mua: {totalPurchaseNeeded}
                  </span>
                </div>

                <p className="text-slate-700 font-medium leading-relaxed">
                  {scenarioType === 'FULL_STOCK' && (
                    <>
                      ✅ <strong>Hệ thống sẽ tạo phiếu xuất kho bàn giao trực tiếp cho công trường.</strong>{' '}
                      Trạng thái đơn chuyển sang <em>"Chờ công trường nhận"</em> và lưu mốc thời gian bàn giao.
                    </>
                  )}
                  {scenarioType === 'PARTIAL_STOCK' && (
                    <>
                      ⚠️ <strong>Hệ thống sẽ xuất kho phần sẵn có và tự động lập đơn mua sắm cho {shortageItemsCount} món gửi lên Ban Giám đốc.</strong>{' '}
                      Công trường sẽ nhận trước phần hàng đã có, đồng thời CEO duyệt mua ngoài phần còn lại.
                    </>
                  )}
                  {scenarioType === 'ZERO_STOCK' && (
                    <>
                      ⚠️ <strong>Kho hoàn toàn không có hàng.</strong>{' '}
                      Hệ thống sẽ tự động lập phiếu mua sắm mới cho toàn bộ {shortageItemsCount} món và chuyển thẳng lên CEO phê duyệt mua ngoài.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 transition active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý tách đơn...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Xác nhận & Xử lý đơn</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WarehouseInspectionModal;
