import React, { useState } from 'react';
import { requestApi } from '../../services/api';
import {
  ClipboardCheck,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
} from 'lucide-react';

const CEOApprovalModal = ({ isOpen, onClose, request, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  if (!isOpen || !request) return null;

  const handleApprove = async () => {
    setError('');
    setLoading(true);
    try {
      await requestApi.ceoApprove(request._id, 'approve');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi duyệt');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError('Vui lòng nhập lý do từ chối yêu cầu mua sắm');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await requestApi.ceoApprove(request._id, 'reject', rejectReason.trim());
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi từ chối');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">CEO Phê Duyệt Yêu Cầu Vật Tư</h3>
              <p className="text-xs text-slate-500">Mã yêu cầu: <strong className="font-mono text-purple-700">{request.code}</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="text-slate-500 uppercase tracking-wider text-[11px] font-bold">Dự án công trình:</div>
            <div className="text-sm font-bold text-slate-900">{request.projectName}</div>
            <div className="text-slate-500">
              Người lập: <strong>{request.createdBy?.fullName || 'Trưởng công trình'}</strong>
            </div>
          </div>

          {request.materialRequestId && (
            <div className="flex items-center gap-2 p-2.5 bg-cyan-50 border border-cyan-200 rounded-xl text-cyan-900 text-[11px]">
              <span className="font-bold">📦 Tách đơn tự động từ Kho:</span>
              <span>Vật tư thiếu đã được Quản lý kho kiểm tra và chuyển CEO duyệt mua sắm ngoài.</span>
            </div>
          )}

          <div>
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
              Danh sách vật tư đề xuất:
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Tên vật tư</th>
                    <th className="py-2 px-3">Số lượng</th>
                    <th className="py-2 px-3">Đơn vị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {request.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-medium text-slate-900">{it.name}</td>
                      <td className="py-2 px-3 font-bold text-blue-600">{it.quantity}</td>
                      <td className="py-2 px-3 text-slate-500">{it.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {request.note && (
            <div className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 italic">
              "Ghi chú: {request.note}"
            </div>
          )}

          {isRejecting && (
            <div className="space-y-1.5 p-3 bg-rose-50 border border-rose-200 rounded-xl animate-in fade-in">
              <label className="block text-xs font-bold text-rose-800 uppercase tracking-wider">
                Lý do CEO từ chối <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do chi tiết..."
                className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg outline-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            {!isRejecting ? (
              <button
                type="button"
                onClick={() => setIsRejecting(true)}
                className="px-4 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" /> Từ chối
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReject}
                disabled={loading}
                className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition"
              >
                {loading ? 'Đang gửi...' : 'Xác nhận Từ chối'}
              </button>
            )}

            <button
              type="button"
              onClick={handleApprove}
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Đang duyệt...' : 'CEO Phê Duyệt Cấp Vật Tư'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CEOApprovalModal;
