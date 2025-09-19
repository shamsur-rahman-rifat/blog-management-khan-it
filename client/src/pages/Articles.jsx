import React, { useEffect, useState, useContext } from "react";
import api from "../api";
import { AuthContext } from "../auth/AuthContext";
import * as XLSX from "xlsx";
import { CSVLink } from "react-csv";

export default function Articles() {
  const { user } = useContext(AuthContext);
  const [articles, setArticles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [revisionModal, setRevisionModal] = useState({ show: false, articleId: null, topicId: null, instructions: "" });

  // New states for filters/search
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
      default: return "secondary";
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

  // Ensure status is published if publishLink is added
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

  const deleteArticle = async (articleId) => {
    if (!window.confirm("Are you sure you want to delete this article?")) return;
    try {
      await api.delete(`/deleteArticle/${articleId}`);
      loadData();
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Failed to delete article: " + error.message);
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
  );
  const monthOptions = Array.from(
    new Set(articles.map(a => a.topic?.month).filter(m => m))
  );
  const statusOptions = Array.from(
    new Set(articles.map(a => a.status).filter(s => s))
  );
  const writerOptions = users.filter(u => u.roles?.includes("writer"));
  const managerOptions = users.filter(u => u.roles?.includes("manager"));

  return (
    <div className="container py-4">
      <h3 className="mb-4 text-center fw-bold">📝 Articles Dashboard</h3>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" style={{ width: "3rem", height: "3rem" }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading articles...</p>
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body">
            {/* Export Buttons */}
            {filteredArticles.length > 0 && (
              <div className="d-flex justify-content-end gap-2 mb-3">
                <button className="btn btn-outline-success btn-sm" onClick={handleExcelDownload}>
                  📊 Export Excel
                </button>
                <CSVLink
                  data={getExportData()}
                  filename="articles.csv"
                  className="btn btn-outline-secondary btn-sm"
                >
                  📥 Export CSV
                </CSVLink>
              </div>
            )}

            {/* Filters / Search Row */}
            <div className="row mb-3 g-2">
              <div className="col-md-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by title"
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                />
              </div>
              <div className="col-md-2">
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
              <div className="col-md-1">
                <select
                  className="form-select"
                  value={filters.month}
                  onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
                >
                  <option value="">All Months</option>
                  {monthOptions.map((m, idx) => (
                    <option key={idx} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <select
                  className="form-select"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">All Statuses</option>
                  {statusOptions.map((st, idx) => (
                    <option key={idx} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
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
              <div className="col-md-2">
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
            </div>

            {/* Articles Table */}
            {filteredArticles.length === 0 ? (
              <p className="text-center text-muted py-5">No articles to display.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Title</th>
                      <th>Project</th>
                      <th className="d-none d-md-table-cell">Month</th>
                      <th>Status</th>
                      <th className="d-none d-lg-table-cell">Writer</th>
                      <th className="d-none d-lg-table-cell">Manager</th>
                      <th>Content Link</th>
                      <th>Publish Link</th>
                      <th className="d-none d-md-table-cell">Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArticles.map(article => {
                      const isEditing = editingId === article._id;
                      const canEditContent = (isWriter && article.topic?.project?.writer === user.id) || isAdmin;
                      const canEditPublish = (isManager && article.topic?.project?.manager === user.id) || isAdmin;
                      const canDelete = isAdmin || (isManager && article.topic?.project?.manager === user.id);
                      const canRequestRevision = ((isManager && article.topic?.project?.manager === user.id) || isAdmin) && article.status === "submitted";

                      return (
                        <tr key={article._id}>
                          <td style={{ maxWidth: "200px", wordWrap: "break-word" }}>
                            {article.topic?.title || "—"}
                          </td>
                          <td>{article.topic?.project?.name || "—"}</td>
                          <td className="d-none d-md-table-cell">{article.topic?.month || "—"}</td>
                          <td>
                            <span className={`badge bg-${getStatusBadge(article.status)}`}>
                              {article.status || "draft"}
                            </span>
                          </td>
                          <td className="d-none d-lg-table-cell">{getUserName(article.topic?.project?.writer)}</td>
                          <td className="d-none d-lg-table-cell">{getUserName(article.topic?.project?.manager)}</td>
                          <td>
                            {isEditing && canEditContent ? (
                              <input
                                type="url"
                                className="form-control form-control-sm"
                                placeholder="Enter content link"
                                value={editData.contentLink}
                                onChange={(e) => handleEditChange("contentLink", e.target.value)}
                                style={{ minWidth: "150px" }}
                              />
                            ) : article.contentLink ? (
                              <a href={article.contentLink} target="_blank" rel="noreferrer">View</a>
                            ) : "—"}
                          </td>
                          <td>
                            {isEditing && canEditPublish ? (
                              <input
                                type="url"
                                className="form-control form-control-sm"
                                placeholder="Enter publish link"
                                value={editData.publishLink}
                                onChange={(e) => handleEditChange("publishLink", e.target.value)}
                                style={{ minWidth: "150px" }}
                              />
                            ) : article.publishLink ? (
                              <a href={article.publishLink} target="_blank" rel="noreferrer">View</a>
                            ) : "—"}
                          </td>
                          <td className="d-none d-md-table-cell">{formatDate(article.updatedAt)}</td>
                          <td>
                            {isEditing ? (
                              <div className="d-flex gap-1">
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => saveChanges(article._id)}
                                  disabled={canEditContent && !editData.contentLink}
                                >
                                  💾
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={cancelEdit}
                                >
                                  ✖
                                </button>
                              </div>
                            ) : (
                              <div className="d-flex gap-1 flex-wrap">
                                {(canEditContent || canEditPublish) && (
                                  <button
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => startEdit(article)}
                                  >
                                    ✏️ Edit
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => deleteArticle(article._id)}
                                  >
                                    🗑️
                                  </button>
                                )}
                                {canRequestRevision && (
                                  <button
                                    className="btn btn-outline-warning btn-sm"
                                    onClick={() => openRevisionModal(article)}
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
