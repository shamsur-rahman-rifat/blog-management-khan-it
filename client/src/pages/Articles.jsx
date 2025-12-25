import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../auth/AuthContext";
import * as XLSX from "xlsx";
import { CSVLink } from "react-csv";

const CLOUD_NAME = "dmfptu1yj";
const UPLOAD_PRESET = "article_content";

const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("resource_type", "raw");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!res.ok) {
    throw new Error("Cloudinary upload failed");
  }

  const data = await res.json();
  return data.secure_url;
};

export default function Articles() {
  const { user } = useContext(AuthContext);
  const [articles, setArticles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [revisionModal, setRevisionModal] = useState({ show: false, articleId: null, topicId: null, instructions: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [uploadingArticleId, setUploadingArticleId] = useState(null);

  const handleContentUpload = async (articleId, file) => {
    if (!file) return;

    if (editData.contentLink) {
      const confirmReplace = window.confirm(
        "This will replace the existing content file. Continue?"
      );
      if (!confirmReplace) return;
    }

    try {
      setUploadingArticleId(articleId);
      const url = await uploadToCloudinary(file);
      setEditData(prev => ({ ...prev, contentLink: url }));
    } catch (error) {
      alert("Upload failed. Please try again.");
    } finally {
      setUploadingArticleId(null);
    }
  };

  // Filter states
  const [searchTitle, setSearchTitle] = useState("");
  const [filters, setFilters] = useState({
    project: "",
    month: "",
    status: "",
    writer: "",
    manager: ""
  });

  const isAdmin = user?.roles?.includes("admin");
  const isWriter = user?.roles?.includes("writer");
  const isManager = user?.roles?.includes("manager");

  // Load data from API
  const loadData = async () => {
    setLoading(true);
    try {
      const topicsRes = await api.get("/viewTopicList");
      const topics = topicsRes.data?.data || [];
      const topicsMap = {};
      topics.forEach(topic => {
        topicsMap[topic._id] = topic;
      });

      const articlesRes = await api.get("/viewArticleList");
      const allArticles = articlesRes.data?.data || [];
      const articlesWithTopics = allArticles.map(article => ({
        ...article,
        topic: topicsMap[article.topic?._id] || article.topic,
      }));

      const usersRes = await api.get("/viewUserList");
      const allUsers = usersRes.data?.data || [];

      setArticles(articlesWithTopics);
      setUsers(allUsers);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getUserName = (idOrEmail) => {
    const found = users.find(u => u._id === idOrEmail || u.email === idOrEmail);
    return found?.name || found?.email || "—";
  };

  // Filtering by role
  const filterByRole = (arr) => {
    if (isAdmin) return arr;
    if (isWriter) return arr.filter(a => a.topic?.project?.writer === user.id);
    if (isManager) return arr.filter(a => a.topic?.project?.manager === user.id);
    return [];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, "0");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "published": return "success";
      case "submitted": return "info";
      case "revision": return "warning";
      case "approved": return "primary";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "published": return "✓";
      case "submitted": return "📤";
      case "revision": return "🔄";
      case "approved": return "👍";
      default: return "📝";
    }
  };

  const startEdit = (article) => {
    setEditingId(article._id);
    setEditData({
      contentLink: article.contentLink || "",
      publishLink: article.publishLink || "",
      status: article.status || ""
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleEditChange = (field, value) => {
    let sanitizedValue = value;
    if ((field === "contentLink" || field === "publishLink") && sanitizedValue) {
      sanitizedValue = sanitizedValue.trim();
      if (!sanitizedValue.startsWith("http://") && !sanitizedValue.startsWith("https://")) {
        sanitizedValue = `https://${sanitizedValue}`;
      }
    }
    setEditData(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  const openRevisionModal = (article) => {
    setRevisionModal({
      show: true,
      articleId: article._id,
      topicId: article.topic?._id,
      instructions: article.topic?.instructions || ""
    });
  };

  const closeRevisionModal = () => {
    setRevisionModal({ show: false, articleId: null, topicId: null, instructions: "" });
  };

  const handleRevisionSubmit = async () => {
    try {
      if (revisionModal.topicId) {
        await api.put(`/updateTopic/${revisionModal.topicId}`, {
          instructions: revisionModal.instructions
        });
      }
      await api.put(`/updateArticle/${revisionModal.articleId}`, {
        status: "revision",
        contentLink: "",
        writerSubmittedAt: ""
      });
      closeRevisionModal();
      loadData();
      alert("Revision instructions sent successfully!");
    } catch (error) {
      console.error("Error sending revision:", error);
      alert("Failed to send revision instructions: " + error.message);
    }
  };

  const saveChanges = async (articleId) => {
    const article = articles.find(a => a._id === articleId);
    if (!article) return;
    const updates = {};

    if ((isWriter || isAdmin) && editData.contentLink) {
      updates.contentLink = editData.contentLink;
      if (!article.status || article.status === "revision") {
        updates.status = "submitted";
      }
      updates.writerSubmittedAt = new Date();
    }

    if ((isManager || isAdmin) && editData.publishLink) {
      updates.publishLink = editData.publishLink;
      if (!editData.status) {
        updates.status = "published";
      }
    }

    try {
      await api.put(`/updateArticle/${articleId}`, updates);
      setEditingId(null);
      setEditData({});
      loadData();
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save changes: " + error.message);
    }
  };

  // Combine role filtering + search + other filters
  const getFilteredArticles = () => {
    let arr = filterByRole(articles);

    if (searchTitle.trim()) {
      const st = searchTitle.trim().toLowerCase();
      arr = arr.filter(a => a.topic?.title?.toLowerCase().includes(st));
    }

    if (filters.project) {
      arr = arr.filter(a => a.topic?.project?.name === filters.project);
    }
    if (filters.month) {
      arr = arr.filter(a => a.topic?.month === filters.month);
    }
    if (filters.status) {
      arr = arr.filter(a => a.status === filters.status);
    }
    if (filters.writer) {
      arr = arr.filter(a => a.topic?.project?.writer === filters.writer);
    }
    if (filters.manager) {
      arr = arr.filter(a => a.topic?.project?.manager === filters.manager);
    }

    return arr;
  };

  const clearAllFilters = () => {
    setSearchTitle("");
    setFilters({
      project: "",
      month: "",
      status: "",
      writer: "",
      manager: ""
    });
  };

  const hasActiveFilters = () => {
    return searchTitle || filters.project || filters.month || filters.status || filters.writer || filters.manager;
  };

  const getExportData = () => {
    return getFilteredArticles().map(article => ({
      Title: article.topic?.title || "—",
      Project: article.topic?.project?.name || "—",
      Month: article.topic?.month || "—",
      Status: article.status || "—",
      Writer: getUserName(article.topic?.project?.writer),
      Manager: getUserName(article.topic?.project?.manager),
      "Content Link": article.contentLink || "—",
      "Publish Link": article.publishLink || "—",
      Date: formatDate(article.updatedAt),
    }));
  };

  const handleExcelDownload = () => {
    const data = getExportData();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Articles");
    XLSX.writeFile(workbook, "articles.xlsx");
  };

  const filteredArticles = getFilteredArticles();

  // Helpers to generate options lists from articles / users
  const projectOptions = Array.from(
    new Set(articles.map(a => a.topic?.project?.name).filter(n => n))
  ).sort();
  const monthOptions = Array.from(
    new Set(articles.map(a => a.topic?.month).filter(m => m))
  );
  const statusOptions = Array.from(
    new Set(articles.map(a => a.status).filter(s => s))
  );
  const writerOptions = users.filter(u => u.roles?.includes("writer"));
  const managerOptions = users.filter(u => u.roles?.includes("manager"));

  return (
    <div className="container-fluid py-4 px-3 px-lg-4" style={{ maxWidth: "1400px" }}>
      {/* Header Section */}
      <div className="row mb-4">
        <div className="col">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <div>
              <h2 className="mb-1 fw-bold text-primary">
                📝 Articles Dashboard
              </h2>
              <p className="text-muted mb-0 small">
                Manage and track all your articles in one place
              </p>
            </div>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => loadData()}
              disabled={loading}
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" style={{ width: "3rem", height: "3rem" }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading articles...</p>
        </div>
      ) : (
        <>
          {/* Main Content Card */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
                <div className="d-flex align-items-center gap-2">
                  <h5 className="mb-0 fw-semibold">Articles List</h5>
                  {hasActiveFilters() && (
                    <span className="badge bg-primary rounded-pill">{filteredArticles.length} results</span>
                  )}
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <button 
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    🔍 {showFilters ? "Hide Filters" : "Show Filters"}
                  </button>
                  {filteredArticles.length > 0 && (
                    <>
                      <button 
                        className="btn btn-outline-success btn-sm" 
                        onClick={handleExcelDownload}
                      >
                        📊 Excel
                      </button>
                      <CSVLink
                        data={getExportData()}
                        filename={`articles_${new Date().toISOString().split('T')[0]}.csv`}
                        className="btn btn-outline-secondary btn-sm"
                      >
                        📥 CSV
                      </CSVLink>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="card-body p-3 p-lg-4">
              {/* Filters Section */}
              {showFilters && (
                <div className="mb-4 p-3 bg-light rounded border">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0 fw-semibold">🔍 Search & Filters</h6>
                    {hasActiveFilters() && (
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={clearAllFilters}
                      >
                        ✖ Clear All
                      </button>
                    )}
                  </div>

                  <div className="row g-3">
                    {/* Search by Title */}
                    <div className="col-12 col-md-6 col-lg-4">
                      <label className="form-label small fw-semibold text-muted mb-1">
                        Search by Title
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Type to search..."
                        value={searchTitle}
                        onChange={(e) => setSearchTitle(e.target.value)}
                      />
                    </div>

                    {/* Project — only for admins */}
                    {isAdmin && (
                      <div className="col-6 col-md-6 col-lg-4">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Project
                        </label>
                        <select
                          className="form-select"
                          value={filters.project}
                          onChange={(e) => setFilters(prev => ({ ...prev, project: e.target.value }))}
                        >
                          <option value="">All Projects</option>
                          {projectOptions.map((proj, idx) => (
                            <option key={idx} value={proj}>{proj}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Month */}
                    <div className={`col-6 ${isAdmin ? 'col-md-4 col-lg-2' : 'col-md-6 col-lg-3'}`}>
                      <label className="form-label small fw-semibold text-muted mb-1">
                        Month
                      </label>
                      <select
                        className="form-select"
                        value={filters.month}
                        onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
                      >
                        <option value="">All</option>
                        {monthOptions.map((m, idx) => (
                          <option key={idx} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status */}
                    <div className={`col-6 ${isAdmin ? 'col-md-4 col-lg-2' : 'col-md-6 col-lg-3'}`}>
                      <label className="form-label small fw-semibold text-muted mb-1">
                        Status
                      </label>
                      <select
                        className="form-select"
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      >
                        <option value="">All</option>
                        {statusOptions.map((st, idx) => (
                          <option key={idx} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    {/* Writer — only for admins */}
                    {isAdmin && (
                      <div className="col-6 col-md-4 col-lg-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Writer
                        </label>
                        <select
                          className="form-select"
                          value={filters.writer}
                          onChange={(e) => setFilters(prev => ({ ...prev, writer: e.target.value }))}
                        >
                          <option value="">All Writers</option>
                          {writerOptions.map(w => (
                            <option key={w._id} value={w._id}>{w.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Manager — only for admins */}
                    {isAdmin && (
                      <div className="col-6 col-md-4 col-lg-3">
                        <label className="form-label small fw-semibold text-muted mb-1">
                          Manager
                        </label>
                        <select
                          className="form-select"
                          value={filters.manager}
                          onChange={(e) => setFilters(prev => ({ ...prev, manager: e.target.value }))}
                        >
                          <option value="">All Managers</option>
                          {managerOptions.map(mgr => (
                            <option key={mgr._id} value={mgr._id}>{mgr.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Articles Table */}
              {filteredArticles.length === 0 ? (
                <div className="text-center py-5">
                  <div className="mb-3" style={{ fontSize: "4rem", opacity: 0.3 }}>📭</div>
                  <h5 className="text-muted mb-2">No articles found</h5>
                  <p className="text-muted small">
                    {hasActiveFilters() 
                      ? "Try adjusting your filters or search criteria"
                      : "Get started by creating your first article"
                    }
                  </p>
                  {hasActiveFilters() && (
                    <button className="btn btn-sm btn-outline-primary mt-2" onClick={clearAllFilters}>
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th className="fw-semibold" style={{ minWidth: "200px" }}>Title</th>
                        <th className="fw-semibold">Project</th>
                        <th className="fw-semibold d-none d-md-table-cell">Month</th>
                        <th className="fw-semibold">Status</th>
                        <th className="fw-semibold d-none d-md-table-cell">Updated</th>
                        <th className="fw-semibold d-none d-lg-table-cell">Writer</th>
                        <th className="fw-semibold d-none d-lg-table-cell">Manager</th>
                        <th className="fw-semibold text-center">Content</th>
                        <th className="fw-semibold text-center">Publish</th>
                        <th className="fw-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredArticles.map(article => {
                        const isEditing = editingId === article._id;
                        const canEditContent = (isWriter && article.topic?.project?.writer === user.id) || isAdmin;
                        const canEditPublish = (isManager && article.topic?.project?.manager === user.id) || isAdmin;
                        const canRequestRevision = ((isManager && article.topic?.project?.manager === user.id) || isAdmin) && article.status === "submitted";

                        return (
                          <tr key={article._id}>
                            <td>
                              <div className="fw-semibold text-dark" style={{ maxWidth: "300px" }}>
                                {article.topic?.title || <span className="text-muted">No title</span>}
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-secondary bg-opacity-25 text-dark">
                                {article.topic?.project?.name || "—"}
                              </span>
                            </td>
                            <td className="d-none d-md-table-cell">
                              <small className="text-muted">{article.topic?.month || "—"}</small>
                            </td>
                            <td>
                              <span className={`badge bg-${getStatusBadge(article.status)}`}>
                                {getStatusIcon(article.status)} {article.status || "draft"}
                              </span>
                            </td>
                            <td className="d-none d-md-table-cell">
                              <small className="text-muted">{formatDate(article.updatedAt)}</small>
                            </td>                            
                            <td className="d-none d-lg-table-cell">
                              <small>{getUserName(article.topic?.project?.writer)}</small>
                            </td>
                            <td className="d-none d-lg-table-cell">
                              <small>{getUserName(article.topic?.project?.manager)}</small>
                            </td>
                            <td className="text-center">
                              {isEditing && canEditContent ? (
                                <div className="d-flex flex-column gap-1" style={{ minWidth: "200px" }}>
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.md,.txt"
                                    className="form-control form-control-sm"
                                    onChange={(e) =>
                                      handleContentUpload(article._id, e.target.files[0])
                                    }
                                    disabled={uploadingArticleId === article._id}
                                  />

                                  {uploadingArticleId === article._id && (
                                    <small className="text-muted">Uploading...</small>
                                  )}

                                  {editData.contentLink && (
                                    <a
                                      href={editData.contentLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="small text-primary"
                                    >
                                      Preview uploaded file
                                    </a>
                                  )}
                                </div>
                              ) : article.contentLink ? (
                                <a 
                                  href={article.contentLink} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="btn btn-sm btn-outline-primary"
                                >
                                  📄 View
                                </a>
                              ) : (
                                <span className="text-muted small">—</span>
                              )}
                            </td>
                            <td className="text-center">
                              {isEditing && canEditPublish ? (
                                <input
                                  type="url"
                                  className="form-control form-control-sm"
                                  placeholder="https://..."
                                  value={editData.publishLink}
                                  onChange={(e) => handleEditChange("publishLink", e.target.value)}
                                  style={{ minWidth: "180px" }}
                                />
                              ) : article.publishLink ? (
                                <a 
                                  href={article.publishLink} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="btn btn-sm btn-outline-success"
                                >
                                  🌐 View
                                </a>
                              ) : (
                                <span className="text-muted small">—</span>
                              )}
                            </td>
                            <td>
                              {isEditing ? (
                                <div className="d-flex gap-1 justify-content-center">
                                  <button
                                    className="btn btn-success btn-sm"
                                    onClick={() => saveChanges(article._id)}
                                    disabled={
                                      (canEditContent && !editData.contentLink) ||
                                      uploadingArticleId === article._id                                      
                                    }
                                    title="Save changes"
                                  >
                                    💾
                                  </button>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={cancelEdit}
                                    title="Cancel"
                                  >
                                    ✖
                                  </button>
                                </div>
                              ) : (
                                <div className="d-flex gap-1 justify-content-center flex-wrap">
                                  {(canEditContent || canEditPublish) && (
                                    <button
                                      className="btn btn-outline-primary btn-sm"
                                      onClick={() => startEdit(article)}
                                      title="Edit article"
                                    >
                                      ✏️
                                    </button>
                                  )}
                                  {canRequestRevision && (
                                    <button
                                      className="btn btn-outline-warning btn-sm"
                                      onClick={() => openRevisionModal(article)}
                                      title="Request revision"
                                    >
                                      🔄
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {revisionModal.show && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">🔄 Request Revision</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeRevisionModal}
                  aria-label="Close"
                >
                  <span className="visually-hidden">Close</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Revision Instructions:</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder="Provide detailed instructions for the writer..."
                    value={revisionModal.instructions}
                    onChange={(e) => setRevisionModal(prev => ({ ...prev, instructions: e.target.value }))}
                  />
                </div>
                <div className="text-muted small">
                  <strong>Note:</strong> This will update the topic instructions you given during topic research. Also, the content link will be cleared so the writer can submit a new one.
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeRevisionModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-warning"
                  onClick={handleRevisionSubmit}
                  disabled={!revisionModal.instructions.trim()}
                >
                  Send Revision Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
