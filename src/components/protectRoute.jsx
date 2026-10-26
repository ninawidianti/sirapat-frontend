import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // 1. Jika belum login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // 2. Normalisasi role pengguna dari localStorage
  const userRole = (user.role || "").trim().toLowerCase();

  // 3. Normalisasi allowedRole menjadi Array huruf kecil
  const allowedRolesArray = Array.isArray(allowedRole)
    ? allowedRole.map((r) => r.trim().toLowerCase())
    : [allowedRole.trim().toLowerCase()];

  // 4. Pengecekan Akses
  const isAllowed = allowedRolesArray.includes(userRole);

  if (!isAllowed) {
    // Jika tidak diizinkan, kembalikan sesuai role
    if (userRole === "pimpinan" || userRole === "peserta") {
      return <Navigate to="/user/dashboard-user" replace />;
    }
    if (userRole === "admin") {
      return <Navigate to="/admin/dashboard-admin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}