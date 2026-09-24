import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/logo_kementan.png";
import hai from "../../assets/hello_admin.png";

export default function DashboardUser() {
  // Ambil data user & token dari localStorage
  const userStored = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = userStored.name || "User";
  const currentUserId = userStored.user_id || userStored.id;
  const token = localStorage.getItem("token");

  const navigate = useNavigate();
  const location = useLocation();

  // State untuk mendeteksi lebar layar secara real-time
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  // State untuk mengontrol pop-up modal logout
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // State Data Rapat dari API
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State Data Kepanitiaan dari API
  const [committees, setCommittees] = useState([]);
  const [loadingCommittees, setLoadingCommittees] = useState(true);
  const [errorCommittees, setErrorCommittees] = useState(null);

  // State Data Tindak Lanjut dari API & Hitungan Per Status
  const [tindakLanjutCounts, setTindakLanjutCounts] = useState({
    belumMulai: 0,
    dikerjakan: 0,
    selesai: 0,
  });
  const [loadingTindakLanjut, setLoadingTindakLanjut] = useState(true);

  // State Modal List Peserta
  const [showPesertaModal, setShowPesertaModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loadingPeserta, setLoadingPeserta] = useState(false);

  // State Modal Konfirmasi Kehadiran Form
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedMeetingForConfirm, setSelectedMeetingForConfirm] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("Hadir");
  const [notes, setNotes] = useState("");
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  // State Modal Sukses Konfirmasi
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // State Modal Warning / Info Waktu Konfirmasi Kehadiran
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Helper untuk mengecek apakah window konfirmasi kehadiran sedang dibuka (Mulai jam rapat s/d 2 minggu setelahnya)
  const isAttendanceOpen = (meeting) => {
    if (!meeting || !meeting.date || !meeting.start_time) {
      return { isOpen: false, reason: "Data rapat tidak lengkap" };
    }

    const now = new Date();
    const dateStr = typeof meeting.date === "string" ? meeting.date.split("T")[0] : "";
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = meeting.start_time.split(":").map(Number);

    if (!year || !month || !day) {
      return { isOpen: false, reason: "Format tanggal tidak valid" };
    }

    // Waktu Mulai: Tanggal & jam rapat dimulai
    const openTime = new Date(year, month - 1, day, hours || 0, minutes || 0, 0);

    // Batas Selesai: 2 minggu (14 hari) setelah rapat dimulai
    const closeTime = new Date(openTime.getTime() + 14 * 24 * 60 * 60 * 1000);

    if (now < openTime) {
      const timeFormatted = `${String(hours || 0).padStart(2, "0")}:${String(minutes || 0).padStart(2, "0")}`;
      return {
        isOpen: false,
        reason: `Konfirmasi kehadiran baru dapat diisi ketika jam rapat telah dimulai (pukul ${timeFormatted} WIB).`,
      };
    }

    if (now > closeTime) {
      return {
        isOpen: false,
        reason: "Batas waktu konfirmasi kehadiran telah berakhir (maksimal 2 minggu setelah rapat berlangsung).",
      };
    }

    return { isOpen: true, reason: "" };
  };

  // 1. Fetch Data Rapat dari API Backend
  const fetchMeetings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("http://localhost:5000/api/meetings", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengambil data rapat");
      }

      setMeetings(result.data || []);
    } catch (err) {
      console.error("Fetch meetings error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Data Kepanitiaan dari API Backend dan Filter Sesuai User yang Login
  const fetchCommittees = async () => {
    try {
      setLoadingCommittees(true);
      setErrorCommittees(null);

      const response = await fetch("http://localhost:5000/api/committees", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengambil data kepanitiaan");
      }

      const allCommittees = result.data || [];

      // Filter kepanitiaan dimana user saat ini terdaftar di dalam array 'members'
      const userCommittees = allCommittees.filter((comm) => {
        if (!comm.members || !Array.isArray(comm.members)) return false;
        return comm.members.some(
          (m) => Number(m.user_id) === Number(currentUserId)
        );
      });

      setCommittees(userCommittees);
    } catch (err) {
      console.error("Fetch committees error:", err);
      setErrorCommittees(err.message);
    } finally {
      setLoadingCommittees(false);
    }
  };

  // 3. Fetch Data Tindak Lanjut dari API & Hitung Jumlah Per Status
  const fetchFollowUps = async () => {
    try {
      setLoadingTindakLanjut(true);
      const res = await fetch("http://localhost:5000/api/follow-ups", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await res.json();

      if (res.ok) {
        const allData = result.data || [];

        const userFollowUps = allData.filter((item) => {
          let userIds = [];
          if (Array.isArray(item.user_id)) {
            userIds = item.user_id.map(Number);
          } else if (typeof item.user_id === "string") {
            try {
              userIds = JSON.parse(item.user_id).map(Number);
            } catch (e) {
              userIds = [Number(item.user_id)];
            }
          } else if (item.user_id) {
            userIds = [Number(item.user_id)];
          }

          return userIds.includes(Number(currentUserId));
        });

        const counts = userFollowUps.reduce(
          (acc, item) => {
            const status = item.status;
            if (status === "Belum Mulai") acc.belumMulai += 1;
            else if (status === "Dikerjakan") acc.dikerjakan += 1;
            else if (status === "Selesai") acc.selesai += 1;
            return acc;
          },
          { belumMulai: 0, dikerjakan: 0, selesai: 0 }
        );

        setTindakLanjutCounts(counts);
      }
    } catch (err) {
      console.error("Error fetching follow ups for dashboard:", err);
    } finally {
      setLoadingTindakLanjut(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMeetings();
      fetchCommittees();
      fetchFollowUps();
    }
  }, [token, currentUserId]);

  const handleOpenConfirmModal = (meetingItem) => {
    const timeCheck = isAttendanceOpen(meetingItem);
    if (!timeCheck.isOpen) {
      setInfoMessage(timeCheck.reason);
      setShowInfoModal(true);
      return;
    }

    setSelectedMeetingForConfirm(meetingItem);
    setSelectedStatus("Hadir");
    setNotes("");
    setShowConfirmModal(true);
  };

  const handleSubmitAttendance = async () => {
    if (!selectedMeetingForConfirm) return;

    try {
      setSubmittingAttendance(true);
      const statusToSubmit = selectedStatus || "Belum Konfirmasi";

      const response = await fetch(
        `http://localhost:5000/api/meetings/${selectedMeetingForConfirm.meeting_id}/confirm-attendance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: statusToSubmit,
            notes: notes,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        setShowConfirmModal(false);
        setSuccessMessage("Konfirmasi kehadiran berhasil disimpan! Admin akan melakukan pengecekan ulang.");
        setShowSuccessModal(true);
        fetchMeetings();
      } else {
        alert(result.message || "Gagal melakukan konfirmasi kehadiran");
      }
    } catch (err) {
      console.error("Error konfirmasi kehadiran:", err);
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setSubmittingAttendance(false);
    }
  };

  const handleOpenPesertaModal = async (meetingItem) => {
    setSelectedMeeting(meetingItem);
    setShowPesertaModal(true);
    setLoadingPeserta(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/meetings/${meetingItem.meeting_id}/participants`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        const list = Array.isArray(result.data)
          ? result.data
          : Array.isArray(result)
          ? result
          : [];
        setParticipants(list);
      } else {
        setParticipants([]);
      }
    } catch (err) {
      console.error("Error fetch peserta:", err);
      setParticipants([]);
    } finally {
      setLoadingPeserta(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatCreatedDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${d}/${m}/${y} ${hh}:${mm}`;
  };

  const formatTimeRange = (start, end) => {
    if (!start || !end) return "-";
    const startTime = start.substring(0, 5);
    const endTime = end.substring(0, 5);
    return `${startTime} - ${endTime} WIB`;
  };

  const scheduledMeetings = meetings.filter((m) => m.status === "Terjadwal");

  // --- HITUNGAN STATISTIK STATUS RAPAT USER ---
  const totalDiundang = meetings.length;
  const totalHadir = meetings.filter((m) => String(m.attendance_status).toLowerCase() === "hadir").length;
  const totalIzin = meetings.filter((m) => String(m.attendance_status).toLowerCase() === "izin").length;
  const totalSakit = meetings.filter((m) => String(m.attendance_status).toLowerCase() === "sakit").length;
  const totalBelumKonfirmasi = meetings.filter(
    (m) =>
      !m.attendance_status ||
      String(m.attendance_status).toLowerCase() === "belum konfirmasi" ||
      String(m.attendance_status).trim() === ""
  ).length;

  const isMobile = windowWidth <= 768;
  const isSmallMobile = windowWidth <= 480;

  const executeLogout = async () => {
    try {
      await fetch("http://localhost:5000/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("Gagal logout di server:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/", { replace: true });
    }
  };

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: "#f3f4f6",
      color: "#1f2937",
      display: "flex",
      flexDirection: "column",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      boxSizing: "border-box",
    },
    header: {
      backgroundColor: "#2D7A68",
      color: "#ffffff",
      position: "sticky",
      top: 0,
      zIndex: 1000,
      width: "100%",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08)",
    },
    headerTop: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: isMobile ? "0.75rem 1rem" : "1rem 1.5rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxSizing: "border-box",
      gap: "0.75rem",
    },
    brandBox: {
      display: "flex",
      alignItems: "center",
      gap: isMobile ? "0.5rem" : "0.75rem",
    },
    logo: {
      width: isMobile ? "2.75rem" : "3.5rem",
      height: isMobile ? "2.75rem" : "3.5rem",
      objectFit: "contain",
      flexShrink: 0,
    },
    brandSubtitle: {
      fontSize: "clamp(0.65rem, 1.5vw, 0.75rem)",
      fontWeight: 300,
      margin: 0,
      opacity: 0.8,
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    },
    brandTitle: {
      fontSize: "clamp(0.9rem, 2vw, 1.125rem)",
      fontWeight: 700,
      lineHeight: 1.2,
      margin: 0,
      color: "#f0fdf4",
      letterSpacing: "0.1px",
    },
    userProfile: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      cursor: "pointer",
    },
    userText: {
      fontSize: "0.875rem",
      fontWeight: 500,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: "150px",
      display: "inline-block",
      verticalAlign: "middle",
      lineHeight: "1.2",
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif",
    },
    logoutBtn: {
      display: "flex",
      alignItems: "center",
      gap: "0.375rem",
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      color: "#ffffff",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      padding: isMobile ? "0.375rem 0.625rem" : "0.375rem 0.75rem",
      borderRadius: "0.375rem",
      cursor: "pointer",
      fontSize: "clamp(0.75rem, 1.5vw, 0.8125rem)",
      fontWeight: 500,
      marginLeft: isMobile ? "0.5rem" : "0.75rem",
      transition: "all 0.2s ease",
      flexShrink: 0,
    },
    avatarCircle: {
      width: "2rem",
      height: "2rem",
      borderRadius: "50%",
      backgroundColor: "#ffffff",
      color: "#2D7A68",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "bold",
      fontSize: "0.875rem",
      flexShrink: 0,
    },
    headerNav: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: isMobile ? "0 1rem" : "0 1.5rem",
      display: "flex",
      gap: isMobile ? "1rem" : "2rem",
      overflowX: "auto",
      scrollbarWidth: "none",
      boxSizing: "border-box",
    },
    navLinkActive: {
      padding: "0.5rem 0",
      color: "#ffffff",
      fontWeight: 700,
      borderBottom: "2px solid #ffffff",
      fontSize: "clamp(0.8rem, 1.5vw, 0.875rem)",
      whiteSpace: "nowrap",
      background: "none",
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
      cursor: "pointer",
      flexShrink: 0,
    },
    navLink: {
      padding: "0.5rem 0",
      color: "#d1e7e0",
      fontWeight: 500,
      fontSize: "clamp(0.8rem, 1.5vw, 0.875rem)",
      whiteSpace: "nowrap",
      background: "none",
      border: "none",
      cursor: "pointer",
      flexShrink: 0,
    },
    main: {
      flex: 1,
      maxWidth: "1280px",
      width: "100%",
      margin: "0 auto",
      padding: isMobile ? "1rem" : "1.5rem",
      display: "flex",
      flexDirection: "column",
      gap: isMobile ? "1rem" : "1.5rem",
      boxSizing: "border-box",
    },
    bannerCard: {
      backgroundColor: "#ffffff",
      borderRadius: "1rem",
      padding: isMobile ? "1rem" : "1.5rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      border: "1px solid #f3f4f6",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      alignItems: "center",
      textAlign: isMobile ? "center" : "left",
      gap: isMobile ? "1rem" : "2rem",
    },
    bannerIllustration: {
      width: isMobile ? "7.5rem" : "10rem",
      flexShrink: 0,
    },
    bannerImg: {
      width: "100%",
      height: "auto",
    },
    bannerTitle: {
      fontSize: "clamp(1.25rem, 2.5vw, 1.5rem)",
      fontWeight: 700,
      color: "#2D7A68",
      margin: "0 0 0.5rem 0",
    },
    bannerSubtitle: {
      fontSize: "clamp(0.875rem, 1.8vw, 1rem)",
      fontWeight: 600,
      color: "#1f2937",
      margin: "0 0 0.5rem 0",
    },
    bannerSlogan: {
      fontSize: "clamp(0.8125rem, 1.5vw, 0.875rem)",
      color: "#059669",
      fontWeight: 600,
      margin: "0 0 0.75rem 0",
      letterSpacing: "0.3px",
    },
    bannerText: {
      fontSize: "clamp(0.8125rem, 1.5vw, 0.875rem)",
      color: "#4b5563",
      lineHeight: 1.6,
      maxWidth: "700px",
      margin: 0,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "2.2fr 1fr",
      gap: isMobile ? "1rem" : "1.5rem",
    },
    leftColumn: {
      display: "flex",
      flexDirection: "column",
      gap: isMobile ? "1rem" : "1.5rem",
    },
    panelCard: {
      backgroundColor: "#ffffff",
      borderRadius: "1rem",
      padding: isMobile ? "1rem" : "1.5rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      border: "1px solid #f3f4f6",
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
    },
    panelTitle: {
      fontSize: "clamp(0.9375rem, 2vw, 1rem)",
      fontWeight: 700,
      color: "#2D7A68",
      borderBottom: "2px solid #2D7A68",
      width: "fit-content",
      paddingBottom: "0.25rem",
      margin: 0,
    },
    rapatCard: {
      border: "1px solid #e5e7eb",
      borderRadius: "0.75rem",
      padding: isMobile ? "0.875rem" : "1.25rem",
      backgroundColor: "#ffffff",
      display: "flex",
      flexDirection: "column",
      gap: "0.75rem",
    },
    committeeCard: {
      border: "1px solid #e5e7eb",
      borderRadius: "0.75rem",
      padding: isMobile ? "0.875rem" : "1.25rem",
      backgroundColor: "#ffffff",
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
    },
    btnPeserta: {
      padding: "0.375rem 1rem",
      border: "1px solid #d1d5db",
      borderRadius: "0.5rem",
      fontSize: "clamp(0.75rem, 1.2vw, 0.75rem)",
      fontWeight: 500,
      color: "#374151",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "0.375rem",
      width: isSmallMobile ? "100%" : "auto",
      justifyContent: "center",
    },
    btnKehadiranPrimary: {
      padding: "0.375rem 1rem",
      border: "none",
      borderRadius: "0.5rem",
      fontSize: "clamp(0.75rem, 1.2vw, 0.75rem)",
      fontWeight: 600,
      color: "#ffffff",
      backgroundColor: "#2D7A68",
      cursor: "pointer",
      width: isSmallMobile ? "100%" : "auto",
      textAlign: "center",
    },
    btnKehadiranDisabled: {
      padding: "0.375rem 1rem",
      border: "none",
      borderRadius: "0.5rem",
      fontSize: "clamp(0.75rem, 1.2vw, 0.75rem)",
      fontWeight: 500,
      color: "#6b7280",
      backgroundColor: "#e5e7eb",
      cursor: "pointer",
      width: isSmallMobile ? "100%" : "auto",
      textAlign: "center",
      transition: "background-color 0.2s",
    },
    btnKehadiranSecondary: {
      padding: "0.375rem 1rem",
      border: "none",
      borderRadius: "0.5rem",
      fontSize: "clamp(0.75rem, 1.2vw, 0.75rem)",
      fontWeight: 500,
      color: "#6b7280",
      backgroundColor: "#e5e7eb",
      cursor: "not-allowed",
      width: isSmallMobile ? "100%" : "auto",
      textAlign: "center",
    },
    tindakLanjutCard: {
      border: "1px solid #d1d5db",
      borderRadius: "0.75rem",
      padding: "1rem",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0.5rem",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      transition: "transform 0.1s, box-shadow 0.1s",
    },
    tindakLanjutTitle: {
      fontSize: "clamp(0.8125rem, 1.5vw, 0.875rem)",
      fontWeight: 700,
      color: "#1f2937",
      margin: 0,
    },
    tindakLanjutValueBox: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.75rem",
      marginTop: "0.25rem",
    },
    tindakLanjutNumber: {
      fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
      fontWeight: 800,
      color: "#1f2937",
    },
    footer: {
      backgroundColor: "#2D7A68",
      color: "#ffffff",
      padding: "0.75rem",
      textAlign: "center",
      fontSize: "clamp(0.7rem, 1.2vw, 0.75rem)",
      marginTop: "auto",
    },
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100vh",
      backgroundColor: "rgba(0, 0, 0, 0.4)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
      padding: "1rem",
      boxSizing: "border-box",
    },
    modalCard: {
      backgroundColor: "#ffffff",
      padding: isMobile ? "1.25rem" : "1.5rem 2rem",
      borderRadius: "0.75rem",
      boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.2)",
      textAlign: "center",
      maxWidth: "360px",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0.75rem",
      boxSizing: "border-box",
    },
    modalTitle: {
      fontSize: "clamp(1rem, 2vw, 1.125rem)",
      fontWeight: 700,
      color: "#1f2937",
      margin: 0,
    },
    modalText: {
      fontSize: "clamp(0.75rem, 1.5vw, 0.8125rem)",
      color: "#4b5563",
      margin: 0,
      lineHeight: 1.5,
    },
    modalButtonGroup: {
      display: "flex",
      gap: "0.75rem",
      width: "100%",
      marginTop: "0.5rem",
    },
    btnCancel: {
      flex: 1,
      padding: "0.5rem 1rem",
      border: "1px solid #d1d5db",
      borderRadius: "0.375rem",
      backgroundColor: "#ffffff",
      color: "#374151",
      fontSize: "clamp(0.75rem, 1.5vw, 0.8125rem)",
      fontWeight: 500,
      cursor: "pointer",
    },
    btnConfirm: {
      flex: 1,
      padding: "0.5rem 1rem",
      border: "none",
      borderRadius: "0.375rem",
      backgroundColor: "#dc2626",
      color: "#ffffff",
      fontSize: "clamp(0.75rem, 1.5vw, 0.8125rem)",
      fontWeight: 500,
      cursor: "pointer",
    },
    confirmModalCard: {
      backgroundColor: "#ffffff",
      borderRadius: "1rem",
      width: "100%",
      maxWidth: "520px",
      padding: isMobile ? "1.25rem" : "1.5rem 2rem",
      boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.15)",
      display: "flex",
      flexDirection: "column",
      gap: "1.25rem",
      boxSizing: "border-box",
    },
    confirmModalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    confirmModalTitle: {
      fontSize: "clamp(0.9375rem, 2vw, 1rem)",
      fontWeight: 700,
      color: "#2D7A68",
      margin: 0,
    },
    confirmSelect: {
      width: "100%",
      padding: "0.75rem 1rem",
      borderRadius: "0.5rem",
      border: "1px solid #d1d5db",
      fontSize: "clamp(0.8125rem, 1.5vw, 0.875rem)",
      color: "#374151",
      outline: "none",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      boxSizing: "border-box",
    },
    confirmTextarea: {
      width: "100%",
      minHeight: "110px",
      padding: "0.75rem 1rem",
      borderRadius: "0.5rem",
      border: "1px solid #d1d5db",
      fontSize: "clamp(0.8125rem, 1.5vw, 0.875rem)",
      color: "#374151",
      outline: "none",
      fontFamily: "inherit",
      resize: "vertical",
      boxSizing: "border-box",
    },
    confirmBtnCancel: {
      padding: "0.5rem 1.5rem",
      border: "none",
      borderRadius: "0.5rem",
      backgroundColor: "#ff5c5c",
      color: "#ffffff",
      fontSize: "clamp(0.75rem, 1.5vw, 0.8125rem)",
      fontWeight: 600,
      cursor: "pointer",
    },
    confirmBtnSubmit: {
      padding: "0.5rem 1.5rem",
      border: "none",
      borderRadius: "0.5rem",
      backgroundColor: "#2D7A68",
      color: "#ffffff",
      fontSize: "clamp(0.75rem, 1.5vw, 0.8125rem)",
      fontWeight: 600,
      cursor: "pointer",
    },
    pesertaModalCard: {
      backgroundColor: "#ffffff",
      borderRadius: "1rem",
      width: "100%",
      maxWidth: "600px",
      maxHeight: "85vh",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.2)",
      overflow: "hidden",
      padding: isMobile ? "1.25rem" : "1.5rem 1.75rem",
      boxSizing: "border-box",
    },
    pesertaModalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "1rem",
    },
    pesertaModalClose: {
      background: "none",
      border: "none",
      fontSize: "1.25rem",
      fontWeight: "bold",
      color: "#6b7280",
      cursor: "pointer",
      padding: "0 0.25rem",
      lineHeight: 1,
    },
    pesertaSubBar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: "clamp(0.75rem, 1.5vw, 0.8125rem)",
      fontWeight: 600,
      color: "#4b5563",
      paddingBottom: "0.5rem",
      borderBottom: "1px solid #e5e7eb",
      marginBottom: "0.5rem",
    },
    pesertaTableHeader: {
      display: "grid",
      gridTemplateColumns: "1.8fr 1.2fr 1fr 1fr",
      padding: "0.5rem 0",
      fontSize: "clamp(0.7rem, 1.2vw, 0.75rem)",
      fontWeight: 700,
      color: "#374151",
      borderBottom: "2px solid #e5e7eb",
      textAlign: "left",
      minWidth: "450px",
    },
    pesertaListScroll: {
      overflowY: "auto",
      overflowX: "auto",
      maxHeight: "360px",
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
      paddingRight: "0.25rem",
      WebkitOverflowScrolling: "touch",
    },
    pesertaRow: {
      display: "grid",
      gridTemplateColumns: "1.8fr 1.2fr 1fr 1fr",
      alignItems: "center",
      padding: "0.625rem 0",
      borderBottom: "1px solid #f3f4f6",
      fontSize: "clamp(0.7rem, 1.2vw, 0.75rem)",
      textAlign: "left",
      minWidth: "450px",
    },
    pesertaNameBox: {
      display: "flex",
      alignItems: "center",
      gap: "0.625rem",
    },
    pesertaAvatar: {
      width: "1.75rem",
      height: "1.75rem",
      borderRadius: "50%",
      backgroundColor: "#e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "0.8125rem",
      color: "#6b7280",
      flexShrink: 0,
    },
    pesertaName: {
      fontWeight: 600,
      color: "#1f2937",
    },
    pesertaNip: {
      color: "#6b7280",
    },
    pesertaMeta: {
      color: "#6b7280",
    },
  };

  return (
    <div style={styles.container}>
      {/* Navbar Header */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.brandBox}>
            <img
              src={logo}
              alt="Logo"
              style={styles.logo}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div style={{ textAlign: "left" }}>
              <p style={styles.brandSubtitle}>SiRapat - Sistem Rapat Pintar dan Terintegrasi</p>
              <h1 style={styles.brandTitle}>Balai Veteriner Bukittinggi</h1>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={styles.userProfile}>
              <span style={styles.userText}>{userName}</span>
              <div style={styles.avatarCircle}>👤</div>
            </div>

            <button
              onClick={() => setShowLogoutModal(true)}
              style={styles.logoutBtn}
              title="Keluar dari Aplikasi"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {!isMobile && <span>Logout</span>}
            </button>
          </div>
        </div>

        {/* Navigation Menu User */}
        <div style={styles.headerNav}>
          <button
            onClick={() => navigate("/user/dashboard-user")}
            style={
              location.pathname === "/user/dashboard-user" ||
              location.pathname.includes("dashboard")
                ? styles.navLinkActive
                : styles.navLink
            }
          >
            Home
          </button>

          <button
            onClick={() => navigate("/user/jadwal-rapat")}
            style={
              location.pathname === "/user/jadwal-rapat"
                ? styles.navLinkActive
                : styles.navLink
            }
          >
            Jadwal Rapat
          </button>

          <button
            onClick={() => navigate("/user/tindak-lanjut")}
            style={
              location.pathname === "/user/tindak-lanjut"
                ? styles.navLinkActive
                : styles.navLink
            }
          >
            Tindak Lanjut
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Welcome Banner Card */}
        <div style={styles.bannerCard}>
          <div style={styles.bannerIllustration}>
            <img src={hai} alt="Hai" style={styles.bannerImg} />
          </div>
          <div>
            <h2 style={styles.bannerTitle}>Hai, {userName}</h2>
            <h3 style={styles.bannerSubtitle}>SiRapat (Sistem Rapat Pintar dan Terintegrasi)</h3>
            <p style={styles.bannerSlogan}>1 Rapat • 1 Sistem • Semua Terdokumentasi</p>
            <p style={styles.bannerText}>
              Selamat datang di Sistem Manajemen Rapat Balai Veteriner Bukittinggi.
              Mewujudkan <strong>Rapat Terencana</strong>, <strong>Administrasi Tertata</strong>, dan <strong>Dokumentasi Terjaga</strong>.
              Silakan melihat jadwal rapat, melakukan konfirmasi kehadiran, melihat hasil rapat, serta memantau tindak lanjut yang menjadi tanggung jawab Anda secara efisien melalui sistem ini.
            </p>
          </div>
        </div>

        {/* Grid 2 Kolom */}
        <div style={styles.grid}>
          {/* Kolom Kiri: Jadwal Rapat Terdekat & Kepanitiaan Saya */}
          <div style={styles.leftColumn}>
            {/* Panel 1: Jadwal Rapat Terdekat */}
            <div style={styles.panelCard}>
              <h3 style={styles.panelTitle}>Jadwal Rapat Terdekat</h3>

              {loading ? (
                <div
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: "13px",
                  }}
                >
                  Memuat jadwal rapat...
                </div>
              ) : error ? (
                <div
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    color: "#dc2626",
                    fontSize: "13px",
                  }}
                >
                  Terjadi kesalahan: {error}
                </div>
              ) : scheduledMeetings.length > 0 ? (
                scheduledMeetings.map((item, idx) => {
                  const timeStatus = isAttendanceOpen(item);

                  return (
                    <div
                      key={item.meeting_id || idx}
                      style={{
                        ...styles.rapatCard,
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "12px",
                          marginBottom: "12px",
                        }}
                      >
                        <div style={{ textAlign: "left" }}>
                          <h4
                            style={{
                              margin: "0 0 4px 0",
                              fontSize: "clamp(14px, 3.5vw, 15px)",
                              fontWeight: 600,
                              color: "#111827",
                              textAlign: "left",
                            }}
                          >
                            {item.title}
                          </h4>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "clamp(12px, 3vw, 13px)",
                              color: "#6b7280",
                              lineHeight: 1.4,
                              textAlign: "left",
                            }}
                          >
                            {item.description || item.agenda}
                          </p>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            fontFamily: "monospace",
                            color: "#6b7280",
                            backgroundColor: "#f3f4f6",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            border: "1px solid #e5e7eb",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.meeting_code}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isSmallMobile ? "1fr" : "1fr 1fr",
                          gap: "10px 16px",
                          fontSize: "clamp(11px, 2.8vw, 12px)",
                          color: "#4b5563",
                          paddingTop: "12px",
                          borderTop: "1px solid #f3f4f6",
                          textAlign: "left",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            justifyContent: "flex-start",
                          }}
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#6b7280"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ flexShrink: 0 }}
                          >
                            <rect
                              x="3"
                              y="4"
                              width="18"
                              height="18"
                              rx="2"
                              ry="2"
                            ></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                          <span style={{ fontWeight: 600, color: "#111827" }}>{formatDate(item.date)}</span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            justifyContent: "flex-start",
                          }}
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#6b7280"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ flexShrink: 0 }}
                          >
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          <span>
                            {formatTimeRange(
                              item.start_time,
                              item.end_time
                            )}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            justifyContent: "flex-start",
                          }}
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#6b7280"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ flexShrink: 0 }}
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                          </svg>
                          <span>
                            {item.creator ? item.creator.name : "Admin"}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            justifyContent: "flex-start",
                          }}
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#2D7A68"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ flexShrink: 0 }}
                          >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                          </svg>
                          <span style={{ color: "#2D7A68", fontWeight: 600 }}>
                            {item.status}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            justifyContent: "flex-start",
                          }}
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#6b7280"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ flexShrink: 0 }}
                          >
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          <span>{item.location}</span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            justifyContent: "flex-start",
                          }}
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#6b7280"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ flexShrink: 0 }}
                          >
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 8 10"></polyline>
                          </svg>
                          <span style={{ color: "#9ca3af" }}>
                            Dibuat: {formatCreatedDate(item.created_at)}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: "10px",
                          marginTop: "14px",
                          paddingTop: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          style={styles.btnPeserta}
                          onClick={() => handleOpenPesertaModal(item)}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                          List Peserta
                        </button>

                        {item.attendance_status === "Belum Konfirmasi" ? (
                          timeStatus.isOpen ? (
                            <button
                              style={styles.btnKehadiranPrimary}
                              onClick={() => handleOpenConfirmModal(item)}
                            >
                              Konfirmasi Kehadiran
                            </button>
                          ) : (
                            <button
                              style={styles.btnKehadiranDisabled}
                              onClick={() => handleOpenConfirmModal(item)}
                              title="Klik untuk info konfirmasi kehadiran"
                            >
                              Konfirmasi Kehadiran
                            </button>
                          )
                        ) : (
                          <button style={styles.btnKehadiranSecondary} disabled>
                            {item.attendance_status === "Hadir"
                              ? "Terkonfirmasi (Hadir)"
                              : `Status: ${item.attendance_status}`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: "13px",
                  }}
                >
                  Tidak ada jadwal rapat terdekat.
                </div>
              )}
            </div>

            {/* Panel 2: Kepanitiaan Saya */}
            <div style={styles.panelCard}>
              <h3 style={styles.panelTitle}>Kepanitiaan Saya</h3>

              {loadingCommittees ? (
                <div
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: "13px",
                  }}
                >
                  Memuat data kepanitiaan...
                </div>
              ) : errorCommittees ? (
                <div
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    color: "#dc2626",
                    fontSize: "13px",
                  }}
                >
                  Terjadi kesalahan: {errorCommittees}
                </div>
              ) : committees.length > 0 ? (
                committees.map((comm) => (
                  <div key={comm.committee_id} style={styles.committeeCard}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          backgroundColor: "#e6f4ea",
                          color: "#2D7A68",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <h4
                          style={{
                            margin: "0 0 2px 0",
                            fontSize: "clamp(13px, 3.2vw, 14px)",
                            fontWeight: 600,
                            color: "#111827",
                          }}
                        >
                          {comm.name}
                        </h4>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "clamp(11px, 2.8vw, 12px)",
                            color: "#6b7280",
                            lineHeight: 1.4,
                          }}
                        >
                          {comm.description || "Tidak ada deskripsi"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: "13px",
                  }}
                >
                  Anda belum tergabung ke dalam kepanitiaan apa pun.
                </div>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Statistik Rapat Saya & Daftar Tindak Lanjut */}
          <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "1rem" : "1.5rem" }}>
            
            {/* STATISTIK RAPAT SAYA */}
            <div style={styles.panelCard}>
              <h3 style={styles.panelTitle}>Statistik Rapat Saya</h3>

              {loading ? (
                <div
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: "13px",
                  }}
                >
                  Memuat data statistik rapat...
                </div>
              ) : (
                <>
                  {/* Total Diundang */}
                  <div
                    style={styles.tindakLanjutCard}
                    onClick={() => navigate("/user/jadwal-rapat")}
                  >
                    <p style={styles.tindakLanjutTitle}>Total Rapat Diundang</p>
                    <div style={styles.tindakLanjutValueBox}>
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#2D7A68"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="20" y1="8" x2="20" y2="14" />
                        <line x1="17" y1="11" x2="23" y2="11" />
                      </svg>
                      <span style={{ ...styles.tindakLanjutNumber, color: "#2D7A68" }}>
                        {totalDiundang}
                      </span>
                    </div>
                  </div>

                  {/* Hadir */}
                  <div
                    style={styles.tindakLanjutCard}
                    onClick={() => navigate("/user/jadwal-rapat")}
                  >
                    <p style={styles.tindakLanjutTitle}>Status: Hadir</p>
                    <div style={styles.tindakLanjutValueBox}>
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#059669"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span style={{ ...styles.tindakLanjutNumber, color: "#059669" }}>
                        {totalHadir}
                      </span>
                    </div>
                  </div>

                  {/* Izin */}
                  <div
                    style={styles.tindakLanjutCard}
                    onClick={() => navigate("/user/jadwal-rapat")}
                  >
                    <p style={styles.tindakLanjutTitle}>Status: Izin</p>
                    <div style={styles.tindakLanjutValueBox}>
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#d97706"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span style={{ ...styles.tindakLanjutNumber, color: "#d97706" }}>
                        {totalIzin}
                      </span>
                    </div>
                  </div>

                  {/* Sakit */}
                  <div
                    style={styles.tindakLanjutCard}
                    onClick={() => navigate("/user/jadwal-rapat")}
                  >
                    <p style={styles.tindakLanjutTitle}>Status: Sakit</p>
                    <div style={styles.tindakLanjutValueBox}>
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#dc2626"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                      <span style={{ ...styles.tindakLanjutNumber, color: "#dc2626" }}>
                        {totalSakit}
                      </span>
                    </div>
                  </div>

                  {/* Belum Konfirmasi */}
                  <div
                    style={styles.tindakLanjutCard}
                    onClick={() => navigate("/user/jadwal-rapat")}
                  >
                    <p style={styles.tindakLanjutTitle}>Belum Konfirmasi</p>
                    <div style={styles.tindakLanjutValueBox}>
                      <svg
                        width="26"
                        height="26"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#4b5563"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <span style={{ ...styles.tindakLanjutNumber, color: "#4b5563" }}>
                        {totalBelumKonfirmasi}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* DAFTAR TINDAK LANJUT */}
            <div style={styles.panelCard}>
              <h3 style={styles.panelTitle}>Daftar Tindak Lanjut</h3>

              {loadingTindakLanjut ? (
                <div
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: "13px",
                  }}
                >
                  Memuat data...
                </div>
              ) : (
                <>
                  {/* Belum Mulai */}
                  <div
                    style={styles.tindakLanjutCard}
                    onClick={() => navigate("/user/tindak-lanjut")}
                  >
                    <p style={styles.tindakLanjutTitle}>Belum Mulai</p>
                    <div style={styles.tindakLanjutValueBox}>
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#4b5563"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                        <path d="M9 9h6" />
                        <path d="M9 13h6" />
                        <path d="M9 17h4" />
                      </svg>
                      <span style={styles.tindakLanjutNumber}>
                        {tindakLanjutCounts.belumMulai}
                      </span>
                    </div>
                  </div>

                  {/* Dikerjakan */}
                  <div
                    style={styles.tindakLanjutCard}
                    onClick={() => navigate("/user/tindak-lanjut")}
                  >
                    <p style={styles.tindakLanjutTitle}>Dikerjakan</p>
                    <div style={styles.tindakLanjutValueBox}>
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#d97706"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      <span style={styles.tindakLanjutNumber}>
                        {tindakLanjutCounts.dikerjakan}
                      </span>
                    </div>
                  </div>

                  {/* Selesai */}
                  <div
                    style={styles.tindakLanjutCard}
                    onClick={() => navigate("/user/tindak-lanjut")}
                  >
                    <p style={styles.tindakLanjutTitle}>Selesai</p>
                    <div style={styles.tindakLanjutValueBox}>
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#059669"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                      <span style={styles.tindakLanjutNumber}>
                        {tindakLanjutCounts.selesai}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        © 2026 BVet Bukittinggi. All rights reserved.
      </footer>

      {/* POPUP MODAL WARNING / INFO WAKTU KONFIRMASI */}
      {showInfoModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#fef3c7",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              ℹ️
            </div>
            <h3 style={styles.modalTitle}>Informasi Konfirmasi</h3>
            <p style={styles.modalText}>{infoMessage}</p>
            <button
              onClick={() => setShowInfoModal(false)}
              style={{
                ...styles.confirmBtnSubmit,
                width: "100%",
                marginTop: "8px",
              }}
            >
              Mengerti
            </button>
          </div>
        </div>
      )}

      {/* POPUP MODAL FORM KONFIRMASI KEHADIRAN */}
      {showConfirmModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.confirmModalCard}>
            <div style={styles.confirmModalHeader}>
              <h3 style={styles.confirmModalTitle}>
                Konfirmasi Kehadiran Rapat
              </h3>
              <button
                style={styles.pesertaModalClose}
                onClick={() => setShowConfirmModal(false)}
              >
                ✕
              </button>
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={styles.confirmSelect}
            >
              <option value="Hadir">Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
            </select>

            <textarea
              placeholder="Catatan"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={styles.confirmTextarea}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={styles.confirmBtnCancel}
                disabled={submittingAttendance}
              >
                Batal
              </button>
              <button
                onClick={handleSubmitAttendance}
                style={styles.confirmBtnSubmit}
                disabled={submittingAttendance}
              >
                {submittingAttendance ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL SUKSES KONFIRMASI */}
      {showSuccessModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#d1fae5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              ✓
            </div>
            <h3 style={styles.modalTitle}>Berhasil!</h3>
            <p style={styles.modalText}>{successMessage}</p>
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                ...styles.confirmBtnSubmit,
                width: "100%",
                marginTop: "8px",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* POPUP MODAL LIST PESERTA RAPAT */}
      {showPesertaModal && selectedMeeting && (
        <div style={styles.modalOverlay}>
          <div style={styles.pesertaModalCard}>
            {/* Header Modal */}
            <div style={styles.pesertaModalHeader}>
              <div style={{ visibility: "hidden" }}></div>
              <button
                style={styles.pesertaModalClose}
                onClick={() => setShowPesertaModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Sub-bar Info Jumlah Peserta */}
            <div style={styles.pesertaSubBar}>
              <span>List Peserta Rapat</span>
              <span>{participants.length} Peserta</span>
            </div>

            {/* Header Tabel Peserta */}
            <div style={styles.pesertaTableHeader}>
              <span>Nama</span>
              <span>NIP</span>
              <span>Jabatan</span>
              <span>Bidang</span>
            </div>

            {/* Body List Peserta */}
            <div style={styles.pesertaListScroll}>
              {loadingPeserta ? (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: "13px",
                  }}
                >
                  Memuat daftar peserta...
                </div>
              ) : participants.length > 0 ? (
                participants.map((p, idx) => (
                  <div
                    key={p.participant_id || p.user_id || idx}
                    style={styles.pesertaRow}
                  >
                    <div style={styles.pesertaNameBox}>
                      <div style={styles.pesertaAvatar}>👤</div>
                      <span style={styles.pesertaName}>
                        {p.name || p.user?.name || "-"}
                      </span>
                    </div>
                    <span style={styles.pesertaNip}>
                      {p.nip || p.user?.nip || "-"}
                    </span>
                    <span style={styles.pesertaMeta}>
                      {p.jabatan || p.user?.jabatan || "-"}
                    </span>
                    <span style={styles.pesertaMeta}>
                      {p.bidang || p.user?.bidang || "-"}
                    </span>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#9ca3af",
                    fontSize: "13px",
                  }}
                >
                  Belum ada peserta di rapat ini.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL KONFIRMASI LOGOUT */}
      {showLogoutModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>Konfirmasi Logout</h3>
            <p style={styles.modalText}>
              Apakah Anda yakin ingin keluar dari aplikasi?
            </p>
            <div style={styles.modalButtonGroup}>
              <button
                onClick={() => setShowLogoutModal(false)}
                style={styles.btnCancel}
              >
                Batal
              </button>
              <button onClick={executeLogout} style={styles.btnConfirm}>
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}