import React, { useState, useEffect } from 'react';
import { warehouseApi } from '../../services/api';
import { formatDate, MATERIAL_REQUEST_STATUS } from '../../utils/constants';
import WarehouseInspectionModal from './WarehouseInspectionModal';
import {
  Warehouse,
  Search,
  RefreshCw,
  Clock,
  Building,
  User,
  Package,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Boxes,
  Layers,
  Sparkles,
} from 'lucide-react';

const WarehousePendingListPage = () => {
  const [requests, setRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'

  // Modal inspection state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  // Load danh sách đơn chờ kho
  const fetchPendingRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await warehouseApi.getPendingRequests({ search });
      if (res.data && res.data.success) {
        setRequests(res.data.data || []);
      } else {
        setError(res.data?.message || 'Không thể tải danh sách đơn.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Lỗi kết nối khi tải danh sách đơn chờ kho.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Load lịch sử kho
  const fetchHistoryRequests = async () => {
    try {
      const res = await warehouseApi.getHistory();
      if (res.data && res.data.success) {
        setHistoryRequests(res.data.data || []);
      }
    } catch (err) {
      console.error('fetchHistoryRequests error:', err);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    fetchHistoryRequests();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPendingRequests();
  };

  // Mở modal kiểm tra tồn kho
  const handleOpenInspection = (req) => {
    setSelectedRequest(req);
    setIsModalOpen(true);
  };

  // Callback khi hoàn tất kiểm tra kho và tách đơn
  const handleInspectionSuccess = (response) => {
    setNotification({
      type: 'success',
      message: response.message || 'Đã kiểm tra kho và tách đơn thành công.',
    });
    fetchPendingRequests();
    fetchHistoryRequests();

    // Tự động tắt thông báo sau 6 giây
    setTimeout(() => {
      setNotification(null);
    }, 6000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-semibold">
              <Warehouse className="w-3.5 h-3.5" />
              <span>Phân hệ Quản lý kho công trình</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Kiểm tra tồn kho & Tách đơn cấp vật tư
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Tiếp nhận yêu cầu từ Trưởng thi công, đối soát số lượng tồn kho thực tế. Hệ thống tự động
              xuất kho phần sẵn có và lập tức tách đơn mua ngoài cho phần thiếu gửi CEO duyệt.
            </p>
          </div>

          {/* Quick Stats Widget */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/10 shrink-0">
            <div className="text-center border-r border-white/10 pr-4">
              <span className="text-[11px] text-slate-300 block font-medium">Chờ kiểm kho</span>
              <span className="text-2xl font-black text-amber-400 font-mono">
                {requests.length}
              </span>
            </div>
            <div className="text-center pl-1">
              <span className="text-[11px] text-slate-300 block font-medium">Đã xử lý xong</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {historyRequests.filter((r) => r.status !== 'PENDING_WAREHOUSE').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification Alert */}
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <strong className="font-bold text-sm block">Thao tác thành công!</strong>
              <span>{notification.message}</span>
            </div>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Đơn chờ kiểm tra</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-mono">
              {requests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4 text-blue-500" />
            <span>Lịch sử xuất kho & Tách đơn</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
              {historyRequests.length}
            </span>
          </button>
        </div>

        {/* Search & Refresh Form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã phiếu, dự án..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={fetchPendingRequests}
            title="Làm mới danh sách"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </form>
      </div>

      {/* Main Content Area */}
      {activeTab === 'pending' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-900">
                Danh sách phiếu cấp vật tư đang chờ kiểm tra tồn kho
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Hiển thị {requests.length} phiếu
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
              <p className="text-xs">Đang tải danh sách phiếu chờ kho...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-xs font-semibold text-slate-600">
                Kho đã xử lý hết mọi yêu cầu! Không có phiếu vật tư nào đang chờ.
              </p>
              <p className="text-[11px] text-slate-400">
                Khi Trưởng thi công gửi đơn mới, phiếu sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3.5 px-4">Mã phiếu</th>
                    <th className="py-3.5 px-4">Dự án / Công trình</th>
                    <th className="py-3.5 px-4">Người yêu cầu</th>
                    <th className="py-3.5 px-4">Ngày tạo</th>
                    <th className="py-3.5 px-4 text-center">Tổng số hạng mục</th>
                    <th className="py-3.5 px-4 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((req) => (
                    <tr key={req._id} className="hover:bg-slate-50/70 transition group">
                      {/* Cột 1: Mã phiếu */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg text-xs group-hover:bg-blue-50 group-hover:text-blue-700 transition">
                            {req.requestCode}
                          </span>
                        </div>
                      </td>

                      {/* Cột 2: Dự án */}
                      <td className="py-4 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{req.project}</span>
                        </div>
                      </td>

                      {/* Cột 3: Người yêu cầu */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {req.requestedBy?.fullName?.charAt(0) || 'T'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 block text-xs">
                              {req.requestedBy?.fullName || 'Trưởng thi công'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {req.requestedBy?.phone || req.requestedBy?.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 4: Ngày tạo */}
                      <td className="py-4 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDate(req.createdAt)}
                      </td>

                      {/* Cột 5: Tổng số hạng mục */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono font-bold text-xs">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          {req.items?.length || 0} vật tư
                        </span>
                      </td>

                      {/* Cột 6: Nút Kiểm tra tồn kho */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleOpenInspection(req)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95"
                        >
                          <Warehouse className="w-3.5 h-3.5" />
                          <span>Kiểm tra tồn kho</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Tab Lịch sử kho */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Lịch sử các phiếu vật tư đã xử lý tại kho
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Tổng {historyRequests.length} phiếu
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4">Mã phiếu</th>
                  <th className="py-3.5 px-4">Dự án</th>
                  <th className="py-3.5 px-4">Trạng thái hiện tại</th>
                  <th className="py-3.5 px-4 text-center">Tỷ lệ xuất kho</th>
                  <th className="py-3.5 px-4">Đơn mua sắm kèm theo</th>
                  <th className="py-3.5 px-4">Thời gian cập nhật</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyRequests.map((req) => {
                  const statusConfig = MATERIAL_REQUEST_STATUS[req.status] || {
                    label: req.status,
                    color: 'bg-slate-100 text-slate-700',
                  };

                  let totalReq = 0;
                  let totalStock = 0;
                  req.items?.forEach((i) => {
                    totalReq += i.requestedQty || 0;
                    totalStock += i.stockSuppliedQty || 0;
                  });
                  const percentage = totalReq > 0 ? Math.round((totalStock / totalReq) * 100) : 0;

                  return (
                    <tr key={req._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-4 font-mono font-bold text-slate-800">
                        {req.requestCode}
                      </td>
                      <td className="py-4 px-4 font-medium text-slate-800">{req.project}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                percentage === 100
                                  ? 'bg-emerald-500'
                                  : percentage > 0
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-bold">{percentage}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {req.procurementRequestId ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-mono text-[11px] font-bold">
                            <FileText className="w-3 h-3" />
                            {req.procurementRequestId.code || 'Đơn mua ngoài'}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Không có (đủ kho)</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDate(req.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal kiểm tra tồn kho */}
      <WarehouseInspectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        request={selectedRequest}
        onSuccess={handleInspectionSuccess}
      />
    </div>
  );
};

export default WarehousePendingListPage;
