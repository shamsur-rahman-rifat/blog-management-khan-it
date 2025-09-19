import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../api';

export default function Profile() {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // For toggling visibility

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.post('/profileDetails');
        const user = res.data?.data?.[0];

        if (user) {
          setUserId(user._id);
          setValue('name', user.name);
          setValue('email', user.email);
          
          // ⚠️ Only do this if the backend actually returns the password (NOT recommended)
          setValue('password', user.password || '');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to load profile details');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [setValue]);

  const onSubmit = async (data) => {
    setIsUpdating(true);

    const payload = {
      name: data.name,
      email: data.email,
    };

    if (data.password) {
      payload.password = data.password;
    }

    try {
      await api.put(`/profileUpdate/${userId}`, payload);
      alert('Profile updated successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <div>
          <div className="spinner-border text-primary" role="status" />
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8">
          <div className="card shadow-sm border-0 p-4">
            <h3 className="mb-4 text-center">👤 My Profile</h3>

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Name */}
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  placeholder="e.g. John Doe"
                />
                {errors.name && <div className="invalid-feedback">{errors.name.message}</div>}
              </div>

              {/* Email */}
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: 'Invalid email format'
                    }
                  })}
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  placeholder="you@example.com"
                />
                {errors.email && <div className="invalid-feedback">{errors.email.message}</div>}
              </div>

              {/* Password (editable) */}
              <div className="mb-3">
                <label className="form-label">Password</label>
                <div className="input-group">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Enter or update your password"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? '🙈 Hide' : '👁️ Show'}
                  </button>
                </div>
                <small className="text-muted">
                  Leave unchanged to keep your existing password.
                </small>
              </div>

              {/* Submit */}
              <div className="d-grid">
                <button 
                  className="btn btn-success btn-lg"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
