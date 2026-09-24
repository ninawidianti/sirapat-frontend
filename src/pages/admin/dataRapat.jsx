import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PDFDocument } from "pdf-lib";
import logo from "../../assets/logo_kementan.png";

export default function DataRapat() {
    // Ambil data user dari localStorage
    const userStored = JSON.parse(localStorage.getItem("user") || "{}");
    const adminName = userStored.name || "Admin";

    const navigate = useNavigate();
    const location = useLocation();

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    // State Modal Logout & Loading Preview PDF
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // State Data All Users untuk Dropdown TTD
    const [allUsers, setAllUsers] = useState([]);

    // State Modal & Data Pengaturan Kepala / Ketua Balai (Tanda Tangan)
    const [showTTDModal, setShowTTDModal] = useState(false);
    const [kepalaBalaiInfo, setKepalaBalaiInfo] = useState(() => {
        const saved = localStorage.getItem("kepalaBalaiInfo");
        return saved ? JSON.parse(saved) : {
            nama: "drh. Tangguh Pitona",
            nip: "197602182002121002",
            jabatan: "Kepala Balai"
        };
    });

    // Temp State untuk Form Input Pengaturan TTD
    const [tempSelectedUserId, setTempSelectedUserId] = useState("");
    const [tempNip, setTempNip] = useState("");

    // State Data Rapat & Fetching API
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State Filter & Search
    const [statusFilter, setStatusFilter] = useState("");
    const [yearFilter, setYearFilter] = useState("2026");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeMonth, setActiveMonth] = useState(new Date().getMonth());

    const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const isMobile = windowWidth <= 768;
    const isSmallMobile = windowWidth <= 480;

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
                    fontSize: "11px",
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
                    fontSize: "11px",
                    display: "inline-block"
                };
            default:
                return {
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontWeight: 500,
                    fontSize: "11px",
                    display: "inline-block"
                };
        }
    };

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem("token");
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };

            const [resMeetings, resUsers] = await Promise.all([
                fetch("http://localhost:5000/api/meetings", { headers }),
                fetch("http://localhost:5000/api/users", { headers })
            ]);

            const resultMeetings = await resMeetings.json();
            const resultUsers = await resUsers.json();

            if (!resMeetings.ok) {
                throw new Error(resultMeetings.message || "Gagal mengambil data rapat");
            }

            setMeetings(resultMeetings.data || []);

            if (resUsers.ok) {
                const userList = Array.isArray(resultUsers.data) ? resultUsers.data : Array.isArray(resultUsers) ? resultUsers : [];
                setAllUsers(userList);
            }
        } catch (err) {
            console.error("Fetch initial data error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const pimpinanUsers = allUsers.filter((u) => {
        if (!u.jabatan) return false;
        const j = u.jabatan.toLowerCase();
        return j.includes("kepala") || j.includes("ketua");
    });

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

    const filteredMeetings = meetings.filter((item) => {
        const computedStatus = getComputedStatus(item);
        const matchesStatus = statusFilter ? computedStatus === statusFilter : true;
        const itemYear = item.date ? new Date(item.date).getFullYear().toString() : "";
        const matchesYear = yearFilter ? itemYear === yearFilter : true;

        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
            item.title?.toLowerCase().includes(searchLower) ||
            item.meeting_code?.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower) ||
            item.agenda?.toLowerCase().includes(searchLower) ||
            item.location?.toLowerCase().includes(searchLower);

        return matchesStatus && matchesYear && matchesSearch;
    });

    const meetingsInActiveMonth = filteredMeetings.filter((item) => {
        if (!item.date) return false;
        const itemMonth = new Date(item.date).getMonth();
        return itemMonth === activeMonth;
    });

    const getBase64ImageFromUrl = async (imageUrl) => {
        if (!imageUrl) return null;
        let fullUrl = "";

        if (typeof imageUrl === "string" && imageUrl.startsWith("data:")) {
            return imageUrl;
        }

        if (typeof imageUrl === "string" && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
            fullUrl = imageUrl;
        } else if (typeof imageUrl === "string" && imageUrl.includes("uploads")) {
            const cleanPath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
            fullUrl = `http://localhost:5000${cleanPath}`;
        } else {
            fullUrl = window.location.origin + (String(imageUrl).startsWith("/") ? imageUrl : `/${imageUrl}`);
        }

        fullUrl = fullUrl.replace(/\\/g, "/");

        try {
            const response = await fetch(fullUrl, { mode: 'cors' });
            if (!response.ok) return null;

            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            console.warn("Gagal konversi gambar ke Base64:", fullUrl, err);
            return null;
        }
    };

    const formatImageUrl = (url) => {
        if (!url) return "";
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
            return url;
        }
        return `http://localhost:5000/${url.replace(/\\/g, "/")}`;
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

    // FUNGSI UNTUK MEMBUKA MODAL TTD
    const handleOpenTTDModal = () => {
        const currentKepala = pimpinanUsers.find(
            (u) => u.name === kepalaBalaiInfo.nama || u.nip === kepalaBalaiInfo.nip
        );
        if (currentKepala) {
            setTempSelectedUserId(String(currentKepala.user_id || currentKepala.id));
            setTempNip(currentKepala.nip || kepalaBalaiInfo.nip);
        } else {
            setTempSelectedUserId("");
            setTempNip(kepalaBalaiInfo.nip);
        }
        setShowTTDModal(true);
    };

    // HANDLER JIKA USER MENGUBAH PILIHAN NAMA KEPALA BALAI
    const handleUserSelectChange = (e) => {
        const selectedId = e.target.value;
        setTempSelectedUserId(selectedId);

        const selectedUser = pimpinanUsers.find(
            (u) => String(u.user_id || u.id) === String(selectedId)
        );
        if (selectedUser) {
            setTempNip(selectedUser.nip || "");
        } else {
            setTempNip("");
        }
    };

    // SIMPAN DATA TTD
    const handleSaveTTD = (e) => {
        e.preventDefault();
        const selectedUser = pimpinanUsers.find(
            (u) => String(u.user_id || u.id) === String(tempSelectedUserId)
        );

        const newInfo = {
            nama: selectedUser ? selectedUser.name : kepalaBalaiInfo.nama,
            nip: tempNip || (selectedUser ? selectedUser.nip : kepalaBalaiInfo.nip),
            jabatan: selectedUser ? selectedUser.jabatan : kepalaBalaiInfo.jabatan,
            signature_url: selectedUser ? selectedUser.signature_url : kepalaBalaiInfo.signature_url
        };
        setKepalaBalaiInfo(newInfo);
        localStorage.setItem("kepalaBalaiInfo", JSON.stringify(newInfo));
        setShowTTDModal(false);
    };

    const handleExportPDF = async () => {
        try {
            const doc = new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4"
            });

            const selectedMonthName = monthNames[activeMonth];

            try {
                const base64Logo = await getBase64ImageFromUrl(logo);
                if (base64Logo) {
                    doc.addImage(base64Logo, "PNG", 15, 8, 22, 22);
                }
            } catch (e) {
                console.warn("Logo tidak dapat diproses ke PDF:", e);
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.text("KEMENTERIAN PERTANIAN", 148, 13, { align: "center" });

            doc.setFontSize(11);
            doc.text("DIREKTORAT JENDERAL PETERNAKAN DAN KESEHATAN HEWAN", 148, 18, { align: "center" });

            doc.setFontSize(13);
            doc.text("BALAI VETERINER BUKITTINGGI", 148, 24, { align: "center" });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.text("Jl. Raya Bukittinggi - Payakumbuh Km. 14, Pakan Sinayan, Banuhampu, Agam, Sumatera Barat", 148, 29, { align: "center" });
            doc.text("Website: bvetbukittinggi.ditjenpkh.pertanian.go.id | Email: bvet.bukittinggi@pertanian.go.id", 148, 33, { align: "center" });

            doc.setLineWidth(0.8);
            doc.line(15, 36, 282, 36);
            doc.setLineWidth(0.2);
            doc.line(15, 37, 282, 37);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text(`LAPORAN REKAPITULASI JADWAL RAPAT - BULAN ${selectedMonthName.toUpperCase()} ${yearFilter}`, 148, 44, { align: "center" });

            const tableColumn = ["No", "Kode Rapat", "Judul Rapat", "Agenda / Deskripsi", "Tanggal", "Waktu", "Lokasi", "Status"];
            const tableRows = meetingsInActiveMonth.map((item, idx) => [
                idx + 1,
                item.meeting_code || "-",
                item.title || "-",
                item.agenda || item.description || "-",
                formatDate(item.date),
                formatTimeRange(item.start_time, item.end_time),
                item.location || "-",
                getComputedStatus(item)
            ]);

            autoTable(doc, {
                startY: 49,
                head: [tableColumn],
                body: tableRows,
                theme: "grid",
                headStyles: {
                    fillColor: [45, 122, 104],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                    halign: "center",
                    fontSize: 8.5
                },
                bodyStyles: {
                    fontSize: 8,
                    textColor: [31, 41, 55]
                },
                columnStyles: {
                    0: { halign: "center", cellWidth: 10 },
                    1: { halign: "center", cellWidth: 25 },
                    2: { cellWidth: 45 },
                    3: { cellWidth: 65 },
                    4: { halign: "center", cellWidth: 32 },
                    5: { halign: "center", cellWidth: 28 },
                    6: { cellWidth: 35 },
                    7: { halign: "center", cellWidth: 22 }
                },
                styles: {
                    overflow: "linebreak",
                    cellPadding: 2.5
                }
            });

            const lastTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 49;
            let currentY = lastTableY + 10;

            if (currentY + 35 > doc.internal.pageSize.getHeight()) {
                doc.addPage();
                currentY = 20;
            }

            const todayStr = new Date().toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric"
            });

            const signatureX = 210;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.text(`Bukittinggi, ${todayStr}`, signatureX, currentY);
            currentY += 5;
            doc.setFont("helvetica", "bold");
            const penandatanganTitle = kepalaBalaiInfo.jabatan || "Kepala Balai Veteriner Bukittinggi";
            doc.text(penandatanganTitle, signatureX, currentY);

            currentY += 22;

            doc.setFont("helvetica", "bold");
            doc.text(kepalaBalaiInfo.nama, signatureX, currentY);
            doc.setFont("helvetica", "normal");
            currentY += 4;
            doc.text(`NIP. ${kepalaBalaiInfo.nip}`, signatureX, currentY);

            const pdfBlobUrl = doc.output("bloburl");
            window.open(pdfBlobUrl, "_blank");

        } catch (err) {
            console.error("Gagal melakukan export PDF:", err);
            alert("Terjadi kesalahan saat membuat dokumen PDF.");
        }
    };

    // GENERATE PDF DAFTAR HADIR DENGAN TTD DIGITAL DAN KETERANGAN KEHADIRAN
    const generatePresencePDF = async (item, participants) => {
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const startX = 15;
        const endX = 195;
        const contentWidth = endX - startX;

        doc.setLineWidth(0.3);

        const kopStartY = 12;
        const kopHeight = 32;
        const xLogoSplit = 42;
        const xInfoSplit = 95;

        doc.rect(startX, kopStartY, contentWidth, kopHeight);
        const hLine1Y = kopStartY + 16;
        doc.line(startX, hLine1Y, endX, hLine1Y);
        doc.line(xLogoSplit, kopStartY, xLogoSplit, hLine1Y);

        try {
            const base64Logo = await getBase64ImageFromUrl(logo);
            if (base64Logo) {
                const logoFormat = base64Logo.includes("image/jpeg") || base64Logo.includes("image/jpg") ? "JPEG" : "PNG";
                doc.addImage(base64Logo, logoFormat, startX + 7, kopStartY + 1.5, 13, 13);
            }
        } catch (e) {
            console.warn("Logo tidak dimuat:", e);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("BALAI VETERINER BUKITTINGGI", (xLogoSplit + endX) / 2, kopStartY + 9.5, { align: "center" });

        const hLine2Y = kopStartY + 25.5;
        doc.line(startX, hLine2Y, endX, hLine2Y);
        doc.line(xInfoSplit, hLine1Y, xInfoSplit, hLine2Y);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("FORMULIR", (startX + xInfoSplit) / 2, hLine1Y + 6, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);

        const rowStep = 3.1;
        doc.line(xInfoSplit, hLine1Y + rowStep, endX, hLine1Y + rowStep);
        doc.line(xInfoSplit, hLine1Y + (rowStep * 2), endX, hLine1Y + (rowStep * 2));

        const savedKopInfo = JSON.parse(localStorage.getItem("kopInfo") || "{}");
        doc.text("Kode Dokumen", xInfoSplit + 2, hLine1Y + 2.3);
        doc.text(`: ${savedKopInfo.kodeDokumen || item.meeting_code || "PMT-M06-02"}`, xInfoSplit + 32, hLine1Y + 2.3);

        doc.text("Revisi ke", xInfoSplit + 2, hLine1Y + rowStep + 2.3);
        doc.text(`: ${savedKopInfo.revisi || "01"}`, xInfoSplit + 32, hLine1Y + rowStep + 2.3);

        doc.text("Tanggal", xInfoSplit + 2, hLine1Y + (rowStep * 2) + 2.3);
        doc.text(`: ${savedKopInfo.tanggal || "23 Oktober 2023"}`, xInfoSplit + 32, hLine1Y + (rowStep * 2) + 2.3);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("DAFTAR HADIR", (startX + endX) / 2, hLine2Y + 4.8, { align: "center" });

        const infoStartY = kopStartY + kopHeight;
        const infoHeight = 24;

        doc.line(startX, infoStartY, startX, infoStartY + infoHeight);
        doc.line(endX, infoStartY, endX, infoStartY + infoHeight);
        doc.line(startX, infoStartY + infoHeight, endX, infoStartY + infoHeight);

        const formatTime = (start, end) => {
            if (!start || !end) return "-";
            return `${start.substring(0, 5)} WIB sd ${end.substring(0, 5)} WIB`;
        };

        let textY = infoStartY + 5.5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);

        doc.text("Hari/Tanggal", startX + 4, textY);
        doc.text(`:  ${formatDate(item.date)}`, startX + 32, textY);

        textY += 5;
        doc.text("Tempat", startX + 4, textY);
        doc.text(`:  ${item.location || item.room || "-"}`, startX + 32, textY);

        textY += 5;
        doc.text("Kegiatan", startX + 4, textY);
        doc.text(`:  ${item.title || item.agenda || "-"}`, startX + 32, textY);

        textY += 5;
        doc.text("Pukul", startX + 4, textY);
        doc.text(`:  ${formatTime(item.start_time, item.end_time)}`, startX + 32, textY);

        const tableColumn = ["No.", "Nama", "Jabatan", "Tanda Tangan"];
        const tableRows = [];

        // Prosess TTD digital & status kehadiran
        const participantRowsWithImg = await Promise.all(
            participants.map(async (p, idx) => {
                const no = idx + 1;
                const indentText = no % 2 !== 0 ? `${no}.` : `       ${no}.`;

                const statusKehadiranRaw = p.status_kehadiran || p.attendance_status || "";
                const statusKehadiranTrimmed = String(statusKehadiranRaw).trim();
                const statusLower = statusKehadiranTrimmed.toLowerCase();

                const isHadir = statusLower === "hadir";
                const isKeteranganLain = statusKehadiranTrimmed !== "" && !isHadir && statusLower !== "belum konfirmasi" && statusLower !== "-";

                const sigUrl = p.signature_url || p.signature || p.ttd ||
                    p.User?.signature_url || p.User?.signature ||
                    p.user?.signature_url || p.user?.signature;

                let base64Signature = null;
                if (isHadir && sigUrl) {
                    base64Signature = await getBase64ImageFromUrl(sigUrl);
                }

                return {
                    no,
                    name: p.name || p.User?.name || p.user?.name || "-",
                    jabatan: p.jabatan || p.bidang || p.User?.jabatan || p.user?.jabatan || "-",
                    indentText,
                    isHadir,
                    isKeteranganLain,
                    statusText: statusKehadiranTrimmed,
                    hasSignature: isHadir && !!base64Signature,
                    base64Signature
                };
            })
        );

        participantRowsWithImg.forEach((row) => {
            let ttdText = "";
            if (row.isHadir) {
                ttdText = row.hasSignature ? `${row.indentText}` : `${row.indentText} .....`;
            } else if (row.isKeteranganLain) {
                ttdText = `${row.indentText} (${row.statusText})`;
            } else {
                ttdText = `${row.indentText} .....`;
            }

            tableRows.push([
                row.no,
                row.name,
                row.jabatan,
                ttdText
            ]);
        });

        // Tambah baris kosong susulan
        const totalPeserta = participants.length;
        for (let i = 1; i <= 3; i++) {
            const no = totalPeserta + i;
            const indentText = no % 2 !== 0 ? `${no}. .....` : `       ${no}. .....`;
            tableRows.push([no, "", "", indentText]);
        }

        autoTable(doc, {
            startY: infoStartY + infoHeight,
            margin: { left: startX, right: 15 },
            tableWidth: contentWidth,
            head: [tableColumn],
            body: tableRows,
            theme: "grid",
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                fontStyle: "bold",
                halign: "center",
                lineWidth: 0.3,
                lineColor: [0, 0, 0],
                fontSize: 9
            },
            bodyStyles: {
                fontSize: 8.5,
                textColor: [0, 0, 0],
                lineWidth: 0.3,
                lineColor: [0, 0, 0],
                minCellHeight: 11
            },
            columnStyles: {
                0: { halign: "center", cellWidth: 12 },
                1: { cellWidth: 68 },
                2: { cellWidth: 50 },
                3: { cellWidth: 50 }
            },
            styles: { overflow: "linebreak", valign: "middle" },
            didDrawCell: (data) => {
                if (data.section === "body" && data.column.index === 3) {
                    const rowIndex = data.row.index;
                    if (rowIndex < participantRowsWithImg.length) {
                        const pData = participantRowsWithImg[rowIndex];

                        if (pData.hasSignature && pData.base64Signature) {
                            const isOdd = pData.no % 2 !== 0;
                            const imgWidth = 16;
                            const imgHeight = 8;

                            const imgX = isOdd ? data.cell.x + 10 : data.cell.x + 22;
                            const imgY = data.cell.y + (data.cell.height - imgHeight) / 2;

                            try {
                                const format = pData.base64Signature.includes("image/jpeg") || pData.base64Signature.includes("image/jpg") ? "JPEG" : "PNG";
                                doc.addImage(pData.base64Signature, format, imgX, imgY, imgWidth, imgHeight);
                            } catch (e) {
                                console.warn("Gagal merender TTD di PDF cell:", e);
                            }
                        }
                    }
                }
            }
        });

        const lastTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY : infoStartY + infoHeight + 20;
        let currentY = lastTableY + 8;

        if (currentY + 45 > doc.internal.pageSize.getHeight()) {
            doc.addPage();
            currentY = 20;
        }

        const todayStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        const signatureX = 130;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text(`Bukittinggi, ${todayStr}`, signatureX, currentY);
        currentY += 4.5;

        doc.setFont("helvetica", "bold");
        const penandatanganTitle = kepalaBalaiInfo.jabatan || "Kepala Balai Veteriner Bukittinggi";
        doc.text(penandatanganTitle, signatureX, currentY);
        currentY += 3;

        if (kepalaBalaiInfo.signature_url) {
            try {
                const kepalaTTDBase64 = await getBase64ImageFromUrl(kepalaBalaiInfo.signature_url);
                if (kepalaTTDBase64) {
                    const imgFormat = kepalaTTDBase64.includes("image/jpeg") || kepalaTTDBase64.includes("image/jpg") ? "JPEG" : "PNG";
                    doc.addImage(kepalaTTDBase64, imgFormat, signatureX, currentY, 28, 14);
                    currentY += 16;
                } else {
                    currentY += 15;
                }
            } catch (err) {
                currentY += 15;
            }
        } else {
            currentY += 15;
        }

        doc.setFont("helvetica", "bold");
        doc.text(kepalaBalaiInfo.nama || "Drh. Nama Kepala Balai, M.Si", signatureX, currentY);
        doc.setFont("helvetica", "normal");
        currentY += 3.5;
        doc.text(`NIP. ${kepalaBalaiInfo.nip || "19750101 200003 1 001"}`, signatureX, currentY);

        return doc.output("arraybuffer");
    };

    const generateNotulensiPDF = async (item, minuteData) => {
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const startX = 20;
        const endX = 190;
        const contentWidth = endX - startX;
        const pageHeight = doc.internal.pageSize.getHeight();

        let currentY = 15;

        try {
            const base64Logo = await getBase64ImageFromUrl(logo);
            if (base64Logo) {
                const logoFormat = base64Logo.includes("image/jpeg") || base64Logo.includes("image/jpg") ? "JPEG" : "PNG";
                doc.addImage(base64Logo, logoFormat, startX, currentY, 13, 13);
            }
        } catch (e) {
            console.warn("Logo tidak dimuat:", e);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("BALAI VETERINER BUKITTINGGI", (startX + endX) / 2, currentY + 4, { align: "center" });

        doc.setFontSize(10);
        doc.text("NOTULEN RAPAT", (startX + endX) / 2, currentY + 9, { align: "center" });

        currentY += 18;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);

        doc.text("Hari/Tanggal", startX, currentY);
        doc.text(`:  ${formatDate(item.date)}`, startX + 30, currentY);

        currentY += 5;
        doc.text("Tempat", startX, currentY);
        doc.text(`:  ${item.location || item.room || "-"}`, startX + 30, currentY);

        currentY += 5;
        doc.text("Topik", startX, currentY);
        doc.text(`:  ${item.title || item.agenda || "-"}`, startX + 30, currentY);

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
        const discussionText = minuteData?.discussion || "-";
        const discussionLines = doc.splitTextToSize(discussionText, contentWidth);
        checkAddPage(discussionLines.length * 4.5);

        doc.text(discussionText, startX, currentY, { align: "justify", maxWidth: contentWidth });
        currentY += (discussionLines.length * 4.5) + 6;

        checkAddPage(20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.text("Keputusan Rapat", startX, currentY);
        currentY += 5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        const decisionText = minuteData?.decisions || "-";
        const decisionLines = doc.splitTextToSize(decisionText, contentWidth);
        checkAddPage(decisionLines.length * 4.5);

        doc.text(decisionText, startX, currentY, { align: "justify", maxWidth: contentWidth });
        currentY += (decisionLines.length * 4.5) + 6;

        const renderImageSection = async (title, imageList) => {
            checkAddPage(20);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10.5);
            doc.text(title, startX, currentY);
            currentY += 5;

            if (!imageList || imageList.length === 0) {
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
                    if (base64Img) {
                        const format = base64Img.includes("image/jpeg") || base64Img.includes("image/jpg") ? "JPEG" : "PNG";
                        doc.addImage(base64Img, format, xPos, currentY, imgWidth, imgHeight);
                    } else {
                        throw new Error("Base64 kosong");
                    }
                } catch (err) {
                    doc.rect(xPos, currentY, imgWidth, imgHeight);
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    doc.text("Gambar gagal dimuat", xPos + 20, currentY + 25);
                }
            }
            currentY += imgHeight + 10;
        };

        const invitationList = parseImages(minuteData?.invitation_img);
        await renderImageSection("Undangan", invitationList);

        const documentationList = parseImages(minuteData?.documentation_img);
        await renderImageSection("Dokumentasi", documentationList);

        return doc.output("arraybuffer");
    };

    // PRATINJAU (PREVIEW) & UNDUH PDF GABUNGAN
    const handlePreviewCombinedPDF = async (item) => {
        try {
            setIsGeneratingPDF(true);
            const token = localStorage.getItem("token");
            const headers = { Authorization: `Bearer ${token}` };

            const [resNotulensi, resParticipants] = await Promise.all([
                fetch(`http://localhost:5000/api/minutes/meeting/${item.meeting_id}`, { headers }),
                fetch(`http://localhost:5000/api/meetings/${item.meeting_id}/participants`, { headers })
            ]);

            let minuteData = {};
            if (resNotulensi.ok) {
                const dataNotulensi = await resNotulensi.json();
                minuteData = dataNotulensi.data || {};
            }

            let participants = [];
            if (resParticipants.ok) {
                const dataParticipants = await resParticipants.json();
                participants = Array.isArray(dataParticipants.data) ? dataParticipants.data : Array.isArray(dataParticipants) ? dataParticipants : [];
            }

            // Generate Daftar Hadir PDF
            let arrayBufferPresence;
            if (item.signed_presence_pdf) {
                try {
                    const resSigned = await fetch(formatImageUrl(item.signed_presence_pdf));
                    if (resSigned.ok) {
                        arrayBufferPresence = await resSigned.arrayBuffer();
                    } else {
                        arrayBufferPresence = await generatePresencePDF(item, participants);
                    }
                } catch (e) {
                    arrayBufferPresence = await generatePresencePDF(item, participants);
                }
            } else {
                arrayBufferPresence = await generatePresencePDF(item, participants);
            }

            // Generate Notulensi PDF
            const arrayBufferNotulensi = await generateNotulensiPDF(item, minuteData);

            // Merge PDF menggunakan pdf-lib
            const mergedPdf = await PDFDocument.create();

            const pdf1 = await PDFDocument.load(arrayBufferPresence);
            const pdf2 = await PDFDocument.load(arrayBufferNotulensi);

            const copiedPages1 = await mergedPdf.copyPages(pdf1, pdf1.getPageIndices());
            copiedPages1.forEach((page) => mergedPdf.addPage(page));

            const copiedPages2 = await mergedPdf.copyPages(pdf2, pdf2.getPageIndices());
            copiedPages2.forEach((page) => mergedPdf.addPage(page));

            const mergedPdfBytes = await mergedPdf.save();
            const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
            const pdfBlobUrl = URL.createObjectURL(blob);

            // Buka PDF di tab baru untuk dicek dan diunduh oleh user
            window.open(pdfBlobUrl, "_blank");

        } catch (err) {
            console.error("Gagal menggabungkan PDF:", err);
            alert("Terjadi kesalahan saat memproses PDF. Silakan coba lagi.");
        } finally {
            setIsGeneratingPDF(false);
        }
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
            backgroundColor: "#f3f4f6",
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
            gap: isMobile ? "1rem" : "1.25rem",
            boxSizing: "border-box",
        },
        filterCardGroup: {
            backgroundColor: "#ffffff",
            borderRadius: "1rem",
            padding: isMobile ? "1rem" : "1.25rem 1.5rem",
            border: "1px solid #f3f4f6",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            gap: "0.875rem",
            flexWrap: "wrap",
        },
        filterSelectWrapper: {
            display: "flex",
            alignItems: "center",
            width: isSmallMobile ? "100%" : "auto",
        },
        selectInput: {
            padding: "0.5rem 0.875rem",
            borderRadius: "0.5rem",
            border: "1px solid #d1d5db",
            fontSize: "clamp(0.75rem, 1.2vw, 0.8125rem)",
            backgroundColor: "#ffffff",
            outline: "none",
            color: "#4b5563",
            cursor: "pointer",
            width: isSmallMobile ? "100%" : "auto",
        },
        searchBox: {
            position: "relative",
            display: "flex",
            alignItems: "center",
            flex: 1,
            minWidth: isMobile ? "100%" : "240px",
        },
        searchInput: {
            width: "100%",
            padding: "0.5rem 0.875rem 0.5rem 2.375rem",
            borderRadius: "0.5rem",
            border: "1px solid #d1d5db",
            fontSize: "clamp(0.75rem, 1.2vw, 0.8125rem)",
            outline: "none",
            boxSizing: "border-box",
            backgroundColor: "#ffffff",
            color: "#374151",
        },
        searchIcon: {
            position: "absolute",
            left: "0.75rem",
            color: "#9ca3af",
            display: "flex",
            alignItems: "center",
            pointerEvents: "none",
        },
        btnExport: {
            backgroundColor: "#2D7A68",
            color: "#ffffff",
            border: "none",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            fontSize: "clamp(0.75rem, 1.2vw, 0.8125rem)",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.375rem",
            width: isSmallMobile ? "100%" : "auto",
        },
        btnSettingTTD: {
            backgroundColor: "#ffffff",
            color: "#4b5563",
            border: "1px solid #d1d5db",
            padding: "0.5rem 0.875rem",
            borderRadius: "0.5rem",
            fontSize: "clamp(0.75rem, 1.2vw, 0.8125rem)",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.375rem",
            width: isSmallMobile ? "100%" : "auto",
        },
        monthTabsContainer: {
            display: "flex",
            gap: "0.375rem",
            overflowX: "auto",
            padding: "0.25rem 0",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
        },
        monthTab: {
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            outline: "none",
            padding: "0.375rem 0.875rem",
            borderRadius: "1.25rem",
            fontSize: "clamp(0.75rem, 1.2vw, 0.8125rem)",
            fontWeight: "500",
            color: "#4b5563",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
            whiteSpace: "nowrap",
            flexShrink: 0,
        },
        monthTabActive: {
            backgroundColor: "#2D7A68",
            border: "1px solid #2D7A68",
            outline: "none",
            padding: "0.375rem 0.875rem",
            borderRadius: "1.25rem",
            fontSize: "clamp(0.75rem, 1.2vw, 0.8125rem)",
            fontWeight: "600",
            color: "#ffffff",
            cursor: "pointer",
            transition: "all 0.2s ease-in-out",
            boxShadow: "0 2px 4px rgba(45, 122, 104, 0.2)",
            whiteSpace: "nowrap",
            flexShrink: 0,
        },
        cardList: {
            display: "flex",
            flexDirection: "column",
            gap: "0.875rem",
        },
        cardItem: {
            backgroundColor: "#ffffff",
            borderRadius: "0.875rem",
            padding: isMobile ? "1rem" : "1.25rem 1.5rem",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "0.875rem",
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
            width: isSmallMobile ? "100%" : "auto",
        },
        downloadButtonActive: {
            backgroundColor: "#1e40af",
            color: "#ffffff",
            border: "none",
            padding: "0.375rem 1rem",
            borderRadius: "0.375rem",
            fontSize: "clamp(0.75rem, 1.2vw, 0.75rem)",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            width: isSmallMobile ? "100%" : "auto",
        },
        downloadButtonDisabled: {
            backgroundColor: "#9ca3af",
            color: "#ffffff",
            border: "none",
            padding: "0.375rem 1rem",
            borderRadius: "0.375rem",
            fontSize: "clamp(0.75rem, 1.2vw, 0.75rem)",
            fontWeight: 600,
            cursor: "not-allowed",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            width: isSmallMobile ? "100%" : "auto",
            opacity: 0.7,
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
        ttdModalCard: {
            backgroundColor: "#ffffff",
            padding: "1.25rem 1.5rem",
            borderRadius: "0.875rem",
            boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.12)",
            textAlign: "center",
            maxWidth: "340px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "0.875rem",
            boxSizing: "border-box",
        },
        ttdModalTitle: {
            fontSize: "1.1rem",
            fontWeight: "700",
            color: "#2D7A68",
            margin: 0,
            lineHeight: 1.2
        },
        ttdModalSubtext: {
            fontSize: "0.78rem",
            color: "#4b5563",
            margin: "0 auto",
            lineHeight: 1.35,
        },
        ttdButtonGroup: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.75rem",
            width: "100%",
            marginTop: "0.5rem",
        },
        ttdBtnCancel: {
            padding: "0.5rem 1rem",
            border: "none",
            borderRadius: "0.5rem",
            backgroundColor: "#FF6B6B",
            color: "#ffffff",
            fontSize: "0.85rem",
            fontWeight: "600",
            cursor: "pointer",
            textAlign: "center",
            flex: 1,
        },
        ttdBtnSave: {
            padding: "0.5rem 1rem",
            border: "none",
            borderRadius: "0.5rem",
            backgroundColor: "#2B7B61",
            color: "#ffffff",
            fontSize: "0.85rem",
            fontWeight: "600",
            cursor: "pointer",
            textAlign: "center",
            flex: 1,
        },
        ttdFormGroup: {
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "0.35rem",
            width: "100%"
        },
        ttdFormLabel: {
            fontSize: "0.8rem",
            fontWeight: "600",
            color: "#2f384c"
        },
        ttdFormSelect: {
            width: "100%",
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            border: "1.5px solid #111827",
            fontSize: "0.825rem",
            outline: "none",
            boxSizing: "border-box",
            backgroundColor: "#ffffff",
            color: "#111827",
            cursor: "pointer"
        },
        ttdFormInput: {
            width: "100%",
            padding: "0.5rem 0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid #d1d5db",
            fontSize: "0.825rem",
            outline: "none",
            boxSizing: "border-box",
            backgroundColor: "#ffffff",
            color: "#111827"
        },
        modalCard: {
            backgroundColor: "#ffffff",
            padding: isMobile ? "1.25rem" : "1.5rem 2rem",
            borderRadius: "0.875rem",
            boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.15)",
            textAlign: "center",
            maxWidth: "380px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
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
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "0.75rem",
            width: "100%",
            marginTop: "0.5rem",
        },
        btnCancel2: {
            padding: "0.5rem 1.25rem",
            border: "1px solid #d1d5db",
            borderRadius: "0.5rem",
            backgroundColor: "#ff6b6b",
            color: "#ffffff",
            fontSize: "clamp(0.75rem, 1.5vw, 0.8125rem)",
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "center",
            flex: 1,
        },
        btnSaveTTD: {
            padding: "0.5rem 1rem",
            border: "none",
            borderRadius: "0.375rem",
            backgroundColor: "#2D7A68",
            color: "#ffffff",
            fontSize: "clamp(0.75rem, 1.5vw, 0.8125rem)",
            fontWeight: 500,
            cursor: "pointer",
            flex: 1,
        }
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
                {/* SINGLE CARD GROUP: KONTROL FILTER & BUTTONS */}
                <div style={styles.filterCardGroup}>
                    {/* Input Cari */}
                    <div style={styles.searchBox}>
                        <span style={styles.searchIcon}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Cari berdasarkan kode/judul rapat, deskripsi, atau lokasi..."
                            style={styles.searchInput}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Dropdown Status */}
                    <div style={styles.filterSelectWrapper}>
                        <span style={{ fontSize: "12px", color: "#6b7280", marginRight: "6px", fontWeight: 400 }}>Status:</span>
                        <select
                            style={styles.selectInput}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">Semua Status</option>
                            <option value="Terjadwal">Terjadwal</option>
                            <option value="Selesai">Selesai</option>
                            <option value="Batal">Batal</option>
                        </select>
                    </div>

                    {/* Dropdown Tahun */}
                    <div style={styles.filterSelectWrapper}>
                        <span style={{ fontSize: "12px", color: "#6b7280", marginRight: "6px", fontWeight: 400 }}>Tahun:</span>
                        <select
                            style={styles.selectInput}
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}
                        >
                            <option value="">Semua Tahun</option>
                            <option value="2026">2026</option>
                            <option value="2025">2025</option>
                        </select>
                    </div>

                    {/* Tombol TTD */}
                    <button
                        onClick={handleOpenTTDModal}
                        style={styles.btnSettingTTD}
                        title="Atur Nama & NIP Kepala Balai"
                    >
                        ⚙️ TTD
                    </button>

                    {/* Tombol Export PDF */}
                    <button onClick={handleExportPDF} style={styles.btnExport}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                        </svg>
                        Export PDF
                    </button>
                </div>

                {/* TAB BULAN */}
                <div style={styles.monthTabsContainer}>
                    {monthNames.map((monthName, index) => (
                        <button
                            key={index}
                            style={activeMonth === index ? styles.monthTabActive : styles.monthTab}
                            onClick={() => setActiveMonth(index)}
                        >
                            {monthName}
                        </button>
                    ))}
                </div>

                {/* LIST DATA RAPAT */}
                {loading ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontSize: "13px" }}>
                        Memuat data rapat...
                    </div>
                ) : error ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#dc2626", fontSize: "13px" }}>
                        Terjadi Kesalahan: {error}
                    </div>
                ) : (
                    <div style={styles.cardList}>
                        {meetingsInActiveMonth.length > 0 ? (
                            meetingsInActiveMonth.map((item) => {
                                const currentStatus = getComputedStatus(item);

                                // Tombol selalu siap aktif apabila rapat dalam status Selesai atau memiliki notulensi/daftar hadir
                                const isReadyToDownload = Boolean(
                                    item.signed_presence_pdf ||
                                    item.has_notulensi ||
                                    item.notulensi_filled ||
                                    currentStatus === "Selesai"
                                );

                                return (
                                    <div key={item.meeting_id} style={styles.cardItem}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexDirection: isSmallMobile ? "column" : "row" }}>
                                            <div style={{ textAlign: "left" }}>
                                                <h3 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: 700, color: "#111827", textAlign: "left" }}>
                                                    {item.title}
                                                </h3>
                                                <p style={{ margin: 0, fontSize: "13px", color: "#6b7280", lineHeight: 1.4, textAlign: "left" }}>
                                                    {item.description || item.agenda}
                                                </p>
                                            </div>
                                            <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#6b7280", backgroundColor: "#f3f4f6", padding: "2px 8px", borderRadius: "4px", border: "1px solid #e5e7eb", whiteSpace: "nowrap", alignSelf: isSmallMobile ? "flex-start" : "auto" }}>
                                                {item.meeting_code}
                                            </span>
                                        </div>

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
                                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                                    </svg>
                                                    <span style={{ fontWeight: 600, color: "#111827" }}>{formatDate(item.date)}</span>
                                                </div>

                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                        <circle cx="12" cy="7" r="4"></circle>
                                                    </svg>
                                                    <span>{item.creator ? item.creator.name : "Admin"}</span>
                                                </div>

                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                                        <circle cx="12" cy="10" r="3"></circle>
                                                    </svg>
                                                    <span>{item.location}</span>
                                                </div>
                                            </div>

                                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <polyline points="12 6 12 12 16 14"></polyline>
                                                    </svg>
                                                    <span>{formatTimeRange(item.start_time, item.end_time)}</span>
                                                </div>

                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                    </svg>
                                                    <span style={getStatusBadgeStyle(currentStatus)}>
                                                        {currentStatus}
                                                    </span>
                                                </div>

                                                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                        <circle cx="12" cy="12" r="10"></circle>
                                                        <polyline points="12 6 12 12 8 10"></polyline>
                                                    </svg>
                                                    <span style={{ color: "#9ca3af" }}>Dibuat: {formatCreatedDate(item.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* AKSI BUTTONS */}
                                        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                                            <button
                                                type="button"
                                                disabled={!isReadyToDownload || isGeneratingPDF}
                                                style={isReadyToDownload ? styles.downloadButtonActive : styles.downloadButtonDisabled}
                                                title={
                                                    isReadyToDownload
                                                        ? "Cek & Download PDF Gabungan (Daftar Hadir TTD + Notulensi)"
                                                        : "Rapat Belum Selesai / Notulensi Belum Terisi"
                                                }
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isReadyToDownload) {
                                                        handlePreviewCombinedPDF(item);
                                                    }
                                                }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                    <polyline points="7 10 12 15 17 10" />
                                                    <line x1="12" y1="15" x2="12" y2="3" />
                                                </svg>
                                                Download PDF
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
                                );
                            })
                        ) : (
                            <div style={{
                                backgroundColor: "#ffffff",
                                borderRadius: "0.875rem",
                                padding: "40px 20px",
                                border: "1px solid #e5e7eb",
                                textAlign: "center",
                                color: "#6b7280",
                                fontSize: "13px"
                            }}>
                                Tidak ada data rapat pada bulan <strong>{monthNames[activeMonth]}</strong>.
                            </div>
                        )}
                    </div>
                )}
            </main>

            <footer style={styles.footer}>
                © 2026 BVet Bukittinggi. All rights reserved.
            </footer>

            {/* Modal Processing / Loading PDF */}
            {isGeneratingPDF && (
                <div style={styles.modalOverlay}>
                    <div style={{ ...styles.modalCard, maxWidth: "300px" }}>
                        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#2D7A68", margin: 0 }}>
                            Memproses PDF...
                        </h3>
                        <p style={{ fontSize: "0.8rem", color: "#4b5563", margin: 0 }}>
                            Menyiapkan dan menggabungkan dokumen rapat. Mohon tunggu sebentar.
                        </p>
                    </div>
                </div>
            )}

            {/* Modal Pengaturan TTD Kepala Balai */}
            {showTTDModal && (
                <div style={styles.modalOverlay}>
                    <form onSubmit={handleSaveTTD} style={styles.ttdModalCard}>
                        <h3 style={styles.ttdModalTitle}>
                            Pengaturan TTD Kepala Balai
                        </h3>
                        <p style={styles.ttdModalSubtext}>
                            Pilih Nama dan NIP pejabat Kepala Balai untuk dicetak pada laporan PDF.
                        </p>

                        {/* Input Nama Kepala Balai */}
                        <div style={styles.ttdFormGroup}>
                            <label style={styles.ttdFormLabel}>Nama Kepala Balai</label>
                            <select
                                style={styles.ttdFormSelect}
                                value={tempSelectedUserId}
                                onChange={handleUserSelectChange}
                                required
                            >
                                <option value="">-- Pilih Kepala Balai --</option>
                                {pimpinanUsers.length > 0 ? (
                                    pimpinanUsers.map((u) => (
                                        <option key={u.user_id || u.id} value={u.user_id || u.id}>
                                            {u.name} ({u.jabatan || "Kepala Balai"})
                                        </option>
                                    ))
                                ) : (
                                    <option value="default">{kepalaBalaiInfo.nama} (Kepala Balai)</option>
                                )}
                            </select>
                        </div>

                        {/* Input NIP Kepala Balai */}
                        <div style={styles.ttdFormGroup}>
                            <label style={styles.ttdFormLabel}>NIP Kepala Balai</label>
                            <input
                                type="text"
                                style={styles.ttdFormInput}
                                value={tempNip}
                                onChange={(e) => setTempNip(e.target.value)}
                                placeholder="Masukkan NIP"
                                required
                            />
                        </div>

                        {/* Button Group */}
                        <div style={styles.ttdButtonGroup}>
                            <button
                                type="button"
                                onClick={() => setShowTTDModal(false)}
                                style={styles.ttdBtnCancel}
                            >
                                Batal
                            </button>
                            <button type="submit" style={styles.ttdBtnSave}>
                                Simpan
                            </button>
                        </div>
                    </form>
                </div>
            )}

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
                            <button
                                onClick={() => setShowLogoutModal(false)}
                                style={styles.btnCancel2}
                            >
                                Batal
                            </button>
                            <button onClick={executeLogout} style={{ ...styles.btnSaveTTD, backgroundColor: "#dc2626" }}>
                                Ya, Keluar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}