import React, { useState } from 'react';
import { warehouseApi } from '../../services/api';
import { formatDate } from '../../utils/constants';
import {
  CheckCircle2,
  PackageCheck,
  Truck,
  Clock,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

/**
 * Component SiteReceiptConfirmation
 * Dành cho Trưởng thi công (SITE_MANAGER) trên trang chi tiết đơn vật tư.
 * Khi đơn ở trạng thái WAITING_SITE_CONFIRMATION, hiển thị Card thông báo nổi bật
 * kèm danh sách vật tư kho đã xuất và nút bấm "Xác nhận đã nhận đủ hàng từ kho".
 */
const SiteReceiptConfirmation = ({ materialRequest, onConfirmed }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!materialRequest) return null;

  // Chỉ hiển thị card hành động này khi đơn ở trạng thái WAITING_SITE_CONFIRMATION
  const isWaitingConfirmation =
    materialRequest.status === 'WAITING_SITE_CONFIRMATION';

  // Nếu đơn đã được xác nhận hoàn tất
  const isFulfilled =
    materialRequest.status === 'FULFILLED_BY_STOCK' ||
    (materialRequest.siteConfirmedAt && materialRequest.status !== 'WAITING_SITE_CONFIRMATION');

  const handleConfirmReceipt = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await warehouseApi.siteConfirm(materialRequest._id);
      if (res.data && res.data.success) {
        setSuccessMsg(res.data.message || 'Xác nhận nhận hàng thành công!');
        if (onConfirmed) {
          onConfirmed(res.data.data);
        }
      } else {
        setError(res.data?.message || 'Có lỗi xảy ra khi xác nhận nhận hàng.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Lỗi khi gọi API xác nhận nhận hàng.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Card khi đã nhận hàng thành công
  if (isFulfilled) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-950">
              Công trường đã xác nhận nhận hàng thành công
            </h4>
            <p className="text-xs text-emerald-700">
              Thời gian xác nhận:{' '}
              <span className="font-mono font-semibold">
                {formatDate(materialRequest.siteConfirmedAt)}
              </span>
            </p>
          </div>
        </div>

        {materialRequest.procurementRequestId && (
          <div className="mt-2 text-xs bg-white/70 p-3 rounded-xl border border-emerald-200 text-slate-700 flex items-center justify-between">
            <span>
              ℹ️ Phần hàng còn thiếu đã được chuyển sang phiếu mua ngoài của Ban Giám đốc:
            </span>
            <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              {materialRequest.procurementRequestId.code || 'Phiếu PR'}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Card nổi bật khi đang chờ Trưởng thi công xác nhận
  if (!isWaitingConfirmation) return null;

  return (
    <div className="rounded-2xl border-2 border-blue-400 bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-white p-5 sm:p-6 shadow-lg shadow-blue-500/10 space-y-4 relative overflow-hidden animate-in fade-in duration-300">
      <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-200/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
            <Truck className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 text-[10px] font-bold uppercase tracking-wider">
                Vật tư đã tới công trường
              </span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Yêu cầu xác nhận nhận hàng từ Quản lý kho
            </h3>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-xl border border-blue-200">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Xuất kho lúc: {formatDate(materialRequest.deliveredAt)}</span>
        </div>
      </div>

      {/* Error / Success message */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Ghi chú của thủ kho */}
      {materialRequest.warehouseNotes && (
        <div className="text-xs bg-white/90 p-3 rounded-xl border border-blue-200/80 text-slate-700 space-y-1">
          <span className="font-bold text-blue-900 block text-[11px]">
            💬 Ghi chú từ Thủ kho bàn giao:
          </span>
          <p className="italic text-slate-600 font-medium">
            "{materialRequest.warehouseNotes}"
          </p>
        </div>
      )}

      {/* Danh sách vật tư thực xuất */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-800 block">
          Chi tiết vật tư kho đã thực xuất:
        </span>
        <div className="rounded-xl border border-blue-200/80 bg-white overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold">
                <th className="py-2.5 px-3">Tên vật tư</th>
                <th className="py-2.5 px-3 text-center">ĐVT</th>
                <th className="py-2.5 px-3 text-right">Yêu cầu</th>
                <th className="py-2.5 px-3 text-right font-bold text-emerald-700">Thực xuất</th>
                <th className="py-2.5 px-3 text-center">Tình trạng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {materialRequest.items?.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/60">
                  <td className="py-2 px-3 font-semibold text-slate-800">{item.materialName}</td>
                  <td className="py-2 px-3 text-center text-slate-500">{item.unit}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600">
                    {item.requestedQty}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                    {item.stockSuppliedQty}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {item.purchaseQty > 0 ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Thiếu {item.purchaseQty} {item.unit} (chờ mua)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Đủ 100%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Thông tin tách đơn mua sắm (nếu có) */}
      {materialRequest.procurementRequestId && (
        <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200 text-purple-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
            <span>
              <strong>Lưu ý:</strong> Một số hạng mục thiếu đã được hệ thống tự động lập đơn mua sắm
              chuyển CEO phê duyệt.
            </span>
          </div>
          <span className="font-mono font-bold text-purple-700 bg-white px-2 py-1 rounded border border-purple-200">
            {materialRequest.procurementRequestId.code || 'PR-PENDING'}
          </span>
        </div>
      )}

      {/* Action Button */}
      <div className="pt-2 flex items-center justify-end gap-3">
        <button
          onClick={handleConfirmReceipt}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang lưu xác nhận...</span>
            </>
          ) : (
            <>
              <PackageCheck className="w-4 h-4" />
              <span>Xác nhận đã nhận đủ hàng từ kho</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SiteReceiptConfirmation;
