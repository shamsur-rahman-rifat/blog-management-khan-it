import React, { useEffect, useState, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../auth/AuthContext';
import { useForm } from 'react-hook-form';

// ✅ Updated roles list
const ROLES = ['admin', 'writer', 'manager'];

export default function Team() {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState(null); // 'add' | 'edit'

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (!user?.roles?.includes('admin')) return;
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/viewUserList');
      setUsers(res.data?.data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const openAddUserForm = () => {
    reset();
    setFormMode('add');
  };

  const onEdit = (u) => {
    setEditingUserId(u._id);
    setFormMode('edit');
    reset();
    setValue('name', u.name);
    setValue('email', u.email);
    ROLES.forEach((role) => setValue(role, u.roles?.includes(role)));
  };

  const cancelForm = () => {
    setEditingUserId(null);
    setFormMode(null);
    reset();
  };

  const onSubmit = async (formData) => {
    const selectedRoles = ROLES.filter((role) => formData[role]);
    const payload = {
      name: formData.name,
      email: formData.email,
      roles: selectedRoles,
    };

    if (formMode === 'add') {
      payload.password = formData.password;
      try {
        await api.post('/registration', payload);
        alert('User added');
        fetchUsers();
        cancelForm();
      } catch (err) {
        console.error(err);
        alert('Failed to add user');
      }
    } else if (formMode === 'edit') {
      try {
        await api.put(`/profileUpdate/${editingUserId}`, payload);
        alert('User updated');
        fetchUsers();
        cancelForm();
      } catch (err) {
        console.error(err);
        alert('Failed to update user');
      }
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.delete(`/profileDelete/${id}`);
      alert('User deleted');
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to delete user');
    }
  };

  if (!user?.roles?.includes('admin')) {
    return (
      <div className="container py-5 text-center text-danger">
        Access Denied: Admins Only
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h3 className="mb-4 text-center">👥 Team Management</h3>

      <div className="text-end mb-3">
        {formMode === 'add' ? (
          <button className="btn btn-outline-secondary" onClick={cancelForm}>
            ➖ Cancel Add
          </button>
        ) : (
          <button className="btn btn-outline-success" onClick={openAddUserForm}>
            ➕ Add New User
          </button>
        )}
      </div>

      {(formMode === 'add' || formMode === 'edit') && (
        <div className="card mb-4 p-4 shadow-sm">
          <h5 className="mb-3">
            {formMode === 'add' ? '➕ Add New Team Member' : '✏️ Edit User'}
          </h5>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="row g-3">
              <div className="col-md-4">
                <input
                  {...register('name', { required: 'Name is required' })}
                  className="form-control"
                  placeholder="Name"
                />
                {errors.name && (
                  <small className="text-danger">{errors.name.message}</small>
                )}
              </div>
              <div className="col-md-4">
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: 'Invalid email format',
                    },
                  })}
                  className="form-control"
                  placeholder="Email"
                />
                {errors.email && (
                  <small className="text-danger">{errors.email.message}</small>
                )}
              </div>
              {formMode === 'add' && (
                <div className="col-md-4">
                  <input
                    {...register('password', { required: 'Password is required' })}
                    type="password"
                    className="form-control"
                    placeholder="Password"
                  />
                  {errors.password && (
                    <small className="text-danger">{errors.password.message}</small>
                  )}
                </div>
              )}
              <div className="col-12">
                <label className="form-label">Roles</label>
                <div className="d-flex flex-wrap gap-3">
                  {ROLES.map((role) => (
                    <div key={role} className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`role-${role}`}
                        {...register(role)}
                      />
                      <label className="form-check-label ms-1" htmlFor={`role-${role}`}>
                        {role}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-12 d-flex gap-2">
                <button type="submit" className="btn btn-primary">
                  {formMode === 'add' ? 'Add User' : 'Update'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={cancelForm}>
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center">
          <div className="spinner-border text-primary" />
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-striped align-middle text-center">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    {u.roles?.map((r) => (
                      <span className="badge bg-secondary me-1" key={r}>
                        {r}
                      </span>
                    ))}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary me-2"
                      onClick={() => onEdit(u)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onDelete(u._id)}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
