import React, { useEffect, useState, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../auth/AuthContext';

export default function Projects() {
  const { user } = useContext(AuthContext);

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  const [form, setForm] = useState({
    name: '',
    word: 0,
    private: true,
    writer: '',
    manager: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const hasRole = (role) => user?.roles?.includes(role);

  if (!user) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3">Loading user info...</p>
      </div>
    );
  }

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get('/viewProjectList');
      let allProjects = res.data?.data || [];

      if (hasRole('manager') && !hasRole('admin')) {
        allProjects = allProjects.filter(p => {
          const managerId = p.manager?._id || p.manager;
          return managerId === user.id;
        });
      }

      setProjects(allProjects);
    } catch (err) {
      console.error(err);
      alert('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/viewUserList');
      setUsers(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, [user]);

  const handleChange = (field, value) => {
    if (field === 'private') {
      setForm(prev => ({
        ...prev,
        private: value,
        writer: value ? '' : '68c24f01384b81a2c17349e3',
      }));
    } else {
      setForm(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name: form.name,
      word: form.word,
      private: form.private,
      writer: form.writer || undefined,
      manager: form.manager || undefined,
    };

    try {
      if (editingId) {
        await api.put(`/updateProject/${editingId}`, payload);
        alert('Project updated!');
      } else {
        await api.post('/addProject', payload);
        alert('Project added!');
      }
      setForm({ name: '', word: 0, private: true, writer: '', manager: '' });
      setEditingId(null);
      fetchProjects();
    } catch (err) {
      console.error(err);
      alert(editingId ? 'Update failed' : 'Add failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (p) => {
    setEditingId(p._id || p.id);
    setForm({
      name: p.name || '',
      word: p.word || 0,
      private: p.private ?? true,
      writer: p.writer?._id || p.writer || '',
      manager: p.manager?._id || p.manager || '',
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await api.delete(`/deleteProject/${id}`);
      alert('Project deleted!');
      fetchProjects();
    } catch (err) {
      console.error(err);
      alert('Delete failed');
    }
  };

  const handleToggleStatus = async (project) => {
    const currentStatus = project.status;
    const newStatus = currentStatus === 'paused' ? 'ongoing' : 'paused';

    if (!window.confirm(`Change project status to "${newStatus}"?`)) return;

    try {
      await api.put(`/updateProject/${project._id || project.id}`, {
        status: newStatus,
      });
      alert(`Project status updated to "${newStatus}"`);
      fetchProjects();
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  return (
    <div className="container py-4">
      <h3 className="mb-4 text-center">🗂️ Project Dashboard</h3>

      {hasRole('admin') && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title mb-4">
              {editingId ? '✏️ Edit Project' : '➕ Add New Project'}
            </h5>
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6 col-lg-4">
                  <label htmlFor="projectName" className="form-label">Project Name</label>
                  <input
                    type="text"
                    id="projectName"
                    className="form-control"
                    placeholder="Enter project name"
                    value={form.name}
                    onChange={e => handleChange('name', e.target.value)}
                    required
                  />
                </div>

                <div className="col-md-6 col-lg-4">
                  <label htmlFor="words" className="form-label">Content (Per Month)</label>
                  <input
                    type="number"
                    id="words"
                    className="form-control"
                    placeholder="e.g., 5000"
                    min={0}
                    value={form.word}
                    onChange={e => handleChange('word', Number(e.target.value))}
                  />
                </div>

                <div className="col-md-6 col-lg-4">
                  <label className="form-label">Project Type</label>
                  <select
                    className="form-control"
                    value={form.private ? 'private' : 'public'}
                    onChange={e => handleChange('private', e.target.value === 'private')}
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div className="col-md-6 col-lg-4">
                  <label className="form-label">Writer</label>
                  <select
                    className="form-control"
                    value={form.writer}
                    onChange={e => handleChange('writer', e.target.value)}
                    disabled={!form.private}
                  >
                    <option value="">-- Select Writer --</option>
                    {users
                      .filter(u => u.roles?.includes('writer') && (form.private ? u._id !== '68c24f01384b81a2c17349e3' : true))
                      .map(u => (
                        <option key={u._id} value={u._id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="col-md-6 col-lg-4">
                  <label className="form-label">Manager</label>
                  <select
                    className="form-control"
                    value={form.manager}
                    onChange={e => handleChange('manager', e.target.value)}
                  >
                    <option value="">-- Select Manager --</option>
                    {users
                      .filter(u => u.roles?.includes('manager'))
                      .map(u => (
                        <option key={u._id} value={u._id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="col-12 col-md-6 col-lg-4 d-flex align-items-end gap-2">
                  <button 
                    className="btn btn-primary w-100" 
                    type="submit"
                    disabled={submitting}
                  >
                    {submitting ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Project' : 'Add Project')}
                  </button>
                  {editingId && (
                    <button
                      className="btn btn-outline-secondary w-100"
                      type="button"
                      onClick={() => {
                        setForm({ name: '', word: 0, private: true, writer: '', manager: '' });
                        setEditingId(null);
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="card-title mb-4">🗂️ Projects List</h5>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-3">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center text-muted py-5">
              <p>No projects found.</p>
              {hasRole('admin') && <p>Start by adding a new project above.</p>}
            </div>
          ) : (
            <div className="table-responsive shadow-sm rounded overflow-auto">
              <table className="table table-bordered table-striped table-hover align-middle text-center">
                <thead className="table-light text-center sticky-top">
                  <tr>
                    <th>Project Name</th>
                    <th>Monthly Content</th>
                    <th>Type</th>
                    <th>Writer</th>
                    <th>Manager</th>
                    <th>Status</th>
                    {hasRole('admin') && <th style={{ minWidth: '180px' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {projects.map(p => {
                    const id = p._id || p.id;
                    const writerUser = users.find(u => u._id === (p.writer?._id || p.writer));
                    const managerUser = users.find(u => u._id === (p.manager?._id || p.manager));

                    return (
                      <tr key={id}>
                        <td className="text-start">{p.name}</td>
                        <td>{p.word || 0}</td>
                        <td>{p.private ? 'Private' : 'Public'}</td>
                        <td>{writerUser ? writerUser.name : (p.writer || '—')}</td>
                        <td>{managerUser ? managerUser.name : (p.manager || '—')}</td>
                        <td>
                          <span className={`badge ${p.status === 'paused' ? 'bg-warning text-dark' : 'bg-success'}`}>
                            {p.status || '—'}
                          </span>
                        </td>
                        {hasRole('admin') && (
                          <td>
                            <div className="d-flex justify-content-center gap-2 flex-wrap">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                title="Edit"
                                onClick={() => handleEdit(p)}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                title="Delete"
                                onClick={() => handleDelete(id)}
                              >
                                🗑️ Delete
                              </button>
                              <button
                                className="btn btn-sm btn-outline-warning"
                                title="Toggle Status"
                                onClick={() => handleToggleStatus(p)}
                              >
                                🔄 {p.status === 'paused' ? 'Ongoing' : 'Pause'}
                              </button>
                            </div>
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
