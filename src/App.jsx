import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import DashboardAdmin from "./pages/admin/dashboardAdmin";
import DashboardUser from "./pages/user/dashboardUser";
import DaftarPeserta from "./pages/admin/daftarPeserta"; // <-- Import Halaman Daftar Peserta
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
        <Route path="/" element={<Login />} />

        {/* Halaman Admin */}
        <Route
          path="/admin/dashboard-admin"
          element={
            <ProtectedRoute allowedRole="Admin">
              <DashboardAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/daftar-peserta"
          element={
            <ProtectedRoute allowedRole="Admin">
              <DaftarPeserta />
            </ProtectedRoute>
          }
        />

        {/* Halaman Jadwal Rapat */}
        <Route
          path="/admin/jadwal-rapat"
          element={
            <ProtectedRoute allowedRole="Admin">
              <JadwalRapat />
            </ProtectedRoute>
          }
        />

        {/* Halaman Data Rapat */}
        <Route
          path="/admin/data-rapat"
          element={
            <ProtectedRoute allowedRole="Admin">
              <DataRapat />
            </ProtectedRoute>
          }
        />

        {/* Route tanpa ID (mengandalkan state) */}
        <Route
          path="/admin/detail-data-rapat"
          element={
            <ProtectedRoute allowedRole="Admin">
              <DetailDataRapat />
            </ProtectedRoute>
          }
        />

        {/* Route dengan ID (untuk penanganan saat page refresh / direct link) */}
        <Route
          path="/admin/detail-data-rapat/:meetingId"
          element={
            <ProtectedRoute allowedRole="Admin">
              <DetailDataRapat />
            </ProtectedRoute>
          }
        />

        {/* Route tindak lanjut */}
        <Route
          path="/admin/tindak-lanjut"
          element={
            <ProtectedRoute allowedRole="Admin">
              <TindakLanjutAdmin />
            </ProtectedRoute>
          }
        />

        {/* Halaman User / Peserta */}
        <Route
          path="/user/dashboard-user"
          element={
            <ProtectedRoute allowedRole="Peserta">
              <DashboardUser />
            </ProtectedRoute>
          }
        />

        {/* Halaman jadwal rapat / Peserta */}
        <Route
          path="/user/jadwal-rapat"
          element={
            <ProtectedRoute allowedRole="Peserta">
              <JadwalRapatUser />
            </ProtectedRoute>
          }
        />

        {/* Halaman tindak lanjut / Peserta */}
        <Route
          path="/user/tindak-lanjut"
          element={
            <ProtectedRoute allowedRole="Peserta">
              <TindakLanjutUser />
            </ProtectedRoute>
          }
        />

        {/* Halaman tindak lanjut / Peserta */}
        <Route
          path="/user/detail-data-rapat-user/:meetingId"
          element={
            <ProtectedRoute allowedRole="Peserta">
              <DetailDataRapatUser />
            </ProtectedRoute>
          }
        />


      </Routes>
    </BrowserRouter>
  );
}

export default App;