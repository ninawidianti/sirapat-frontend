import React, { useState, useEffect } from "react";
import Select from "react-select"; // Import react-select

export default function TabTindakLanjutRapat({ meetingId }) {
    // State Window Width untuk Responsivitas Layar
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const isMobile = windowWidth <= 768;
    const isSmallMobile = windowWidth <= 480;

    const [followUps, setFollowUps] = useState([]);
    const [users, setUsers] = useState([]); // Daftar PIC/User
    const [loading, setLoading] = useState(true);

    // Form States
    const [task, setTask] = useState("");
    const [selectedUserIds, setSelectedUserIds] = useState([]); // Berbentuk Array ID
    const [deadline, setDeadline] = useState("");
    const [priority, setPriority] = useState("Sedang");
    const [status, setStatus] = useState("Belum Mulai");

    // Modal & Edit States
    const [showModal, setShowModal] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Delete Modal States
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    // Alert Modal State
    const [alertModal, setAlertModal] = useState({
        show: false,
        type: "success",
        title: "",
        message: "",
    });

    const token = localStorage.getItem("token");

    useEffect(() => {
        if (meetingId) {
            fetchFollowUps();
            fetchUsers();
        }
    }, [meetingId]);

    // 1. Fetch Follow Ups berdasarkan Meeting ID
    const fetchFollowUps = async () => {
        try {
            setLoading(true);
            const res = await fetch(`http://localhost:5000/api/follow-ups/meeting/${meetingId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await res.json();
            if (res.ok) setFollowUps(result.data || []);
        } catch (err) {
            console.error("Error fetching follow ups:", err);
            showAlert("error", "Error!", "Gagal memuat data tindak lanjut.");
        } finally {
            setLoading(false);
        }
    };

    // 2. Fetch Users untuk Dropdown PIC
    const fetchUsers = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/users", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await res.json();
            if (res.ok) setUsers(result.data || []);
        } catch (err) {
            console.error("Error fetching users:", err);
        }
    };

    const showAlert = (type, title, message) => {
        setAlertModal({ show: true, type, title, message });
    };

    const closeAlert = () => {
        setAlertModal({ ...alertModal, show: false });
    };

    const openModal = (data = null) => {
        if (data) {
            setSelectedId(data.follow_up_id);
            setTask(data.task || "");

            // Mengurai user_id (Bisa berupa Array [1,2] atau String/JSON)
            let userIds = [];
            if (Array.isArray(data.user_id)) {
                userIds = data.user_id;
            } else if (typeof data.user_id === "string") {
                try {
                    userIds = JSON.parse(data.user_id);
                } catch (e) {
                    userIds = [parseInt(data.user_id)];
                }
            } else if (data.user_id) {
                userIds = [data.user_id];
            }
            setSelectedUserIds(userIds);

            setDeadline(data.deadline ? data.deadline.split("T")[0] : "");
            setPriority(data.priority || "Sedang");
            setStatus(data.status || "Belum Mulai");
        } else {
            setSelectedId(null);
            setTask("");
            setSelectedUserIds([]);
            setDeadline("");
            setPriority("Sedang");
            setStatus("Belum Mulai");
        }
        setShowModal(true);
    };

    // 3. Simpan / Update Follow Up
    const handleSave = async () => {
        if (!task || selectedUserIds.length === 0 || !deadline) {
            showAlert("error", "Validasi Gagal", "Tugas, PIC (minimal 1 orang), dan Deadline wajib diisi.");
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                meeting_id: meetingId,
                task,
                user_id: selectedUserIds, // Mengirimkan Array ID
                deadline,
                priority,
                status,
            };

            const url = selectedId
                ? `http://localhost:5000/api/follow-ups/${selectedId}`
                : "http://localhost:5000/api/follow-ups";
            const method = selectedId ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const result = await res.json();

            if (res.ok) {
                setShowModal(false);
                await fetchFollowUps();
                showAlert("success", "Berhasil!", result.message || "Tindak lanjut berhasil disimpan!");
            } else {
                showAlert("error", "Gagal!", result.message || "Gagal menyimpan data.");
            }
        } catch (err) {
            console.error("Error saving follow up:", err);
            showAlert("error", "Error!", "Koneksi ke server bermasalah.");
        } finally {
            setSubmitting(false);
        }
    };

    // Open Modal Konfirmasi Delete
    const openDeleteModal = (item) => {
        setItemToDelete(item);
        setDeleteError("");
        setShowDeleteModal(true);
    };

    // Eksekusi Hapus Tindak Lanjut
    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;

        setDeleteLoading(true);
        setDeleteError("");

        try {
            const response = await fetch(`http://localhost:5000/api/follow-ups/${itemToDelete.follow_up_id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal menghapus tindak lanjut");
            }

            setShowDeleteModal(false);
            setItemToDelete(null);
            showAlert("success", "Berhasil!", "Berhasil menghapus tindak lanjut!");
            fetchFollowUps();
        } catch (err) {
            setDeleteError(err.message);
            showAlert("error", "Gagal!", err.message || "Gagal menghapus tindak lanjut");
        } finally {
            setDeleteLoading(false);
        }
    };

    // Format Opsi untuk React Select
    const userOptions = users.map((u) => ({
        value: u.user_id,
        label: `${u.name} (${u.email})`,
    }));

    // Custom Styling React Select Sesuai Warna Tema (#2D7A68)
    const customSelectStyles = {
        control: (base, state) => ({
            ...base,
            borderRadius: "8px",
            borderColor: state.isFocused ? "#2D7A68" : "#d1d5db",
            boxShadow: "none",
            outline: "none",
            "&:hover": { borderColor: "#2D7A68" },
            fontSize: isSmallMobile ? "12px" : "13px",
            padding: "2px",
        }),
        multiValue: (base) => ({
            ...base,
            backgroundColor: "#e6f2ef",
            borderRadius: "4px",
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: "#2D7A68",
            fontWeight: "600",
            fontSize: isSmallMobile ? "11px" : "12px",
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: "#2D7A68",
            "&:hover": { backgroundColor: "#2D7A68", color: "#ffffff" },
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected
                ? "#2D7A68"
                : state.isFocused
                    ? "#f0fdf4"
                    : "#ffffff",
            color: state.isSelected ? "#ffffff" : "#374151",
            fontSize: isSmallMobile ? "12px" : "13px",
            cursor: "pointer",
        }),
    };

    const formatTaskText = (text) => {
        if (!text) return "";
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

    const getPriorityBadgeStyle = (p) => {
        switch (p) {
            case "Tinggi": return { backgroundColor: "#fee2e2", color: "#ef4444" };
            case "Sedang": return { backgroundColor: "#fef3c7", color: "#d97706" };
            default: return { backgroundColor: "#e0f2fe", color: "#0284c7" };
        }
    };

    const getStatusBadgeStyle = (s) => {
        switch (s) {
            case "Selesai": return { backgroundColor: "#d1fae5", color: "#059669" };
            case "Dikerjakan": return { backgroundColor: "#e0e7ff", color: "#4f46e5" };
            case "Evaluasi": return { backgroundColor: "#f3e8ff", color: "#9333ea" };
            default: return { backgroundColor: "#f3f4f6", color: "#6b7280" };
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const [year, month, day] = dateString.split("T")[0].split("-");
        return `${day}/${month}/${year}`;
    };

    // Helper merender nama PIC dalam tabel
    const renderPicNames = (item) => {
        if (item.pics && item.pics.length > 0) {
            return (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center" }}>
                    {item.pics.map((pic) => (
                        <span key={pic.user_id} style={{
                            backgroundColor: "#f0fdf4",
                            color: "#2D7A68",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: isSmallMobile ? "10px" : "11px",
                            fontWeight: "600",
                            border: "1px solid #bbf7d0"
                        }}>
                            {pic.name}
                        </span>
                    ))}
                </div>
            );
        }

        if (item.pic?.name) {
            return item.pic.name;
        }

        return "-";
    };

    const styles = {
        container: {
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: isSmallMobile ? "14px" : "20px",
            boxSizing: "border-box",
        },
        topBar: {
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            width: "100%",
            gap: isMobile ? "10px" : "0px",
        },
        btnTambah: {
            backgroundColor: "#2D7A68",
            color: "#ffffff",
            border: "none",
            padding: isSmallMobile ? "8px 16px" : "9px 20px",
            borderRadius: "8px",
            fontSize: isSmallMobile ? "12px" : "13px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            width: isMobile ? "100%" : "auto",
        },
        tableCard: {
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            padding: isSmallMobile ? "10px" : "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            overflowX: "auto",
            width: "100%",
            boxSizing: "border-box",
        },
        table: {
            width: "100%",
            borderCollapse: "collapse",
            fontSize: isSmallMobile ? "12px" : "13px",
            textAlign: "center",
            minWidth: "650px",
        },
        th: {
            padding: "12px 8px",
            color: "#374151",
            fontWeight: 600,
            borderBottom: "1px solid #e5e7eb",
            fontSize: isSmallMobile ? "11px" : "12px",
            textAlign: "center",
            backgroundColor: "#f9fafb",
        },
        td: {
            padding: "12px 8px",
            color: "#4b5563",
            borderBottom: "1px solid #f3f4f6",
        },
        actionBtnGroup: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
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
        },
        modalCard: {
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            width: "90%",
            maxWidth: "520px",
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            overflow: "hidden",
        },
        modalCardFormClean: {
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: isSmallMobile ? "18px" : "24px",
            width: "90%",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        },
        btnCancelClean: {
            padding: isSmallMobile ? "7px 12px" : "8px 16px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            backgroundColor: "#ffffff",
            color: "#374151",
            fontSize: isSmallMobile ? "12px" : "13px",
            fontWeight: 500,
            cursor: "pointer",
        },
        modalHeader: {
            padding: isSmallMobile ? "14px 16px" : "20px 24px 16px 24px",
            borderBottom: "1px solid #f3f4f6",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
        },
        modalTitle: {
            fontSize: isSmallMobile ? "14px" : "16px",
            fontWeight: 700,
            color: "#1f2937",
            margin: 0,
        },
        modalBody: {
            padding: isSmallMobile ? "14px 16px" : "16px 24px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            textAlign: "left",
        },
        label: {
            fontSize: isSmallMobile ? "11px" : "12px",
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
            fontSize: isSmallMobile ? "12px" : "13px",
            boxSizing: "border-box",
            outline: "none",
        },
        textarea: {
            width: "100%",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: isSmallMobile ? "12px" : "13px",
            boxSizing: "border-box",
            minHeight: "70px",
            resize: "vertical",
            fontFamily: "inherit",
            outline: "none",
        },
        modalFooter: {
            padding: isSmallMobile ? "12px 16px" : "16px 24px",
            borderTop: "1px solid #f3f4f6",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
        },
        btnBatal: {
            padding: isSmallMobile ? "7px 16px" : "8px 20px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            backgroundColor: "#ff6b6b",
            color: "#ffffff",
            fontSize: isSmallMobile ? "12px" : "13px",
            fontWeight: 600,
            cursor: "pointer",
        },
        btnSimpan: {
            padding: isSmallMobile ? "7px 16px" : "8px 20px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: "#2D7A68",
            color: "#ffffff",
            fontSize: isSmallMobile ? "12px" : "13px",
            fontWeight: 600,
            cursor: "pointer",
        },
        iconBtnEdit: {
            background: "#fef3c7",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            color: "#d97706",
            padding: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        },
        iconBtnDelete: {
            background: "#fee2e2",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            color: "#ef4444",
            padding: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        },
        alertCard: {
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            width: "90%",
            maxWidth: "380px",
            padding: isSmallMobile ? "24px 18px" : "32px 24px 24px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        },
        alertIconSuccess: {
            width: isSmallMobile ? "52px" : "64px",
            height: isSmallMobile ? "52px" : "64px",
            borderRadius: "50%",
            backgroundColor: "#d1fae5",
            color: "#10b981",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
        },
        alertIconError: {
            width: isSmallMobile ? "52px" : "64px",
            height: isSmallMobile ? "52px" : "64px",
            borderRadius: "50%",
            backgroundColor: "#fee2e2",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "16px",
        },
        alertTitle: {
            fontSize: isSmallMobile ? "17px" : "20px",
            fontWeight: "700",
            color: "#111827",
            marginBottom: "8px",
        },
        alertMessage: {
            fontSize: isSmallMobile ? "13px" : "14px",
            color: "#4b5563",
            marginBottom: "20px",
            lineHeight: "1.4",
        },
        alertButton: {
            width: "100%",
            backgroundColor: "#2D7A68",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            padding: isSmallMobile ? "10px" : "12px",
            fontSize: isSmallMobile ? "13px" : "14px",
            fontWeight: "700",
            cursor: "pointer",
        },
    };

    return (
        <div style={styles.container}>
            {/* Header Action */}
            <div style={styles.topBar}>
                <span style={{ fontSize: isSmallMobile ? "12px" : "14px", fontWeight: 600, color: "#374151" }}>
                    Total Tindak Lanjut: {followUps.length}
                </span>
                <button style={styles.btnTambah} onClick={() => openModal()}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Tambah Tindak Lanjut
                </button>
            </div>

            {/* Tabel Utama: List Follow Ups */}
            <div style={styles.tableCard}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>No</th>
                            <th style={{ ...styles.th }}>Tugas</th>
                            <th style={styles.th}>PIC</th>
                            <th style={styles.th}>Deadline</th>
                            <th style={styles.th}>Prioritas</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="7" style={{ ...styles.td, padding: "30px", color: "#6b7280" }}>
                                    Memuat data tindak lanjut...
                                </td>
                            </tr>
                        ) : followUps.length > 0 ? (
                            followUps.map((item, index) => (
                                <tr key={item.follow_up_id}>
                                    <td style={styles.td}>{index + 1}</td>
                                    <td style={{ ...styles.td, color: "#1f2937", textAlign: "left" }}>
                                        {formatTaskText(item.task)}
                                    </td>
                                    <td style={styles.td}>
                                        {renderPicNames(item)}
                                    </td>
                                    <td style={styles.td}>{formatDate(item.deadline)}</td>
                                    <td style={styles.td}>
                                        <span style={{
                                            padding: "4px 10px",
                                            borderRadius: "12px",
                                            fontSize: isSmallMobile ? "10px" : "11px",
                                            fontWeight: 600,
                                            ...getPriorityBadgeStyle(item.priority)
                                        }}>
                                            {item.priority}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <span style={{
                                            padding: "4px 10px",
                                            borderRadius: "12px",
                                            fontSize: isSmallMobile ? "10px" : "11px",
                                            fontWeight: 600,
                                            ...getStatusBadgeStyle(item.status)
                                        }}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.actionBtnGroup}>
                                            <button
                                                onClick={() => openModal(item)}
                                                style={styles.iconBtnEdit}
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

                                            <button
                                                onClick={() => openDeleteModal(item)}
                                                style={styles.iconBtnDelete}
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
                            <tr>
                                <td colSpan="7" style={{ ...styles.td, padding: "30px", color: "#9ca3af" }}>
                                    Belum ada tindak lanjut untuk rapat ini.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Form Create / Edit */}
            {showModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalCard}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>
                                {selectedId ? "Edit Tindak Lanjut" : "Tambah Tindak Lanjut"}
                            </h3>
                            <span
                                style={{ cursor: "pointer", fontSize: "18px", color: "#9ca3af", fontWeight: "bold" }}
                                onClick={() => setShowModal(false)}
                            >
                                ✕
                            </span>
                        </div>

                        <div style={styles.modalBody}>
                            <div>
                                <label style={styles.label}>Tugas</label>
                                <textarea
                                    style={styles.textarea}
                                    value={task}
                                    onChange={(e) => setTask(e.target.value)}
                                    placeholder="Masukkan rencana tugas..."
                                />
                            </div>

                            {/* Dropdown Multi-Select PIC */}
                            <div>
                                <label style={styles.label}>Penanggung Jawab (PIC)</label>
                                <Select
                                    isMulti
                                    options={userOptions}
                                    styles={customSelectStyles}
                                    placeholder="Cari dan pilih PIC..."
                                    value={userOptions.filter((opt) => selectedUserIds.includes(opt.value))}
                                    onChange={(selected) => {
                                        const ids = selected ? selected.map((item) => item.value) : [];
                                        setSelectedUserIds(ids);
                                    }}
                                />
                            </div>

                            <div>
                                <label style={styles.label}>Deadline</label>
                                <input
                                    type="date"
                                    style={styles.input}
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                />
                            </div>

                            <div style={{ display: "flex", gap: "12px", flexDirection: isSmallMobile ? "column" : "row" }}>
                                <div style={{ flex: 1 }}>
                                    <label style={styles.label}>Prioritas</label>
                                    <select
                                        style={styles.input}
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                    >
                                        <option value="Tinggi">Tinggi</option>
                                        <option value="Sedang">Sedang</option>
                                        <option value="Rendah">Rendah</option>
                                    </select>
                                </div>

                                <div style={{ flex: 1 }}>
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
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button style={styles.btnBatal} onClick={() => setShowModal(false)}>
                                Batal
                            </button>
                            <button style={styles.btnSimpan} onClick={handleSave} disabled={submitting}>
                                {submitting ? "Menyimpan..." : "Simpan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Hapus Custom */}
            {showDeleteModal && (
                <div style={styles.modalOverlay}>
                    <style>{`
                        ::-webkit-scrollbar {
                            display: none;
                        }
                        * {
                            -ms-overflow-style: none;
                            scrollbar-width: none;
                        }
                        .btn-danger-hover:hover {
                            background-color: #b91c1c !important;
                        }
                    `}</style>

                    <div style={{ ...styles.modalCardFormClean, maxWidth: "420px", textAlign: "left" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                            <div style={{
                                backgroundColor: "#fef2f2",
                                padding: "10px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: isSmallMobile ? "15px" : "16px", fontWeight: 600, color: "#111827" }}>
                                    Hapus Tindak Lanjut
                                </h3>
                                <p style={{ margin: "2px 0 0 0", fontSize: isSmallMobile ? "12px" : "13px", color: "#6b7280" }}>
                                    Tindakan ini tidak dapat dibatalkan.
                                </p>
                            </div>
                        </div>

                        <p style={{ fontSize: isSmallMobile ? "13px" : "14px", color: "#374151", lineHeight: 1.5, margin: "12px 0 16px 0" }}>
                            Apakah Anda yakin ingin menghapus tindak lanjut <strong>"{itemToDelete?.task}"</strong>?
                        </p>

                        {deleteError && (
                            <p style={{ color: "#dc2626", fontSize: isSmallMobile ? "12px" : "13px", marginBottom: "12px" }}>
                                {deleteError}
                            </p>
                        )}

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "8px" }}>
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                style={styles.btnCancelClean}
                                disabled={deleteLoading}
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="btn-danger-hover"
                                style={{
                                    backgroundColor: "#dc2626",
                                    color: "#ffffff",
                                    border: "none",
                                    padding: isSmallMobile ? "7px 12px" : "8px 16px",
                                    borderRadius: "6px",
                                    fontSize: isSmallMobile ? "12px" : "13px",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    transition: "background-color 0.2s"
                                }}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? "Menghapus..." : "Ya, Hapus"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Alert Feedback */}
            {alertModal.show && (
                <div style={styles.modalOverlay}>
                    <div style={styles.alertCard}>
                        {alertModal.type === "success" ? (
                            <div style={styles.alertIconSuccess}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                        ) : (
                            <div style={styles.alertIconError}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
        </div>
    );
}