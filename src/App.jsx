import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import DashboardAdmin from "./pages/admin/dashboardAdmin";
import DashboardUser from "./pages/user/dashboardUser";
import DaftarPeserta from "./pages/admin/daftarPeserta";
import ProtectedRoute from "./components/protectRoute";
import JadwalRapat from "./pages/admin/jadwalRapat";
import DataRapat from "./pages/admin/dataRapat";
import DetailDataRapat from "./pages/admin/detailDataRapat";
import JadwalRapatUser from "./pages/user/jadwalRapatUser";
import TindakLanjutUser from "./pages/user/tindakLanjutUser";
import DetailDataRapatUser from "./pages/user/detailDataRapatUser";
import TindakLanjutAdmin from "./pages/admin/tindakLanjutAdmin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Halaman Login */}
        <Route path="/login" element={<Login />} />

        {/* ================= HALAMAN KHUSUS ADMIN ================= */}
        <Route
          path="/admin/dashboard-admin"
          element={
            <ProtectedRoute allowedRole={["Admin", "admin"]}>
              <DashboardAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/daftar-peserta"
          element={
            <ProtectedRoute allowedRole={["Admin", "admin"]}>
              <DaftarPeserta />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/jadwal-rapat"
          element={
            <ProtectedRoute allowedRole={["Admin", "admin"]}>
              <JadwalRapat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tindak-lanjut"
          element={
            <ProtectedRoute allowedRole={["Admin", "admin"]}>
              <TindakLanjutAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/data-rapat"
          element={
            <ProtectedRoute allowedRole={["Admin", "admin"]}>
              <DataRapat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/detail-data-rapat"
          element={
            <ProtectedRoute allowedRole={["Admin", "admin"]}>
              <DetailDataRapat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/detail-data-rapat/:meetingId"
          element={
            <ProtectedRoute allowedRole={["Admin", "admin"]}>
              <DetailDataRapat />
            </ProtectedRoute>
          }
        />

        {/* ================= HALAMAN USER & PIMPINAN ================= */}
        <Route
          path="/user/dashboard-user"
          element={
            <ProtectedRoute allowedRole={["Peserta", "peserta", "Pimpinan", "pimpinan", "User", "user"]}>
              <DashboardUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/jadwal-rapat"
          element={
            <ProtectedRoute allowedRole={["Peserta", "peserta", "Pimpinan", "pimpinan", "User", "user"]}>
              <JadwalRapatUser />
            </ProtectedRoute>
          }
        />

        {/* Route Data Rapat Pimpinan & Peserta (Pakai file ./pages/admin/dataRapat) */}
        <Route
          path="/user/data-rapat"
          element={
            <ProtectedRoute allowedRole={["Peserta", "peserta", "Pimpinan", "pimpinan", "User", "user"]}>
              <DataRapat />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/tindak-lanjut"
          element={
            <ProtectedRoute allowedRole={["Peserta", "peserta", "Pimpinan", "pimpinan", "User", "user"]}>
              <TindakLanjutUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/detail-data-rapat-user/:meetingId"
          element={
            <ProtectedRoute allowedRole={["Peserta", "peserta", "Pimpinan", "pimpinan", "User", "user"]}>
              <DetailDataRapatUser />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;