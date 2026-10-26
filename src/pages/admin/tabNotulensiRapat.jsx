import React, { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import logo from "../../assets/logo_kementan.png";

export default function TabNotulensiRapat({ meetingId, meetingData }) {
    // State Window Width untuk Responsivitas Layar
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const isMobile = windowWidth <= 768;
    const isSmallMobile = windowWidth <= 480;

    // State Data Notulensi
    const [minuteData, setMinuteData] = useState(null);
    const [loading, setLoading] = useState(true);

    // State Data Detail Rapat Lokal
    const [localMeetingData, setLocalMeetingData] = useState(meetingData || null);

    // State Form Notulensi
    const [discussion, setDiscussion] = useState("");
    const [decisions, setDecisions] = useState("");
    const [invitationImgs, setInvitationImgs] = useState([]); // Array of File
    const [documentationImgs, setDocumentationImgs] = useState([]); // Array of File

    // State Preview Gambar
    const [invitationPreviews, setInvitationPreviews] = useState([]);
    const [documentationPreviews, setDocumentationPreviews] = useState([]);

    // State Nama Notulis (Lokal / LocalStorage)
    const [notulisName, setNotulisName] = useState(() => {
        const saved = localStorage.getItem(`notulis_${meetingId}`);
        return saved || "";
    });
    const [showNotulisModal, setShowNotulisModal] = useState(false);
    const [tempNotulisName, setTempNotulisName] = useState("");

    // State Modal Form & Modal Alert
    const [showFormModal, setShowFormModal] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [alertModal, setAlertModal] = useState({
        show: false,
        type: "success",
        title: "",
        message: "",
    });

    // State Modal Kamera Web
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [cameraTarget, setCameraTarget] = useState(""); // 'invitation' | 'documentation'
    const [cameraStream, setCameraStream] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const token = localStorage.getItem("token");

    // Sync state localMeetingData saat prop meetingData berubah
    useEffect(() => {
        if (meetingData) {
            setLocalMeetingData(meetingData);
        }
    }, [meetingData]);

    useEffect(() => {
        if (meetingId) {
            fetchInitialData();
        }
    }, [meetingId]);

    // HELPER: Cek Apakah Notulensi Masih Boleh Di-edit (Batas Akses 2 Minggu / 14 Hari dari Tgl Rapat)
    const isEditable = () => {
        const activeMeeting = meetingData || localMeetingData;
        if (!activeMeeting || !activeMeeting.date) return true;

        const meetingDate = new Date(activeMeeting.date);
        const currentDate = new Date();

        // Hitung selisih waktu dalam milidetik dan konversi ke hari
        const diffTime = currentDate - meetingDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        // Jika selisih hari sudah lebih dari 14 hari (2 minggu), kunci edit
        return diffDays <= 14;
    };

    // Fetch Data Notulensi & Rapat
    const fetchInitialData = async () => {
        try {
            setLoading(true);

            const headers = {
                Authorization: `Bearer ${token}`,
            };

            // Fetch detail rapat jika belum ada dari parent
            if (!meetingData) {
                const resMeeting = await fetch(`http://localhost:5000/api/meetings/${meetingId}`, { headers });
                const dataMeeting = await resMeeting.json();
                if (resMeeting.ok && dataMeeting.data) {
                    setLocalMeetingData(dataMeeting.data);
                }
            }

            // Fetch Notulensi
            const response = await fetch(`http://localhost:5000/api/minutes/meeting/${meetingId}`, { headers });
            const result = await response.json();

            if (response.ok && result.data) {
                setMinuteData(result.data);
                setDiscussion(result.data.discussion || "");
                setDecisions(result.data.decisions || "");
            } else {
                setMinuteData(null);
            }
        } catch (err) {
            console.error("Error fetching minute data:", err);
            showAlert("error", "Error!", "Gagal memuat data notulensi.");
        } finally {
            setLoading(false);
        }
    };

    // Handler Modal Input Nama Notulis
    const handleOpenNotulisModal = () => {
        setTempNotulisName(notulisName);
        setShowNotulisModal(true);
    };

    const handleSaveNotulisName = (e) => {
        e.preventDefault();
        setNotulisName(tempNotulisName);
        localStorage.setItem(`notulis_${meetingId}`, tempNotulisName);
        setShowNotulisModal(false);
    };

    // Helper untuk memformat URL Gambar dari Backend
    const formatImageUrl = (url) => {
        if (!url) return "";
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
            return url;
        }
        return `http://localhost:5000/${url.replace(/\\/g, "/")}`;
    };

    // Helper Parsing data gambar dari Backend
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

    // Helper Konversi Gambar/URL ke Base64 (Menggunakan Image Object & Canvas)
    const getBase64ImageFromUrl = (imageUrl) => {
        return new Promise((resolve, reject) => {
            if (imageUrl.startsWith("data:")) {
                return resolve(imageUrl);
            }

            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = imageUrl;

            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);

                const dataURL = canvas.toDataURL("image/png");
                resolve(dataURL);
            };

            img.onerror = (err) => {
                console.error("Gagal load gambar dari URL:", imageUrl, err);
                reject(err);
            };
        });
    };

    // FUNGSI EXPORT PDF NOTULEN RAPAT
    const handleExportPDF = async () => {
        try {
            if (!minuteData) {
                showAlert("error", "Export Gagal", "Belum ada data notulensi untuk diekspor.");
                return;
            }

            const activeMeeting = meetingData || localMeetingData || {};
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            const startX = 20;
            const endX = 190;
            const contentWidth = endX - startX; // 170mm
            const pageHeight = doc.internal.pageSize.getHeight();

            // 1. KOP SURAT
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

            const formatDate = (dateStr) => {
                if (!dateStr) return "-";
                const date = new Date(dateStr);
                return date.toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                });
            };

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);

            doc.text("Hari/Tanggal", startX, currentY);
            doc.text(`:  ${formatDate(activeMeeting.date)}`, startX + 30, currentY);

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

            // 2. KONTEN NOTULENSI
            const checkAddPage = (neededHeight) => {
                if (currentY + neededHeight > pageHeight - 15) {
                    doc.addPage();
                    currentY = 20;
                }
            };

            // Section 1: Deskripsi Notulensi
            checkAddPage(20);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.5);
            doc.text("Deskripsi Notulensi", startX, currentY);
            currentY += 5;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            const discussionText = minuteData.discussion || "-";
            const discussionLines = doc.splitTextToSize(discussionText, contentWidth);
            checkAddPage(discussionLines.length * 4.5);

            doc.text(discussionText, startX, currentY, {
                align: "justify",
                maxWidth: contentWidth
            });
            currentY += (discussionLines.length * 4.5) + 6;

            // Section 2: Keputusan Rapat
            checkAddPage(20);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.5);
            doc.text("Keputusan Rapat", startX, currentY);
            currentY += 5;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            const decisionText = minuteData.decisions || "-";
            const decisionLines = doc.splitTextToSize(decisionText, contentWidth);
            checkAddPage(decisionLines.length * 4.5);

            doc.text(decisionText, startX, currentY, {
                align: "justify",
                maxWidth: contentWidth
            });
            currentY += (decisionLines.length * 4.5) + 6;

            // Helper Render Grid Gambar
            const renderImageSection = async (title, imageList) => {
                checkAddPage(20);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.text(title, startX, currentY);
                currentY += 5;

                if (imageList.length === 0) {
                    doc.setFont("helvetica", "italic");
                    doc.setFontSize(9);
                    doc.text("Tidak ada foto.", startX, currentY);
                    currentY += 8;
                    return;
                }

                const imgWidth = 80;
                const imgHeight = 55;
                const gap = 10;

                for (let i = 0; i < imageList.length; i++) {
                    const col = i % 2;
                    if (col === 0 && i !== 0) {
                        currentY += imgHeight + 6;
                    }

                    checkAddPage(imgHeight + 10);

                    const xPos = startX + (col * (imgWidth + gap));
                    try {
                        const base64Img = await getBase64ImageFromUrl(imageList[i]);
                        const format = base64Img.startsWith("data:image/png") ? "PNG" : "JPEG";
                        doc.addImage(base64Img, format, xPos, currentY, imgWidth, imgHeight);
                    } catch (err) {
                        console.warn(`Gagal memuat gambar ${title} ke-${i + 1}:`, err);
                        doc.rect(xPos, currentY, imgWidth, imgHeight);
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(8);
                        doc.text("Gambar gagal dimuat", xPos + 20, currentY + 25);
                    }
                }
                currentY += imgHeight + 10;
            };

            // Section 3: Undangan
            const invitationList = parseImages(minuteData.invitation_img);
            await renderImageSection("Undangan", invitationList);

            // Section 4: Dokumentasi
            const documentationList = parseImages(minuteData.documentation_img);
            await renderImageSection("Dokumentasi", documentationList);

            // Section 5: Penutup Nama Notulis di Bagian Bawah PDF (Tanpa TTD)
            checkAddPage(20);
            currentY += 5;
            const displayName = notulisName || minuteData?.User?.name || minuteData?.user?.name || "....................................";
            const todayStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
            const signatureX = 130;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            doc.text(`Bukittinggi, ${todayStr}`, signatureX, currentY);
            currentY += 5;

            doc.setFont("helvetica", "normal");
            doc.text(`Notulis: ${displayName}`, signatureX, currentY);

            // 3. PREVIEW DENGAN JUDUL TAB & NAMA DOKUMEN RAPI
            const formattedDateForName = activeMeeting.date
                ? new Date(activeMeeting.date).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                })
                : "Tanggal-Tidak-Ada";

            const cleanCode = (activeMeeting.meeting_code || activeMeeting.code || meetingId || "Rapat")
                .toString()
                .replace(/[/\\?%*:|"<>]/g, "-");

            const fileName = `Notulensi Rapat - ${cleanCode} - ${formattedDateForName}.pdf`;

            const pdfBlob = doc.output("blob");
            const blobUrl = URL.createObjectURL(pdfBlob);

            const previewWindow = window.open("", "_blank");

            if (previewWindow) {
                previewWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>${fileName}</title>
                        <style>
                            html, body {
                                margin: 0;
                                padding: 0;
                                width: 100%;
                                height: 100%;
                                overflow: hidden;
                                background-color: #525659;
                            }
                            iframe {
                                width: 100%;
                                height: 100%;
                                border: none;
                            }
                        </style>
                    </head>
                    <body>
                        <iframe src="${blobUrl}"></iframe>
                    </body>
                    </html>
                `);
                previewWindow.document.close();
            }

        } catch (error) {
            console.error("Gagal export PDF Notulensi:", error);
            showAlert("error", "Error PDF!", "Terjadi kesalahan saat mengekspor PDF Notulensi.");
        }
    };

    // Modal Alert Helper
    const showAlert = (type, title, message) => {
        setAlertModal({ show: true, type, title, message });
    };

    const closeAlert = () => {
        setAlertModal({ ...alertModal, show: false });
    };

    // Open Form Modal (Tambah / Edit)
    const handleOpenFormModal = () => {
        if (!isEditable()) {
            showAlert("error", "Akses Dibatasi", "Notulensi rapat ini sudah tidak dapat diubah karena telah melebihi batas waktu 2 minggu dari tanggal rapat.");
            return;
        }

        if (minuteData) {
            setIsEditMode(true);
            setDiscussion(minuteData.discussion || "");
            setDecisions(minuteData.decisions || "");
            setInvitationPreviews(parseImages(minuteData.invitation_img));
            setDocumentationPreviews(parseImages(minuteData.documentation_img));
        } else {
            setIsEditMode(false);
            setDiscussion("");
            setDecisions("");
            setInvitationImgs([]);
            setDocumentationImgs([]);
            setInvitationPreviews([]);
            setDocumentationPreviews([]);
        }
        setShowFormModal(true);
    };

    // Handler Multiple File Input
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

    // Handler Hapus Preview Sebelum Submit
    const handleRemoveImage = (index, type) => {
        if (type === "invitation") {
            setInvitationImgs((prev) => prev.filter((_, i) => i !== index));
            setInvitationPreviews((prev) => prev.filter((_, i) => i !== index));
        } else {
            setDocumentationImgs((prev) => prev.filter((_, i) => i !== index));
            setDocumentationPreviews((prev) => prev.filter((_, i) => i !== index));
        }
    };

    // Handler Akses Kamera Web
    const handleStartCamera = async (target) => {
        setCameraTarget(target);
        setShowCameraModal(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Gagal membuka kamera:", err);
            showAlert("error", "Kamera Error", "Tidak dapat mengakses kamera web.");
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

    // Simpan / Update Notulensi
    const handleSaveMinute = async () => {
        if (!isEditable()) {
            showAlert("error", "Akses Dibatasi", "Batas waktu pengisian/perubahan notulensi (2 minggu dari tanggal rapat) telah berakhir.");
            return;
        }

        if (!discussion || !decisions) {
            showAlert("error", "Validasi Gagal", "Deskripsi notulensi dan keputusan wajib diisi.");
            return;
        }

        try {
            setSubmitting(true);
            const formData = new FormData();
            formData.append("meeting_id", meetingId);
            formData.append("discussion", discussion);
            formData.append("decisions", decisions);

            invitationImgs.forEach((file) => {
                formData.append("invitation_img", file);
            });

            documentationImgs.forEach((file) => {
                formData.append("documentation_img", file);
            });

            const url = isEditMode
                ? `http://localhost:5000/api/minutes/${minuteData.minutes_id}`
                : "http://localhost:5000/api/minutes";

            const method = isEditMode ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                setShowFormModal(false);
                setInvitationImgs([]);
                setDocumentationImgs([]);
                await fetchInitialData();
                showAlert("success", "Berhasil!", result.message || "Notulensi berhasil disimpan!");
            } else {
                showAlert("error", "Gagal!", result.message || "Gagal menyimpan notulensi.");
            }
        } catch (error) {
            console.error("Error saving minute:", error);
            showAlert("error", "Error!", "Terjadi kesalahan koneksi ke server.");
        } finally {
            setSubmitting(false);
        }
    };

    // Dynamic Style Object Responsif
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
        actionGroup: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: isSmallMobile ? "wrap" : "nowrap",
            width: isMobile ? "100%" : "auto",
            justifyContent: isMobile ? "flex-end" : "flex-start",
        },
        btnNotulis: {
            backgroundColor: "#ffffff",
            color: "#374151",
            border: "1px solid #d1d5db",
            padding: isSmallMobile ? "7px 10px" : "9px 14px",
            borderRadius: "8px",
            fontSize: isSmallMobile ? "12px" : "13px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            flex: isSmallMobile ? "1" : "none",
        },
        btnExportPDF: {
            backgroundColor: "#2D7A68",
            color: "#ffffff",
            border: "none",
            padding: isSmallMobile ? "7px 12px" : "9px 16px",
            borderRadius: "8px",
            fontSize: isSmallMobile ? "12px" : "13px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            flex: isSmallMobile ? "1" : "none",
        },
        btnAction: {
            backgroundColor: isEditable() ? "#2D7A68" : "#9ca3af",
            color: "#ffffff",
            border: "none",
            padding: isSmallMobile ? "7px 14px" : "9px 20px",
            borderRadius: "8px",
            fontSize: isSmallMobile ? "12px" : "13px",
            fontWeight: 600,
            cursor: isEditable() ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            flex: isSmallMobile ? "1" : "none",
        },
        card: {
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            padding: isSmallMobile ? "14px" : "20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
        },
        sectionTitle: {
            fontSize: isSmallMobile ? "13px" : "14px",
            fontWeight: 700,
            color: "#1f2937",
            margin: 0,
            textAlign: "left",
        },
        sectionContent: {
            fontSize: isSmallMobile ? "12px" : "13px",
            color: "#4b5563",
            lineHeight: 1.6,
            whiteSpace: "pre-line",
            margin: 0,
            textAlign: "justify",
        },
        imageGrid: {
            display: "grid",
            gridTemplateColumns: isSmallMobile
                ? "repeat(auto-fill, minmax(130px, 1fr))"
                : "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "12px",
            marginTop: "8px",
        },
        imageContainer: {
            position: "relative",
            borderRadius: "8px",
            overflow: "hidden",
            border: "1px solid #e5e7eb",
            height: isSmallMobile ? "110px" : "140px",
        },
        imagePreview: {
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
        },
        btnRemovePreview: {
            position: "absolute",
            top: "6px",
            right: "6px",
            backgroundColor: "rgba(239, 68, 68, 0.85)",
            color: "#ffffff",
            border: "none",
            borderRadius: "50%",
            width: "22px",
            height: "22px",
            fontSize: "12px",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        },
        modalInputSoft: {
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            backgroundColor: "#ffffff",
            fontSize: isSmallMobile ? "12px" : "13px",
            fontFamily: "inherit",
            boxSizing: "border-box",
            outline: "none"
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
        modalCardNotulis: {
            backgroundColor: "#ffffff",
            padding: isSmallMobile ? "20px 18px" : "24px 28px",
            borderRadius: "16px",
            boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.15)",
            textAlign: "center",
            maxWidth: "400px",
            width: "90%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
        },
        modalCard: {
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            width: "90%",
            maxWidth: "600px",
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            overflow: "hidden",
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
            color: "#2D7A68",
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
            fontSize: isSmallMobile ? "12px" : "13px",
            color: "#374151",
            fontWeight: 600,
            marginBottom: "6px",
            display: "block",
        },
        textarea: {
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            fontSize: isSmallMobile ? "12px" : "13px",
            boxSizing: "border-box",
            outline: "none",
            minHeight: "80px",
            resize: "vertical",
        },
        uploadOptionsGroup: {
            display: "flex",
            gap: "10px",
            marginTop: "6px",
            flexWrap: "wrap",
        },
        btnUploadOption: {
            padding: "8px 12px",
            fontSize: isSmallMobile ? "11px" : "12px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            backgroundColor: "#ffffff",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
        },
        modalFooter: {
            padding: isSmallMobile ? "12px 16px" : "16px 24px",
            borderTop: "1px solid #f3f4f6",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
        },
        modalButtonGroup: {
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "12px",
            width: "100%",
            marginTop: "8px",
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
    };

    const invitationImagesList = minuteData ? parseImages(minuteData.invitation_img) : [];
    const documentationImagesList = minuteData ? parseImages(minuteData.documentation_img) : [];

    return (
        <div style={styles.container}>
            {/* Action Bar Header */}
            <div style={styles.topBar}>
                <span style={{ fontSize: isSmallMobile ? "12px" : "14px", fontWeight: 600, color: "#374151" }}>
                    Status Notulensi: {minuteData ? "Sudah Terisi" : "Belum Ada Data"}
                </span>
                <div style={styles.actionGroup}>
                    {/* Tombol Input/Edit Nama Notulis */}
                    <button
                        onClick={handleOpenNotulisModal}
                        style={styles.btnNotulis}
                        title="Atur Nama Notulis"
                    >
                        ⚙️ Notulis{notulisName ? `: ${notulisName}` : ""}
                    </button>

                    {/* Tombol Export PDF */}
                    {minuteData && (
                        <button style={styles.btnExportPDF} onClick={handleExportPDF}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                            Export PDF
                        </button>
                    )}
                    {/* Tombol Action Edit / Tambah Notulensi */}
                    <button 
                        style={styles.btnAction} 
                        onClick={handleOpenFormModal}
                        disabled={!isEditable()}
                        title={!isEditable() ? "Akses ubah ditutup (Melebihi 2 minggu dari tanggal rapat)" : ""}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        {minuteData ? "Edit Notulensi Rapat" : "Tambah Notulensi Rapat"}
                    </button>
                </div>
            </div>

            {/* Konten Utama Notulensi Rapat */}
            {loading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                    Memuat data notulensi...
                </div>
            ) : minuteData ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {/* Deskripsi Notulensi */}
                    <div style={styles.card}>
                        <h4 style={styles.sectionTitle}>Deskripsi Notulensi</h4>
                        <p style={styles.sectionContent}>{minuteData.discussion}</p>
                    </div>

                    {/* Keputusan */}
                    <div style={styles.card}>
                        <h4 style={styles.sectionTitle}>Keputusan</h4>
                        <p style={styles.sectionContent}>{minuteData.decisions}</p>
                    </div>

                    {/* Undangan */}
                    <div style={styles.card}>
                        <h4 style={styles.sectionTitle}>Undangan</h4>
                        {invitationImagesList.length > 0 ? (
                            <div style={styles.imageGrid}>
                                {invitationImagesList.map((imgUrl, idx) => (
                                    <div key={idx} style={styles.imageContainer}>
                                        <img
                                            src={imgUrl}
                                            alt={`Undangan ${idx + 1}`}
                                            style={styles.imagePreview}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ ...styles.sectionContent, color: "#9ca3af" }}>
                                Tidak ada foto undangan.
                            </p>
                        )}
                    </div>

                    {/* Dokumentasi */}
                    <div style={styles.card}>
                        <h4 style={styles.sectionTitle}>Dokumentasi</h4>
                        {documentationImagesList.length > 0 ? (
                            <div style={styles.imageGrid}>
                                {documentationImagesList.map((imgUrl, idx) => (
                                    <div key={idx} style={styles.imageContainer}>
                                        <img
                                            src={imgUrl}
                                            alt={`Dokumentasi ${idx + 1}`}
                                            style={styles.imagePreview}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ ...styles.sectionContent, color: "#9ca3af" }}>
                                Tidak ada foto dokumentasi.
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ ...styles.card, textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                    Belum ada notulensi yang dibuat untuk rapat ini.
                </div>
            )}

            {/* MODAL INPUT NAMA NOTULIS LOKAL (TEXT INPUT) */}
            {showNotulisModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalCardNotulis}>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#2D7A68" }}>
                            Pengaturan Nama Notulis
                        </h3>
                        <form onSubmit={handleSaveNotulisName} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px", width: "100%" }}>
                                <label style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>Nama Notulis Rapat</label>
                                <input
                                    type="text"
                                    style={styles.modalInputSoft}
                                    value={tempNotulisName}
                                    onChange={(e) => setTempNotulisName(e.target.value)}
                                    placeholder="Masukkan nama notulis..."
                                    autoFocus
                                />
                            </div>
                            <div style={styles.modalButtonGroup}>
                                <button type="button" onClick={() => setShowNotulisModal(false)} style={styles.btnBatal}>
                                    Batal
                                </button>
                                <button type="submit" style={styles.btnSimpan}>
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Form Tambah/Edit Notulensi */}
            {showFormModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalCard}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>
                                {isEditMode ? "Edit Notulensi Rapat" : "Tambah Notulensi Rapat"}
                            </h3>
                            <span
                                style={{ cursor: "pointer", fontSize: "18px", color: "#9ca3af", fontWeight: "bold" }}
                                onClick={() => setShowFormModal(false)}
                            >
                                ✕
                            </span>
                        </div>

                        <div style={styles.modalBody}>
                            {/* Input Pembahasan */}
                            <div>
                                <label style={styles.label}>Notulensi Rapat</label>
                                <textarea
                                    style={{ ...styles.textarea, ...styles.modalInputSoft }}
                                    placeholder="Masukkan deskripsi atau hasil pembahasan rapat"
                                    value={discussion}
                                    onChange={(e) => setDiscussion(e.target.value)}
                                />
                            </div>

                            {/* Input Keputusan */}
                            <div>
                                <label style={styles.label}>Keputusan Rapat</label>
                                <textarea
                                    style={{ ...styles.textarea, ...styles.modalInputSoft }}
                                    placeholder="Masukkan keputusan yang dihasilkan"
                                    value={decisions}
                                    onChange={(e) => setDecisions(e.target.value)}
                                />
                            </div>

                            {/* Upload Undangan */}
                            <div>
                                <label style={styles.label}>Upload Undangan (Bisa lebih dari 1)</label>
                                <div style={styles.uploadOptionsGroup}>
                                    <label style={styles.btnUploadOption}>
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
                                        style={styles.btnUploadOption}
                                        onClick={() => handleStartCamera("invitation")}
                                    >
                                        📷 Ambil Foto
                                    </button>
                                </div>
                                {invitationPreviews.length > 0 && (
                                    <div style={styles.imageGrid}>
                                        {invitationPreviews.map((url, idx) => (
                                            <div key={idx} style={styles.imageContainer}>
                                                <img src={url} alt={`Preview Undangan ${idx + 1}`} style={styles.imagePreview} />
                                                <button
                                                    type="button"
                                                    style={styles.btnRemovePreview}
                                                    onClick={() => handleRemoveImage(idx, "invitation")}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Upload Dokumentasi */}
                            <div>
                                <label style={styles.label}>Upload Dokumentasi (Bisa lebih dari 1)</label>
                                <div style={styles.uploadOptionsGroup}>
                                    <label style={styles.btnUploadOption}>
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
                                        style={styles.btnUploadOption}
                                        onClick={() => handleStartCamera("documentation")}
                                    >
                                        📷 Ambil Foto
                                    </button>
                                </div>
                                {documentationPreviews.length > 0 && (
                                    <div style={styles.imageGrid}>
                                        {documentationPreviews.map((url, idx) => (
                                            <div key={idx} style={styles.imageContainer}>
                                                <img src={url} alt={`Preview Dokumentasi ${idx + 1}`} style={styles.imagePreview} />
                                                <button
                                                    type="button"
                                                    style={styles.btnRemovePreview}
                                                    onClick={() => handleRemoveImage(idx, "documentation")}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={styles.modalFooter}>
                            <button style={styles.btnBatal} onClick={() => setShowFormModal(false)}>
                                Batal
                            </button>
                            <button style={styles.btnSimpan} onClick={handleSaveMinute} disabled={submitting}>
                                {submitting ? "Menyimpan..." : "Simpan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Capture Kamera Web */}
            {showCameraModal && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modalCard, maxWidth: "450px" }}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Ambil Foto via Kamera</h3>
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