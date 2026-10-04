import React, { useState, useEffect } from 'react';
import { paymentApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ROLES,
  STATUS_LABELS,
  formatCurrency,
  formatDate,
} from '../../utils/constants';
import {
  Receipt,
  Search,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Banknote,
  FileText,
  AlertCircle,
  Building2,
} from 'lucide-react';

/**
 * PaymentProposalList component
 * Bảng danh sách đề xuất thanh toán, tự động lọc lại khi projectId thay đổi
 * @param {string} projectId - ID dự án được chọn từ ProjectSelect
 * @param {function} onApprove - Callback khi bấm duyệt
 * @param {function} onDisburse - Callback khi thủ quỹ bấm chi tiền
 */
export const PaymentProposalList = ({
  projectId = '',
  onApprove,
  onDisburse,
  refreshTrigger = 0,
}) => {
  const { user } = useAuth();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchProposals = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: 50 };
      if (projectId && projectId !== 'ALL') {
        params.projectId = projectId;
      }
      if (statusFilter) {
        params.status = statusFilter;
      }
      const res = await paymentApi.getAll(params);
      if (res.data.success) {
        setProposals(res.data.data || []);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách đề xuất thanh toán:', err);
      setError('Không thể tải danh sách đề xuất thanh toán');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [projectId, statusFilter, refreshTrigger]);

  const filteredProposals = proposals.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const codeMatch = p.code?.toLowerCase().includes(term);
    const vendorMatch =
      p.contract?.vendorName?.toLowerCase().includes(term) ||
      p.bankAccount?.accountName?.toLowerCase().includes(term);
    const projectMatch =
      p.projectId?.name?.toLowerCase().includes(term) ||
      p.projectId?.code?.toLowerCase().includes(term);
    return codeMatch || vendorMatch || projectMatch;
  });

  const isApprover = user?.role === ROLES.CEO || user?.role === ROLES.CHAIRMAN;
  const isTreasurer = user?.role === ROLES.TREASURER;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Header & Bộ lọc */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">
                Danh Sách Đề Xuất Thanh Toán (Payment Proposals)
              </h3>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full">
                {filteredProposals.length} phiếu
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {projectId
                ? 'Đang lọc dữ liệu theo Dự án được chọn'
                : 'Hiển thị toàn bộ đề xuất trên hệ thống'}
            </p>
          </div>
        </div>

        {/* Search & Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mã phiếu, NCC, dự án..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 w-52 shadow-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-700 shadow-sm"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING_CEO_APPROVAL">Chờ CEO duyệt</option>
            <option value="PENDING_CHAIRMAN">Chờ Chủ tịch duyệt</option>
            <option value="APPROVED_READY_TO_PAY">Sẵn sàng chi</option>
            <option value="PAID">Đã chi (PAID)</option>
            <option value="REJECTED">Bị từ chối</option>
          </select>

          <button
            onClick={fetchProposals}
            disabled={loading}
            className="p-2 text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition shadow-sm"
            title="Tải lại bảng"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Data */}
      {error ? (
        <div className="p-8 text-center text-xs text-rose-600 flex flex-col items-center gap-2">
          <AlertCircle className="w-6 h-6 text-rose-500" />
          <span>{error}</span>
          <button
            onClick={fetchProposals}
            className="text-xs font-semibold text-rose-700 underline mt-1"
          >
            Thử lại
          </button>
        </div>
      ) : loading && proposals.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2 animate-pulse">
          <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
          <span>Đang tải danh sách đề xuất thanh toán...</span>
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400">
          Không tìm thấy đề xuất thanh toán nào phù hợp với bộ lọc.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Mã Đề Xuất</th>
                <th className="py-3 px-4">Dự Án</th>
                <th className="py-3 px-4">Hợp Đồng / Nhà Cung Cấp</th>
                <th className="py-3 px-4 text-right">Số Tiền Đề Xuất</th>
                <th className="py-3 px-4">Tài Khoản Thụ Hưởng</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProposals.map((pm) => {
                const statusInfo = STATUS_LABELS[pm.status] || {
                  label: pm.status,
                  color: 'bg-slate-100 text-slate-700',
                };
                const isHighValue = (pm.proposedAmount || 0) >= 50000000;
                const isPaid = pm.status === 'PAID' || pm.disbursement?.status === 'PAID';

                return (
                  <tr
                    key={pm._id}
                    className="hover:bg-amber-50/20 transition-colors duration-150"
                  >
                    {/* Mã đề xuất & Ngày lập */}
                    <td className="py-3.5 px-4 font-medium">
                      <div className="font-mono text-xs font-bold text-amber-700 bg-amber-50 inline-block px-1.5 py-0.5 rounded border border-amber-200">
                        {pm.code}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {formatDate(pm.createdAt)}
                      </div>
                    </td>

                    {/* Dự án */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800 line-clamp-1">
                          {pm.projectId?.name || 'Dự án liên kết'}
                        </span>
                      </div>
                      {pm.projectId?.code && (
                        <span className="text-[10px] font-mono text-slate-500 ml-5 block">
                          [{pm.projectId.code}]
                        </span>
                      )}
                    </td>

                    {/* Hợp đồng & NCC */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {pm.contract?.vendorName || pm.bankAccount?.accountName}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span>HĐ: {pm.contract?.code || '-'}</span>
                      </div>
                    </td>

                    {/* Số tiền đề xuất */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-sm font-extrabold text-slate-900 block">
                        {formatCurrency(pm.proposedAmount)}
                      </span>
                      {isHighValue && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-0.5 border border-amber-200">
                          <ShieldAlert className="w-3 h-3 text-amber-600" />
                          <span>≥ 50 triệu (2 cấp)</span>
                        </span>
                      )}
                    </td>

                    {/* Tài khoản thụ hưởng */}
                    <td className="py-3.5 px-4 text-[11px]">
                      <div className="font-mono font-medium text-slate-800">
                        {pm.bankAccount?.accountNumber}
                      </div>
                      <div className="text-slate-500">
                        {pm.bankAccount?.bankName} ({pm.bankAccount?.branch || 'Hội sở'})
                      </div>
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                      {isPaid && pm.disbursement?.transactionCode && (
                        <div className="text-[10px] text-teal-700 font-mono mt-0.5">
                          UNC: {pm.disbursement.transactionCode}
                        </div>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* CEO / CHAIRMAN duyệt */}
                        {isApprover &&
                          pm.status !== 'APPROVED_READY_TO_PAY' &&
                          pm.status !== 'REJECTED' &&
                          !isPaid && (
                            <button
                              onClick={() => onApprove && onApprove(pm)}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition shadow-sm whitespace-nowrap"
                            >
                              Phê Duyệt
                            </button>
                          )}

                        {/* TREASURER chi tiền */}
                        {isTreasurer && pm.status === 'APPROVED_READY_TO_PAY' && (
                          <button
                            onClick={() => onDisburse && onDisburse(pm)}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition shadow-sm flex items-center gap-1 whitespace-nowrap"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>Chi Quỹ</span>
                          </button>
                        )}

                        {isPaid && (
                          <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                            Hoàn tất
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PaymentProposalList;
