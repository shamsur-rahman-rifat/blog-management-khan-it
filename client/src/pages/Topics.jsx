import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../api';
import { AuthContext } from '../auth/AuthContext';
import { CSVLink } from 'react-csv';
import * as XLSX from 'xlsx';

export default function ManagerTopics() {
  const { user } = useContext(AuthContext);

  const [projects, setProjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [blogInputs, setBlogInputs] = useState([]);
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const formRef = useRef(null);
  const titleInputRef = useRef(null);

  const isManager = user?.roles?.includes('manager');
  const isWriter = user?.roles?.includes('writer');

  const getMonths = () => {
    const months = [];
    for (let i = 0; i <= 3; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const monthName = date.toLocaleString('default', { month: 'short' });
      const year = String(date.getFullYear()).slice(2);
      months.push(`${monthName}-${year}`);
    }
    return months;
  };

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [projectRes, topicRes, userRes] = await Promise.all([
        api.get('/viewProjectList'),
        api.get('/viewTopicList'),
        api.get('/viewUserList')
      ]);

      const allProjects = projectRes.data?.data || [];
      const allTopics = topicRes.data?.data || [];
      const allUsers = userRes.data?.data || [];

      if (isManager) {
        const userProjects = allProjects.filter(p => String(p.manager) === String(user.id));
        const userTopics = allTopics.filter(t => t.project && String(t.project.manager) === String(user.id));
        setProjects(userProjects);
        setTopics(userTopics);
      } else if (isWriter) {
        const userTopics = allTopics.filter(t => t.project && String(t.project.writer) === String(user.id));
        setProjects([]);
        setTopics(userTopics);
      }

      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleProjectChange = (projectId) => {
    if (!projectId) {
      setSelectedProjectId('');
      setBlogInputs([]);
      setEditingTopicId(null);
      return;
    }

    const project = projects.find(p => p._id === projectId);
    const blogCount = project?.word || 0;

    setSelectedProjectId(projectId);
    setEditingTopicId(null);

    const newInputs = [];
    for (let i = 0; i < blogCount; i++) {
      newInputs.push({
        title: '',
        keyword: '',
        instructions: '',
        month: getMonths()[0]
      });
    }
    setBlogInputs(newInputs);
  };

  const handleInputChange = (index, field, value) => {
    const newInputs = [...blogInputs];
    newInputs[index][field] = value;
    setBlogInputs(newInputs);
  };

  const handleSave = async () => {
    if (!selectedProjectId || blogInputs.length === 0) {
      alert('Please select a project and fill in the blog details');
      return;
    }

    for (let blog of blogInputs) {
      if (!blog.title.trim() || !blog.month) {
        alert('Please fill in title and month for all blogs');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingTopicId) {
        await api.put(`/updateTopic/${editingTopicId}`, {
          ...blogInputs[0],
          project: selectedProjectId,
          createdBy: user.email
        });
        alert('Topic updated successfully');
      } else {
        for (let blog of blogInputs) {
          try {
            await api.post('/addTopic', {
              ...blog,
              project: selectedProjectId,
              createdBy: user.email,
              status: 'assigned'
            });
          } catch (error) {
            if (
              error.response &&
              error.response.status === 409 &&
              error.response.data.similarTitle
            ) {
              const userWantsToProceed = window.confirm(
                `⚠️ Similar topic detected:\n"${error.response.data.similarTitle}"\n\nDo you want to add it anyway?`
              );

              if (userWantsToProceed) {
                await api.post('/addTopic', {
                  ...blog,
                  project: selectedProjectId,
                  createdBy: user.email,
                  status: 'assigned',
                  force: true
                });
              } else {
                throw new Error('Topic addition cancelled due to similarity.');
              }
            } else {
              throw error;
            }
          }
        }

        alert('Blogs assigned successfully');
      }

      setSelectedProjectId('');
      setBlogInputs([]);
      setEditingTopicId(null);
      loadData();
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (topic) => {
    setEditingTopicId(topic._id);
    setSelectedProjectId(topic.project?._id || topic.project);
    setBlogInputs([{
      title: topic.title || '',
      keyword: topic.keyword || '',
      instructions: topic.instructions || '',
      month: topic.month || ''
    }]);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      titleInputRef.current?.focus();
    }, 100);
  };

  const handleCancelEdit = () => {
    setEditingTopicId(null);
    setSelectedProjectId('');
    setBlogInputs([]);
  };

  const handleDelete = async (topicId) => {
    if (!window.confirm('Are you sure you want to delete this topic?')) return;

    setLoading(true);
    try {
      await api.delete(`/deleteTopic/${topicId}`);
      alert('Topic deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpansion = (topicId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedRows(newExpanded);
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return '—';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const getUniqueMonthsFromTopics = () => {
    const monthsSet = new Set(topics.map(topic => topic.month).filter(Boolean));
    return Array.from(monthsSet);
  };

  const getExportData = () => {
    return topics.map(topic => ({
      project: topic.project?.name || '',
      month: topic.month || '',
      title: topic.title || '',
      keyword: topic.keyword || '',
      instructions: topic.instructions || '',
      writer: users.find(u => u._id === topic.project?.writer)?.name || '—'
    }));
  };

  const handleExportExcel = () => {
    const data = getExportData();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Blog Topics');
    XLSX.writeFile(workbook, 'blog_topics.xlsx');
  };

  const csvHeaders = [
    { label: 'Project', key: 'project' },
    { label: 'Month', key: 'month' },
    { label: 'Title', key: 'title' },
    { label: 'Keyword', key: 'keyword' },
    { label: 'Instructions', key: 'instructions' },
    { label: 'Writer', key: 'writer' }
  ];

  const filteredTopics = selectedMonth
    ? topics.filter(topic => topic.month === selectedMonth)
    : topics;

  return (
    <div className="container-fluid px-3 px-md-4 py-4" style={{ maxWidth: '1400px' }}>
      <div className="mb-4">
        <h2 className="fw-bold text-center mb-2" style={{ color: '#1a1a1a' }}>
          🛠️ Manage Your Blogs
        </h2>
        <p className="text-center text-muted mb-0">
          {isManager ? 'Assign and manage blog topics for your projects' : 'View your assigned blog topics'}
        </p>
      </div>

      {/* Manager Form Section */}
      {isManager && (
        <div className="card border-0 shadow-sm mb-4" ref={formRef} style={{ borderRadius: '12px' }}>
          <div className="card-body p-4">
            <div className="d-flex align-items-center mb-4">
              <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                <span style={{ fontSize: '24px' }}>📌</span>
              </div>
              <div>
                <h5 className="mb-0 fw-bold">Assign Blog Topics</h5>
                <small className="text-muted">Create and assign topics to your writers</small>
              </div>
            </div>

            {/* Project Dropdown */}
            <div className="mb-4">
              <label className="form-label fw-semibold mb-2">
                <span className="text-danger">*</span> Select Project
              </label>
              <select
                className="form-select form-select-lg"
                style={{ borderRadius: '8px' }}
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                disabled={loading || saving}
              >
                <option value="">-- Choose a project --</option>
                {projects
                  .filter(project => project.status !== 'paused')
                  .map(project => (
                    <option key={project._id} value={project._id}>
                      {project.name} • {project.word || 0} blog{project.word !== 1 ? 's' : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* Blog Inputs */}
            {blogInputs.length > 0 && (
              <>
                <div className="d-flex align-items-center mb-3 pb-3 border-bottom">
                  <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2" style={{ fontSize: '14px' }}>
                    {editingTopicId ? '✏️ Editing Blog' : `📝 ${blogInputs.length} Blog${blogInputs.length > 1 ? 's' : ''} to Assign`}
                  </span>
                </div>

                {blogInputs.map((blog, index) => (
                  <div 
                    key={index} 
                    className="border rounded mb-3 p-4" 
                    style={{ 
                      borderRadius: '10px', 
                      backgroundColor: '#f8f9fa',
                      borderColor: '#dee2e6'
                    }}
                  >
                    <div className="d-flex align-items-center mb-3">
                      <span className="badge bg-secondary me-2" style={{ fontSize: '13px' }}>
                        Blog #{index + 1}
                      </span>
                    </div>

                    <div className="row g-3">
                      <div className="col-12 col-lg-6">
                        <label className="form-label text-muted small mb-1">
                          <span className="text-danger">*</span> Blog Title
                        </label>
                        <input
                          className="form-control"
                          style={{ borderRadius: '6px' }}
                          placeholder="Enter blog title..."
                          value={blog.title}
                          onChange={(e) => handleInputChange(index, 'title', e.target.value)}
                          required
                          ref={index === 0 ? titleInputRef : null}
                        />
                      </div>
                      <div className="col-12 col-lg-6">
                        <label className="form-label text-muted small mb-1">Keyword(s)</label>
                        <input
                          className="form-control"
                          style={{ borderRadius: '6px' }}
                          placeholder="e.g., SEO, marketing, digital"
                          value={blog.keyword}
                          onChange={(e) => handleInputChange(index, 'keyword', e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label text-muted small mb-1">Instructions</label>
                        <textarea
                          className="form-control"
                          style={{ borderRadius: '6px' }}
                          placeholder="Add any special instructions for the writer... We recommend to give the content outline in a public doc file"
                          rows={3}
                          value={blog.instructions}
                          onChange={(e) => handleInputChange(index, 'instructions', e.target.value)}
                        />
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label text-muted small mb-1">
                          <span className="text-danger">*</span> Target Month
                        </label>
                        <select
                          className="form-select"
                          style={{ borderRadius: '6px' }}
                          value={blog.month}
                          onChange={(e) => handleInputChange(index, 'month', e.target.value)}
                          required
                        >
                          <option value="">-- Select month --</option>
                          {getMonths().map(month => (
                            <option key={month} value={month}>{month}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Action Buttons */}
                <div className="d-flex flex-column flex-sm-row gap-2 mt-4">
                  <button
                    className={`btn btn-lg flex-fill ${editingTopicId ? 'btn-primary' : 'btn-success'}`}
                    style={{ borderRadius: '8px', fontWeight: '500' }}
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Saving...
                      </>
                    ) : editingTopicId ? (
                      '✅ Update Blog'
                    ) : (
                      `✅ Assign ${blogInputs.length} Blog${blogInputs.length > 1 ? 's' : ''}`
                    )}
                  </button>

                  <button
                    className="btn btn-lg btn-outline-secondary flex-fill"
                    style={{ borderRadius: '8px', fontWeight: '500' }}
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    ❌ Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Topics Table */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
        <div className="card-body p-4">
          {/* Header and Filters */}
          <div className="row align-items-center mb-4 g-3">
            <div className="col-12 col-md-6">
              <div className="d-flex align-items-center">
                <div className="bg-info bg-opacity-10 rounded-circle p-2 me-3">
                  <span style={{ fontSize: '24px' }}>📋</span>
                </div>
                <div>
                  <h5 className="mb-0 fw-bold">Your Blog Topics</h5>
                  <small className="text-muted">{filteredTopics.length} topic{filteredTopics.length !== 1 ? 's' : ''} found</small>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="d-flex flex-wrap gap-2 justify-content-md-end">
                <select
                  className="form-select form-select-sm"
                  style={{ maxWidth: '180px', borderRadius: '6px' }}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="">📅 All Months</option>
                  {getUniqueMonthsFromTopics().map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>

                {topics.length > 0 && (
                  <>
                    <CSVLink
                      data={getExportData()}
                      headers={csvHeaders}
                      filename="blog_topics.csv"
                      className="btn btn-outline-secondary btn-sm"
                      style={{ borderRadius: '6px' }}
                    >
                      📤 CSV
                    </CSVLink>
                    <button
                      className="btn btn-outline-success btn-sm"
                      style={{ borderRadius: '6px' }}
                      onClick={handleExportExcel}
                    >
                      📊 Excel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-muted mt-3">Loading topics...</p>
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="text-center py-5">
              <div className="mb-3" style={{ fontSize: '48px', opacity: 0.3 }}>📝</div>
              <p className="text-muted">No topics found. {isManager && 'Start by assigning some blogs above!'}</p>
            </div>
          ) : (
            <div className="table-responsive" style={{ borderRadius: '8px', overflow: 'hidden' }}>
              <table className="table table-hover align-middle mb-0">
                <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th className="fw-semibold" style={{ minWidth: '140px' }}>Project</th>
                    <th className="fw-semibold text-center" style={{ minWidth: '90px' }}>Month</th>
                    <th className="fw-semibold" style={{ minWidth: '200px' }}>Title</th>
                    <th className="fw-semibold" style={{ minWidth: '150px' }}>Keyword</th>
                    <th className="fw-semibold" style={{ minWidth: '200px' }}>Instructions</th>
                    <th className="fw-semibold text-center" style={{ minWidth: '120px' }}>Writer</th>
                    <th className="fw-semibold text-center" style={{ minWidth: '100px' }}>Updated</th>
                    {isManager && <th className="fw-semibold text-center" style={{ minWidth: '140px' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredTopics.map(topic => {
                    const writerName = users.find(u => u._id === topic.project?.writer)?.name || '—';
                    const canEdit = isManager;
                    const updatedDate = topic.updatedAt
                      ? new Date(topic.updatedAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                      : '—';
                    const isExpanded = expandedRows.has(topic._id);
                    const hasLongContent = 
                      (topic.keyword && topic.keyword.length > 50) || 
                      (topic.instructions && topic.instructions.length > 50);

                    return (
                      <tr key={topic._id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td>
                          <span className="badge bg-light text-dark" style={{ fontSize: '12px' }}>
                            {topic.project?.name || 'N/A'}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-primary bg-opacity-10 text-primary">
                            {topic.month}
                          </span>
                        </td>
                        <td>
                          <div className="fw-semibold" style={{ fontSize: '14px' }}>
                            {topic.title}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px' }}>
                            {isExpanded ? topic.keyword || '—' : truncateText(topic.keyword, 50)}
                            {topic.keyword && topic.keyword.length > 50 && (
                              <button
                                className="btn btn-link btn-sm p-0 ms-1"
                                style={{ fontSize: '11px', textDecoration: 'none' }}
                                onClick={() => toggleRowExpansion(topic._id)}
                              >
                                {isExpanded ? '▲ less' : '▼ more'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px' }}>
                            {isExpanded ? topic.instructions || '—' : truncateText(topic.instructions, 50)}
                            {topic.instructions && topic.instructions.length > 50 && (
                              <button
                                className="btn btn-link btn-sm p-0 ms-1"
                                style={{ fontSize: '11px', textDecoration: 'none' }}
                                onClick={() => toggleRowExpansion(topic._id)}
                              >
                                {isExpanded ? '▲ less' : '▼ more'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-secondary bg-opacity-10 text-secondary">
                            {writerName}
                          </span>
                        </td>
                        <td className="text-center">
                          <small className="text-muted">{updatedDate}</small>
                        </td>
                        {isManager && (
                          <td>
                            {canEdit ? (
                              <div className="d-flex justify-content-center gap-1 flex-wrap">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  style={{ borderRadius: '6px', fontSize: '12px' }}
                                  onClick={() => handleEdit(topic)}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  style={{ borderRadius: '6px', fontSize: '12px' }}
                                  onClick={() => handleDelete(topic._id)}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}