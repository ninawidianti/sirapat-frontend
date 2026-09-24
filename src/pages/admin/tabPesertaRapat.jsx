import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../../assets/logo_kementan.png";

export default function TabPesertaRapat({ meetingId, meetingData }) {
    // State Window Width untuk Responsivitas Layar
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const isMobile = windowWidth <= 768;
    const isSmallMobile = windowWidth <= 480;

    // State Data User, Kepanitiaan & Peserta Rapat
    const [allUsers, setAllUsers] = useState([]);
    const [committees, setCommittees] = useState([]);
    const [selectedCommitteeId, setSelectedCommitteeId] = useState("");
    const [confirmedParticipants, setConfirmedParticipants] = useState([]);
    const [meetingStartTime, setMeetingStartTime] = useState(null);
    const [loading, setLoading] = useState(true);

    // State Data Detail Rapat Lokal
    const [localMeetingData, setLocalMeetingData] = useState(meetingData || null);

    // State Header/Kop PDF
    const [kopInfo, setKopInfo] = useState(() => {
        const saved = localStorage.getItem("kopInfo");
        return saved ? JSON.parse(saved) : {
            kodeDokumen: meetingData?.meeting_code || "PMT-M06-02",
            revisi: "01",
            tanggal: "23 Oktober 2023"
        };
    });

    // State Pengaturan Penandatangan (Kepala Balai / Pimpinan)
    const [showTTDModal, setShowTTDModal] = useState(false);
    const [kepalaBalaiInfo, setKepalaBalaiInfo] = useState(() => {
        const saved = localStorage.getItem("kepalaBalaiInfo");
        return saved ? JSON.parse(saved) : {
            nama: "",
            nip: "",
            jabatan: "",
            signature_url: ""
        };
    });

    // Temp State untuk Modal TTD & Kop
    const [tempKodeDokumen, setTempKodeDokumen] = useState(kopInfo.kodeDokumen);
    const [tempRevisi, setTempRevisi] = useState(kopInfo.revisi);
    const [tempTanggalKop, setTempTanggalKop] = useState(kopInfo.tanggal);
    const [tempSelectedKepalaId, setTempSelectedKepalaId] = useState("");

    // State Modal Pilih Peserta
    const [showModal, setShowModal] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    // State Feedback Alert Modal
    const [alertModal, setAlertModal] = useState({
        show: false,
        type: "success",
        title: "",
        message: "",
    });

    const token = localStorage.getItem("token");

    // Sync state localMeetingData
    useEffect(() => {
        if (meetingData) {
            setLocalMeetingData(meetingData);
            if (!kopInfo.kodeDokumen) {
                setKopInfo(prev => ({ ...prev, kodeDokumen: meetingData.meeting_code || "PMT-M06-02" }));
            }
        }
    }, [meetingData]);

    // Fetch Data
    useEffect(() => {
        if (meetingId) {
            fetchInitialData();
        }
    }, [meetingId]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };

            if (!meetingData) {
                const resMeeting = await fetch(`http://localhost:5000/api/meetings/${meetingId}`, { headers });
                const dataMeeting = await resMeeting.json();
                if (resMeeting.ok && dataMeeting.data) {
                    setLocalMeetingData(dataMeeting.data);
                }
            }

            const resUsers = await fetch("http://localhost:5000/api/users", { headers });
            const dataUsers = await resUsers.json();

            const resCommittees = await fetch("http://localhost:5000/api/committees", { headers });
            const dataCommittees = await resCommittees.json();

            const resParticipants = await fetch(`http://localhost:5000/api/meetings/${meetingId}/participants`, { headers });
            const dataParticipants = await resParticipants.json();

            if (resUsers.ok) {
                const userList = Array.isArray(dataUsers.data) ? dataUsers.data : Array.isArray(dataUsers) ? dataUsers : [];
                setAllUsers(userList);
            }

            if (resCommittees.ok) {
                const committeeList = Array.isArray(dataCommittees.data) ? dataCommittees.data : Array.isArray(dataCommittees) ? dataCommittees : [];
                setCommittees(committeeList);
            }

            if (resParticipants.ok) {
                const participantList = Array.isArray(dataParticipants.data) ? dataParticipants.data : Array.isArray(dataParticipants) ? dataParticipants : [];
                setConfirmedParticipants(participantList);
                if (dataParticipants.startTime) {
                    setMeetingStartTime(new Date(dataParticipants.startTime));
                }
            } else {
                setConfirmedParticipants([]);
            }
        } catch (err) {
            console.error("Error fetching initial data:", err);
            showAlert("error", "Error!", "Terjadi kesalahan koneksi ke server.");
        } finally {
            setLoading(false);
        }
    };

    // Filter pimpinan
    const pimpinanUsers = allUsers.filter((u) => {
        if (!u.jabatan) return false;
        const j = u.jabatan.toLowerCase();
        return j.includes("kepala") || j.includes("ketua");
    });

    // Helper Konversi URL/Image ke Base64
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
            console.warn("Gagal konversi TTD ke Base64:", fullUrl, err);
            return null;
        }
    };

    // Modal Handler TTD Pimpinan
    const handleOpenTTDModal = () => {
        setTempKodeDokumen(kopInfo.kodeDokumen);
        setTempRevisi(kopInfo.revisi);
        setTempTanggalKop(kopInfo.tanggal);

        const currentKepala = pimpinanUsers.find(
            (u) => u.name === kepalaBalaiInfo.nama || u.nip === kepalaBalaiInfo.nip
        );
        setTempSelectedKepalaId(currentKepala ? String(currentKepala.user_id || currentKepala.id) : "");
        setShowTTDModal(true);
    };

    const handleSaveTTD = (e) => {
        e.preventDefault();

        const selectedUser = pimpinanUsers.find(
            (u) => String(u.user_id || u.id) === String(tempSelectedKepalaId)
        );

        const newKepalaInfo = {
            nama: selectedUser ? selectedUser.name : kepalaBalaiInfo.nama,
            nip: selectedUser ? selectedUser.nip : kepalaBalaiInfo.nip,
            jabatan: selectedUser ? selectedUser.jabatan : kepalaBalaiInfo.jabatan,
            signature_url: selectedUser ? selectedUser.signature_url : kepalaBalaiInfo.signature_url
        };

        const newKopInfo = {
            kodeDokumen: tempKodeDokumen,
            revisi: tempRevisi,
            tanggal: tempTanggalKop,
        };

        setKepalaBalaiInfo(newKepalaInfo);
        setKopInfo(newKopInfo);

        localStorage.setItem("kepalaBalaiInfo", JSON.stringify(newKepalaInfo));
        localStorage.setItem("kopInfo", JSON.stringify(newKopInfo));

        setShowTTDModal(false);
    };

    // EXPORT PDF DAFTAR HADIR (DENGAN BARIS KOSONG SUSULAN DI BAWAH)
    const handleExportPDF = async () => {
        try {
            const activeMeeting = meetingData || localMeetingData || {};

            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            const startX = 15;
            const endX = 195;
            const contentWidth = endX - startX;

            doc.setLineWidth(0.3);

            // KOP SURAT
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

            doc.text("Kode Dokumen", xInfoSplit + 2, hLine1Y + 2.3);
            doc.text(`: ${kopInfo.kodeDokumen || activeMeeting.meeting_code || "PMT-M06-02"}`, xInfoSplit + 32, hLine1Y + 2.3);

            doc.text("Revisi ke", xInfoSplit + 2, hLine1Y + rowStep + 2.3);
            doc.text(`: ${kopInfo.revisi || "01"}`, xInfoSplit + 32, hLine1Y + rowStep + 2.3);

            doc.text("Tanggal", xInfoSplit + 2, hLine1Y + (rowStep * 2) + 2.3);
            doc.text(`: ${kopInfo.tanggal || "23 Oktober 2023"}`, xInfoSplit + 32, hLine1Y + (rowStep * 2) + 2.3);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.text("DAFTAR HADIR", (startX + endX) / 2, hLine2Y + 4.8, { align: "center" });

            // DETAIL INFORMASI RAPAT
            const infoStartY = kopStartY + kopHeight;
            const infoHeight = 24;

            doc.line(startX, infoStartY, startX, infoStartY + infoHeight);
            doc.line(endX, infoStartY, endX, infoStartY + infoHeight);
            doc.line(startX, infoStartY + infoHeight, endX, infoStartY + infoHeight);

            const formatDate = (dateStr) => {
                if (!dateStr) return "-";
                const date = new Date(dateStr);
                return date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
            };

            const formatTime = (start, end) => {
                if (!start || !end) return "-";
                return `${start.substring(0, 5)} WIB sd ${end.substring(0, 5)} WIB`;
            };

            let textY = infoStartY + 5.5;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);

            doc.text("Hari/Tanggal", startX + 4, textY);
            doc.text(`:  ${formatDate(activeMeeting.date)}`, startX + 32, textY);

            textY += 5;
            doc.text("Tempat", startX + 4, textY);
            doc.text(`:  ${activeMeeting.location || activeMeeting.room || "-"}`, startX + 32, textY);

            textY += 5;
            doc.text("Kegiatan", startX + 4, textY);
            doc.text(`:  ${activeMeeting.title || activeMeeting.agenda || "-"}`, startX + 32, textY);

            textY += 5;
            doc.text("Pukul", startX + 4, textY);
            doc.text(`:  ${formatTime(activeMeeting.start_time, activeMeeting.end_time)}`, startX + 32, textY);

            // PREPARE TABEL & FILTER TTD
            const tableColumn = ["No.", "Nama", "Jabatan", "Tanda Tangan"];
            const tableRows = [];

            const participantRowsWithImg = await Promise.all(
                confirmedParticipants.map(async (item, idx) => {
                    const no = idx + 1;
                    const indentText = no % 2 !== 0 ? `${no}.` : `       ${no}.`;

                    // Cek status kehadiran
                    const statusKehadiranRaw = item.status_kehadiran || item.attendance_status || "";
                    const statusKehadiranTrimmed = String(statusKehadiranRaw).trim();
                    const statusLower = statusKehadiranTrimmed.toLowerCase();

                    const isHadir = statusLower === "hadir";
                    const isKeteranganLain = statusKehadiranTrimmed !== "" && !isHadir && statusLower !== "belum konfirmasi" && statusLower !== "-";

                    const sigUrl = item.signature_url || item.signature || item.ttd ||
                        item.User?.signature_url || item.User?.signature ||
                        item.user?.signature_url || item.user?.signature;

                    let base64Signature = null;

                    if (isHadir && sigUrl) {
                        base64Signature = await getBase64ImageFromUrl(sigUrl);
                    }

                    return {
                        no,
                        name: item.name || item.User?.name || item.user?.name || "-",
                        jabatan: item.jabatan || item.bidang || item.User?.jabatan || item.user?.jabatan || "-",
                        indentText,
                        isHadir,
                        isKeteranganLain,
                        statusText: statusKehadiranTrimmed,
                        hasSignature: isHadir && !!base64Signature,
                        base64Signature
                    };
                })
            );

            // 1. Masukkan peserta terdaftar ke baris tabel
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

            // 2. TAMBAHAN: Buat baris kosong tambahan untuk peserta susulan mendadak (walk-in)
            const totalPesertaTerdaftar = confirmedParticipants.length;
            const extraEmptyRows = 3;

            for (let i = 1; i <= extraEmptyRows; i++) {
                const no = totalPesertaTerdaftar + i;
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
                    minCellHeight: 12
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

            // TANDA TANGAN KEPALA BALAI / PIMPINAN
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

            const pdfBlobUrl = doc.output("bloburl");
            window.open(pdfBlobUrl, "_blank");

        } catch (err) {
            console.error("Gagal export PDF Daftar Hadir:", err);
            showAlert("error", "Error PDF!", "Terjadi kesalahan saat mengekspor dokumen PDF.");
        }
    };

    const getUserId = (user) => Number(user.user_id || user.id);

    const isMeetingStarted = () => {
        if (!meetingStartTime) return false;
        return new Date() >= meetingStartTime;
    };

    const showAlert = (type, title, message) => {
        setAlertModal({ show: true, type, title, message });
    };

    const closeAlert = () => {
        setAlertModal({ ...alertModal, show: false });
    };

    const handleOpenModal = () => {
        if (isMeetingStarted()) {
            showAlert("error", "Akses Dibatasi", "Rapat sudah dimulai. Anda tidak dapat mengubah daftar peserta.");
            return;
        }
        setSelectedUserIds(confirmedParticipants.map((p) => Number(p.user_id)));
        setSelectedCommitteeId("");
        setShowModal(true);
    };

    const handleToggleUser = (userId) => {
        const idNum = Number(userId);
        if (selectedUserIds.includes(idNum)) {
            setSelectedUserIds(selectedUserIds.filter((id) => id !== idNum));
        } else {
            setSelectedUserIds([...selectedUserIds, idNum]);
        }
    };

    const groupedUsers = allUsers.reduce((acc, user) => {
        const bidangName = user.bidang || "Lainnya";
        if (!acc[bidangName]) acc[bidangName] = [];
        acc[bidangName].push(user);
        return acc;
    }, {});

    const isAllSelected = allUsers.length > 0 && selectedUserIds.length === allUsers.length;

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedUserIds([]);
        } else {
            setSelectedUserIds(allUsers.map((u) => getUserId(u)));
        }
    };

    const handleSelectAllByBidang = (bidangName, usersInBidang) => {
        const bidangUserIds = usersInBidang.map((u) => getUserId(u));
        const isBidangAllSelected = bidangUserIds.every((id) => selectedUserIds.includes(id));

        if (isBidangAllSelected) {
            setSelectedUserIds(selectedUserIds.filter((id) => !bidangUserIds.includes(id)));
        } else {
            const newSelected = new Set([...selectedUserIds, ...bidangUserIds]);
            setSelectedUserIds(Array.from(newSelected));
        }
    };

    const handleSelectCommitteeMembers = (committeeId) => {
        setSelectedCommitteeId(committeeId);
        if (!committeeId) return;

        const targetCommittee = committees.find((c) => String(c.committee_id) === String(committeeId));
        if (targetCommittee && Array.isArray(targetCommittee.members)) {
            const committeeUserIds = targetCommittee.members.map((m) => getUserId(m));
            const combinedUserIds = new Set([...selectedUserIds, ...committeeUserIds]);
            setSelectedUserIds(Array.from(combinedUserIds));
        }
    };

    const handleSaveParticipants = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/meetings/${meetingId}/participants`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ userIds: selectedUserIds }),
            });

            const result = await response.json();
            if (response.ok) {
                setShowModal(false);
                await fetchInitialData();
                showAlert("success", "Berhasil!", result.message || "Berhasil memperbarui data peserta!");
            } else {
                showAlert("error", "Gagal!", result.message || "Gagal menyimpan peserta.");
            }
        } catch (error) {
            console.error("ERROR SIMPAN PESERTA:", error);
            showAlert("error", "Error!", "Terjadi kesalahan koneksi ke server.");
        }
    };

    const handleRemoveParticipant = async (userId) => {
        if (isMeetingStarted()) {
            showAlert("error", "Akses Ditutup", "Aksi hapus tidak berlaku lagi karena rapat telah dimulai.");
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/meetings/${meetingId}/participants/${userId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            const result = await response.json();
            if (response.ok) {
                await fetchInitialData();
                showAlert("success", "Berhasil!", result.message || "Peserta berhasil dihapus dari rapat!");
            } else {
                showAlert("error", "Gagal!", result.message || "Gagal menghapus peserta.");
            }
        } catch (err) {
            console.error("Error removing participant:", err);
            showAlert("error", "Error!", "Terjadi masalah koneksi.");
        }
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
        actionButtonGroup: {
            display: "flex",
            alignItems: "center",
            gap: isSmallMobile ? "6px" : "10px",
            flexWrap: isSmallMobile ? "wrap" : "nowrap",
            width: isMobile ? "100%" : "auto",
            justifyContent: "flex-end",
            marginLeft: "auto",
        },
        btnSettingTTD: {
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
        btnTambah: {
            backgroundColor: isMeetingStarted() ? "#9ca3af" : "#2D7A68",
            color: "#ffffff",
            border: "none",
            padding: isSmallMobile ? "7px 14px" : "9px 20px",
            borderRadius: "8px",
            fontSize: isSmallMobile ? "12px" : "13px",
            fontWeight: 600,
            cursor: isMeetingStarted() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            flex: isSmallMobile ? "100%" : "none",
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
            minWidth: "700px",
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
        iconBtnDelete: {
            background: isMeetingStarted() ? "#f3f4f6" : "#fee2e2",
            border: "none",
            borderRadius: "4px",
            cursor: isMeetingStarted() ? "not-allowed" : "pointer",
            color: isMeetingStarted() ? "#9ca3af" : "#ef4444",
            padding: "6px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
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
        modalCardTTD: {
            backgroundColor: "#ffffff",
            padding: isSmallMobile ? "20px 18px" : "24px 28px",
            borderRadius: "16px",
            boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.15)",
            textAlign: "center",
            maxWidth: "420px",
            width: "90%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            maxHeight: "90vh",
            overflowY: "auto",
        },
        formGroup: {
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "6px",
            width: "100%"
        },
        formLabel: {
            fontSize: isSmallMobile ? "11px" : "12px",
            fontWeight: "600",
            color: "#374151"
        },
        formInput: {
            width: "100%",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            fontSize: isSmallMobile ? "12px" : "13px",
            outline: "none",
            boxSizing: "border-box"
        },
        modalCard: {
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            width: "90%",
            maxWidth: "540px",
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
        committeeBox: {
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
        },
        bidangHeader: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#f9fafb",
            padding: "8px 12px",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: isSmallMobile ? "12px" : "13px",
            color: "#374151",
            marginTop: "8px",
        },
        userRow: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            borderBottom: "1px solid #f3f4f6",
        },
        userInfo: {
            display: "flex",
            alignItems: "center",
            gap: "12px",
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

    return (
        <div style={styles.container}>
            <div style={styles.topBar}>
                <span style={{ fontSize: isSmallMobile ? "12px" : "14px", fontWeight: 600, color: "#374151" }}>
                    Total Peserta: {confirmedParticipants.length} Orang
                </span>

                <div style={styles.actionButtonGroup}>
                    <button
                        onClick={handleOpenTTDModal}
                        style={styles.btnSettingTTD}
                        title="Atur Kop & TTD Pimpinan"
                    >
                        ⚙️ TTD
                    </button>

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

                    <button
                        style={styles.btnTambah}
                        onClick={handleOpenModal}
                        disabled={isMeetingStarted()}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Tambah Peserta Rapat
                    </button>
                </div>
            </div>

            <div style={styles.tableCard}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>No</th>
                            <th style={styles.th}>Nama</th>
                            <th style={styles.th}>NIP</th>
                            <th style={styles.th}>Bidang</th>
                            <th style={styles.th}>Jabatan</th>
                            <th style={styles.th}>Hp</th>
                            <th style={styles.th}>Status Undangan</th>
                            <th style={styles.th}>Status Kehadiran</th>
                            <th style={styles.th}>Catatan</th>
                            <th style={styles.th}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="10" style={{ ...styles.td, padding: "30px", color: "#6b7280" }}>
                                    Memuat data peserta rapat...
                                </td>
                            </tr>
                        ) : confirmedParticipants.length > 0 ? (
                            confirmedParticipants.map((item, index) => (
                                <tr key={item.participant_id || item.user_id}>
                                    <td style={styles.td}>{index + 1}</td>
                                    <td style={{ ...styles.td, fontWeight: 600, color: "#1f2937", textAlign: "left" }}>
                                        {item.name || item.User?.name || item.user?.name}
                                    </td>
                                    <td style={styles.td}>{item.nip || item.User?.nip || item.user?.nip}</td>
                                    <td style={styles.td}>{item.bidang || item.User?.bidang || item.user?.bidang}</td>
                                    <td style={styles.td}>{item.jabatan || item.User?.jabatan || item.user?.jabatan}</td>
                                    <td style={styles.td}>{item.phone || item.User?.phone || item.user?.phone || "-"}</td>
                                    <td style={styles.td}>{item.invitation_status}</td>
                                    <td style={styles.td}>{item.status_kehadiran || item.attendance_status || "-"}</td>
                                    <td style={styles.td}>{item.notes || "-"}</td>
                                    <td style={styles.td}>
                                        <button
                                            style={styles.iconBtnDelete}
                                            title={isMeetingStarted() ? "Akses hapus ditutup (Rapat sudah dimulai)" : "Hapus dari Rapat"}
                                            disabled={isMeetingStarted()}
                                            onClick={() => handleRemoveParticipant(item.user_id)}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                <line x1="10" y1="11" x2="10" y2="17" />
                                                <line x1="14" y1="11" x2="14" y2="17" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="10" style={{ ...styles.td, padding: "30px", color: "#6b7280" }}>
                                    Belum ada peserta di rapat ini.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL ATUR TTD & KOP */}
            {showTTDModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalCardTTD}>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#2D7A68" }}>
                            Pengaturan Kop & TTD Pimpinan
                        </h3>

                        <form onSubmit={handleSaveTTD} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Kode Dokumen Kop</label>
                                <input
                                    type="text"
                                    style={styles.formInput}
                                    value={tempKodeDokumen}
                                    onChange={(e) => setTempKodeDokumen(e.target.value)}
                                    placeholder="Contoh: PMT-M06-02"
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Revisi Kop</label>
                                <input
                                    type="text"
                                    style={styles.formInput}
                                    value={tempRevisi}
                                    onChange={(e) => setTempRevisi(e.target.value)}
                                    placeholder="Contoh: 01"
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Tanggal Kop</label>
                                <input
                                    type="text"
                                    style={styles.formInput}
                                    value={tempTanggalKop}
                                    onChange={(e) => setTempTanggalKop(e.target.value)}
                                    placeholder="Contoh: 23 Oktober 2023"
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.formLabel}>Pilih Kepala / Pimpinan Penandatangan</label>
                                <select
                                    style={styles.formInput}
                                    value={tempSelectedKepalaId}
                                    onChange={(e) => setTempSelectedKepalaId(e.target.value)}
                                >
                                    <option value="">-- Pilih Pimpinan --</option>
                                    {pimpinanUsers.map((p) => (
                                        <option key={p.user_id || p.id} value={p.user_id || p.id}>
                                            {p.name} - {p.jabatan}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={styles.modalButtonGroup}>
                                <button type="button" onClick={() => setShowTTDModal(false)} style={styles.btnBatal}>
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

            {/* MODAL TAMBAH PESERTA */}
            {showModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalCard}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Tambah Peserta Rapat</h3>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#9ca3af" }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            <div style={styles.committeeBox}>
                                <span style={{ fontSize: "12px", fontWeight: "600", color: "#166534" }}>
                                    Impor dari Kepanitiaan (Opsional)
                                </span>
                                <select
                                    style={{ ...styles.formInput, backgroundColor: "#ffffff" }}
                                    value={selectedCommitteeId}
                                    onChange={(e) => handleSelectCommitteeMembers(e.target.value)}
                                >
                                    <option value="">-- Pilih Kepanitiaan --</option>
                                    {committees.map((c) => (
                                        <option key={c.committee_id} value={c.committee_id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "4px" }}>
                                <span style={{ fontSize: "13px", fontWeight: "600", color: "#1f2937" }}>Daftar Pegawai</span>
                                <button
                                    onClick={handleSelectAll}
                                    style={{ background: "none", border: "none", color: "#2D7A68", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                                >
                                    {isAllSelected ? "Batal Pilih Semua" : "Pilih Semua Pegawai"}
                                </button>
                            </div>

                            {Object.keys(groupedUsers).map((bidangName) => {
                                const usersInBidang = groupedUsers[bidangName];
                                return (
                                    <div key={bidangName}>
                                        <div style={styles.bidangHeader}>
                                            <span>{bidangName}</span>
                                            <button
                                                onClick={() => handleSelectAllByBidang(bidangName, usersInBidang)}
                                                style={{ background: "none", border: "none", color: "#2D7A68", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}
                                            >
                                                Pilih Bidang Ini
                                            </button>
                                        </div>

                                        {usersInBidang.map((u) => {
                                            const uId = getUserId(u);
                                            const isSelected = selectedUserIds.includes(uId);

                                            return (
                                                <div key={uId} style={styles.userRow}>
                                                    <div style={styles.userInfo}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleUser(uId)}
                                                            style={{ cursor: "pointer" }}
                                                        />
                                                        <div>
                                                            <div style={{ fontSize: "13px", fontWeight: "600", color: "#1f2937" }}>{u.name}</div>
                                                            <div style={{ fontSize: "11px", color: "#6b7280" }}>{u.jabatan || "-"}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={styles.modalFooter}>
                            <button onClick={() => setShowModal(false)} style={styles.btnBatal}>
                                Batal
                            </button>
                            <button onClick={handleSaveParticipants} style={styles.btnSimpan}>
                                Simpan Peserta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ALERT MODAL */}
            {alertModal.show && (
                <div style={styles.modalOverlay}>
                    <div style={styles.alertCard}>
                        <div style={alertModal.type === "success" ? styles.alertIconSuccess : styles.alertIconError}>
                            {alertModal.type === "success" ? "✓" : "✕"}
                        </div>
                        <h3 style={styles.alertTitle}>{alertModal.title}</h3>
                        <p style={styles.alertMessage}>{alertModal.message}</p>
                        <button onClick={closeAlert} style={styles.alertButton}>
                            OK
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}