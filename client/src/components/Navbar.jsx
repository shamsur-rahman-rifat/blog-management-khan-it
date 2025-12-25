import React, { useContext, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../auth/AuthContext';
import Report from './../pages/Report';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const toggleNavbar = () => setIsCollapsed(!isCollapsed);
  const closeNavbar = () => setIsCollapsed(true);

  const linkClass = ({ isActive }) =>
    `nav-link ${isActive ? 'active fw-semibold text-primary' : ''}`;

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light px-3 shadow-sm">
      <NavLink className="navbar-brand fw-bold" to="/" onClick={closeNavbar}>
        Blog Management
      </NavLink>

      <button
        className="navbar-toggler"
        type="button"
        aria-controls="navbarSupportedContent"
        aria-expanded={!isCollapsed}
        aria-label="Toggle navigation"
        onClick={toggleNavbar}
      >
        <span className="navbar-toggler-icon"></span>
      </button>

      <div className={`collapse navbar-collapse ${!isCollapsed ? 'show' : ''}`} id="navbarSupportedContent">
        <ul className="navbar-nav me-auto mb-2 mb-lg-0">

          {user && (
            <li className="nav-item">
              <NavLink className={linkClass} to="/" onClick={closeNavbar}>
                Dashboard
              </NavLink>
            </li>
          )}

          {(user?.roles?.includes('manager') || user?.roles?.includes('admin')) && (
            <li className="nav-item">
              <NavLink className={linkClass} to="/projects" onClick={closeNavbar}>
                Projects
              </NavLink>
            </li>
          )}

          {(user?.roles?.includes('manager') || user?.roles?.includes('writer')) && (
            <li className="nav-item">
              <NavLink className={linkClass} to="/topics" onClick={closeNavbar}>
                Topics
              </NavLink>
            </li>
          )}

          {(user?.roles?.includes('manager') || user?.roles?.includes('writer') || user?.roles?.includes('admin')) && (
            <li className="nav-item">
              <NavLink className={linkClass} to="/articles" onClick={closeNavbar}>
                Articles
              </NavLink>
            </li>
          )}

          {user?.roles?.includes('admin') && (
            <li className="nav-item">
              <NavLink className={linkClass} to="/team" onClick={closeNavbar}>
                Team
              </NavLink>
            </li>
          )}

          {user?.roles?.includes('admin') && (
            <li className="nav-item">
              <NavLink className={linkClass} to="/report" onClick={closeNavbar}>
                Report
              </NavLink>
            </li>
          )}          

        </ul>

        <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center">
          {user ? (
            <>
              <li className="nav-item">
                <NavLink
                  className={({ isActive }) =>
                    `nav-link fs-6 ${isActive ? 'active text-primary fw-semibold' : 'text-dark'}`
                  }
                  to="/profile"
                  onClick={closeNavbar}
                >
                  Hi, {user.name}
                </NavLink>
              </li>
              <li className="nav-item">
                <button
                  className="btn btn-outline-danger ms-2"
                  onClick={() => {
                    logout();
                    navigate('/login');
                    closeNavbar();
                  }}
                  aria-label="Logout"
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <li className="nav-item">
              <NavLink className={linkClass} to="/login" onClick={closeNavbar}>
                Login
              </NavLink>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}
