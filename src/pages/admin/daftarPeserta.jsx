import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../assets/logo_kementan.png";

export default function DaftarPeserta() {
    const userStored = JSON.parse(localStorage.getItem("user") || "{}");
    const adminName = userStored.name || "Admin";

    const navigate = useNavigate();
    const location = useLocation();

    // State Active Tab ('peserta' | 'kepanitiaan')
    const [activeTab, setActiveTab] = useState("peserta");

    // State Layar & Pencarian
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [searchQuery, setSearchQuery] = useState("");

    // State Data Peserta dari API
    const [pesertaList, setPesertaList] = useState([]);
    const [loadingPeserta, setLoadingPeserta] = useState(true);
    const [errorPeserta, setErrorPeserta] = useState(null);

    // State Data Kepanitiaan dari API
    const [committeeList, setCommitteeList] = useState([]);
    const [loadingCommittee, setLoadingCommittee] = useState(true);
    const [errorCommittee, setErrorCommittee] = useState(null);

    // State Modal Logout
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // State Modal & Data TTD Kepala Balai
    const [showTTDModal, setShowTTDModal] = useState(false);
    const [kepalaBalaiInfo, setKepalaBalaiInfo] = useState(() => {
        const saved = localStorage.getItem("kepalaBalaiInfo");
        return saved
            ? JSON.parse(saved)
            : {
                nama: "Drh. Nama Kepala Balai, M.Si",
                nip: "19750101 200003 1 001",
            };
    });
    const [tempNamaTTD, setTempNamaTTD] = useState(kepalaBalaiInfo.nama);
    const [tempNipTTD, setTempNipTTD] = useState(kepalaBalaiInfo.nip);

    // State Modal Form Peserta (Tambah & Edit)
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [signatureFile, setSignatureFile] = useState(null);
    const [formUserData, setFormUserData] = useState({
        name: "",
        nip: "",
        email: "",
        password: "",
        role: "Peserta",
        bidang: "",
        jabatan: "",
        phone: "",
        status: "Aktif",
    });

    // State Modal Form Kepanitiaan (Tambah & Edit)
    const [showCommitteeModal, setShowCommitteeModal] = useState(false);
    const [selectedCommitteeId, setSelectedCommitteeId] = useState(null);
    const [formCommitteeData, setFormCommitteeData] = useState({
        name: "",
        description: "",
        userIds: [],
    });

    // State Modal Detail Anggota Kepanitiaan
    const [showDetailMembersModal, setShowDetailMembersModal] = useState(false);
    const [selectedCommitteeForDetail, setSelectedCommitteeForDetail] = useState(null);

    // State Common Modal Submit / Hapus
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // State Modal Hapus (Reusable untuk User/Committee)
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // State Modal Sukses
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // Listener Ukuran Layar
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const isMobile = windowWidth <= 768;

    // Fetch Data Peserta
    const fetchUsers = async () => {
        try {
            setLoadingPeserta(true);
            const token = localStorage.getItem("token");

            const response = await fetch("http://localhost:5000/api/users", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error("Gagal mengambil data peserta");

            const result = await response.json();
            setPesertaList(result.data || []);
            setErrorPeserta(null);
        } catch (err) {
            console.error(err);
            setErrorPeserta(err.message);
        } finally {
            setLoadingPeserta(false);
        }
    };

    // Fetch Data Kepanitiaan
    const fetchCommittees = async () => {
        try {
            setLoadingCommittee(true);
            const token = localStorage.getItem("token");

            const response = await fetch("http://localhost:5000/api/committees", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Gagal mengambil data kepanitiaan (Route 404/Error)");
            }

            const result = await response.json();
            setCommitteeList(result.data || []);
            setErrorCommittee(null);
        } catch (err) {
            console.error(err);
            setErrorCommittee(err.message);
        } finally {
            setLoadingCommittee(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchCommittees();
    }, []);

    // Filter daftar pejabat (hanya yang memiliki kata 'kepala' atau 'ketua' di jabatan/bidang)
    const filteredKepalaList = pesertaList.filter((user) => {
        const j = (user.jabatan || "").toLowerCase();
        const b = (user.bidang || "").toLowerCase();
        return j.includes("kepala") || j.includes("ketua") || b.includes("kepala") || b.includes("ketua");
    });

    // Helper Base64 Image
    const getBase64ImageFromUrl = (imageUrl) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = imageUrl;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = (error) => reject(error);
        });
    };

    // Handler Perubahan Dropdown TTD Kepala Balai
    const handleKepalaBalaiSelectChange = (e) => {
        const selectedName = e.target.value;
        setTempNamaTTD(selectedName);

        const foundUser = pesertaList.find((u) => u.name === selectedName);
        if (foundUser && foundUser.nip) {
            setTempNipTTD(foundUser.nip);
        }
    };

    // Simpan Pengaturan TTD
    const handleSaveTTD = (e) => {
        e.preventDefault();
        const newInfo = { nama: tempNamaTTD, nip: tempNipTTD };
        setKepalaBalaiInfo(newInfo);
        localStorage.setItem("kepalaBalaiInfo", JSON.stringify(newInfo));
        setShowTTDModal(false);
    };

    // Export PDF
    const handleExportPDF = async () => {
        try {
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageWidth = doc.internal.pageSize.getWidth();
            const centerX = pageWidth / 2;

            try {
                const base64Logo = await getBase64ImageFromUrl(logo);
                doc.addImage(base64Logo, "PNG", 12, 8, 20, 20);
            } catch (e) {
                console.warn("Logo gagal dimuat di PDF:", e);
            }

            // Kop Surat
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("KEMENTERIAN PERTANIAN", centerX, 12, { align: "center" });

            doc.setFontSize(9.5);
            doc.text("DIREKTORAT JENDERAL PETERNAKAN DAN KESEHATAN HEWAN", centerX, 16, { align: "center" });

            doc.setFontSize(11);
            doc.text("BALAI VETERINER BUKITTINGGI", centerX, 21, { align: "center" });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.text("Jl. Raya Bukittinggi - Payakumbuh Km. 14, Pakan Sinayan, Banuhampu, Agam, Sumatera Barat", centerX, 25, { align: "center" });
            doc.text("Website: bvetbukittinggi.ditjenpkh.pertanian.go.id | Email: bvet.bukittinggi@pertanian.go.id", centerX, 28.5, { align: "center" });

            doc.setLineWidth(0.7);
            doc.line(12, 31, 198, 31);
            doc.setLineWidth(0.2);
            doc.line(12, 32, 198, 32);

            let tableColumn = [];
            let tableRows = [];

            if (activeTab === "peserta") {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.text("LAPORAN DAFTAR PESERTA RAPAT", centerX, 39, { align: "center" });

                tableColumn = ["No", "Nama", "NIP", "Kategori", "Bidang", "Jabatan", "No. HP", "Status"];
                tableRows = filteredPeserta.map((item, idx) => [
                    idx + 1,
                    item.name || "-",
                    item.nip || "-",
                    item.role || "-",
                    item.bidang || "-",
                    item.jabatan || "-",
                    item.phone || "-",
                    item.status || "-",
                ]);
            } else {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.text("LAPORAN DAFTAR KEPANITIAAN", centerX, 39, { align: "center" });

                tableColumn = ["No", "Nama Kepanitiaan", "Deskripsi", "Jumlah Anggota", "Daftar Anggota"];
                tableRows = filteredCommittees.map((item, idx) => [
                    idx + 1,
                    item.name || "-",
                    item.description || "-",
                    item.members ? item.members.length : 0,
                    item.members ? item.members.map((m) => m.name).join(", ") : "-",
                ]);
            }

            autoTable(doc, {
                startY: 43,
                head: [tableColumn],
                body: tableRows,
                theme: "grid",
                headStyles: {
                    fillColor: [45, 122, 104],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                    halign: "center",
                    fontSize: 8,
                },
                bodyStyles: { fontSize: 7.5, textColor: [31, 41, 55] },
                styles: { overflow: "linebreak", cellPadding: 2 },
            });

            const lastTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 43;
            let currentY = lastTableY + 10;

            if (currentY + 35 > doc.internal.pageSize.getHeight()) {
                doc.addPage();
                currentY = 20;
            }

            const todayStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
            const signatureX = 135;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.text(`Bukittinggi, ${todayStr}`, signatureX, currentY);
            currentY += 4;
            doc.setFont("helvetica", "bold");
            doc.text("Kepala Balai Veteriner Bukittinggi", signatureX, currentY);
            currentY += 20;
            doc.text(kepalaBalaiInfo.nama, signatureX, currentY);
            doc.setFont("helvetica", "normal");
            currentY += 3.5;
            doc.text(`NIP. ${kepalaBalaiInfo.nip}`, signatureX, currentY);

            window.open(doc.output("bloburl"), "_blank");
        } catch (err) {
            console.error("Gagal export PDF:", err);
            alert("Terjadi kesalahan saat mencetak PDF.");
        }
    };

    // LOGIKA FORM USER
    const handleCloseUserModal = () => {
        setShowAddUserModal(false);
        setSelectedUserId(null);
        setSignatureFile(null);
        setFormError("");
        setFormUserData({
            name: "",
            nip: "",
            email: "",
            password: "",
            role: "Peserta",
            bidang: "",
            jabatan: "",
            phone: "",
            status: "Aktif",
        });
    };

    const handleEditUserClick = (user) => {
        setSelectedUserId(user.user_id);
        setSignatureFile(null);
        setFormUserData({
            name: user.name || "",
            nip: user.nip || "",
            email: user.email || "",
            password: "",
            role: user.role || "Peserta",
            bidang: user.bidang || "",
            jabatan: user.jabatan || "",
            phone: user.phone || "",
            status: user.status || "Aktif",
        });
        setFormError("");
        setShowAddUserModal(true);
    };

    const handleSubmitUser = async (e) => {
        e.preventDefault();
        setFormError("");

        if (!formUserData.name || !formUserData.nip || !formUserData.email || !formUserData.bidang || !formUserData.jabatan) {
            setFormError("Mohon isi semua bidang wajib.");
            return;
        }

        if (!selectedUserId && !formUserData.password) {
            setFormError("Password wajib diisi untuk peserta baru.");
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem("token");
            const url = selectedUserId
                ? `http://localhost:5000/api/users/${selectedUserId}`
                : "http://localhost:5000/api/users";

            const formData = new FormData();
            formData.append("name", formUserData.name);
            formData.append("nip", formUserData.nip);
            formData.append("email", formUserData.email);
            if (formUserData.password) formData.append("password", formUserData.password);
            formData.append("role", formUserData.role);
            formData.append("bidang", formUserData.bidang);
            formData.append("jabatan", formUserData.jabatan);
            if (formUserData.phone) formData.append("phone", formUserData.phone);
            if (selectedUserId) formData.append("status", formUserData.status);
            if (signatureFile) formData.append("signature", signatureFile);

            const response = await fetch(url, {
                method: selectedUserId ? "PUT" : "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Gagal menyimpan data peserta");

            fetchUsers();
            handleCloseUserModal();
            setSuccessMessage(selectedUserId ? "Berhasil memperbarui data peserta!" : "Berhasil menambahkan peserta!");
            setShowSuccessModal(true);
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // LOGIKA FORM KEPANITIAAN
    const handleCloseCommitteeModal = () => {
        setShowCommitteeModal(false);
        setSelectedCommitteeId(null);
        setFormError("");
        setFormCommitteeData({ name: "", description: "", userIds: [] });
    };

    const handleEditCommitteeClick = (committee) => {
        setSelectedCommitteeId(committee.committee_id);
        setFormCommitteeData({
            name: committee.name || "",
            description: committee.description || "",
            userIds: committee.members ? committee.members.map((m) => m.user_id) : [],
        });
        setFormError("");
        setShowCommitteeModal(true);
    };

    const handleCheckboxUserChange = (userId) => {
        setFormCommitteeData((prev) => {
            const exists = prev.userIds.includes(userId);
            if (exists) {
                return { ...prev, userIds: prev.userIds.filter((id) => id !== userId) };
            } else {
                return { ...prev, userIds: [...prev.userIds, userId] };
            }
        });
    };

    const handleSubmitCommittee = async (e) => {
        e.preventDefault();
        setFormError("");

        if (!formCommitteeData.name) {
            setFormError("Nama kepanitiaan wajib diisi.");
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem("token");
            const url = selectedCommitteeId
                ? `http://localhost:5000/api/committees/${selectedCommitteeId}`
                : "http://localhost:5000/api/committees";

            const response = await fetch(url, {
                method: selectedCommitteeId ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formCommitteeData),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Gagal menyimpan kepanitiaan");

            fetchCommittees();
            handleCloseCommitteeModal();
            setSuccessMessage(selectedCommitteeId ? "Berhasil memperbarui kepanitiaan!" : "Berhasil membuat kepanitiaan!");
            setShowSuccessModal(true);
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // LOGIKA HAPUS (REUSABLE)
    const handleOpenDeleteModal = (id, type, name) => {
        setItemToDelete({ id, type, name });
        setShowDeleteModal(true);
    };

    const handleDeleteItem = async () => {
        if (!itemToDelete) return;

        try {
            setDeleting(true);
            const token = localStorage.getItem("token");
            const endpoint = itemToDelete.type === "user" ? `users/${itemToDelete.id}` : `committees/${itemToDelete.id}`;

            const response = await fetch(`http://localhost:5000/api/${endpoint}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Gagal menghapus data");

            if (itemToDelete.type === "user") {
                fetchUsers();
                fetchCommittees();
            } else {
                fetchCommittees();
            }

            setShowDeleteModal(false);
            setItemToDelete(null);
            setSuccessMessage("Berhasil menghapus data!");
            setShowSuccessModal(true);
        } catch (err) {
            alert(err.message);
        } finally {
            setDeleting(false);
        }
    };

    // Execute Logout
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
            console.error("Gagal logout:", error);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/", { replace: true });
        }
    };

    // Filter Data
    const filteredPeserta = pesertaList.filter((item) => {
        const q = searchQuery.toLowerCase();
        return (
            (item.name && item.name.toLowerCase().includes(q)) ||
            (item.nip && item.nip.toLowerCase().includes(q)) ||
            (item.email && item.email.toLowerCase().includes(q))
        );
    });

    const filteredCommittees = committeeList.filter((item) => {
        const q = searchQuery.toLowerCase();
        return (
            (item.name && item.name.toLowerCase().includes(q)) ||
            (item.description && item.description.toLowerCase().includes(q))
        );
    });

    // Styles Object
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
            padding: isMobile ? "1rem" : "1.5rem 1.5rem 2rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            boxSizing: "border-box",
        },
        filterCard: {
            backgroundColor: "#ffffff",
            borderRadius: "1rem",
            padding: isMobile ? "1rem" : "1rem 1.25rem",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
        },
        searchBox: {
            position: "relative",
            display: "flex",
            alignItems: "center",
            flex: 1,
            minWidth: isMobile ? "100%" : "250px",
        },
        searchInput: {
            width: "100%",
            padding: "0.625rem 0.875rem 0.625rem 2.375rem",
            borderRadius: "0.625rem",
            border: "1px solid #d1d5db",
            fontSize: "clamp(0.75rem, 1.5vw, 0.8125rem)",
            outline: "none",
            backgroundColor: "#ffffff",
            color: "#374151",
            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        },
        searchIcon: {
            position: "absolute",
            left: "0.75rem",
            color: "#9ca3af",
            display: "flex",
            alignItems: "center",
            pointerEvents: "none",
        },
        btnSettingTTD: {
            backgroundColor: "#ffffff",
            color: "#4b5563",
            border: "1px solid #d1d5db",
            padding: "0.5625rem 0.875rem",
            borderRadius: "0.5rem",
            fontSize: "clamp(0.75rem, 1.5vw, 0.8125rem)",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.375rem",
            flex: isMobile ? "1" : "initial",
            whiteSpace: "nowrap",
        },
        btnExport: {
            backgroundColor: "#2D7A68",
            color: "#ffffff",
            border: "none",
            padding: "0.5625rem 1rem",
            borderRadius: "0.5rem",
            fontSize: "clamp(0.75rem, 1.5vw, 0.8125rem)",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.375rem",
            flex: isMobile ? "1" : "initial",
            whiteSpace: "nowrap",
        },
        tabContainer: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "3rem",
            borderBottom: "1px solid #e5e7eb",
            marginTop: "0.5rem",
            marginBottom: "0.5rem",
            paddingBottom: "0",
        },
        tabButtonActive: {
            padding: "0.75rem 1rem",
            backgroundColor: "transparent",
            color: "#2D7A68",
            fontWeight: "700",
            fontSize: "clamp(0.875rem, 1.5vw, 1rem)",
            border: "none",
            borderBottom: "3px solid #2D7A68",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
        },
        tabButtonInactive: {
            padding: "0.75rem 1rem",
            backgroundColor: "transparent",
            color: "#6b7280",
            fontWeight: "500",
            fontSize: "clamp(0.875rem, 1.5vw, 1rem)",
            border: "none",
            borderBottom: "3px solid transparent",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
        },
        totalText: {
            fontSize: "clamp(0.875rem, 2vw, 1rem)",
            fontWeight: 700,
            color: "#1f2937",
            margin: "0.25rem 0",
            alignSelf: "flex-start",
        },
        tableCard: {
            backgroundColor: "#ffffff",
            borderRadius: "1rem",
            border: "1px solid #e5e7eb",
            padding: isMobile ? "1rem" : "1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            overflowX: "auto",
        },
        cardHeader: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
            gap: "0.5rem",
            flexWrap: "wrap",
        },
        sectionTitle: {
            fontSize: "clamp(1rem, 2vw, 1.125rem)",
            fontWeight: 700,
            color: "#2D7A68",
            margin: 0,
            borderBottom: "2px solid #2D7A68",
            paddingBottom: "0.25rem",
        },
        btnTambah: {
            backgroundColor: "#2D7A68",
            color: "#ffffff",
            border: "none",
            padding: "0.5625rem 1.125rem",
            borderRadius: "0.5rem",
            fontSize: "clamp(0.75rem, 1.5vw, 0.8125rem)",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            width: isMobile ? "100%" : "auto",
        },
        tableWrapper: { width: "100%", overflowX: "auto" },
        table: {
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "clamp(0.75rem, 1.2vw, 0.8125rem)",
            textAlign: "center",
            minWidth: "700px",
        },
        th: {
            padding: "0.75rem 0.5rem",
            color: "#374151",
            fontWeight: 600,
            borderBottom: "1px solid #e5e7eb",
            fontSize: "clamp(0.7rem, 1.2vw, 0.75rem)",
            backgroundColor: "#f9fafb",
            whiteSpace: "nowrap",
        },
        td: {
            padding: "0.75rem 0.5rem",
            color: "#4b5563",
            borderBottom: "1px solid #f3f4f6",
            verticalAlign: "middle",
        },
        actionBtnGroup: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem",
        },
        iconBtnEdit: {
            background: "#fef3c7",
            border: "none",
            borderRadius: "0.25rem",
            cursor: "pointer",
            color: "#d97706",
            padding: "0.375rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        },
        iconBtnDelete: {
            background: "#fee2e2",
            border: "none",
            borderRadius: "0.25rem",
            cursor: "pointer",
            color: "#ef4444",
            padding: "0.375rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        },
        btnMemberDetail: {
            backgroundColor: "#e0f2fe",
            color: "#0284c7",
            border: "none",
            borderRadius: "0.375rem",
            padding: "0.25rem 0.625rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
        },
        footer: {
            backgroundColor: "#2D7A68",
            color: "#ffffff",
            padding: "0.75rem 1rem",
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
            maxWidth: "380px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.75rem",
            boxSizing: "border-box",
        },
        modalCardAdd: {
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "520px",
            maxHeight: "88vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
            overflow: "hidden",
            boxSizing: "border-box",
        },
        modalHeader: {
            padding: "20px 24px 16px 24px",
            borderBottom: "1px solid #f3f4f6",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
        },
        modalTitle: {
            fontSize: "18px",
            fontWeight: 700,
            color: "#2D7A68",
            margin: 0,
        },
        modalBody: {
            padding: "20px 24px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            textAlign: "left",
        },
        modalInputSoft: {
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            backgroundColor: "#ffffff",
            fontSize: "13px",
            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
            boxSizing: "border-box",
            outline: "none",
            color: "#374151",
        },
        label: {
            fontSize: "13px",
            fontWeight: 600,
            color: "#374151",
            marginBottom: "6px",
            display: "block",
        },
        modalFooter: {
            padding: "16px 24px",
            borderTop: "1px solid #f3f4f6",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
        },
        btnCancelSoft: {
            padding: "8px 20px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            backgroundColor: "#ff6b6b",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
        },
        btnSubmitSoft: {
            padding: "8px 20px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: "#2D7A68",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
        },
        checkboxList: {
            maxHeight: "150px",
            overflowY: "auto",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            padding: "8px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            backgroundColor: "#fafafa",
        },
        checkboxItem: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            color: "#374151",
            cursor: "pointer",
        },
        formGroup: {
            display: "flex",
            flexDirection: "column",
            gap: "0.375rem",
            width: "100%",
            textAlign: "left",
        },
        formLabel: {
            fontSize: "clamp(0.7rem, 1.2vw, 0.75rem)",
            fontWeight: "600",
            color: "#374151",
        },
        formInput: {
            width: "100%",
            padding: "0.5rem 0.75rem",
            borderRadius: "0.375rem",
            border: "1px solid #d1d5db",
            fontSize: "clamp(0.75rem, 1.5vw, 0.8125rem)",
            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
            boxSizing: "border-box",
        },
        btnCancel: {
            flex: 1,
            padding: "0.5rem 1.25rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.5rem",
            backgroundColor: "#ff6b6b",
            color: "#ffffff",
            fontSize: "clamp(0.75rem, 1.5vw, 0.8125rem)",
            fontWeight: 600,
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
        successIconCircle: {
            width: "3rem",
            height: "3rem",
            borderRadius: "50%",
            backgroundColor: "#dcfce7",
            color: "#16a34a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "0.5rem",
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
                    <button onClick={() => navigate("/admin/dashboard-admin")} style={location.pathname.includes("dashboard") ? styles.navLinkActive : styles.navLink}>Home</button>
                    <button onClick={() => navigate("/admin/jadwal-rapat")} style={location.pathname.includes("jadwal") ? styles.navLinkActive : styles.navLink}>Jadwal Rapat</button>
                    <button onClick={() => navigate("/admin/data-rapat")} style={location.pathname.includes("data-rapat") ? styles.navLinkActive : styles.navLink}>Data Rapat</button>
                    <button onClick={() => navigate("/admin/tindak-lanjut")} style={location.pathname.includes("tindak-lanjut") ? styles.navLinkActive : styles.navLink}>Tindak Lanjut</button>
                    <button onClick={() => navigate("/admin/daftar-peserta")} style={location.pathname.includes("daftar-peserta") ? styles.navLinkActive : styles.navLink}>Daftar Peserta</button>
                </div>
            </header>

            {/* Main Content */}
            <main style={styles.main}>
                {/* 1. GROUP PENCARIAN, TTD, & EXPORT PDF */}
                <div style={styles.filterCard}>
                    <div style={styles.searchBox}>
                        <span style={styles.searchIcon}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder={activeTab === "peserta" ? "Cari nama, NIP, atau email..." : "Cari nama kepanitiaan atau deskripsi..."}
                            style={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={() => {
                            setTempNamaTTD(kepalaBalaiInfo.nama);
                            setTempNipTTD(kepalaBalaiInfo.nip);
                            setShowTTDModal(true);
                        }}
                        style={styles.btnSettingTTD}
                        title="Atur Nama & NIP Kepala Balai"
                    >
                        ⚙️ TTD
                    </button>

                    <button onClick={handleExportPDF} style={styles.btnExport}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        Export PDF
                    </button>
                </div>

                {/* 2. TAB DI BAWAH GROUP SEARCH / TTD / EXPORT */}
                <div style={styles.tabContainer}>
                    <button
                        style={activeTab === "peserta" ? styles.tabButtonActive : styles.tabButtonInactive}
                        onClick={() => { setActiveTab("peserta"); setSearchQuery(""); }}
                    >
                        Peserta Rapat
                    </button>
                    <button
                        style={activeTab === "kepanitiaan" ? styles.tabButtonActive : styles.tabButtonInactive}
                        onClick={() => { setActiveTab("kepanitiaan"); setSearchQuery(""); }}
                    >
                        Kepanitiaan
                    </button>
                </div>

                {/* TOTAL COUNTER */}
                <h3 style={styles.totalText}>
                    {activeTab === "peserta"
                        ? `Total Peserta: ${filteredPeserta.length}`
                        : `Total Kepanitiaan: ${filteredCommittees.length}`}
                </h3>

                {/* TABEL DATA */}
                <div style={styles.tableCard}>
                    <div style={styles.cardHeader}>
                        <h2 style={styles.sectionTitle}>
                            {activeTab === "peserta" ? "Daftar Peserta" : "Daftar Kepanitiaan"}
                        </h2>
                        {activeTab === "peserta" ? (
                            <button style={styles.btnTambah} onClick={() => { setSelectedUserId(null); setSignatureFile(null); setShowAddUserModal(true); }}>
                                + Tambah Peserta
                            </button>
                        ) : (
                            <button style={styles.btnTambah} onClick={() => { setSelectedCommitteeId(null); setFormCommitteeData({ name: "", description: "", userIds: [] }); setShowCommitteeModal(true); }}>
                                + Tambah Kepanitiaan
                            </button>
                        )}
                    </div>

                    <div style={styles.tableWrapper}>
                        {activeTab === "peserta" ? (
                            // TABEL PESERTA
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>No</th>
                                        <th style={styles.th}>Nama</th>
                                        <th style={styles.th}>NIP</th>
                                        <th style={styles.th}>Email</th>
                                        <th style={styles.th}>Kategori</th>
                                        <th style={styles.th}>Bidang</th>
                                        <th style={styles.th}>Jabatan</th>
                                        <th style={styles.th}>HP</th>
                                        <th style={styles.th}>TTD Digital</th>
                                        <th style={styles.th}>Status</th>
                                        <th style={styles.th}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingPeserta ? (
                                        <tr><td colSpan="11" style={{ ...styles.td, textAlign: "center" }}>Memuat data...</td></tr>
                                    ) : errorPeserta ? (
                                        <tr><td colSpan="11" style={{ ...styles.td, textAlign: "center", color: "red" }}>Error: {errorPeserta}</td></tr>
                                    ) : filteredPeserta.length > 0 ? (
                                        filteredPeserta.map((item, index) => (
                                            <tr key={item.user_id}>
                                                <td style={styles.td}>{index + 1}</td>
                                                <td style={{ ...styles.td, fontWeight: 600, color: "#1f2937" }}>{item.name}</td>
                                                <td style={styles.td}>{item.nip}</td>
                                                <td style={styles.td}>{item.email}</td>
                                                <td style={styles.td}>{item.role}</td>
                                                <td style={styles.td}>{item.bidang}</td>
                                                <td style={styles.td}>{item.jabatan}</td>
                                                <td style={styles.td}>{item.phone || "-"}</td>
                                                <td style={styles.td}>
                                                    {item.signature_url ? (
                                                        <img
                                                            src={`http://localhost:5000${item.signature_url}`}
                                                            alt="TTD"
                                                            style={{ width: "40px", height: "25px", objectFit: "contain" }}
                                                        />
                                                    ) : (
                                                        <span style={{ fontSize: "10px", color: "#9ca3af" }}>Belum ada</span>
                                                    )}
                                                </td>
                                                <td style={styles.td}>{item.status}</td>
                                                <td style={styles.td}>
                                                    <div style={styles.actionBtnGroup}>
                                                        <button
                                                            style={styles.iconBtnEdit}
                                                            title="Edit Data"
                                                            onClick={() => handleEditUserClick(item)}
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                            </svg>
                                                        </button>

                                                        <button
                                                            style={styles.iconBtnDelete}
                                                            title="Hapus Data"
                                                            onClick={() => handleOpenDeleteModal(item.user_id, "user", item.name)}
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6" />
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                                <line x1="10" y1="11" x2="10" y2="17" />
                                                                <line x1="14" y1="11" x2="14" y2="17" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="11" style={{ ...styles.td, textAlign: "center" }}>Data peserta tidak ditemukan</td></tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            // TABEL KEPANITIAAN
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>No</th>
                                        <th style={styles.th}>Nama Kepanitiaan</th>
                                        <th style={styles.th}>Deskripsi</th>
                                        <th style={styles.th}>Jumlah Anggota</th>
                                        <th style={styles.th}>Anggota</th>
                                        <th style={styles.th}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingCommittee ? (
                                        <tr><td colSpan="6" style={{ ...styles.td, textAlign: "center" }}>Memuat data kepanitiaan...</td></tr>
                                    ) : errorCommittee ? (
                                        <tr><td colSpan="6" style={{ ...styles.td, textAlign: "center", color: "red" }}>Error: {errorCommittee}</td></tr>
                                    ) : filteredCommittees.length > 0 ? (
                                        filteredCommittees.map((item, index) => (
                                            <tr key={item.committee_id}>
                                                <td style={styles.td}>{index + 1}</td>
                                                <td style={{ ...styles.td, fontWeight: 600, color: "#1f2937" }}>{item.name}</td>
                                                <td style={styles.td}>{item.description || "-"}</td>
                                                <td style={styles.td}>{item.members ? item.members.length : 0} Orang</td>
                                                <td style={styles.td}>
                                                    <button
                                                        style={styles.btnMemberDetail}
                                                        onClick={() => {
                                                            setSelectedCommitteeForDetail(item);
                                                            setShowDetailMembersModal(true);
                                                        }}
                                                    >
                                                        Lihat Anggota
                                                    </button>
                                                </td>
                                                <td style={styles.td}>
                                                    <div style={styles.actionBtnGroup}>
                                                        <button style={styles.iconBtnEdit} onClick={() => handleEditCommitteeClick(item)} title="Edit">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                            </svg>
                                                        </button>

                                                        <button style={styles.iconBtnDelete} onClick={() => handleOpenDeleteModal(item.committee_id, "committee", item.name)} title="Hapus">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6" />
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                                <line x1="10" y1="11" x2="10" y2="17" />
                                                                <line x1="14" y1="11" x2="14" y2="17" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="6" style={{ ...styles.td, textAlign: "center" }}>Data kepanitiaan tidak ditemukan</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer style={styles.footer}>
                © 2026 BVet Bukittinggi. All rights reserved.
            </footer>

            {/* MODAL TTD KEPALA BALAI */}
            {showTTDModal && (
                <div style={styles.modalOverlay}>
                    <form onSubmit={handleSaveTTD} style={styles.modalCard}>
                        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#2D7A68", margin: 0 }}>
                            Pengaturan TTD Kepala Balai
                        </h3>
                        <p style={{ fontSize: "12px", color: "#4b5563", margin: 0 }}>
                            Pilih Nama dan NIP pejabat Kepala Balai untuk dicetak pada laporan PDF.
                        </p>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>Nama Kepala Balai</label>
                            <select
                                style={styles.formInput}
                                value={tempNamaTTD}
                                onChange={handleKepalaBalaiSelectChange}
                                required
                            >
                                <option value="">-- Pilih Kepala / Ketua --</option>

                                {/* Tetap tampilkan nilai saat ini jika belum ada di list terfilter */}
                                {tempNamaTTD && !filteredKepalaList.some((u) => u.name === tempNamaTTD) && (
                                    <option value={tempNamaTTD}>{tempNamaTTD}</option>
                                )}

                                {/* Opsi dari data terfilter ("Kepala" atau "Ketua") */}
                                {filteredKepalaList.map((user) => (
                                    <option key={user.user_id} value={user.name}>
                                        {user.name} ({user.jabatan || user.bidang})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.formLabel}>NIP Kepala Balai</label>
                            <input
                                type="text"
                                style={styles.formInput}
                                placeholder="Masukkan NIP Kepala Balai..."
                                value={tempNipTTD}
                                onChange={(e) => setTempNipTTD(e.target.value)}
                                required
                            />
                        </div>
                        <div style={{ display: "flex", gap: "0.75rem", width: "100%", marginTop: "0.5rem" }}>
                            <button type="button" onClick={() => setShowTTDModal(false)} style={styles.btnCancel}>Batal</button>
                            <button type="submit" style={styles.btnSubmitSoft}>Simpan</button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL LOGOUT */}
            {showLogoutModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalCard}>
                        <h3 style={styles.modalTitle}>Konfirmasi Logout</h3>
                        <p style={{ fontSize: "13px", color: "#4b5563" }}>Apakah Anda yakin ingin keluar dari aplikasi?</p>
                        <div style={{ display: "flex", gap: "0.75rem", width: "100%", marginTop: "0.5rem" }}>
                            <button onClick={() => setShowLogoutModal(false)} style={styles.btnCancel}>Batal</button>
                            <button onClick={executeLogout} style={styles.btnConfirm}>Ya, Keluar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL TAMBAH / EDIT PESERTA */}
            {showAddUserModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalCardAdd}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>{selectedUserId ? "Edit Peserta" : "Tambah Peserta"}</h3>
                            <span style={{ cursor: "pointer", fontSize: "18px", color: "#9ca3af", fontWeight: "bold" }} onClick={handleCloseUserModal}>✕</span>
                        </div>
                        <form onSubmit={handleSubmitUser} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                            <div style={styles.modalBody}>
                                {formError && <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>{formError}</p>}
                                <div>
                                    <label style={styles.label}>Nama Lengkap</label>
                                    <input 
                                        type="text" 
                                        name="name" 
                                        placeholder="Masukkan nama lengkap beserta gelar..." 
                                        value={formUserData.name} 
                                        onChange={(e) => setFormUserData({ ...formUserData, name: e.target.value })} 
                                        style={styles.modalInputSoft} 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label style={styles.label}>NIP</label>
                                    <input 
                                        type="text" 
                                        name="nip" 
                                        placeholder="Masukkan NIP (Contoh: 19800101 200501 1 002)..." 
                                        value={formUserData.nip} 
                                        onChange={(e) => setFormUserData({ ...formUserData, nip: e.target.value })} 
                                        style={styles.modalInputSoft} 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label style={styles.label}>Email</label>
                                    <input 
                                        type="email" 
                                        name="email" 
                                        placeholder="Masukkan alamat email aktif..." 
                                        value={formUserData.email} 
                                        onChange={(e) => setFormUserData({ ...formUserData, email: e.target.value })} 
                                        style={styles.modalInputSoft} 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label style={styles.label}>Password {selectedUserId ? "(Kosongkan jika tak diubah)" : ""}</label>
                                    <input 
                                        type="password" 
                                        name="password" 
                                        placeholder={selectedUserId ? "Kosongkan jika tidak ingin mengubah password" : "Masukkan password akun..."} 
                                        value={formUserData.password} 
                                        onChange={(e) => setFormUserData({ ...formUserData, password: e.target.value })} 
                                        style={styles.modalInputSoft} 
                                        required={!selectedUserId} 
                                    />
                                </div>
                                <div>
                                    <label style={styles.label}>Kategori</label>
                                    <select name="role" value={formUserData.role} onChange={(e) => setFormUserData({ ...formUserData, role: e.target.value })} style={styles.modalInputSoft}>
                                        <option value="Peserta">Peserta</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                                {selectedUserId && (
                                    <div>
                                        <label style={styles.label}>Status Akun</label>
                                        <select name="status" value={formUserData.status} onChange={(e) => setFormUserData({ ...formUserData, status: e.target.value })} style={styles.modalInputSoft}>
                                            <option value="Aktif">Aktif</option>
                                            <option value="Tidak Aktif">Tidak Aktif</option>
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label style={styles.label}>Bidang</label>
                                    <input 
                                        type="text" 
                                        name="bidang" 
                                        placeholder="Masukkan bidang/subbagian..." 
                                        value={formUserData.bidang} 
                                        onChange={(e) => setFormUserData({ ...formUserData, bidang: e.target.value })} 
                                        style={styles.modalInputSoft} 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label style={styles.label}>Jabatan</label>
                                    <input 
                                        type="text" 
                                        name="jabatan" 
                                        placeholder="Masukkan nama jabatan..." 
                                        value={formUserData.jabatan} 
                                        onChange={(e) => setFormUserData({ ...formUserData, jabatan: e.target.value })} 
                                        style={styles.modalInputSoft} 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label style={styles.label}>No. HP</label>
                                    <input 
                                        type="text" 
                                        name="phone" 
                                        placeholder="Masukkan nomor HP/WhatsApp..." 
                                        value={formUserData.phone} 
                                        onChange={(e) => setFormUserData({ ...formUserData, phone: e.target.value })} 
                                        style={styles.modalInputSoft} 
                                    />
                                </div>
                                <div>
                                    <label style={styles.label}>Tanda Tangan Digital (PNG/JPG)</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setSignatureFile(e.target.files[0])}
                                        style={styles.modalInputSoft}
                                    />
                                </div>
                            </div>
                            <div style={styles.modalFooter}>
                                <button type="button" onClick={handleCloseUserModal} style={styles.btnCancelSoft}>Batal</button>
                                <button type="submit" disabled={submitting} style={styles.btnSubmitSoft}>{submitting ? "Menyimpan..." : "Simpan"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL TAMBAH / EDIT KEPANITIAAN */}
            {showCommitteeModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalCardAdd}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>{selectedCommitteeId ? "Edit Kepanitiaan" : "Tambah Kepanitiaan"}</h3>
                            <span style={{ cursor: "pointer", fontSize: "18px", color: "#9ca3af", fontWeight: "bold" }} onClick={handleCloseCommitteeModal}>✕</span>
                        </div>
                        <form onSubmit={handleSubmitCommittee} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                            <div style={styles.modalBody}>
                                {formError && <p style={{ color: "#ef4444", fontSize: "12px", margin: 0 }}>{formError}</p>}
                                <div>
                                    <label style={styles.label}>Nama Kepanitiaan</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Panitia WBK 2026"
                                        value={formCommitteeData.name}
                                        onChange={(e) => setFormCommitteeData({ ...formCommitteeData, name: e.target.value })}
                                        style={styles.modalInputSoft}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={styles.label}>Deskripsi</label>
                                    <textarea
                                        rows="3"
                                        placeholder="Keterangan singkat tentang panitia..."
                                        value={formCommitteeData.description}
                                        onChange={(e) => setFormCommitteeData({ ...formCommitteeData, description: e.target.value })}
                                        style={{ ...styles.modalInputSoft, resize: "vertical" }}
                                    />
                                </div>
                                <div>
                                    <label style={styles.label}>Pilih Anggota Panitia</label>
                                    <div style={styles.checkboxList}>
                                        {pesertaList.length > 0 ? (
                                            pesertaList.map((user) => (
                                                <label key={user.user_id} style={styles.checkboxItem}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formCommitteeData.userIds.includes(user.user_id)}
                                                        onChange={() => handleCheckboxUserChange(user.user_id)}
                                                    />
                                                    <span>{user.name} ({user.jabatan || user.bidang || "Peserta"})</span>
                                                </label>
                                            ))
                                        ) : (
                                            <span style={{ fontSize: "12px", color: "#9ca3af" }}>Tidak ada peserta tersedia.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div style={styles.modalFooter}>
                                <button type="button" onClick={handleCloseCommitteeModal} style={styles.btnCancelSoft}>Batal</button>
                                <button type="submit" disabled={submitting} style={styles.btnSubmitSoft}>{submitting ? "Menyimpan..." : "Simpan"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DETAIL ANGGOTA KEPANITIAAN */}
            {showDetailMembersModal && selectedCommitteeForDetail && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalCardAdd}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Anggota: {selectedCommitteeForDetail.name}</h3>
                            <span style={{ cursor: "pointer", fontSize: "18px", color: "#9ca3af", fontWeight: "bold" }} onClick={() => setShowDetailMembersModal(false)}>✕</span>
                        </div>
                        <div style={styles.modalBody}>
                            {selectedCommitteeForDetail.members && selectedCommitteeForDetail.members.length > 0 ? (
                                <table style={{ ...styles.table, minWidth: "100%" }}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>No</th>
                                            <th style={styles.th}>Nama</th>
                                            <th style={styles.th}>NIP</th>
                                            <th style={styles.th}>Jabatan / Bidang</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedCommitteeForDetail.members.map((m, idx) => (
                                            <tr key={m.user_id}>
                                                <td style={styles.td}>{idx + 1}</td>
                                                <td style={{ ...styles.td, fontWeight: 600 }}>{m.name}</td>
                                                <td style={styles.td}>{m.nip || "-"}</td>
                                                <td style={styles.td}>{m.jabatan || m.bidang || "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p style={{ textAlign: "center", color: "#6b7280", margin: "20px 0" }}>Belum ada anggota di kepanitiaan ini.</p>
                            )}
                        </div>
                        <div style={styles.modalFooter}>
                            <button onClick={() => setShowDetailMembersModal(false)} style={styles.btnSubmitSoft}>Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL HAPUS */}
            {showDeleteModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalCard}>
                        <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1f2937", margin: 0 }}>Konfirmasi Hapus</h3>
                        <p style={{ fontSize: "13px", color: "#4b5563", margin: 0, lineHeight: 1.5 }}>
                            Apakah Anda yakin ingin menghapus {itemToDelete?.type === "user" ? "peserta" : "kepanitiaan"}: <br />
                            <strong style={{ color: "#111827" }}>{itemToDelete?.name}</strong>?
                        </p>
                        <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: "12px" }}>
                            <button onClick={() => setShowDeleteModal(false)} style={styles.btnCancel} disabled={deleting}>Batal</button>
                            <button onClick={handleDeleteItem} style={styles.btnConfirm} disabled={deleting}>{deleting ? "Menghapus..." : "Ya, Hapus"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL SUKSES */}
            {showSuccessModal && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modalCard, maxWidth: "320px", padding: "24px 20px" }}>
                        <div style={styles.successIconCircle}>✓</div>
                        <h3 style={{ ...styles.modalTitle, fontSize: "16px", color: "#111827" }}>Berhasil!</h3>
                        <p style={{ fontSize: "13px", color: "#4b5563", textAlign: "center" }}>{successMessage}</p>
                        <button onClick={() => setShowSuccessModal(false)} style={{ ...styles.btnSubmitSoft, width: "100%", padding: "8px 0" }}>OK</button>
                    </div>
                </div>
            )}
        </div>
    );
}