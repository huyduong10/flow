import React, { useState, useEffect } from 'react';
import { projectApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ROLES, formatCurrency } from '../../utils/constants';
import { FolderGit2, Loader2 } from 'lucide-react';

/**
 * Reusable ProjectSelect dropdown component
 * @param {string} value - Current project _id
 * @param {function} onChange - Callback (projectId, projectObject)
 * @param {boolean} allowAll - Cho phép tùy chọn "Tất cả dự án"
 * @param {boolean} assignedOnly - Chỉ hiển thị dự án được phân công (cho Trưởng thi công)
 * @param {boolean} showBudget - Hiển thị ngân sách bên cạnh tên dự án
 */
export const ProjectSelect = ({
  value = '',
  onChange,
  allowAll = false,
  assignedOnly = false,
  showBudget = false,
  disabled = false,
  required = false,
  className = '',
  placeholder = 'Chọn dự án...',
  label = null,
}) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await projectApi.getAll({
          assignedOnly: assignedOnly ? 'true' : undefined,
        });
        if (isMounted && res.data.success) {
          setProjects(res.data.data || []);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách dự án:', err);
        if (isMounted) setError('Không thể tải danh sách dự án');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProjects();

    const handleProjectCreated = () => {
      fetchProjects();
    };
    window.addEventListener('project-created', handleProjectCreated);

    return () => {
      isMounted = false;
      window.removeEventListener('project-created', handleProjectCreated);
    };
  }, [user?.role, assignedOnly, allowAll]);

  const handleChange = (e) => {
    const selectedId = e.target.value;
    const projectObj = projects.find((p) => p._id === selectedId) || null;
    if (onChange) {
      onChange(selectedId, projectObj);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        <FolderGit2 className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
        <select
          value={value || ''}
          onChange={handleChange}
          disabled={disabled || loading}
          required={required}
          className={`w-full pl-9 pr-8 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none cursor-pointer transition-colors ${
            error ? 'border-rose-300' : ''
          }`}
        >
          {allowAll && <option value="">-- Tất cả dự án --</option>}
          {!allowAll && !value && <option value="">{placeholder}</option>}
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              [{p.code}] {p.name}{' '}
              {showBudget && p.allocatedBudget
                ? `(Ngân sách: ${formatCurrency(p.allocatedBudget)})`
                : ''}
            </option>
          ))}
        </select>
        {loading ? (
          <Loader2 className="absolute right-3 w-4 h-4 text-blue-500 animate-spin pointer-events-none" />
        ) : (
          <div className="absolute right-3 pointer-events-none text-gray-400 text-xs">▼</div>
        )}
      </div>
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
};

export default ProjectSelect;
