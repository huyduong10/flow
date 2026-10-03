import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { materialRequestApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate, MATERIAL_REQUEST_STATUS, ROLES } from '../../utils/constants';
import SiteReceiptConfirmation from './SiteReceiptConfirmation';
import WarehouseInspectionModal from './WarehouseInspectionModal';
import {
  ArrowLeft,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Package,
  RefreshCw,
  User,
  Warehouse,
  FileText,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

const MaterialRequestDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isInspectionOpen, setIsInspectionOpen] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await materialRequestApi.getById(id);
      if (res.data && res.data.success) {
        setRequest(res.data.data);
      } else {
        setError(res.data?.message || 'Không tìm thấy yêu cầu cấp vật tư.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Lỗi kết nối khi tải chi tiết đơn vật tư.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
        <p className="text-xs">Đang tải thông tin đơn vật tư...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4 text-center">
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error || 'Không tìm thấy đơn yêu cầu cấp vật tư.'}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>
      </div>
    );
  }

  const statusConfig = MATERIAL_REQUEST_STATUS[request.status] || {
    label: request.status,
    color: 'bg-slate-100 text-slate-700',
  };

  const isWarehouseManager = user?.role === ROLES.WAREHOUSE_MANAGER;
  const isSiteManager = user?.role === ROLES.SITE_MANAGER;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold shadow-sm transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại</span>
      </button>

      {/* Main Request Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xl sm:text-2xl font-black text-slate-900">
                {request.requestCode}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig.color}`}
              >
                {statusConfig.label}
              </span>
            </div>
            <p className="text-slate-500 text-xs flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Khởi tạo lúc: {formatDate(request.createdAt)}</span>
            </p>
          </div>

          {/* Quick Action for Warehouse Manager */}
          {isWarehouseManager && request.status === 'PENDING_WAREHOUSE' && (
            <button
              onClick={() => setIsInspectionOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700"
            >
              <Warehouse className="w-4 h-4" />
              <span>Kiểm tra tồn kho ngay</span>
            </button>
          )}
        </div>

        {/* Project & Requester Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-2 text-slate-400 text-[11px] font-semibold">
              <Building className="w-3.5 h-3.5 text-blue-600" />
              <span>Công trình / Dự án:</span>
            </div>
            <div className="font-bold text-slate-900 text-xs sm:text-sm">{request.project}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-2 text-slate-400 text-[11px] font-semibold">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Người yêu cầu (Thi công):</span>
            </div>
            <div className="font-bold text-slate-900 text-xs sm:text-sm">
              {request.requestedBy?.fullName || 'Trưởng thi công'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {request.requestedBy?.phone || request.requestedBy?.email}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-2 text-slate-400 text-[11px] font-semibold">
              <Warehouse className="w-3.5 h-3.5 text-purple-600" />
              <span>Thủ kho kiểm tra:</span>
            </div>
            <div className="font-bold text-slate-900 text-xs sm:text-sm">
              {request.warehouseInspectorId?.fullName || '(Chưa kiểm tra)'}
            </div>
            {request.deliveredAt && (
              <div className="text-[10px] text-slate-400 font-mono">
                Xuất kho: {formatDate(request.deliveredAt)}
              </div>
            )}
          </div>
        </div>

        {/* SITE RECEIPT CONFIRMATION COMPONENT */}
        {/* Nằm trên trang chi tiết đơn của Site Manager */}
        {isSiteManager && (
          <SiteReceiptConfirmation
            materialRequest={request}
            onConfirmed={(updated) => setRequest(updated)}
          />
        )}

        {/* Danh sách vật tư */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Chi tiết danh mục vật tư ({request.items?.length || 0} món)</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-4">Tên vật tư</th>
                  <th className="py-3 px-3 text-center">ĐVT</th>
                  <th className="py-3 px-4 text-right">Yêu cầu</th>
                  <th className="py-3 px-4 text-right font-bold text-emerald-700">Kho thực cấp</th>
                  <th className="py-3 px-4 text-center">Mua ngoài</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {request.items?.map((item, index) => (
                  <tr key={item._id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3 text-center font-mono text-slate-400">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.materialName}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[11px]">
                        {item.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                      {item.requestedQty}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      {item.stockSuppliedQty || 0}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.purchaseQty > 0 ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                          Thiếu: {item.purchaseQty} {item.unit}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium text-[11px]">Đủ từ kho</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Liên kết phiếu mua ngoài (nếu có tách đơn) */}
        {request.procurementRequestId && (
          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <strong className="block text-sm">
                  Phiếu Mua Sắm Vật Tư Thiếu Đã Được Tách Tự Động
                </strong>
                <span className="text-purple-700">
                  Mã đơn mua ngoài:{' '}
                  <span className="font-mono font-bold">
                    {request.procurementRequestId.code || 'PR'}
                  </span>{' '}
                  (Trạng thái: {request.procurementRequestId.status})
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700"
            >
              <span>Xem trên Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Modal kiểm tra tồn kho */}
      <WarehouseInspectionModal
        isOpen={isInspectionOpen}
        onClose={() => setIsInspectionOpen(false)}
        request={request}
        onSuccess={() => fetchDetail()}
      />
    </div>
  );
};

export default MaterialRequestDetailPage;
