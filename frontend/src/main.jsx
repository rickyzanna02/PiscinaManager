import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import CollaboratorePage from "./CollaboratorePage";
import "./index.css";
import AdminPage from "./AdminPage";
import ContabilitaPage from "./ContabilitaPage";
import ContabilitaDettaglio from "./ContabilitaDettaglio";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/collaboratore" element={<CollaboratorePage />} />
        <Route path="/contabilita" element={<ContabilitaPage />} />
        <Route path="/contabilita/:userId" element={<ContabilitaDettaglio />} />

      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
