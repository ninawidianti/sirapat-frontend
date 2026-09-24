import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/logo_kementan.png";

export default function UserTindakLanjut() {
  const navigate = useNavigate();
  const location = useLocation();

  // Data user terlogin dari localStorage
  const userStored = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = userStored.name || "User";
  const currentUserId = userStored.user_id || userStored.id;
  const token = localStorage.getItem("token");

  // Responsive State & Logout Modal
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Data Tindak Lanjut State
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Edit States
  const [selectedItem, setSelectedItem] = useState(null);
  const [status, setStatus] = useState("Belum Mulai");
  const [progress, setProgress] = useState(0);
  const [description, setDescription] = useState("");

  // Modal Form & Alert State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState({
    show: false,
    type: "success",
    title: "",
    message: "",
  });

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (token) {
      fetchAllFollowUps();
    }
  }, [token, currentUserId]);

  // 1. Fetch All Follow Ups dari Backend & Filter berdasarkan Array user_id
  const fetchAllFollowUps = async () => {
    try {
      setLoading(true);
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

        // Filtering aman untuk data user_id yang berbentuk Array [1, 2], JSON String, atau Single Integer
        const filteredData = allData.filter((item) => {
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

        setFollowUps(filteredData);
      } else {
        showAlert("error", "Gagal!", result.message || "Gagal memuat data tindak lanjut.");
      }
    } catch (err) {
      console.error("Error fetching follow ups:", err);
      showAlert("error", "Error!", "Koneksi ke server bermasalah.");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, title, message) => {
    setAlertModal({ show: true, type, title, message });
  };

  const closeAlert = () => {
    setAlertModal({ ...alertModal, show: false });
  };

  // FUNGSI MEMBUKA MODAL EDIT (Diperbaiki agar mengambil deskripsi & progress paling akhir)
  const openEditModal = (item) => {
    setSelectedItem(item);
    setStatus(item.status || "Belum Mulai");

    // Ambil data update paling akhir jika backend menyertakannya dalam array follow_up_updates / updates
    const latestUpdate =
      Array.isArray(item.FollowUpUpdates) && item.FollowUpUpdates.length > 0
        ? item.FollowUpUpdates[item.FollowUpUpdates.length - 1]
        : Array.isArray(item.updates) && item.updates.length > 0
        ? item.updates[item.updates.length - 1]
        : null;

    setProgress(latestUpdate ? latestUpdate.progress : item.progress || 0);
    setDescription(latestUpdate ? latestUpdate.description : item.description || "");
    setShowModal(true);
  };

  // 2. Submit Update Progress
  const handleUpdate = async () => {
    if (!selectedItem) return;

    try {
      setSubmitting(true);

      const payload = {
        follow_up_id: selectedItem.follow_up_id,
        status: status,
        progress: Number(progress),
        description: description,
      };

      const res = await fetch("http://localhost:5000/api/follow-up-updates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok) {
        setShowModal(false);

        // Ambil ulang data dari backend
        await fetchAllFollowUps();

        showAlert("success", "Berhasil!", "Progress tindak lanjut berhasil diperbarui.");
      } else {
        showAlert("error", "Gagal!", result.message || "Gagal memperbarui data.");
      }
    } catch (err) {
      console.error("Error updating follow up:", err);
      showAlert("error", "Error!", "Koneksi ke server bermasalah.");
    } finally {
      setSubmitting(false);
    }
  };

  // Logout Function
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

  // HELPER 1: Format Tanggal ke DD/MM/YYYY
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const cleanDate = dateString.split("T")[0];
    const [year, month, day] = cleanDate.split("-");
    return `${day}/${month}/${year}`;
  };

  // HELPER 2: Wrap teks 7 kata per baris
  const formatTaskText = (text) => {
    if (!text) return "-";
    const words = text.split(" ");
    const lines = [];

    for (let i = 0; i < words.length; i += 7) {
      lines.push(words.slice(i, i + 7).join(" "));
    }

    return lines.map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // HELPER 3: Mendapatkan Keterangan/Hasil Terbaru
  const getLatestDescription = (item) => {
    const updates = item.FollowUpUpdates || item.updates || [];
    if (Array.isArray(updates) && updates.length > 0) {
      return updates[updates.length - 1].description || "-";
    }
    return item.description || "-";
  };

  // HELPER 4: Mendapatkan Persentase Progress Terbaru
  const getLatestProgress = (item) => {
    const updates = item.FollowUpUpdates || item.updates || [];
    if (Array.isArray(updates) && updates.length > 0) {
      return updates[updates.length - 1].progress;
    }
    return item.progress !== undefined ? item.progress : 0;
  };

  const getPriorityBadgeStyle = (p) => {
    switch (p) {
      case "Tinggi":
        return { backgroundColor: "#fee2e2", color: "#ef4444" };
      case "Sedang":
        return { backgroundColor: "#fef3c7", color: "#d97706" };
      default:
        return { backgroundColor: "#e0f2fe", color: "#0284c7" };
    }
  };

  const getStatusBadgeStyle = (s) => {
    switch (s) {
      case "Selesai":
        return { backgroundColor: "#d1fae5", color: "#059669" };
      case "Dikerjakan":
        return { backgroundColor: "#e0e7ff", color: "#4f46e5" };
      case "Evaluasi":
        return { backgroundColor: "#f3e8ff", color: "#9333ea" };
      default:
        return { backgroundColor: "#f3f4f6", color: "#6b7280" };
    }
  };

  const isMobile = windowWidth <= 768;
  const isSmallMobile = windowWidth <= 480;

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: "#f3f4f6",
      color: "#1f2937",
      display: "flex",
      flexDirection: "column",
      fontFamily: "Arial, Helvetica, sans-serif",
      boxSizing: "border-box",
    },
    header: {
      backgroundColor: "#2D7A68",
      color: "#ffffff",
      position: "sticky",
      top: 0,
      zIndex: 1000,
      width: "100%",
    },
    headerTop: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: isMobile ? "12px 16px" : "16px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxSizing: "border-box",
      gap: "12px",
    },
    brandBox: {
      display: "flex",
      alignItems: "center",
      gap: isSmallMobile ? "8px" : "12px",
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
      opacity: 0.8, // Menurunkan opacity agar terlihat lebih soft/tipis
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif", // Font dengan variasi Light yang bagus
      WebkitFontSmoothing: "antialiased", // Membuat rendering teks lebih halus di Mac/iOS
      MozOsxFontSmoothing: "grayscale",
    },
    brandTitle: {
      fontSize: "clamp(13px, 3.5vw, 18px)",
      fontWeight: 700,
      lineHeight: 1.2,
      margin: 0,
      color: "#f0fdf4",
      letterSpacing: "0.1px",
    },
    userProfile: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      cursor: "pointer",
    },
    userText: {
      fontSize: "clamp(12px, 3vw, 14px)",
      fontWeight: 500,
    },
    logoutBtn: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      color: "#ffffff",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      padding: isMobile ? "6px 10px" : "6px 12px",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "clamp(11px, 2.8vw, 13px)",
      fontWeight: 500,
      marginLeft: isSmallMobile ? "6px" : "12px",
    },
    avatarCircle: {
      width: isMobile ? "28px" : "32px",
      height: isMobile ? "28px" : "32px",
      borderRadius: "50%",
      backgroundColor: "#ffffff",
      color: "#2D7A68",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "bold",
      fontSize: isMobile ? "12px" : "14px",
    },
    headerNav: {
      maxWidth: "1280px",
      margin: "0 auto",
      padding: isMobile ? "0 16px" : "0 24px",
      display: "flex",
      gap: isMobile ? "16px" : "32px",
      overflowX: "auto",
      boxSizing: "border-box",
      scrollbarWidth: "none",
    },
    navLinkActive: {
      padding: "8px 0",
      color: "#ffffff",
      fontWeight: 700,
      borderBottom: "2px solid #ffffff",
      fontSize: "clamp(12px, 3vw, 14px)",
      whiteSpace: "nowrap",
      background: "none",
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
      cursor: "pointer",
    },
    navLink: {
      padding: "8px 0",
      color: "#d1e7e0",
      fontWeight: 500,
      fontSize: "clamp(12px, 3vw, 14px)",
      whiteSpace: "nowrap",
      background: "none",
      border: "none",
      cursor: "pointer",
    },
    main: {
      flex: 1,
      maxWidth: "1280px",
      width: "100%",
      margin: "0 auto",
      padding: isMobile ? "16px" : "24px",
      display: "flex",
      flexDirection: "column",
      gap: isMobile ? "16px" : "24px",
      boxSizing: "border-box",
    },
    sectionTitle: {
      fontSize: "clamp(14px, 3.5vw, 16px)",
      fontWeight: 700,
      color: "#2D7A68",
      borderBottom: "2px solid #2D7A68",
      width: "fit-content",
      paddingBottom: "4px",
      margin: "0 0 16px 0",
    },
    tableCard: {
      backgroundColor: "#ffffff",
      borderRadius: "16px",
      padding: isSmallMobile ? "14px" : isMobile ? "16px" : "24px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      border: "1px solid #f3f4f6",
      overflowX: "auto",
      width: "100%",
      boxSizing: "border-box",
      WebkitOverflowScrolling: "touch",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "clamp(11px, 2.8vw, 13px)",
      textAlign: "center",
      minWidth: "850px",
    },
    th: {
      padding: "12px 8px",
      color: "#374151",
      fontWeight: 600,
      borderBottom: "1px solid #e5e7eb",
      fontSize: "clamp(11px, 2.8vw, 12px)",
      textAlign: "center",
      backgroundColor: "#ffffff",
    },
    td: {
      padding: "14px 8px",
      color: "#4b5563",
      borderBottom: "1px solid #f3f4f6",
      verticalAlign: "middle",
    },
    linkDetail: {
      color: "#2563eb",
      textDecoration: "underline",
      cursor: "pointer",
      fontWeight: 600,
    },
    btnEdit: {
      background: "#fef3c7",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      color: "#d97706",
      padding: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto",
    },
    footer: {
      backgroundColor: "#2D7A68",
      color: "#ffffff",
      padding: "12px",
      textAlign: "center",
      fontSize: "clamp(11px, 2.8vw, 12px)",
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
      padding: "16px",
      boxSizing: "border-box",
    },
    modalCard: {
      backgroundColor: "#ffffff",
      padding: isSmallMobile ? "20px" : "24px 32px",
      borderRadius: "12px",
      boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.2)",
      textAlign: "center",
      maxWidth: "340px",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "12px",
      boxSizing: "border-box",
    },
    modalTitle: {
      fontSize: "clamp(16px, 4vw, 18px)",
      fontWeight: 700,
      color: "#1f2937",
      margin: 0,
    },
    modalText: {
      fontSize: "clamp(12px, 3vw, 13px)",
      color: "#4b5563",
      margin: 0,
      lineHeight: 1.5,
    },
    modalButtonGroup: {
      display: "flex",
      gap: "12px",
      width: "100%",
      marginTop: "8px",
    },
    btnCancel: {
      flex: 1,
      padding: "8px 16px",
      border: "1px solid #d1d5db",
      borderRadius: "6px",
      backgroundColor: "#ffffff",
      color: "#374151",
      fontSize: "clamp(12px, 3vw, 13px)",
      fontWeight: 500,
      cursor: "pointer",
    },
    btnConfirm: {
      flex: 1,
      padding: "8px 16px",
      border: "none",
      borderRadius: "6px",
      backgroundColor: "#dc2626",
      color: "#ffffff",
      fontSize: "clamp(12px, 3vw, 13px)",
      fontWeight: 500,
      cursor: "pointer",
    },
    formModalCard: {
      backgroundColor: "#ffffff",
      borderRadius: "16px",
      width: "100%",
      maxWidth: "500px",
      maxHeight: "85vh",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
      overflow: "hidden",
      boxSizing: "border-box",
    },
    formModalHeader: {
      padding: isSmallMobile ? "14px 16px" : "20px 24px 16px 24px",
      borderBottom: "1px solid #f3f4f6",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    formModalTitle: {
      fontSize: "clamp(14px, 3.5vw, 16px)",
      fontWeight: 700,
      color: "#2D7A68",
      margin: 0,
    },
    formModalBody: {
      padding: isSmallMobile ? "14px 16px" : "16px 24px",
      overflowY: "auto",
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      textAlign: "left",
    },
    label: {
      fontSize: "clamp(11px, 2.8vw, 12px)",
      fontWeight: 600,
      color: "#374151",
      marginBottom: "4px",
      display: "block",
    },
    input: {
      width: "100%",
      padding: "8px 12px",
      borderRadius: "8px",
      border: "1px solid #d1d5db",
      fontSize: "clamp(12px, 3vw, 13px)",
      boxSizing: "border-box",
      outline: "none",
    },
    textarea: {
      width: "100%",
      padding: "8px 12px",
      borderRadius: "8px",
      border: "1px solid #d1d5db",
      fontSize: "clamp(12px, 3vw, 13px)",
      boxSizing: "border-box",
      outline: "none",
      fontFamily: "inherit",
      minHeight: "70px",
      resize: "vertical",
    },
    formModalFooter: {
      padding: isSmallMobile ? "12px 16px" : "16px 24px",
      borderTop: "1px solid #f3f4f6",
      display: "flex",
      justifyContent: "flex-end",
      gap: "12px",
    },
    btnBatal: {
      padding: "8px 20px",
      border: "1px solid #d1d5db",
      borderRadius: "8px",
      backgroundColor: "#ff6b6b",
      color: "#ffffff",
      fontSize: "clamp(12px, 3vw, 13px)",
      fontWeight: 600,
      cursor: "pointer",
    },
    btnSimpan: {
      padding: "8px 20px",
      border: "none",
      borderRadius: "8px",
      backgroundColor: "#2D7A68",
      color: "#ffffff",
      fontSize: "clamp(12px, 3vw, 13px)",
      fontWeight: 600,
      cursor: "pointer",
    },
    alertCard: {
      backgroundColor: "#ffffff",
      borderRadius: "20px",
      width: "100%",
      maxWidth: "380px",
      padding: isSmallMobile ? "24px 18px" : "32px 24px 24px 24px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
      boxSizing: "border-box",
    },
    alertIconSuccess: {
      width: "64px",
      height: "64px",
      borderRadius: "50%",
      backgroundColor: "#d1fae5",
      color: "#10b981",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "20px",
    },
    alertIconError: {
      width: "64px",
      height: "64px",
      borderRadius: "50%",
      backgroundColor: "#fee2e2",
      color: "#ef4444",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "20px",
    },
    alertTitle: {
      fontSize: "clamp(17px, 4vw, 20px)",
      fontWeight: "700",
      color: "#111827",
      marginBottom: "8px",
    },
    alertMessage: {
      fontSize: "clamp(12px, 3vw, 14px)",
      color: "#4b5563",
      marginBottom: "24px",
      lineHeight: "1.4",
    },
    alertButton: {
      width: "100%",
      backgroundColor: "#2D7A68",
      color: "#ffffff",
      border: "none",
      borderRadius: "10px",
      padding: "12px",
      fontSize: "clamp(13px, 3.2vw, 14px)",
      fontWeight: "700",
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.container}>
      {/* Header / Navbar */}
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

        {/* Tab Navigation Menu */}
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

      {/* Main Content Area */}
      <main style={styles.main}>
        <div style={styles.tableCard}>
          <h2 style={styles.sectionTitle}>Tindak Lanjut</h2>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>No</th>
                <th style={styles.th}>Kode Rapat</th>
                <th style={styles.th}>Tugas</th>
                <th style={styles.th}>Judul Rapat</th>
                <th style={styles.th}>Deadline</th>
                <th style={styles.th}>Prioritas</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Progres (%)</th>
                <th style={styles.th}>Hasil</th>
                <th style={styles.th}>Notulensi</th>
                <th style={styles.th}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" style={{ ...styles.td, padding: "30px", color: "#6b7280" }}>
                    Memuat data tindak lanjut...
                  </td>
                </tr>
              ) : followUps.length > 0 ? (
                followUps.map((item, index) => (
                  <tr key={item.follow_up_id || index}>
                    <td style={styles.td}>{index + 1}</td>
                    <td
                      style={{
                        ...styles.td,
                        fontFamily: "monospace",
                        fontSize: "11px",
                        textAlign: "center",
                      }}
                    >
                      {item.meeting?.meeting_code || "-"}
                    </td>
                    <td style={{ ...styles.td, color: "#1f2937", textAlign: "left" }}>
                      {formatTaskText(item.task)}
                    </td>
                    <td style={{ ...styles.td, textAlign: "left", color: "#6b7280" }}>
                      {item.meeting?.title || item.Meeting?.title || "-"}
                    </td>
                    <td style={styles.td}>{formatDate(item.deadline)}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 600,
                          ...getPriorityBadgeStyle(item.priority),
                        }}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 600,
                          ...getStatusBadgeStyle(item.status),
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    {/* Menampilkan Progres Terbaru */}
                    <td style={styles.td}>{`${getLatestProgress(item)}%`}</td>
                    {/* Menampilkan Hasil Keterangan Terbaru */}
                    <td style={{ ...styles.td, color: "#1f2937", textAlign: "left" }}>
                      {getLatestDescription(item)}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={styles.linkDetail}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item?.meeting_id) {
                            navigate(`/user/detail-data-rapat-user/${item.meeting_id}`, {
                              state: { meetingData: item },
                            });
                          } else {
                            console.error("meeting_id tidak ditemukan pada item:", item);
                          }
                        }}
                      >
                        Detail
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={styles.btnEdit}
                        onClick={() => openEditModal(item)}
                        title="Update Progres/Status"
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
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" style={{ ...styles.td, padding: "30px", color: "#9ca3af" }}>
                    Tidak ada tindak lanjut untuk Anda saat ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal Update Progres/Status */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.formModalCard}>
            <div style={styles.formModalHeader}>
              <h3 style={styles.formModalTitle}>Update Progress Tindak Lanjut</h3>
              <span
                style={{
                  cursor: "pointer",
                  fontSize: "18px",
                  color: "#9ca3af",
                  fontWeight: "bold",
                }}
                onClick={() => setShowModal(false)}
              >
                ✕
              </span>
            </div>

            <div style={styles.formModalBody}>
              <div>
                <label style={styles.label}>Tugas</label>
                <input
                  type="text"
                  style={{ ...styles.input, backgroundColor: "#f3f4f6" }}
                  value={selectedItem?.task || ""}
                  disabled
                />
              </div>

              <div>
                <label style={styles.label}>Status</label>
                <select
                  style={styles.input}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Belum Mulai">Belum Mulai</option>
                  <option value="Dikerjakan">Dikerjakan</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Evaluasi">Evaluasi</option>
                </select>
              </div>

              <div>
                <label style={styles.label}>Progres (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  style={styles.input}
                  value={progress}
                  onChange={(e) => setProgress(e.target.value)}
                  placeholder="Masukkan persentase (0 - 100)"
                />
              </div>

              <div>
                <label style={styles.label}>Keterangan Hasil</label>
                <textarea
                  style={styles.textarea}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Masukkan Keterangan Perkembangan..."
                />
              </div>
            </div>

            <div style={styles.formModalFooter}>
              <button style={styles.btnBatal} onClick={() => setShowModal(false)}>
                Batal
              </button>
              <button style={styles.btnSimpan} onClick={handleUpdate} disabled={submitting}>
                {submitting ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Feedback Modal */}
      {alertModal.show && (
        <div style={styles.modalOverlay}>
          <div style={styles.alertCard}>
            {alertModal.type === "success" ? (
              <div style={styles.alertIconSuccess}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            ) : (
              <div style={styles.alertIconError}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
            )}

            <h3 style={styles.alertTitle}>{alertModal.title}</h3>
            <p style={styles.alertMessage}>{alertModal.message}</p>

            <button style={styles.alertButton} onClick={closeAlert}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* Modal Logout */}
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

      {/* Footer */}
      <footer style={styles.footer}>
        © 2026 BVet Bukittinggi. All rights reserved.
      </footer>
    </div>
  );
}