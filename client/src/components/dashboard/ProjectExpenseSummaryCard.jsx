import React, { useState, useEffect } from 'react';
import { projectApi } from '../../services/api';
import { formatCurrency } from '../../utils/constants';
import {
  Wallet,
  TrendingUp,
  Clock,
  PiggyBank,
  AlertTriangle,
  CheckCircle,
  Building2,
  RefreshCw,
} from 'lucide-react';

/**
 * ProjectExpenseSummaryCard widget
 * Hiển thị 4 chỉ số chi phí và thanh tiến độ giải ngân ngân sách
 * @param {string} projectId - ID dự án đang chọn (nếu rỗng/ALL -> tổng hợp toàn bộ)
 */
export const ProjectExpenseSummaryCard = ({ projectId, onRefresh }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await projectApi.getExpenseSummary(projectId || '');
      if (res.data.success) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải thống kê chi phí dự án:', err);
      setError('Không thể tải dữ liệu chi phí dự án');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [projectId]);

  if (loading && !summary) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm flex items-center justify-between">
        <span>{error}</span>
        <button
          onClick={fetchSummary}
          className="text-xs font-medium text-rose-800 underline hover:no-underline"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const {
    project,
    allocatedBudget = 0,
    actualSpent = 0,
    pendingSpent = 0,
    remainingBudget = 0,
    burnRate = 0,
    paidCount = 0,
    pendingCount = 0,
  } = summary || {};

  // Tính tỷ lệ % giải ngân và kiểm tra ngưỡng cảnh báo 90%
  const isOverBudget = remainingBudget < 0;
  const isHighAlert = burnRate >= 90;
  const isWarning = burnRate >= 70 && burnRate < 90;

  // Màu sắc của thanh tiến độ
  let progressBarColor = 'bg-emerald-500';
  let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let statusText = 'Ngân sách an toàn';

  if (isHighAlert || isOverBudget) {
    progressBarColor = 'bg-rose-600';
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
    statusText = isOverBudget ? 'Vượt quá ngân sách!' : 'Cảnh báo: Tiêu hao > 90% ngân sách!';
  } else if (isWarning) {
    progressBarColor = 'bg-amber-500';
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
    statusText = 'Chú ý: Đã giải ngân trên 70%';
  }

  const progressPercentage = Math.min(Math.max(burnRate, 0), 100);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 transition-all hover:shadow-md">
      {/* Header của Widget */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-gray-900 text-base">
                {project ? `[${project.code}] ${project.name}` : 'Tổng hợp Ngân sách & Chi phí'}
              </h3>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeColor}`}
              >
                {statusText}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {project
                ? `Chỉ huy trưởng: ${project.manager?.fullName || 'Chưa phân công'}`
                : 'Thống kê tổng hợp toàn bộ các dự án đang hoạt động'}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchSummary();
            if (onRefresh) onRefresh();
          }}
          disabled={loading}
          title="Làm mới số liệu"
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Cập nhật</span>
        </button>
      </div>

      {/* 4 Chỉ số chi phí chính */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* 1. Ngân sách được duyệt */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex items-start justify-between">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
                Ngân sách duyệt
              </span>
              <p className="text-lg font-bold text-slate-900">
                {formatCurrency(allocatedBudget)}
              </p>
              <span className="text-xs text-slate-400 mt-1 inline-block">
                Hạn mức phân bổ gốc
              </span>
            </div>
            <div className="p-2.5 bg-slate-200/70 text-slate-700 rounded-lg">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          {/* 2. Đã giải ngân (Xanh lá) */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-4 flex items-start justify-between">
            <div>
              <span className="text-xs font-medium text-emerald-700 uppercase tracking-wider block mb-1">
                Đã giải ngân
              </span>
              <p className="text-lg font-bold text-emerald-700">
                {formatCurrency(actualSpent)}
              </p>
              <span className="text-xs text-emerald-600 mt-1 inline-block">
                {paidCount} phiếu đã chi (PAID)
              </span>
            </div>
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* 3. Đang chờ duyệt (Vàng) */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-start justify-between">
            <div>
              <span className="text-xs font-medium text-amber-700 uppercase tracking-wider block mb-1">
                Đang chờ duyệt
              </span>
              <p className="text-lg font-bold text-amber-700">
                {formatCurrency(pendingSpent)}
              </p>
              <span className="text-xs text-amber-600 mt-1 inline-block">
                {pendingCount} đề xuất chờ xử lý
              </span>
            </div>
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* 4. Ngân sách còn lại */}
          <div
            className={`rounded-xl p-4 flex items-start justify-between border ${
              isOverBudget
                ? 'bg-rose-50 border-rose-300'
                : 'bg-indigo-50/70 border-indigo-200/80'
            }`}
          >
            <div>
              <span
                className={`text-xs font-medium uppercase tracking-wider block mb-1 ${
                  isOverBudget ? 'text-rose-700' : 'text-indigo-700'
                }`}
              >
                Ngân sách còn lại
              </span>
              <p
                className={`text-lg font-bold ${
                  isOverBudget ? 'text-rose-700' : 'text-indigo-800'
                }`}
              >
                {formatCurrency(remainingBudget)}
              </p>
              <span
                className={`text-xs mt-1 inline-block ${
                  isOverBudget ? 'text-rose-600 font-medium' : 'text-indigo-600'
                }`}
              >
                {isOverBudget ? 'Vượt quá hạn mức!' : 'Khả dụng cho các đợt tới'}
              </span>
            </div>
            <div
              className={`p-2.5 rounded-lg ${
                isOverBudget ? 'bg-rose-100 text-rose-700' : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              {isOverBudget ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <PiggyBank className="w-5 h-5" />
              )}
            </div>
          </div>
        </div>

        {/* Thanh tiến độ giải ngân (Progress Bar) */}
        <div>
          <div className="flex items-center justify-between text-xs font-medium mb-1.5">
            <div className="flex items-center space-x-1.5 text-gray-700">
              <span>Tiến độ giải ngân thực tế (Burn Rate):</span>
              <span
                className={`font-bold ${
                  isHighAlert ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {burnRate}%
              </span>
            </div>
            <div className="text-gray-500">
              Tổng cam kết (Đã chi + Chờ duyệt):{' '}
              <span className="font-semibold text-gray-800">
                {allocatedBudget > 0
                  ? (((actualSpent + pendingSpent) / allocatedBudget) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className={`h-full transition-all duration-700 ease-out rounded-full ${progressBarColor}`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>

          {isHighAlert && (
            <div className="mt-2 flex items-center space-x-1.5 text-xs text-rose-600 font-medium animate-pulse">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                Cảnh báo: Dự án đã giải ngân vượt quá 90% ngân sách phân bổ! Cần kiểm soát chặt chẽ
                các đề xuất thanh toán phát sinh.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectExpenseSummaryCard;
