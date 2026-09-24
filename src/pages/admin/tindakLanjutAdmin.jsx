import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Select from "react-select";
import jsPDF from "jspdf";
import logo from "../../assets/logo_kementan.png";

export default function TindakLanjutAdmin() {
    const navigate = useNavigate();
    const location = useLocation();

    // Data Admin terlogin dari localStorage
    const userStored = JSON.parse(localStorage.getItem("user") || "{}");
    const userName = userStored.name || "Admin";
    const token = localStorage.getItem("token");

    // State Utama & Responsivitas Layar
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [followUps, setFollowUps] = useState([]);
    const [users, setUsers] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("Semua");
    const [filterPriority, setFilterPriority] = useState("Semua");

    // State Form Create / Edit Follow-up
    const [showModal, setShowModal] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [meetingId, setMeetingId] = useState("");
    const [task, setTask] = useState("");
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [deadline, setDeadline] = useState("");
    const [priority, setPriority] = useState("Sedang");
    const [status, setStatus] = useState("Belum Mulai");
    const [progress, setProgress] = useState(0);
    const [resultText, setResultText] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // State Modal Riwayat Progress (FollowUpUpdates)
    const [showUpdatesModal, setShowUpdatesModal] = useState(false);
    const [selectedFollowUpForUpdates, setSelectedFollowUpForUpdates] = useState(null);
    const [updatesList, setUpdatesList] = useState([]);
    const [loadingUpdates, setLoadingUpdates] = useState(false);

    // State Delete Modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState("");

    // State Modal Notulensi Integration
    const [showNotulensiModal, setShowNotulensiModal] = useState(false);
    const [activeMeetingForNotulensi, setActiveMeetingForNotulensi] = useState(null);
    const [minuteData, setMinuteData] = useState(null);
    const [minuteDiscussion, setMinuteDiscussion] = useState("");
    const [minuteDecisions, setMinuteDecisions] = useState("");
    const [invitationImgs, setInvitationImgs] = useState([]);
    const [documentationImgs, setDocumentationImgs] = useState([]);
    const [invitationPreviews, setInvitationPreviews] = useState([]);
    const [documentationPreviews, setDocumentationPreviews] = useState([]);

    // State Modal Kamera Web
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [cameraTarget, setCameraTarget] = useState("");
    const [cameraStream, setCameraStream] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // State Alert Modal Feedback
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

    const isMobile = windowWidth <= 768;
    const isSmallMobile = windowWidth <= 480;

    useEffect(() => {
        if (token) {
            fetchAllFollowUps();
            fetchUsers();
            fetchMeetings();
        }
    }, [token]);

    // Fetch Semua Data Tindak Lanjut Rapat
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
                setFollowUps(result.data || []);
            } else {
                showAlert("error", "Gagal!", result.message || "Gagal memuat data tindak lanjut.");
            }
        } catch (err) {
            console.error("Error fetching follow ups admin:", err);
            showAlert("error", "Error!", "Koneksi ke server bermasalah.");
        } finally {
            setLoading(false);
        }
    };

    // Helper untuk Mendapatkan Update Terkini Berdasarkan Waktu ('updated_at')
    const getLatestUpdateRecord = (item) => {
        if (item?.updates && Array.isArray(item.updates) && item.updates.length > 0) {
            const sortedUpdates = [...item.updates].sort((a, b) => {
                return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
            });
            return sortedUpdates[0];
        }
        return null;
    };

    const getLatestProgress = (item) => {
        const latest = getLatestUpdateRecord(item);
        if (latest && latest.progress !== undefined && latest.progress !== null) {
            return latest.progress;
        }
        return item?.progress !== undefined && item?.progress !== null ? item.progress : 0;
    };

    const getLatestResult = (item) => {
        const latest = getLatestUpdateRecord(item);
        if (latest && latest.description) {
            return latest.description;
        }
        return item?.result || "-";
    };

    // Fetch Riwayat Update Progress Spesifik
    const fetchFollowUpUpdates = async (followUpId) => {
        try {
            setLoadingUpdates(true);
            const res = await fetch(`http://localhost:5000/api/follow-up-updates/${followUpId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await res.json();
            if (res.ok) {
                setUpdatesList(result.data || []);
            } else {
                setUpdatesList([]);
            }
        } catch (err) {
            console.error("Error fetching updates:", err);
            setUpdatesList([]);
        } finally {
            setLoadingUpdates(false);
        }
    };

    const handleOpenUpdatesModal = (item) => {
        setSelectedFollowUpForUpdates(item);
        fetchFollowUpUpdates(item.follow_up_id);
        setShowUpdatesModal(true);
    };

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

    const fetchMeetings = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/meetings", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await res.json();
            if (res.ok) setMeetings(result.data || []);
        } catch (err) {
            console.error("Error fetching meetings:", err);
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
            setMeetingId(data.meeting_id || data.meeting?.meeting_id || "");
            setTask(data.task || "");

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
            } else if (data.pics && Array.isArray(data.pics)) {
                userIds = data.pics.map((p) => p.user_id);
            }
            setSelectedUserIds(userIds);

            setDeadline(data.deadline ? data.deadline.split("T")[0] : "");
            setPriority(data.priority || "Sedang");
            setStatus(data.status || "Belum Mulai");
            setProgress(getLatestProgress(data));
            setResultText(getLatestResult(data) !== "-" ? getLatestResult(data) : "");
        } else {
            setSelectedId(null);
            setMeetingId("");
            setTask("");
            setSelectedUserIds([]);
            setDeadline("");
            setPriority("Sedang");
            setStatus("Belum Mulai");
            setProgress(0);
            setResultText("");
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!meetingId || !task || selectedUserIds.length === 0 || !deadline) {
            showAlert("error", "Validasi Gagal", "Pilihan Rapat, Tugas, PIC (minimal 1 orang), dan Deadline wajib diisi.");
            return;
        }

        try {
            setSubmitting(true);
            const payload = {
                meeting_id: Number(meetingId),
                task,
                user_id: selectedUserIds,
                deadline,
                priority,
                status,
                progress: Number(progress),
                result: resultText,
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
                await fetchAllFollowUps();
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

    const openDeleteModal = (item) => {
        setItemToDelete(item);
        setDeleteError("");
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;

        setDeleteLoading(true);
        setDeleteError("");

        try {
            const response = await fetch(`http://localhost:5000/api/follow-ups/${itemToDelete.follow_up_id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal menghapus tindak lanjut");
            }

            setShowDeleteModal(false);
            setItemToDelete(null);
            showAlert("success", "Berhasil!", "Berhasil menghapus tindak lanjut!");
            fetchAllFollowUps();
        } catch (err) {
            setDeleteError(err.message);
            showAlert("error", "Gagal!", err.message || "Gagal menghapus tindak lanjut");
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleOpenNotulensiModal = async (item) => {
        const mId = item.meeting_id || item.meeting?.meeting_id;
        if (!mId) {
            showAlert("error", "Gagal", "ID Rapat tidak ditemukan.");
            return;
        }

        setActiveMeetingForNotulensi(item.meeting || item);
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:5000/api/minutes/meeting/${mId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await response.json();

            if (response.ok && result.data) {
                setMinuteData(result.data);
                setMinuteDiscussion(result.data.discussion || "");
                setMinuteDecisions(result.data.decisions || "");
                setInvitationPreviews(parseImages(result.data.invitation_img));
                setDocumentationPreviews(parseImages(result.data.documentation_img));
            } else {
                setMinuteData(null);
                setMinuteDiscussion("");
                setMinuteDecisions("");
                setInvitationPreviews([]);
                setDocumentationPreviews([]);
            }
            setShowNotulensiModal(true);
        } catch (err) {
            console.error("Error fetching minute data:", err);
            showAlert("error", "Error!", "Gagal memuat data notulensi rapat.");
        } finally {
            setLoading(false);
        }
    };

    const parseImages = (imageData) => {
        if (!imageData) return [];
        if (Array.isArray(imageData)) return imageData.map(formatImageUrl);
        if (typeof imageData === "string") {
            try {
                const parsed = JSON.parse(imageData);
                if (Array.isArray(parsed)) return parsed.map(formatImageUrl);
            } catch (e) {
                return [formatImageUrl(imageData)];
            }
        }
        return [];
    };

    const formatImageUrl = (url) => {
        if (!url) return "";
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
            return url;
        }
        return `http://localhost:5000/${url.replace(/\\/g, "/")}`;
    };

    const getBase64ImageFromUrl = (imageUrl) => {
        return new Promise((resolve, reject) => {
            if (imageUrl.startsWith("data:")) return resolve(imageUrl);
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
            img.onerror = (err) => reject(err);
        });
    };

    const handleSaveNotulensi = async () => {
        if (!minuteDiscussion || !minuteDecisions) {
            showAlert("error", "Validasi Gagal", "Deskripsi notulensi dan keputusan rapat wajib diisi.");
            return;
        }

        const mId = activeMeetingForNotulensi?.meeting_id;
        try {
            setSubmitting(true);
            const formData = new FormData();
            formData.append("meeting_id", mId);
            formData.append("discussion", minuteDiscussion);
            formData.append("decisions", minuteDecisions);

            invitationImgs.forEach((file) => formData.append("invitation_img", file));
            documentationImgs.forEach((file) => formData.append("documentation_img", file));

            const isEdit = !!minuteData;
            const url = isEdit
                ? `http://localhost:5000/api/minutes/${minuteData.minutes_id}`
                : "http://localhost:5000/api/minutes";

            const response = await fetch(url, {
                method: isEdit ? "PUT" : "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                setShowNotulensiModal(false);
                setInvitationImgs([]);
                setDocumentationImgs([]);
                showAlert("success", "Berhasil!", result.message || "Notulensi berhasil disimpan!");
            } else {
                showAlert("error", "Gagal!", result.message || "Gagal menyimpan notulensi.");
            }
        } catch (error) {
            console.error("Error saving minute:", error);
            showAlert("error", "Error!", "Terjadi kesalahan koneksi server.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleExportPDF = async () => {
        try {
            if (!minuteData) {
                showAlert("error", "Export Gagal", "Belum ada data notulensi untuk diekspor.");
                return;
            }

            const activeMeeting = activeMeetingForNotulensi || {};
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const startX = 20;
            const endX = 190;
            const contentWidth = endX - startX;
            const pageHeight = doc.internal.pageSize.getHeight();
            let currentY = 15;

            try {
                const base64Logo = await getBase64ImageFromUrl(logo);
                doc.addImage(base64Logo, "PNG", startX, currentY, 13, 13);
            } catch (e) {
                console.warn("Logo tidak dimuat:", e);
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("BALAI VETERINER BUKITTINGGI", (startX + endX) / 2, currentY + 4, { align: "center" });
            doc.setFontSize(10);
            doc.text("NOTULEN RAPAT", (startX + endX) / 2, currentY + 9, { align: "center" });

            currentY += 18;

            const formatDateStr = (dateStr) => {
                if (!dateStr) return "-";
                return new Date(dateStr).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                });
            };

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            doc.text("Hari/Tanggal", startX, currentY);
            doc.text(`:  ${formatDateStr(activeMeeting.date)}`, startX + 30, currentY);

            currentY += 5;
            doc.text("Tempat", startX, currentY);
            doc.text(`:  ${activeMeeting.location || activeMeeting.room || "-"}`, startX + 30, currentY);

            currentY += 5;
            doc.text("Topik", startX, currentY);
            doc.text(`:  ${activeMeeting.title || activeMeeting.agenda || "-"}`, startX + 30, currentY);

            currentY += 4;
            doc.setLineWidth(0.7);
            doc.line(startX, currentY, endX, currentY);
            doc.setLineWidth(0.2);
            doc.line(startX, currentY + 0.8, endX, currentY + 0.8);

            currentY += 8;

            const checkAddPage = (neededHeight) => {
                if (currentY + neededHeight > pageHeight - 15) {
                    doc.addPage();
                    currentY = 20;
                }
            };

            checkAddPage(20);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.5);
            doc.text("Deskripsi Notulensi", startX, currentY);
            currentY += 5;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            const discText = minuteData.discussion || "-";
            const discLines = doc.splitTextToSize(discText, contentWidth);
            checkAddPage(discLines.length * 4.5);
            doc.text(discText, startX, currentY, { align: "justify", maxWidth: contentWidth });
            currentY += discLines.length * 4.5 + 6;

            checkAddPage(20);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.5);
            doc.text("Keputusan Rapat", startX, currentY);
            currentY += 5;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            const decText = minuteData.decisions || "-";
            const decLines = doc.splitTextToSize(decText, contentWidth);
            checkAddPage(decLines.length * 4.5);
            doc.text(decText, startX, currentY, { align: "justify", maxWidth: contentWidth });
            currentY += decLines.length * 4.5 + 6;

            const renderPDFImages = async (title, imgList) => {
                checkAddPage(20);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.text(title, startX, currentY);
                currentY += 5;

                if (imgList.length === 0) {
                    doc.setFont("helvetica", "italic");
                    doc.setFontSize(9);
                    doc.text("Tidak ada foto.", startX, currentY);
                    currentY += 8;
                    return;
                }

                const imgW = 80;
                const imgH = 55;
                const gap = 10;

                for (let i = 0; i < imgList.length; i++) {
                    const col = i % 2;
                    if (col === 0 && i !== 0) currentY += imgH + 6;
                    checkAddPage(imgH + 10);
                    const xPos = startX + col * (imgW + gap);
                    try {
                        const b64 = await getBase64ImageFromUrl(imgList[i]);
                        const fmt = b64.startsWith("data:image/png") ? "PNG" : "JPEG";
                        doc.addImage(b64, fmt, xPos, currentY, imgW, imgH);
                    } catch (err) {
                        doc.rect(xPos, currentY, imgW, imgH);
                        doc.text("Gagal muat gambar", xPos + 20, currentY + 25);
                    }
                }
                currentY += imgH + 10;
            };

            await renderPDFImages("Undangan", parseImages(minuteData.invitation_img));
            await renderPDFImages("Dokumentasi", parseImages(minuteData.documentation_img));

            const fileName = `Notulensi Rapat - ${activeMeeting.meeting_code || "Admin"}.pdf`;
            const pdfBlob = doc.output("blob");
            const blobUrl = URL.createObjectURL(pdfBlob);

            const previewWin = window.open("", "_blank");
            if (previewWin) {
                previewWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head><title>${fileName}</title></head>
            <body style="margin:0;background:#525659;"><iframe src="${blobUrl}" style="width:100%;height:100vh;border:none;"></iframe></body>
          </html>
        `);
                previewWin.document.close();
            }
        } catch (err) {
            console.error("PDF Export Error:", err);
            showAlert("error", "Error PDF", "Gagal mengekspor PDF.");
        }
    };

    const handleFileChange = (e, type) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            const newPreviews = files.map((file) => URL.createObjectURL(file));
            if (type === "invitation") {
                setInvitationImgs((prev) => [...prev, ...files]);
                setInvitationPreviews((prev) => [...prev, ...newPreviews]);
            } else {
                setDocumentationImgs((prev) => [...prev, ...files]);
                setDocumentationPreviews((prev) => [...prev, ...newPreviews]);
            }
        }
    };

    const handleStartCamera = async (target) => {
        setCameraTarget(target);
        setShowCameraModal(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setCameraStream(stream);
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) {
            showAlert("error", "Kamera Error", "Tidak dapat mengakses kamera.");
            setShowCameraModal(false);
        }
    };

    const handleCapturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
                const previewUrl = URL.createObjectURL(file);
                if (cameraTarget === "invitation") {
                    setInvitationImgs((prev) => [...prev, file]);
                    setInvitationPreviews((prev) => [...prev, previewUrl]);
                } else {
                    setDocumentationImgs((prev) => [...prev, file]);
                    setDocumentationPreviews((prev) => [...prev, previewUrl]);
                }
                handleStopCamera();
            }, "image/jpeg");
        }
    };

    const handleStopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach((track) => track.stop());
            setCameraStream(null);
        }
        setShowCameraModal(false);
    };

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
            console.error("Logout server error:", error);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/", { replace: true });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const cleanDate = dateString.split("T")[0];
        const [year, month, day] = cleanDate.split("-");
        return `${day}/${month}/${year}`;
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "-";
        const dateObj = new Date(dateString);
        return dateObj.toLocaleString("id-ID", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

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

    const renderPicNames = (item) => {
        if (item.pics && item.pics.length > 0) {
            return (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center" }}>
                    {item.pics.map((pic) => (
                        <span
                            key={pic.user_id}
                            style={{
                                backgroundColor: "#f0fdf4",
                                color: "#2D7A68",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: isSmallMobile ? "10px" : "11px",
                                fontWeight: "600",
                                border: "1px solid #bbf7d0",
                            }}
                        >
                            {pic.name}
                        </span>
                    ))}
                </div>
            );
        }

        if (item.user?.name) return item.user.name;
        return "-";
    };

    const userOptions = users.map((u) => ({
        value: u.user_id,
        label: `${u.name} (${u.email})`,
    }));

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

    const filteredFollowUps = followUps.filter((item) => {
        const meetingTitle = item.meeting?.title || "";
        const meetingCode = item.meeting?.meeting_code || "";
        const taskText = item.task || "";
        const picNames = (item.pics || []).map((p) => p.name).join(" ") || item.user?.name || "";

        const matchesSearch =
            meetingTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
            meetingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            taskText.toLowerCase().includes(searchQuery.toLowerCase()) ||
            picNames.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = filterStatus === "Semua" || item.status === filterStatus;
        const matchesPriority = filterPriority === "Semua" || item.priority === filterPriority;

        return matchesSearch && matchesStatus && matchesPriority;
    });

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

    const getProgressBadgeStyle = (val) => {
        const num = Number(val) || 0;
        if (num >= 100) return { backgroundColor: "#d1fae5", color: "#059669" };
        if (num >= 50) return { backgroundColor: "#e0e7ff", color: "#4f46e5" };
        if (num > 0) return { backgroundColor: "#fef3c7", color: "#d97706" };
        return { backgroundColor: "#f3f4f6", color: "#6b7280" };
    };

    // Styling Objek dengan Kondisional Layout Filter (Web: Berjejer Horizontal | HP: Menumpuk Vertikal)
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
            fontSize: "0.875rem", // Gunakan fixed size agar konsisten di semua tab (atau gunakan clamp jika benar-benar butuh responsif)
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis", // Memberikan tanda titik-titik (...) jika nama terlalu panjang
            maxWidth: "150px", // Membatasi lebar maksimal agar tidak merusak layout tab
            display: "inline-block",
            verticalAlign: "middle",
            lineHeight: "1.2",
            fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif",
        },
        logoutBtn: {
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            color: "#ffffff",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            padding: isSmallMobile ? "4px 8px" : "6px 12px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: isSmallMobile ? "11px" : "13px",
            fontWeight: 500,
            marginLeft: isSmallMobile ? "6px" : "12px",
        },
        avatarCircle: {
            width: isSmallMobile ? "28px" : "32px",
            height: isSmallMobile ? "28px" : "32px",
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            color: "#2D7A68",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            fontSize: isSmallMobile ? "12px" : "14px",
        },
        headerNav: {
            maxWidth: "1280px",
            margin: "0 auto",
            padding: isMobile ? "0 16px" : "0 24px",
            display: "flex",
            gap: isMobile ? "16px" : "32px",
            overflowX: "auto",
            boxSizing: "border-box",
        },
        navLinkActive: {
            padding: "8px 0",
            color: "#ffffff",
            fontWeight: 700,
            borderBottom: "2px solid #ffffff",
            fontSize: isSmallMobile ? "12px" : isMobile ? "13px" : "14px",
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
            fontSize: isSmallMobile ? "12px" : isMobile ? "13px" : "14px",
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
            padding: isSmallMobile ? "12px" : isMobile ? "16px" : "24px",
            display: "flex",
            flexDirection: "column",
            gap: isSmallMobile ? "14px" : "20px",
            boxSizing: "border-box",
        },
        topBar: {
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            width: "100%",
            gap: isMobile ? "10px" : "0px",
        },
        btnTambah: {
            backgroundColor: "#2D7A68",
            color: "#ffffff",
            border: "none",
            padding: isSmallMobile ? "8px 14px" : "9px 20px",
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
        /* Card Filter Utama */
        filterCard: {
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: isSmallMobile ? "14px" : "18px 22px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? "12px" : "16px",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            width: "100%",
            boxSizing: "border-box",
        },
        searchInput: {
            padding: "9px 14px 9px 38px",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
            fontSize: isSmallMobile ? "12px" : "13px",
            width: "100%",
            outline: "none",
            boxSizing: "border-box",
            color: "#374151",
        },
        filterSelect: {
            padding: "8px 12px",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
            fontSize: isSmallMobile ? "12px" : "13px",
            outline: "none",
            backgroundColor: "#ffffff",
            color: "#374151",
            cursor: "pointer",
            width: isMobile ? "100%" : "auto",
        },
        sectionTitle: {
            fontSize: isSmallMobile ? "14px" : "16px",
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
            padding: isSmallMobile ? "12px" : isMobile ? "16px" : "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            border: "1px solid #f3f4f6",
            overflowX: "auto",
            width: "100%",
            boxSizing: "border-box",
        },
        table: {
            width: "100%",
            borderCollapse: "collapse",
            fontSize: isSmallMobile ? "11px" : "13px",
            textAlign: "center",
            minWidth: "900px",
        },
        th: {
            padding: "12px 8px",
            color: "#374151",
            fontWeight: 600,
            borderBottom: "1px solid #e5e7eb",
            fontSize: isSmallMobile ? "11px" : "12px",
            backgroundColor: "#ffffff",
        },
        td: {
            padding: "14px 8px",
            color: "#4b5563",
            borderBottom: "1px solid #f3f4f6",
            verticalAlign: "middle",
        },
        actionBtnGroup: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
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
        btnNotulensi: {
            color: "#2563eb",
            textDecoration: "underline",
            cursor: "pointer",
            fontWeight: 600,
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
            padding: isSmallMobile ? "16px" : "24px",
            width: "90%",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        },
        btnCancelClean: {
            padding: isSmallMobile ? "6px 12px" : "8px 16px",
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
            outline: "none",
            fontFamily: "inherit",
            minHeight: "70px",
            resize: "vertical",
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
        footer: {
            backgroundColor: "#2D7A68",
            color: "#ffffff",
            padding: "12px",
            textAlign: "center",
            fontSize: isSmallMobile ? "11px" : "12px",
            marginTop: "auto",
        },
    };

    return (
        <div style={styles.container}>
            {/* Header Admin */}
            <header style={styles.header}>
                <div style={styles.headerTop}>
                    <div style={styles.brandBox}>
                        <img
                            src={logo}
                            alt="Logo"
                            style={styles.logo}
                            onError={(e) => (e.target.style.display = "none")}
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
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            {!isMobile && <span>Logout</span>}
                        </button>
                    </div>
                </div>

                {/* Tab Navigation Menu Admin */}
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

            {/* Main Content Area */}
            <main style={styles.main}>
                {/* Filter Controls - RESPONSIF (HP: Menumpuk Mengikuti Gambar | Web: Berjejer Menyamping) */}
                <div style={styles.filterCard}>
                    {/* Input Cari Rapat */}
                    <div style={{ position: "relative", flex: 1, minWidth: isMobile ? "100%" : "260px" }}>
                        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", display: "flex", alignItems: "center", pointerEvents: "none" }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Cari berdasarkan tugas, kode/judul rapat, atau nama PIC..."
                            style={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Filter Status */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", width: isMobile ? "100%" : "auto" }}>
                        <span style={{ fontSize: "13px", color: "#6b7280", minWidth: isMobile ? "65px" : "auto" }}>Status:</span>
                        <select
                            style={{ ...styles.filterSelect, flex: isMobile ? 1 : "initial" }}
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="Semua">Semua Status</option>
                            <option value="Belum Mulai">Belum Mulai</option>
                            <option value="Dikerjakan">Dikerjakan</option>
                            <option value="Evaluasi">Evaluasi</option>
                            <option value="Selesai">Selesai</option>
                        </select>
                    </div>

                    {/* Filter Prioritas */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", width: isMobile ? "100%" : "auto" }}>
                        <span style={{ fontSize: "13px", color: "#6b7280", minWidth: isMobile ? "65px" : "auto" }}>Prioritas:</span>
                        <select
                            style={{ ...styles.filterSelect, flex: isMobile ? 1 : "initial" }}
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                        >
                            <option value="Semua">Semua Prioritas</option>
                            <option value="Tinggi">Tinggi</option>
                            <option value="Sedang">Sedang</option>
                            <option value="Rendah">Rendah</option>
                        </select>
                    </div>
                </div>

                {/* Top Action Bar */}
                <div style={styles.topBar}>
                    <span style={{ fontSize: isSmallMobile ? "12px" : "14px", fontWeight: 600, color: "#374151" }}>
                        Total Tindak Lanjut: {filteredFollowUps.length}
                    </span>
                </div>

                {/* Tabel Rekap Tindak Lanjut Admin */}
                <div style={styles.tableCard}>
                    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? "10px" : "0", marginBottom: "16px" }}>
                        <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Semua Tindak Lanjut Rapat</h2>
                        <button style={styles.btnTambah} onClick={() => openModal()}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Tambah Tindak Lanjut
                        </button>
                    </div>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>No</th>
                                <th style={styles.th}>Kode Rapat</th>
                                <th style={styles.th}>Tugas</th>
                                <th style={styles.th}>Judul Rapat</th>
                                <th style={styles.th}>PIC</th>
                                <th style={styles.th}>Deadline</th>
                                <th style={styles.th}>Prioritas</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Progres</th>
                                <th style={styles.th}>Hasil</th>
                                <th style={styles.th}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="12" style={{ ...styles.td, padding: "30px", color: "#6b7280" }}>
                                        Memuat seluruh data tindak lanjut...
                                    </td>
                                </tr>
                            ) : filteredFollowUps.length > 0 ? (
                                filteredFollowUps.map((item, index) => {
                                    const currentProgress = getLatestProgress(item);
                                    const currentResult = getLatestResult(item);

                                    return (
                                        <tr key={item.follow_up_id || index}>
                                            <td style={styles.td}>{index + 1}</td>
                                            <td style={{ ...styles.td, fontFamily: "monospace", fontSize: "11px", textAlign: "center" }}>
                                                {item.meeting?.meeting_code || "-"}
                                            </td>
                                            <td style={{ ...styles.td, color: "#1f2937", textAlign: "left", fontWeight: 500 }}>
                                                {formatTaskText(item.task)}
                                            </td>
                                            <td style={{ ...styles.td, textAlign: "left", color: "#4b5563" }}>
                                                {item.meeting?.title || "-"}
                                            </td>
                                            <td style={styles.td}>
                                                {renderPicNames(item)}
                                            </td>
                                            <td style={styles.td}>{formatDate(item.deadline)}</td>
                                            <td style={styles.td}>
                                                <span
                                                    style={{
                                                        padding: "4px 10px",
                                                        borderRadius: "12px",
                                                        fontSize: isSmallMobile ? "10px" : "11px",
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
                                                        fontSize: isSmallMobile ? "10px" : "11px",
                                                        fontWeight: 600,
                                                        ...getStatusBadgeStyle(item.status),
                                                    }}
                                                >
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td style={styles.td}>
                                                <span
                                                    onClick={() => handleOpenUpdatesModal(item)}
                                                    title="Klik untuk melihat riwayat progress"
                                                    style={{
                                                        padding: "4px 10px",
                                                        borderRadius: "12px",
                                                        fontSize: isSmallMobile ? "10px" : "11px",
                                                        fontWeight: 600,
                                                        cursor: "pointer",
                                                        ...getProgressBadgeStyle(currentProgress),
                                                    }}
                                                >
                                                    {`${currentProgress}%`}
                                                </span>
                                            </td>
                                            <td style={{ ...styles.td, textAlign: "left", color: "#4b5563" }}>
                                                {currentResult}
                                            </td>
                                            <td style={styles.td}>
                                                <div style={styles.actionBtnGroup}>
                                                    <button
                                                        style={styles.iconBtnEdit}
                                                        onClick={() => openModal(item)}
                                                        title="Edit Tindak Lanjut"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                    </button>

                                                    <button
                                                        style={styles.iconBtnDelete}
                                                        onClick={() => openDeleteModal(item)}
                                                        title="Hapus Tindak Lanjut"
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
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="12" style={{ ...styles.td, padding: "30px", color: "#9ca3af" }}>
                                        Tidak ada data tindak lanjut rapat yang ditemukan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

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
                                <label style={styles.label}>Pilih Rapat</label>
                                <select
                                    style={styles.input}
                                    value={meetingId}
                                    onChange={(e) => setMeetingId(e.target.value)}
                                >
                                    <option value="">-- Pilih Rapat --</option>
                                    {meetings.map((m) => (
                                        <option key={m.meeting_id} value={m.meeting_id}>
                                            {m.meeting_code ? `[${m.meeting_code}] ` : ""}{m.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

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

            {/* Modal Detail Riwayat Progress (FollowUpUpdate) */}
            {showUpdatesModal && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modalCard, maxWidth: "600px" }}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Riwayat Progress Tindak Lanjut</h3>
                            <span
                                style={{ cursor: "pointer", fontSize: "18px", color: "#9ca3af", fontWeight: "bold" }}
                                onClick={() => setShowUpdatesModal(false)}
                            >
                                ✕
                            </span>
                        </div>
                        <div style={styles.modalBody}>
                            <p style={{ margin: 0, fontSize: isSmallMobile ? "12px" : "13px", color: "#4b5563" }}>
                                Tugas: <strong>{selectedFollowUpForUpdates?.task}</strong>
                            </p>

                            <div style={{ overflowX: "auto", width: "100%" }}>
                                <table style={{ ...styles.table, marginTop: "12px", minWidth: "450px" }}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>Waktu Update</th>
                                            <th style={styles.th}>Pengupdate</th>
                                            <th style={styles.th}>Status</th>
                                            <th style={styles.th}>Progress</th>
                                            <th style={styles.th}>Catatan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingUpdates ? (
                                            <tr>
                                                <td colSpan="5" style={styles.td}>Memuat riwayat...</td>
                                            </tr>
                                        ) : updatesList.length > 0 ? (
                                            updatesList.map((up) => (
                                                <tr key={up.update_id}>
                                                    <td style={styles.td}>{formatDateTime(up.updated_at)}</td>
                                                    <td style={styles.td}>{up.user?.name || "User"}</td>
                                                    <td style={styles.td}>{up.status}</td>
                                                    <td style={styles.td}>{up.progress}%</td>
                                                    <td style={{ ...styles.td, textAlign: "left" }}>{up.description || "-"}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" style={styles.td}>Belum ada riwayat update.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div style={styles.modalFooter}>
                            <button style={styles.btnCancelClean} onClick={() => setShowUpdatesModal(false)}>
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Hapus */}
            {showDeleteModal && (
                <div style={styles.modalOverlay}>
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
                                style={{
                                    backgroundColor: "#dc2626",
                                    color: "#ffffff",
                                    border: "none",
                                    padding: isSmallMobile ? "7px 12px" : "8px 16px",
                                    borderRadius: "6px",
                                    fontSize: isSmallMobile ? "12px" : "13px",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                }}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? "Menghapus..." : "Ya, Hapus"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Kelola / Input Notulensi Rapat */}
            {showNotulensiModal && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modalCard, maxWidth: "640px" }}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>
                                {minuteData ? "Edit Notulensi Rapat" : "Tambah Notulensi Rapat"}
                            </h3>
                            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                {minuteData && (
                                    <button style={styles.btnNotulensi} onClick={handleExportPDF}>
                                        📥 PDF
                                    </button>
                                )}
                                <span
                                    style={{ cursor: "pointer", fontSize: "18px", color: "#9ca3af", fontWeight: "bold" }}
                                    onClick={() => setShowNotulensiModal(false)}
                                >
                                    ✕
                                </span>
                            </div>
                        </div>

                        <div style={styles.modalBody}>
                            <div>
                                <label style={styles.label}>Topik / Rapat</label>
                                <input
                                    type="text"
                                    style={{ ...styles.input, backgroundColor: "#f3f4f6" }}
                                    value={activeMeetingForNotulensi?.title || activeMeetingForNotulensi?.agenda || "-"}
                                    disabled
                                />
                            </div>

                            <div>
                                <label style={styles.label}>Deskripsi Notulensi Rapat</label>
                                <textarea
                                    style={styles.textarea}
                                    placeholder="Masukkan deskripsi atau pembahasan rapat..."
                                    value={minuteDiscussion}
                                    onChange={(e) => setMinuteDiscussion(e.target.value)}
                                />
                            </div>

                            <div>
                                <label style={styles.label}>Keputusan Rapat</label>
                                <textarea
                                    style={styles.textarea}
                                    placeholder="Masukkan keputusan yang dihasilkan..."
                                    value={minuteDecisions}
                                    onChange={(e) => setMinuteDecisions(e.target.value)}
                                />
                            </div>

                            {/* Upload Undangan */}
                            <div>
                                <label style={styles.label}>Upload Undangan</label>
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <label style={{ ...styles.btnBatal, backgroundColor: "#ffffff", color: "#374151" }}>
                                        📁 Pilih File
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            style={{ display: "none" }}
                                            onChange={(e) => handleFileChange(e, "invitation")}
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        style={{ ...styles.btnBatal, backgroundColor: "#ffffff", color: "#374151" }}
                                        onClick={() => handleStartCamera("invitation")}
                                    >
                                        📷 Kamera
                                    </button>
                                </div>
                                {invitationPreviews.length > 0 && (
                                    <div style={{ display: "flex", gap: "8px", marginTop: "8px", overflowX: "auto" }}>
                                        {invitationPreviews.map((url, idx) => (
                                            <img
                                                key={idx}
                                                src={url}
                                                alt="Preview"
                                                style={{ width: "60px", height: "60px", borderRadius: "6px", objectFit: "cover" }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Upload Dokumentasi */}
                            <div>
                                <label style={styles.label}>Upload Dokumentasi</label>
                                <div style={{ display: "flex", gap: "10px" }}>
                                    <label style={{ ...styles.btnBatal, backgroundColor: "#ffffff", color: "#374151" }}>
                                        📁 Pilih File
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            style={{ display: "none" }}
                                            onChange={(e) => handleFileChange(e, "documentation")}
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        style={{ ...styles.btnBatal, backgroundColor: "#ffffff", color: "#374151" }}
                                        onClick={() => handleStartCamera("documentation")}
                                    >
                                        📷 Kamera
                                    </button>
                                </div>
                                {documentationPreviews.length > 0 && (
                                    <div style={{ display: "flex", gap: "8px", marginTop: "8px", overflowX: "auto" }}>
                                        {documentationPreviews.map((url, idx) => (
                                            <img
                                                key={idx}
                                                src={url}
                                                alt="Preview"
                                                style={{ width: "60px", height: "60px", borderRadius: "6px", objectFit: "cover" }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button style={styles.btnBatal} onClick={() => setShowNotulensiModal(false)}>
                                Batal
                            </button>
                            <button style={styles.btnSimpan} onClick={handleSaveNotulensi} disabled={submitting}>
                                {submitting ? "Menyimpan..." : "Simpan Notulensi"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Capture Kamera */}
            {showCameraModal && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modalCard, maxWidth: "420px" }}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Ambil Foto Kamera</h3>
                            <span
                                style={{ cursor: "pointer", fontSize: "18px", color: "#9ca3af", fontWeight: "bold" }}
                                onClick={handleStopCamera}
                            >
                                ✕
                            </span>
                        </div>
                        <div style={{ ...styles.modalBody, alignItems: "center" }}>
                            <video ref={videoRef} autoPlay playsInline style={{ width: "100%", borderRadius: "8px" }} />
                            <canvas ref={canvasRef} style={{ display: "none" }} />
                        </div>
                        <div style={styles.modalFooter}>
                            <button style={styles.btnBatal} onClick={handleStopCamera}>
                                Batal
                            </button>
                            <button style={styles.btnSimpan} onClick={handleCapturePhoto}>
                                Ambil Foto
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Feedback Modal Alert */}
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

            {/* Logout Modal */}
            {showLogoutModal && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modalCard, maxWidth: "340px", textAlign: "center" }}>
                        <div style={{ padding: isSmallMobile ? "18px" : "24px" }}>
                            <h3 style={{ margin: "0 0 12px 0", fontSize: isSmallMobile ? "16px" : "18px" }}>Konfirmasi Logout</h3>
                            <p style={{ margin: 0, fontSize: isSmallMobile ? "12px" : "13px", color: "#4b5563" }}>
                                Apakah Anda yakin ingin keluar dari aplikasi?
                            </p>
                        </div>
                        <div style={styles.modalFooter}>
                            <button style={styles.btnBatal} onClick={() => setShowLogoutModal(false)}>
                                Batal
                            </button>
                            <button style={styles.btnSimpan} onClick={executeLogout}>
                                Ya, Keluar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer style={styles.footer}>© 2026 BVet Bukittinggi. All rights reserved.</footer>
        </div>
    );
}