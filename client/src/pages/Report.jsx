import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../auth/AuthContext';
import { CSVLink } from 'react-csv';
import * as XLSX from 'xlsx';

export default function Report() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.roles?.includes('admin');

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  const [filters, setFilters] = useState({
    project: '',
    manager: '',
    writer: '',
    month: '',
    status: ''
  });

  const formatReadableDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  function formatDateWithDiff(current, previous) {
    if (!current) return '—';
    const currentDate = new Date(current);
    const formattedDate = formatReadableDate(current);
    if (!previous) return formattedDate;
    const previousDate = new Date(previous);
    const diffTime = currentDate - previousDate;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return `${formattedDate} (${diffDays + 1}d)`;
  }

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (filters.project && item.project !== filters.project) return false;
      if (filters.manager && item.managerName !== filters.manager) return false;
      if (filters.writer && item.writerName !== filters.writer) return false;
      if (filters.month && item.month !== filters.month) return false;

      if (filters.status) {
        if (filters.status === 'assigned' && !item.writerAssignedAt) return false;
        if (filters.status === 'submitted' && !item.writerSubmittedAt) return false;
        if (filters.status === 'published' && !item.publishedAt) return false;
      }
      return true;
    });
  }, [filters, data]);

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      total: filteredData.length,
      assigned: filteredData.filter(d => d.writerAssignedAt && !d.writerSubmittedAt).length,
      submitted: filteredData.filter(d => d.writerSubmittedAt && !d.publishedAt).length,
      published: filteredData.filter(d => d.publishedAt).length
    };
  }, [filteredData]);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const res = await api.get('/getDashboardData');
        setData(res.data?.data || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load report data');
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, []);

  const unique = (key) =>
    [...new Set(data.map(d => d[key]).filter(Boolean))];

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredData.map(item => ({
        Project: item.project,
        Topic: item.topic,
        Month: item.month,
        Manager: item.managerName,
        Writer: item.writerName,
        Assigned: formatReadableDate(item.writerAssignedAt),
        Submitted: formatReadableDate(item.writerSubmittedAt),
        Published: formatReadableDate(item.publishedAt)
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, 'content-report.xlsx');
  };

  const csvHeaders = [
    { label: 'Project', key: 'project' },
    { label: 'Topic', key: 'topic' },
    { label: 'Month', key: 'month' },
    { label: 'Manager', key: 'managerName' },
    { label: 'Writer', key: 'writerName' },
    { label: 'Assigned', key: 'writerAssignedAt' },
    { label: 'Submitted', key: 'writerSubmittedAt' },
    { label: 'Published', key: 'publishedAt' }
  ];

  const clearFilters = () => {
    setFilters({
      project: '',
      manager: '',
      writer: '',
      month: '',
      status: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(f => f !== '');

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div className="container py-4">
        {/* Header */}
        <div className="mb-4">
          <div className="d-flex align-items-center gap-2 mb-2">
            <h2 className="mb-0 fw-bold">📊 Lifetime Content Report</h2>
          </div>
          <p className="text-muted mb-0">Comprehensive overview of all content activities</p>
        </div>

        {/* Statistics Cards */}
        <div className="row g-3 mb-4">
          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #0d6efd' }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="text-muted mb-1 small text-uppercase fw-semibold">Total Articles</p>
                    <h3 className="mb-0 fw-bold text-primary">{stats.total}</h3>
                  </div>
                  <div className="fs-1 text-primary opacity-25">📄</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #ffc107' }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="text-muted mb-1 small text-uppercase fw-semibold">Assigned</p>
                    <h3 className="mb-0 fw-bold text-warning">{stats.assigned}</h3>
                  </div>
                  <div className="fs-1 text-warning opacity-25">✍️</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #0dcaf0' }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="text-muted mb-1 small text-uppercase fw-semibold">Submitted</p>
                    <h3 className="mb-0 fw-bold text-info">{stats.submitted}</h3>
                  </div>
                  <div className="fs-1 text-info opacity-25">📝</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6">
            <div className="card border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #198754' }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <p className="text-muted mb-1 small text-uppercase fw-semibold">Published</p>
                    <h3 className="mb-0 fw-bold text-success">{stats.published}</h3>
                  </div>
                  <div className="fs-1 text-success opacity-25">✅</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            {/* Actions Bar */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
              <div className="d-flex gap-2">
                <button
                  className={`btn ${showFilters ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  🔍 {showFilters ? 'Hide' : 'Show'} Filters
                  {hasActiveFilters && (
                    <span className="badge bg-light text-primary ms-2">
                      {Object.values(filters).filter(f => f !== '').length}
                    </span>
                  )}
                </button>
                
                {hasActiveFilters && (
                  <button
                    className="btn btn-outline-secondary"
                    onClick={clearFilters}
                  >
                    ✖️ Clear All
                  </button>
                )}
              </div>

              <div className="d-flex gap-2">
                <CSVLink
                  data={filteredData}
                  headers={csvHeaders}
                  filename="content-report.csv"
                  className="btn btn-outline-success"
                >
                  ⬇️ Export CSV
                </CSVLink>
                <button
                  className="btn btn-outline-primary"
                  onClick={exportToExcel}
                >
                  ⬇️ Export Excel
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-light rounded p-4 mb-4 border">
                <h6 className="fw-semibold mb-3">🔎 Filter Results</h6>
                
                <div className="row g-3">
                  <div className="col-lg-3 col-md-6">
                    <label className="form-label small fw-semibold text-muted">PROJECT</label>
                    <select
                      className="form-select"
                      value={filters.project}
                      onChange={e =>
                        setFilters({ ...filters, project: e.target.value })
                      }
                    >
                      <option value="">All Projects</option>
                      {unique('project').map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-lg-3 col-md-6">
                    <label className="form-label small fw-semibold text-muted">MANAGER</label>
                    <select
                      className="form-select"
                      value={filters.manager}
                      onChange={e =>
                        setFilters({ ...filters, manager: e.target.value })
                      }
                    >
                      <option value="">All Managers</option>
                      {unique('managerName').map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-lg-3 col-md-6">
                    <label className="form-label small fw-semibold text-muted">WRITER</label>
                    <select
                      className="form-select"
                      value={filters.writer}
                      onChange={e =>
                        setFilters({ ...filters, writer: e.target.value })
                      }
                    >
                      <option value="">All Writers</option>
                      {unique('writerName').map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-lg-3 col-md-6">
                    <label className="form-label small fw-semibold text-muted">MONTH</label>
                    <select
                      className="form-select"
                      value={filters.month}
                      onChange={e =>
                        setFilters({ ...filters, month: e.target.value })
                      }
                    >
                      <option value="">All Months</option>
                      {unique('month').map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-lg-3 col-md-6">
                    <label className="form-label small fw-semibold text-muted">STATUS</label>
                    <select
                      className="form-select"
                      value={filters.status}
                      onChange={e =>
                        setFilters({ ...filters, status: e.target.value })
                      }
                    >
                      <option value="">All Status</option>
                      <option value="assigned">✍️ Assigned (Not Submitted)</option>
                      <option value="submitted">📝 Submitted (Not Published)</option>
                      <option value="published">✅ Published</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} />
                <p className="text-muted">Loading report data...</p>
              </div>
            ) : error ? (
              <div className="alert alert-danger">
                <strong>⚠️ Error:</strong> {error}
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                      <tr>
                        <th className="fw-semibold py-3">Project</th>
                        <th className="fw-semibold py-3">Topic</th>
                        <th className="fw-semibold py-3">Month</th>
                        <th className="fw-semibold py-3">Manager</th>
                        <th className="fw-semibold py-3">Assigned</th>
                        <th className="fw-semibold py-3">Writer</th>
                        <th className="fw-semibold py-3">Submitted</th>
                        <th className="fw-semibold py-3">Published</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="text-center py-5">
                            <div className="fs-1 mb-3">📭</div>
                            <p className="text-muted mb-2 fw-semibold">No records found</p>
                            {hasActiveFilters && (
                              <button
                                className="btn btn-sm btn-outline-primary mt-2"
                                onClick={clearFilters}
                              >
                                Clear Filters to Show All
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredData.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                            <td className="fw-semibold">{item.project}</td>
                            <td>{item.topic}</td>
                            <td>
                              <span className="badge bg-light text-dark border">
                                📅 {item.month}
                              </span>
                            </td>
                            <td>{item.managerName}</td>
                            <td className="text-muted small">{formatReadableDate(item.writerAssignedAt)}</td>
                            <td>{item.writerName}</td>
                            <td className="text-muted small">{formatDateWithDiff(item.writerSubmittedAt, item.writerAssignedAt)}</td>
                            <td className="text-muted small">{formatDateWithDiff(item.publishedAt, item.writerSubmittedAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Results Count */}
                {filteredData.length > 0 && (
                  <div className="mt-3 pt-3 border-top">
                    <small className="text-muted">
                      📊 Showing <strong>{filteredData.length}</strong> of <strong>{data.length}</strong> total records
                      {hasActiveFilters && ' (filtered)'}
                    </small>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}