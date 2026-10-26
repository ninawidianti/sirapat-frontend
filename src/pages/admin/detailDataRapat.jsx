import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import logo from "../../assets/logo_kementan.png";

// Import Komponen Sub-Tab
import TabPesertaRapat from "./tabPesertaRapat";
import TabNotulensiRapat from "./tabNotulensiRapat";
import TabTindakLanjut from "./tabTindakLanjut";

export default function DetailDataRapat() {
    const { meetingId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Data User
    const userStored = JSON.parse(localStorage.getItem("user") || "{}");
    const adminName = userStored.name || "Admin";

    // Responsive State
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // Tab State ("peserta" | "notulensi" | "tindak_lanjut")
    const [activeTab, setActiveTab] = useState("peserta");

    // State Data Rapat
    const [meeting, setMeeting] = useState(location.state?.meetingData || null);
    const [loading, setLoading] = useState(!location.state?.meetingData && !!meetingId);
    const [error, setError] = useState(null);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const isMobile = windowWidth <= 768;
    const isSmallMobile = windowWidth <= 480;

    // Helper Penentu Status Dinamis Berdasarkan Waktu
    const getComputedStatus = (item) => {
        if (!item) return "Terjadwal";
        if (item.status === "Batal") return "Batal";
        if (item.status === "Selesai") return "Selesai";

        if (item.date && item.end_time) {
            const datePart = item.date.split("T")[0];
            const meetingEndDateTime = new Date(`${datePart}T${item.end_time}`);
            const now = new Date();

            if (now > meetingEndDateTime) {
                return "Selesai";
            }
        }
        return item.status || "Terjadwal";
    };

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
                    fontSize: "12px",
                    display: "inline-block"
                };
            case "Selesai":
                return {
                    backgroundColor: "#dbeafe",
                    color: "#1d4ed8",
                    border: "1px solid #bfdbfe",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontWeight: 600,
                    fontSize: "12px",
                    display: "inline-block"
                };
            case "Batal":
                return {
                    backgroundColor: "#fee2e2",
                    color: "#b91c1c",
                    border: "1px solid #fca5a5",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontWeight: 600,
                    fontSize: "12px",
                    display: "inline-block"
                };
            default:
                return {
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontWeight: 500,
                    fontSize: "12px",
                    display: "inline-block"
                };
        }
    };

    // Fetch detail rapat jika di-refresh / via URL langsung
    useEffect(() => {
        if (!meeting && meetingId) {
            const fetchDetail = async () => {
                try {
                    setLoading(true);
                    const token = localStorage.getItem("token");
                    const response = await fetch(`http://localhost:5000/api/meetings/${meetingId}`, {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message || "Gagal memuat detail rapat");
                    setMeeting(result.data);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchDetail();
        }
    }, [meeting, meetingId]);

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    const formatTimeRange = (start, end) => {
        if (!start || !end) return "-";
        return `${start.substring(0, 5)} - ${end.substring(0, 5)} WIB`;
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

    const executeLogout = async () => {
        try {
            const token = localStorage.getItem("token");
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
            backgroundColor: "#f4f5f7",
            color: "#1f2937",
            display: "flex",
            flexDirection: "column",
            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
            boxSizing: "border-box",
            position: "relative"
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
            width: "100%",
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
        rightHeaderSection: {
            display: "flex",
            alignItems: "center",
            marginLeft: "auto",
        },
        userProfile: {
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            cursor: "pointer",
        },
        userText: {
            fontSize: "clamp(0.75rem, 1.5vw, 0.875rem)",
            fontWeight: 500,
            whiteSpace: "nowrap",
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
            padding: isMobile ? "1rem" : "1.5rem 2rem",
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "1rem" : "1.25rem",
            boxSizing: "border-box",
        },
        cardHeader: {
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            padding: isMobile ? "1rem 1.25rem" : "1.25rem 1.5rem",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            textAlign: "left"
        },
        tabBarContainer: {
            display: "flex",
            justifyContent: "space-around",
            borderBottom: "1px solid #e5e7eb",
            marginTop: "0.5rem",
            overflowX: "auto",
            scrollbarWidth: "none",
        },
        tabButton: {
            flex: 1,
            padding: "0.75rem 0.5rem",
            fontSize: "clamp(0.8125rem, 1.5vw, 0.9375rem)",
            fontWeight: 500,
            color: "#6b7280",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "center",
            borderBottom: "3px solid transparent",
            transition: "all 0.2s ease",
            whiteSpace: "nowrap",
        },
        tabButtonActive: {
            flex: 1,
            padding: "0.75rem 0.5rem",
            fontSize: "clamp(0.8125rem, 1.5vw, 0.9375rem)",
            fontWeight: 700,
            color: "#2D7A68",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "center",
            borderBottom: "3px solid #2D7A68",
            transition: "all 0.2s ease",
            whiteSpace: "nowrap",
        },
        tabContent: {
            backgroundColor: "#ffffff",
            borderRadius: "0.75rem",
            padding: isMobile ? "1.25rem 1rem" : "2.0rem 1.5rem",
            border: "1px solid #e5e7eb",
            minHeight: "250px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
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
            borderRadius: "0.875rem",
            boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.15)",
            textAlign: "center",
            maxWidth: "360px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.875rem",
            boxSizing: "border-box",
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
    };

    const currentStatus = meeting ? getComputedStatus(meeting) : "Terjadwal";

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
                            onError={(e) => { e.target.style.display = "none"; }}
                        />
                        <div style={{ textAlign: "left" }}>
                            <p style={styles.brandSubtitle}>SiRapat - Sistem Rapat Pintar dan Terintegrasi</p>
                            <h1 style={styles.brandTitle}>Balai Veteriner Bukittinggi</h1>
                        </div>
                    </div>

                    <div style={styles.rightHeaderSection}>
                        <div style={styles.userProfile}>
                            <span style={styles.userText}>{adminName}</span>
                            <div style={styles.avatarCircle}>👤</div>
                        </div>

                        <button
                            onClick={() => setShowLogoutModal(true)}
                            style={styles.logoutBtn}
                            title="Keluar dari Aplikasi"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                            location.pathname.includes("dashboard")
                                ? styles.navLinkActive
                                : styles.navLink
                        }
                    >
                        Home
                    </button>

                    <button
                        onClick={() => navigate("/admin/jadwal-rapat")}
                        style={
                            location.pathname.includes("jadwal")
                                ? styles.navLinkActive
                                : styles.navLink
                        }
                    >
                        Jadwal Rapat
                    </button>

                    <button
                        onClick={() => navigate("/admin/data-rapat")}
                        style={
                            location.pathname.includes("data-rapat")
                                ? styles.navLinkActive
                                : styles.navLink
                        }
                    >
                        Data Rapat
                    </button>

                    <button
                        onClick={() => navigate("/admin/tindak-lanjut")}
                        style={
                            location.pathname.includes("tindak-lanjut")
                                ? styles.navLinkActive
                                : styles.navLink
                        }
                    >
                        Tindak Lanjut
                    </button>

                    <button
                        onClick={() => navigate("/admin/daftar-peserta")}
                        style={
                            location.pathname.includes("daftar-peserta")
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
                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                        Memuat detail rapat...
                    </div>
                ) : error ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "red", fontSize: "13px" }}>
                        Terjadi Kesalahan: {error}
                    </div>
                ) : meeting ? (
                    <>
                        {/* Card Rapat Utama (Header Detail Rapat) */}
                        <div style={styles.cardHeader}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexDirection: isSmallMobile ? "column" : "row" }}>
                                <div style={{ textAlign: "left" }}>
                                    <h3 style={{ margin: "0 0 6px 0", fontSize: "clamp(0.9375rem, 2vw, 1rem)", fontWeight: 700, color: "#111827" }}>
                                        {meeting.title}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: "clamp(0.75rem, 1.2vw, 0.8125rem)", color: "#6b7280", lineHeight: 1.4 }}>
                                        {meeting.description || meeting.agenda}
                                    </p>
                                </div>
                                <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#6b7280", backgroundColor: "#f3f4f6", padding: "2px 8px", borderRadius: "4px", border: "1px solid #e5e7eb", whiteSpace: "nowrap", alignSelf: isSmallMobile ? "flex-start" : "auto" }}>
                                    {meeting.meeting_code}
                                </span>
                            </div>

                            <div style={{
                                display: "grid",
                                gridTemplateColumns: isSmallMobile ? "1fr" : "1fr 1fr",
                                gap: "10px 16px",
                                fontSize: "clamp(0.75rem, 1.2vw, 0.8125rem)",
                                color: "#4b5563",
                                paddingTop: "4px"
                            }}>
                                {/* Kolom Kiri */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "flex-start" }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                            <line x1="16" y1="2" x2="16" y2="6"></line>
                                            <line x1="8" y1="2" x2="8" y2="6"></line>
                                            <line x1="3" y1="10" x2="21" y2="10"></line>
                                        </svg>
                                        <span style={{ fontWeight: 600, color: "#111827" }}>{formatDate(meeting.date)}</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "flex-start" }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                        <span>{meeting.creator ? meeting.creator.name : "Admin"}</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "flex-start" }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                            <circle cx="12" cy="10" r="3"></circle>
                                        </svg>
                                        <span>{meeting.location}</span>
                                    </div>
                                </div>

                                {/* Kolom Kanan */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "flex-start" }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                        <span>{formatTimeRange(meeting.start_time, meeting.end_time)}</span>
                                    </div>

                                    {/* Baris Status dengan Badge Warna Dinamis */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "flex-start" }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                        </svg>
                                        <span style={getStatusBadgeStyle(currentStatus)}>
                                            {currentStatus}
                                        </span>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "flex-start" }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 8 10"></polyline>
                                        </svg>
                                        <span style={{ color: "#9ca3af" }}>{formatCreatedDate(meeting.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tab */}
                        <div style={styles.tabBarContainer}>
                            <button
                                style={activeTab === "peserta" ? styles.tabButtonActive : styles.tabButton}
                                onClick={() => setActiveTab("peserta")}
                            >
                                Peserta Rapat
                            </button>
                            <button
                                style={activeTab === "notulensi" ? styles.tabButtonActive : styles.tabButton}
                                onClick={() => setActiveTab("notulensi")}
                            >
                                Notulensi Rapat
                            </button>
                            <button
                                style={activeTab === "tindak_lanjut" ? styles.tabButtonActive : styles.tabButton}
                                onClick={() => setActiveTab("tindak_lanjut")}
                            >
                                Tindak Lanjut
                            </button>
                        </div>

                        {/* Area Konten Tab */}
                        <div style={styles.tabContent}>
                            {activeTab === "peserta" && <TabPesertaRapat meetingId={meeting.meeting_id} />}
                            {activeTab === "notulensi" && <TabNotulensiRapat meetingId={meeting.meeting_id} />}
                            {activeTab === "tindak_lanjut" && <TabTindakLanjut meetingId={meeting.meeting_id} />}
                        </div>
                    </>
                ) : (
                    <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                        Data rapat tidak ditemukan.
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer style={styles.footer}>
                © 2026 BVet Bukittinggi. All rights reserved.
            </footer>

            {/* Modal Logout */}
            {showLogoutModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalCard}>
                        <h3 style={{ fontSize: "clamp(0.9375rem, 2vw, 1rem)", fontWeight: 700, color: "#2D7A68", margin: 0 }}>
                            Konfirmasi Logout
                        </h3>
                        <p style={styles.modalText}>
                            Apakah Anda yakin ingin keluar dari aplikasi?
                        </p>
                        <div style={styles.modalButtonGroup}>
                            <button onClick={() => setShowLogoutModal(false)} style={styles.btnCancel}>
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