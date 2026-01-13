import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import "./index.css";

// ===== CONTEXT AUTH =====
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";

// ===== PAGES =====
import LoginPage from "./auth/LoginPage";
import AdminPage from "./AdminPage";
import CollaboratorePage from "./CollaboratorePage";
import ContabilitaPage from "./ContabilitaPage";
import ContabilitaDettaglio from "./ContabilitaDettaglio";
import RegisterPage from "./auth/RegisterPage";
import RequireStaff from "./auth/RequireStaff";
import RequireContabilita from "./auth/RequireContabilita";




ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* Redirect root */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* ===== AUTH ===== */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          


          <Route
            path="/admin"
            element={
              <RequireStaff>
                <AdminPage />
              </RequireStaff>
            }
          />



          {/* ===== COLLABORATORE (PROTETTO) ===== */}
          <Route
            path="/collaboratore"
            element={
              <RequireAuth>
                <CollaboratorePage />
              </RequireAuth>
            }
          />

          {/* ===== CONTABILITÀ (PROTETTO) ===== */}
          <Route
            path="/contabilita"
            element={
              <RequireContabilita>
                <ContabilitaPage />
              </RequireContabilita>
            }
          />

          <Route
            path="/contabilita/:userId"
            element={
              <RequireContabilita>
                <ContabilitaDettaglio />
              </RequireContabilita>
            }
          />


          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
