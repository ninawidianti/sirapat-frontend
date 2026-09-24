import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRole }) {
  // 1. Ambil token dan data user dari localStorage
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  // 2. Jika token tidak ada (belum login), tendang ke halaman login (/)
  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  // 3. Jika ada batasan role (misal khusus "Admin") dan role user tidak sesuai
  if (allowedRole && user.role !== allowedRole) {
    alert("Anda tidak memiliki akses ke halaman ini!");
    
    // Kembalikan ke dashboard yang sesuai role-nya
    if (user.role === "Admin") {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/user/dashboard" replace />;
    }
  }

  // 4. Jika lolos semua pengecekan, tampilkan halamannya
  return children;
}