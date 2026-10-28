import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/logo_kementan.png";
import hai from "../../assets/hello_admin.png";

export default function DashboardAdmin() {
    // Ambil data user dari localStorage
    const userStored = JSON.parse(localStorage.getItem("user") || "{}");
    const adminName = userStored.name || "Admin";

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

    // State Data Statistik Tambahan (Tindak Lanjut & Peserta)
    const [followUps, setFollowUps] = useState([]);
    const [totalUsersCount, setTotalUsersCount] = useState(0);

    // State Modal List Peserta
    const [showPesertaModal, setShowPesertaModal] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loadingPeserta, setLoadingPeserta] = useState(false);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Helper untuk styling badge warna status dinamis
    const getStatusBadgeStyle = (status) => {
        switch (status) {
            case "Terjadwal":
                return {
                    backgroundColor: "#dcfce7",
                    color: "#15803d",
                    border: "1px solid #bbf7d0",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontWeight: 600,
                    fontSize: "11px",
                    display: "inline-block",
                };
            case "Selesai":
                return {
                    backgroundColor: "#dbeafe",
                    color: "#1d4ed8",
                    border: "1px solid #bfdbfe",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontWeight: 600,
                    fontSize: "11px",
                    display: "inline-block",
                };
            case "Batal":
                return {
                    backgroundColor: "#fee2e2",
                    color: "#b91c1c",
                    border: "1px solid #fca5a5",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontWeight: 600,
                    fontSize: "11px",
                    display: "inline-block",
                };
            default:
                return {
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontWeight: 500,
                    fontSize: "11px",
                    display: "inline-block",
                };
        }
    };

    // Fetch Seluruh Data Dashboard (Rapat, Follow Ups, dan Peserta)
    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem("token");
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };

            const [resMeetings, resFollowUps, resUsers] = await Promise.all([
                fetch("/api/meetings", { headers }),
                fetch("/api/follow-ups", { headers }),
                fetch("/api/users", { headers }),
            ]);

            const resultMeetings = await resMeetings.json();
            const resultFollowUps = await resFollowUps.json();
            const resultUsers = await resUsers.json();

            if (!resMeetings.ok) {
                throw new Error(resultMeetings.message || "Gagal mengambil data rapat");
            }

            setMeetings(resultMeetings.data || []);

            if (resFollowUps.ok) {
                setFollowUps(resultFollowUps.data || []);
            }

            if (resUsers.ok) {
                const userList = resultUsers.data || resultUsers || [];
                setTotalUsersCount(Array.isArray(userList) ? userList.length : 0);
            }
        } catch (err) {
            console.error("Fetch dashboard data error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Helper Format Tanggal & Jam
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

    // Filter Rapat Terjadwal untuk Panel Kiri
    const scheduledMeetings = meetings.filter((m) => m.status === "Terjadwal");

    // Hitung Angka Statistik Rapat
    const countSelesai = meetings.filter((m) => m.status === "Selesai").length;
    const countTerjadwal = meetings.filter((m) => m.status === "Terjadwal").length;
    const countBatal = meetings.filter((m) => m.status === "Batal").length;

    // Hitung Angka Statistik Tindak Lanjut Berdasarkan Status
    const countTLDone = followUps.filter((f) => f.status === "Selesai").length;
    const countTLProcess = followUps.filter((f) => f.status === "Dikerjakan").length;
    const countTLEvalOrPending = followUps.filter((f) => f.status === "Evaluasi" || f.status === "Belum Mulai").length;

    // Deteksi jenis layar
    const isMobile = windowWidth <= 768;
    const isSmallMobile = windowWidth <= 480;

    // Fungsi Eksekusi Logout ke Backend & LocalStorage
    const executeLogout = async () => {
        try {
            const token = localStorage.getItem("token");

            await fetch("/api/auth/logout", {
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

    // Fetch Peserta Rapat spesifik dari endpoint meeting_participants
    const handleOpenPesertaModal = async (meetingItem) => {
        setSelectedMeeting(meetingItem);
        setShowPesertaModal(true);
        setLoadingPeserta(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `/api/meetings/${meetingItem.meeting_id}/participants`,
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
            maxWidth: "340px",
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
            gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr",
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
        statSectionTitle: {
            fontSize: "clamp(0.8125rem, 1.5vw, 0.875rem)",
            fontWeight: 700,
            color: "#4b5563",
            margin: "0.5rem 0 0.25rem 0",
            textAlign: "left",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
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
        detailButton: {
            backgroundColor: "#2D7A68",
            color: "#ffffff",
            border: "none",
            padding: "0.375rem 1.25rem",
            borderRadius: "0.375rem",
            fontSize: "clamp(0.75rem, 1.2vw, 0.75rem)",
            fontWeight: 600,
            cursor: "pointer",
            alignSelf: "flex-end",
            width: isSmallMobile ? "100%" : "auto",
        },
        statGridTwoCol: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
        },
        statGridThreeCol: {
            display: "grid",
            gridTemplateColumns: isSmallMobile ? "1fr" : "1fr 1fr 1fr",
            gap: "0.75rem",
        },
        statCard: {
            border: "1px solid #e5e7eb",
            borderRadius: "0.75rem",
            padding: "0.875rem 0.5rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: "0.375rem",
            backgroundColor: "#ffffff",
        },
        statTitle: {
            fontSize: "clamp(0.7rem, 1.1vw, 0.75rem)",
            fontWeight: 600,
            color: "#374151",
            margin: 0,
        },
        statValueBox: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.375rem",
        },
        statIcon: {
            fontSize: "1.1rem",
        },
        statNumber: {
            fontSize: "clamp(1.25rem, 2.2vw, 1.5rem)",
            fontWeight: 800,
            color: "#2D7A68",
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
        footer: {
            backgroundColor: "#2D7A68",
            color: "#ffffff",
            padding: "0.75rem",
            textAlign: "center",
            fontSize: "clamp(0.7rem, 1.2vw, 0.75rem)",
            marginTop: "auto",
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
                        {/* Profile Box */}
                        <div style={styles.userProfile}>
                            <span style={styles.userText}>{adminName}</span>
                            <div style={styles.avatarCircle}>👤</div>
                        </div>

                        {/* Tombol Logout */}
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

                {/* Navigation Menu */}
                <div style={styles.headerNav}>
                    <button
                        onClick={() => navigate("/admin/dashboard-admin")}
                        style={
                            location.pathname === "/admin/dashboardAdmin" ||
                                location.pathname === "/admin/dashboard-admin"
                                ? styles.navLinkActive
                                : styles.navLink
                        }
                    >
                        Home
                    </button>

                    <button
                        onClick={() => navigate("/admin/jadwal-rapat")}
                        style={
                            location.pathname === "/admin/jadwalRapat" ||
                                location.pathname === "/admin/jadwal-rapat"
                                ? styles.navLinkActive
                                : styles.navLink
                        }
                    >
                        Jadwal Rapat
                    </button>

                    <button
                        onClick={() => navigate("/admin/data-rapat")}
                        style={
                            location.pathname === "/admin/data-rapat"
                                ? styles.navLinkActive
                                : styles.navLink
                        }
                    >
                        Data Rapat
                    </button>

                    <button
                        onClick={() => navigate("/admin/tindak-lanjut")}
                        style={
                            location.pathname === "/admin/tindak-lanjut"
                                ? styles.navLinkActive
                                : styles.navLink
                        }
                    >
                        Tindak Lanjut
                    </button>

                    <button
                        onClick={() => navigate("/admin/daftar-peserta")}
                        style={
                            location.pathname === "/admin/daftar-peserta"
                                ? styles.navLinkActive
                                : styles.navLink
                        }
                    >
                        Daftar Peserta
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main style={styles.main}>
                {/* Welcome Banner Card */}
                <div style={styles.bannerCard}>
                    <div style={styles.bannerIllustration}>
                        <img
                            src={hai}
                            alt="Hai"
                            style={styles.bannerImg}
                        />
                    </div>
                    <div>
                        <h2 style={styles.bannerTitle}>Hai, {adminName}</h2>
                        <h3 style={styles.bannerSubtitle}>SiRapat (Sistem Rapat Pintar dan Terintegrasi)</h3>
                        <p style={styles.bannerSlogan}>1 Rapat • 1 Sistem • Semua Terdokumentasi</p>
                        <p style={styles.bannerText}>
                            Selamat datang di Sistem Manajemen Rapat Balai Veteriner Bukittinggi.
                            Mewujudkan <strong>Rapat Terencana</strong>, <strong>Administrasi Tertata</strong>, dan <strong>Dokumentasi Terjaga</strong>.
                            Silakan kelola jadwal rapat, data peserta, notulensi, arsip, serta tindak lanjut rapat secara efisien melalui sistem ini.
                        </p>
                    </div>
                </div>

                {/* Grid 2 Kolom */}
                <div style={styles.grid}>
                    {/* Kolom Kiri: Jadwal Rapat */}
                    <div style={styles.panelCard}>
                        <h3 style={styles.panelTitle}>Jadwal Rapat Terdekat</h3>

                        {loading ? (
                            <div style={{ padding: "16px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                                Memuat jadwal rapat...
                            </div>
                        ) : error ? (
                            <div style={{ padding: "16px", textAlign: "center", color: "#dc2626", fontSize: "13px" }}>
                                Terjadi kesalahan: {error}
                            </div>
                        ) : scheduledMeetings.length > 0 ? (
                            scheduledMeetings.map((item) => (
                                <div key={item.meeting_id} style={{ ...styles.rapatCard, padding: isMobile ? "14px" : "16px", borderRadius: "10px", border: "1px solid #e5e7eb", marginBottom: "12px", backgroundColor: "#ffffff" }}>

                                    {/* Header Card: Judul, Deskripsi & Kode Rapat */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "12px", flexDirection: isSmallMobile ? "column" : "row" }}>
                                        <div style={{ textAlign: "left" }}>
                                            <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 600, color: "#111827", textAlign: "left" }}>
                                                {item.title}
                                            </h4>
                                            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280", lineHeight: 1.4, textAlign: "left" }}>
                                                {item.description || item.agenda}
                                            </p>
                                        </div>
                                        <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#6b7280", backgroundColor: "#f3f4f6", padding: "2px 8px", borderRadius: "4px", border: "1px solid #e5e7eb", whiteSpace: "nowrap", alignSelf: isSmallMobile ? "flex-start" : "auto" }}>
                                            {item.meeting_code}
                                        </span>
                                    </div>

                                    {/* Grid Informasi Rapat */}
                                    <div style={{
                                        display: "grid",
                                        gridTemplateColumns: isSmallMobile ? "1fr" : "1fr 1fr",
                                        gap: "10px 16px",
                                        fontSize: "12px",
                                        color: "#4b5563",
                                        paddingTop: "12px",
                                        borderTop: "1px solid #f3f4f6",
                                        textAlign: "left"
                                    }}>
                                        {/* Tanggal Rapat */}
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                                <line x1="3" y1="10" x2="21" y2="10"></line>
                                            </svg>
                                            <span style={{ fontWeight: 600, color: "#111827" }}>{formatDate(item.date)}</span>
                                        </div>

                                        {/* Jam / Waktu */}
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <polyline points="12 6 12 12 16 14"></polyline>
                                            </svg>
                                            <span>{formatTimeRange(item.start_time, item.end_time)}</span>
                                        </div>

                                        {/* Pembuat / Creator */}
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="12" cy="7" r="4"></circle>
                                            </svg>
                                            <span>{item.creator ? item.creator.name : "Admin"}</span>
                                        </div>

                                        {/* Status Rapat */}
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                            </svg>
                                            <span style={getStatusBadgeStyle(item.status)}>
                                                {item.status}
                                            </span>
                                        </div>

                                        {/* Lokasi */}
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                                <circle cx="12" cy="10" r="3"></circle>
                                            </svg>
                                            <span>{item.location}</span>
                                        </div>

                                        {/* Waktu Dibuat */}
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <polyline points="12 6 12 12 8 10"></polyline>
                                            </svg>
                                            <span style={{ color: "#9ca3af" }}>Dibuat: {formatCreatedDate(item.created_at)}</span>
                                        </div>
                                    </div>

                                    {/* Footer Action Button */}
                                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px", gap: "8px", paddingTop: "10px", flexDirection: isSmallMobile ? "column" : "row" }}>
                                        <button
                                            style={{
                                                ...styles.btnPeserta,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "6px",
                                                padding: "6px 12px",
                                                fontSize: "12px",
                                                fontWeight: 500,
                                                cursor: "pointer"
                                            }}
                                            onClick={() => handleOpenPesertaModal(item)}
                                        >
                                            List Peserta
                                        </button>
                                        <button
                                            type="button"
                                            style={{
                                                ...styles.detailButton,
                                                position: "relative",
                                                zIndex: 10
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (item?.meeting_id) {
                                                    navigate(`/admin/detail-data-rapat/${item.meeting_id}`, { state: { meetingData: item } });
                                                } else {
                                                    console.error("meeting_id tidak ditemukan pada item:", item);
                                                }
                                            }}
                                        >
                                            Detail
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: "16px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                                Tidak ada jadwal rapat terdekat.
                            </div>
                        )}
                    </div>

                    {/* Kolom Kanan: Statistik Lengkap (Rapat, Peserta, & Tindak Lanjut) */}
                    <div style={styles.panelCard}>
                        <h3 style={styles.panelTitle}>Statistik Ringkasan</h3>

                        {/* SUB STATISTIK: PESERTA */}
                        <div style={styles.statCard}>
                            <p style={styles.statTitle}>Total Peserta Terdaftar</p>
                            <div style={styles.statValueBox}>
                                <span style={styles.statIcon}>👥</span>
                                <span style={styles.statNumber}>{loading ? "-" : totalUsersCount}</span>
                            </div>
                        </div>

                        {/* SUB STATISTIK: RAPAT */}
                        <h4 style={styles.statSectionTitle}>Status Rapat</h4>
                        <div style={styles.statGridThreeCol}>
                            <div style={styles.statCard}>
                                <p style={styles.statTitle}>Terjadwal</p>
                                <div style={styles.statValueBox}>
                                    <span style={styles.statIcon}>📅</span>
                                    <span style={{ ...styles.statNumber, color: "#15803d" }}>{loading ? "-" : countTerjadwal}</span>
                                </div>
                            </div>

                            <div style={styles.statCard}>
                                <p style={styles.statTitle}>Selesai</p>
                                <div style={styles.statValueBox}>
                                    <span style={styles.statIcon}>📋</span>
                                    <span style={{ ...styles.statNumber, color: "#1d4ed8" }}>{loading ? "-" : countSelesai}</span>
                                </div>
                            </div>

                            {/* KARTU BATAL */}
                            <div style={styles.statCard}>
                                <p style={styles.statTitle}>Batal</p>
                                <div style={styles.statValueBox}>
                                    <span style={styles.statIcon}>❌</span>
                                    <span style={{ ...styles.statNumber, color: "#dc2626" }}>{loading ? "-" : countBatal}</span>
                                </div>
                            </div>
                        </div>

                        {/* SUB STATISTIK: TINDAK LANJUT */}
                        <h4 style={styles.statSectionTitle}>Status Tindak Lanjut</h4>
                        <div style={styles.statGridTwoCol}>
                            <div style={styles.statCard}>
                                <p style={styles.statTitle}>TL Selesai</p>
                                <div style={styles.statValueBox}>
                                    <span style={styles.statIcon}>✅</span>
                                    <span style={{ ...styles.statNumber, color: "#059669" }}>{loading ? "-" : countTLDone}</span>
                                </div>
                            </div>

                            <div style={styles.statCard}>
                                <p style={styles.statTitle}>TL Dikerjakan</p>
                                <div style={styles.statValueBox}>
                                    <span style={styles.statIcon}>⏳</span>
                                    <span style={{ ...styles.statNumber, color: "#d97706" }}>{loading ? "-" : countTLProcess}</span>
                                </div>
                            </div>
                        </div>

                        <div style={styles.statCard}>
                            <p style={styles.statTitle}>TL Belum / Evaluasi</p>
                            <div style={styles.statValueBox}>
                                <span style={styles.statIcon}>📌</span>
                                <span style={{ ...styles.statNumber, color: "#dc2626" }}>{loading ? "-" : countTLEvalOrPending}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer style={styles.footer}>
                © 2026 BVet Bukittinggi. All rights reserved.
            </footer>

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
                            <button
                                onClick={executeLogout}
                                style={styles.btnConfirm}
                            >
                                Ya, Keluar
                            </button>
                        </div>
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
                                <div style={{ padding: "20px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                                    Memuat daftar peserta...
                                </div>
                            ) : participants.length > 0 ? (
                                participants.map((p, idx) => (
                                    <div key={p.participant_id || p.user_id || idx} style={styles.pesertaRow}>
                                        <div style={styles.pesertaNameBox}>
                                            <div style={styles.pesertaAvatar}>👤</div>
                                            <span style={styles.pesertaName}>{p.name || p.user?.name || "-"}</span>
                                        </div>
                                        <span style={styles.pesertaNip}>{p.nip || p.user?.nip || "-"}</span>
                                        <span style={styles.pesertaMeta}>{p.jabatan || p.user?.jabatan || "-"}</span>
                                        <span style={styles.pesertaMeta}>{p.bidang || p.user?.bidang || "-"}</span>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
                                    Belum ada peserta di rapat ini.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}