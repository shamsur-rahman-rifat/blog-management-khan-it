import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../auth/AuthContext';
import { CSVLink } from 'react-csv';
import * as XLSX from 'xlsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isAdmin = user?.roles?.includes('admin');
  const isManager = user?.roles?.includes('manager');
  const isWriter = user?.roles?.includes('writer');

  const [data, setData] = useState([]);
  const [projectsAssignedCount, setProjectsAssignedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function formatReadableDate(dateStr) {
    if (!dateStr) return '—';
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-GB', options);
  }

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

  // Admin stats function
  function getAdminStats(data) {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    let stats = {
      assignedThisMonth: 0,
      privateAssigned: 0,
      publicAssigned: 0,
      received: 0,
      privateReceived: 0,
      publicReceived: 0,
      published: 0,
      dueContent: 0,
      receivedNotPublished: 0
    };

    data.forEach(item => {
      const assignedDate = item.writerAssignedAt && new Date(item.writerAssignedAt);
      const submittedDate = item.writerSubmittedAt && new Date(item.writerSubmittedAt);
      const publishedDate = item.publishedAt && new Date(item.publishedAt);
      const isThisMonthAssigned = assignedDate && assignedDate.getMonth() === thisMonth && assignedDate.getFullYear() === thisYear;
      const isPrivate = item.projectType === 'Private';
      const isPublic = item.projectType === 'Public';

      if (isThisMonthAssigned) {
        stats.assignedThisMonth++;
        if (isPrivate) stats.privateAssigned++;
        if (isPublic) stats.publicAssigned++;
      }
      if (submittedDate) {
        stats.received++;
        if (isPrivate) stats.privateReceived++;
        if (isPublic) stats.publicReceived++;
      }
      if (publishedDate) {
        stats.published++;
      }
      if (assignedDate && !submittedDate && !publishedDate) {
        stats.dueContent++;
      }
      if (submittedDate && !publishedDate) {
        stats.receivedNotPublished++;
      }
    });

    return stats;
  }

  // Writer stats function
  function getWriterStats(data, writerEmail) {
    const writerData = data.filter(item =>
      item.writerName === writerEmail || item.writerName === user?.name || item.writerEmail === writerEmail
    );
    return {
      totalAssigned: writerData.length,
      submitted: writerData.filter(item => item.writerSubmittedAt).length,
      dueContent: writerData.filter(item => item.writerAssignedAt && !item.writerSubmittedAt).length,
      forRevision: writerData.filter(item => item.writerSubmittedAt && item.status === 'revision').length
    };
  }

  // Manager stats function
  function getManagerStats(data, managerEmail) {
    const managerData = data.filter(item =>
      item.managerName === managerEmail || item.managerName === user?.name || item.managerEmail === managerEmail
    );
    const projects = [...new Set(managerData.map(item => item.project))];
    return {
      projectsAssigned: projectsAssignedCount || projects.length,
      totalContentAssigned: managerData.length,
      contentReceived: managerData.filter(item => item.writerSubmittedAt).length,
      dueContent: managerData.filter(item => item.writerAssignedAt && !item.writerSubmittedAt).length
    };
  }

  // Filter data based on role
  function getFilteredData() {
    if (isAdmin) {
      return data;
    } else if (isManager && !isWriter) {
      return data.filter(item =>
        item.managerName === user?.email || item.managerName === user?.name || item.managerEmail === user?.email
      );
    } else if (isWriter && !isManager) {
      return data.filter(item =>
        item.writerName === user?.email || item.writerName === user?.name || item.writerEmail === user?.email
      );
    } else if (isManager && isWriter) {
      return data.filter(item =>
        item.managerName === user?.email || item.managerName === user?.name || item.managerEmail === user?.email ||
        item.writerName === user?.email || item.writerName === user?.name || item.writerEmail === user?.email
      );
    }
    return [];
  }

  // Get link for each card based on label
  function getCardLink(label) {
    const linkMap = {
      // Admin Overview
      'Assigned This Month': '/articles',
      'Private Content Assigned': '/articles',
      'Public Content Assigned': '/articles',
      'Content Received': '/articles',
      'Private Received': '/articles',
      'Public Received': '/articles',
      'Content Published': '/articles',
      'Due Content': '/articles',
      'Received Not Published': '/articles',
      // Manager Overview
      'Projects Assigned': '/projects',
      'Total Content Assigned': '/topics',
      // Writer Overview
      'Content Submitted': '/articles',
      'Content for Revision': '/articles'
    };
    return linkMap[label] || '/articles';
  }

  // Handle card click navigation
  const handleCardClick = (label) => {
    const path = getCardLink(label);
    navigate(path);
  };

  // Generate stats sections based on user roles
  function generateStatsConfig() {
    const sections = [];

    if (isAdmin) {
      const stats = getAdminStats(data);
      sections.push({
        title: 'Admin Overview',
        titleColor: 'text-primary',
        stats: [
          { label: 'Assigned This Month', value: stats.assignedThisMonth, color: 'primary' },
          { label: 'Private Content Assigned', value: stats.privateAssigned, color: 'info' },
          { label: 'Public Content Assigned', value: stats.publicAssigned, color: 'info' },
          { label: 'Content Received', value: stats.received, color: 'dark' },
          { label: 'Private Received', value: stats.privateReceived, color: 'dark' },
          { label: 'Public Received', value: stats.publicReceived, color: 'dark' },
          { label: 'Content Published', value: stats.published, color: 'success' },
          { label: 'Due Content', value: stats.dueContent, color: 'warning' },
          { label: 'Received Not Published', value: stats.receivedNotPublished, color: 'danger' }
        ]
      });
    }

    if (isManager) {
      const stats = getManagerStats(data, user?.email);
      sections.push({
        title: 'Manager Overview',
        titleColor: 'text-success',
        stats: [
          { label: 'Projects Assigned', value: stats.projectsAssigned, color: 'primary' },
          { label: 'Total Content Assigned', value: stats.totalContentAssigned, color: 'info' },
          { label: 'Content Received', value: stats.contentReceived, color: 'success' },
          { label: 'Due Content', value: stats.dueContent, color: 'warning' }
        ]
      });
    }

    if (isWriter) {
      const stats = getWriterStats(data, user?.email);
      sections.push({
        title: 'Writer Overview',
        titleColor: 'text-warning',
        stats: [
          { label: 'Total Content Assigned', value: stats.totalAssigned, color: 'primary' },
          { label: 'Content Submitted', value: stats.submitted, color: 'success' },
          { label: 'Due Content', value: stats.dueContent, color: 'warning' },
          { label: 'Content for Revision', value: stats.forRevision, color: 'danger' }
        ]
      });
    }

    return sections;
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAdmin && !isManager && !isWriter) return;
      try {
        const res = await api.get('/getDashboardData');
        setData(res.data?.data || []);
        if (isManager && res.data?.projectsAssignedCount) {
          setProjectsAssignedCount(res.data.projectsAssignedCount);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [isAdmin, isManager, isWriter]);

  const filteredData = getFilteredData();
  const statsConfig = generateStatsConfig();

  const csvHeaders = [
    { label: "Project", key: "project" },
    { label: "Project Manager", key: "managerName" },
    { label: "Project Writer", key: "writerName" },
    { label: "Topic", key: "topic" },
    { label: "Month", key: "month" },
    { label: "Writer Assigned", key: "writerAssignedAt" },
    { label: "Writing Complete", key: "writerSubmittedAt" },
    { label: "Content Published", key: "publishedAt" }
  ];

  const exportToExcel = () => {
    const formattedData = filteredData.map(item => ({
      Project: item.project,
      "Project Manager": item.managerName,
      "Project Writer": item.writerName,
      Topic: item.topic,
      Month: item.month,
      "Writer Assigned": formatDateWithDiff(item.writerAssignedAt),
      "Writing Complete": formatDateWithDiff(item.writerSubmittedAt, item.writerAssignedAt),
      "Content Published": formatDateWithDiff(item.publishedAt, item.writerSubmittedAt)
    }));
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dashboard");
    XLSX.writeFile(workbook, "dashboard.xlsx");
  };

  // Generate dashboard title based on roles
  function getDashboardTitle() {
    const roleCount = [isAdmin, isManager, isWriter].filter(Boolean).length;
    const now = new Date();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear().toString().slice(-2);
    const formattedMonthYear = `${currentMonth.slice(0, 3)}-${currentYear}`;

    if (roleCount === 1) {
      if (isAdmin) return `📊 Admin Timeline Dashboard - ${formattedMonthYear}`;
      if (isManager) return `👨‍💼 Manager Timeline Dashboard - ${formattedMonthYear}`;
      if (isWriter) return `📝 Writer Timeline Dashboard - ${formattedMonthYear}`;
    }
    return `📊 Timeline Dashboard - ${formattedMonthYear}`;
  }

  return (
    <div className="container mt-4">
      {/* Dashboard Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4">
        <h3 className="mb-2 mb-md-0 text-center text-md-start">{getDashboardTitle()}</h3>
        <div className="text-center text-md-end">
          <div className="mb-1">Welcome, <strong>{user?.email}</strong></div>
          <div>
            {user?.roles?.map((role, i) => (
              <span key={i} className="badge bg-primary me-1">{role}</span>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Sections */}
      {statsConfig.map((section, sectionIdx) => (
        <div key={sectionIdx} className="mb-5">
          {/* Section Header */}
          <div className="d-flex align-items-center mb-3">
            <h5 className={`mb-0 me-3 ${section.titleColor}`}>{section.title}</h5>
            <hr className="flex-grow-1 border-secondary" />
          </div>

          {/* KPI Cards Grid */}
          <div className="row g-3">
            {section.stats.map((item, idx) => (
              <div
                key={idx}
                className={`col-12 col-sm-6 ${section.stats.length <= 4 ? 'col-md-6 col-lg-3' : 'col-md-4'}`}
              >
                <div
                  onClick={() => handleCardClick(item.label)}
                  className="card shadow-sm border-0 h-100 text-center"
                  style={{
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <div className="card-body py-3">
                    <h6 className="text-muted small mb-1">{item.label}</h6>
                    <h4 className={`fw-bold text-${item.color} mb-0`}>{item.value}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Export Buttons */}
      <div className="d-flex flex-wrap gap-2 mb-4 justify-content-center justify-content-md-end">
        <CSVLink
          data={filteredData}
          headers={csvHeaders}
          filename="dashboard.csv"
          className="btn btn-outline-success d-flex align-items-center gap-1"
        >
          ⬇️ CSV
        </CSVLink>
        <button
          onClick={exportToExcel}
          className="btn btn-outline-primary d-flex align-items-center gap-1"
        >
          ⬇️ Excel
        </button>
      </div>

      <hr className="mb-4" />

      {/* Loader / Error / Table */}
      {loading ? (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-3">Loading dashboard data...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger text-center my-5">
          <strong>Error:</strong> {error}
        </div>
      ) : (
        <div className="table-responsive shadow-sm rounded overflow-auto">
          <table className="table table-striped table-hover align-middle">
            <thead className="table-light text-center sticky-top">
              <tr>
                <th>Project</th>
                <th>Topic</th>
                <th>Month</th>
                <th>Manager</th>
                <th>Writer Assigned</th>
                <th>Writer</th>
                <th>Writing Complete</th>
                <th>Content Published</th>
              </tr>
            </thead>
            <tbody className="text-center">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center text-muted py-4">No data available</td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.project}</td>
                    <td>{item.topic}</td>
                    <td>{item.month}</td>
                    <td>{item.managerName}</td>
                    <td>{formatReadableDate(item.writerAssignedAt)}</td>
                    <td>{item.writerName}</td>
                    <td>{formatDateWithDiff(item.writerSubmittedAt, item.writerAssignedAt)}</td>
                    <td>{formatDateWithDiff(item.publishedAt, item.writerSubmittedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}