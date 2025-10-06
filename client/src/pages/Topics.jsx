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
          await api.post('/addTopic', {
            ...blog,
            project: selectedProjectId,
            createdBy: user.email,
            status: 'assigned'
          });
        }
        alert('Blogs assigned successfully');
      }

      setSelectedProjectId('');
      setBlogInputs([]);
      setEditingTopicId(null);
      loadData();
    } catch (error) {
    console.error('Error saving:', error);

    // Check if the error message matches the 'Topic already exists' message
    if (error.response && error.response.status === 400 && error.response.data.message === 'Topic already exists for this project.') {
      alert('Topic already exists for this project. Please choose another title or project.');
    } else {
      alert('Failed to save: ' + error.message);
    }
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
    // Smooth scroll to form and focus title input
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
  <div className="container py-4">
    <h3 className="mb-4 text-center">🛠️ Manage Your Blogs</h3>

    {/* 📌 Manager Only Form Section */}
    {isManager && (
      <div className="card shadow-sm mb-4" ref={formRef}>
        <div className="card-body">
          <h5 className="card-title mb-3">📌 Assign Blog Topics</h5>

          {/* Project Dropdown */}
          <div className="mb-4">
            <label className="form-label fw-semibold">Select Project</label>
            <select
              className="form-select"
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              disabled={loading || saving}
            >
              <option value="">-- Select Project --</option>
              {projects
                .filter(project => project.status !== 'paused')
                .map(project => (
                  <option key={project._id} value={project._id}>
                    {project.name} ({project.word || 0} blogs)
                  </option>
                ))}
            </select>
          </div>

          {/* Blog Inputs */}
          {blogInputs.length > 0 && (
            <>
              <h6 className="mb-3 text-muted">
                {editingTopicId ? '✏️ Editing Blog' : `📝 Assign ${blogInputs.length} Blog${blogInputs.length > 1 ? 's' : ''}`}
              </h6>

              {/* Each Blog Card */}
              {blogInputs.map((blog, index) => (
                <div key={index} className="border rounded p-3 mb-3 bg-light">
                  <h6 className="mb-3 text-secondary">📝 Blog #{index + 1}</h6>

                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <input
                        className="form-control"
                        placeholder="Title *"
                        value={blog.title}
                        onChange={(e) => handleInputChange(index, 'title', e.target.value)}
                        required
                        ref={index === 0 ? titleInputRef : null}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <input
                        className="form-control"
                        placeholder="Keyword"
                        value={blog.keyword}
                        onChange={(e) => handleInputChange(index, 'keyword', e.target.value)}
                      />
                    </div>
                    <div className="col-12">
                      <textarea
                        className="form-control"
                        placeholder="Instructions"
                        rows={2}
                        value={blog.instructions}
                        onChange={(e) => handleInputChange(index, 'instructions', e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <select
                        className="form-select"
                        value={blog.month}
                        onChange={(e) => handleInputChange(index, 'month', e.target.value)}
                        required
                      >
                        <option value="">-- Select Month * --</option>
                        {getMonths().map(month => (
                          <option key={month} value={month}>{month}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {/* Buttons */}
              <div className="d-flex flex-column flex-sm-row gap-2 mt-3">
                <button
                  className={`btn flex-fill ${editingTopicId ? 'btn-primary' : 'btn-success'}`}
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

                {blogInputs.length > 0 && (
                  <button
                    className="btn btn-outline-secondary flex-fill"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    ❌ Cancel
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    )}

    {/* 📋 Topics Table */}
    <div className="card shadow-sm">
      <div className="card-body">
        {/* Header and Filter */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 gap-3">
          <h5 className="card-title mb-0">📋 Your Blog Topics</h5>

          <div className="d-flex flex-wrap gap-2">
            <select
              className="form-select form-select-sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">All Months</option>
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
                >
                  📤 Export CSV
                </CSVLink>
                <button
                  className="btn btn-outline-success btn-sm"
                  onClick={handleExportExcel}
                >
                  📊 Export Excel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Loading or Empty State */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : filteredTopics.length === 0 ? (
          <p className="text-center text-muted py-5">No topics found.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped table-bordered table-hover align-middle text-center">
              <thead className="table-light sticky-top">
                <tr>
                  <th>Project</th>
                  <th>Month</th>
                  <th>Title</th>
                  <th>Keyword</th>
                  <th>Instructions</th>
                  <th>Writer</th>
                  <th>Updated</th>
                  {isManager && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredTopics.map(topic => {
                  const writerName = users.find(u => u._id === topic.project?.writer)?.name || '—';
                  const canEdit = isManager && topic.createdBy === user.email;
                  const updatedDate = topic.updatedAt
                    ? new Date(topic.updatedAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                    : '—';

                  return (
                    <tr key={topic._id}>
                      <td>{topic.project?.name || 'N/A'}</td>
                      <td>{topic.month}</td>
                      <td>{topic.title}</td>
                      <td>{topic.keyword || '—'}</td>
                      <td>{topic.instructions || '—'}</td>
                      <td>{writerName}</td>
                      <td>{updatedDate}</td>
                      {isManager && (
                        <td>
                          {canEdit ? (
                            <div className="d-flex flex-wrap justify-content-center gap-1">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEdit(topic)}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(topic._id)}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          ) : '—'}
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
