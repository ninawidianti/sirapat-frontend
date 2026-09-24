import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import logo from "../../assets/logo_kementan.png";

export default function DetailNotulensiRapat() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Data User Terlogin
  const userStored = JSON.parse(localStorage.getItem("user") || "{}");
  const userName = userStored.name || "Nina Widianti";
  const token = localStorage.getItem("token");

  // Responsive State & Logout Modal
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // State Data Rapat & Notulensi
  const [meetingData, setMeetingData] = useState(null);
  const [minuteData, setMinuteData] = useState(null);
  const [loading, setLoading] = useState(true);

  // State Form Notulensi
  const [discussion, setDiscussion] = useState("");
  const [decisions, setDecisions] = useState("");
  const [invitationImgs, setInvitationImgs] = useState([]);
  const [documentationImgs, setDocumentationImgs] = useState([]);

  // State Preview Gambar
  const [invitationPreviews, setInvitationPreviews] = useState([]);
  const [documentationPreviews, setDocumentationPreviews] = useState([]);

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
  const [cameraTarget, setCameraTarget] = useState("");
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (meetingId) {
      fetchMeetingAndMinuteData();
    }
  }, [meetingId]);

  // Helper Format URL Gambar
  const formatImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
      return url;
    }
    return `http://localhost:5000/${url.replace(/\\/g, "/")}`;
  };

  // Helper Parsing Gambar
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

  // Helper Dynamic Konversi Gambar/URL ke Base64 & Format Tepat (Untuk jsPDF)
  const getBase64ImageFromUrl = async (imageUrl) => {
    if (!imageUrl) {
      throw new Error("URL gambar kosong");
    }

    // 1. Jika URL sudah berformat Base64
    if (imageUrl.startsWith("data:")) {
      const formatMatch = imageUrl.match(/^data:image\/([a-zA-Z]+);base64,/);
      const rawFormat = formatMatch ? formatMatch[1].toUpperCase() : "PNG";
      return {
        data: imageUrl,
        format: rawFormat === "JPEG" || rawFormat === "JPG" ? "JPEG" : rawFormat,
      };
    }

    // 2. Jika merupakan Blob URL local atau static media import Webpack/Vite
    if (imageUrl.startsWith("blob:") || imageUrl.includes("static/media")) {
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

          resolve({
            data: canvas.toDataURL("image/png"),
            format: "PNG",
          });
        };
        img.onerror = (err) => reject(err);
      });
    }

    // 3. Fetch gambar dari server (Backend / Storage)
    const response = await fetch(imageUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error(`Gagal fetch gambar: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();

    let rawFormat = blob.type ? blob.type.split("/")[1].toUpperCase() : "JPEG";
    if (rawFormat === "JPG") rawFormat = "JPEG";

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          data: reader.result,
          format: rawFormat,
        });
      };
      reader.onerror = () => {
        reject(new Error("Gagal mengonversi file gambar ke Base64"));
      };
      reader.readAsDataURL(blob);
    });
  };

  // Helper Format Tanggal
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTimeRange = (start, end) => {
    if (!start || !end) return "-";
    const startTime = start.substring(0, 5);
    const endTime = end.substring(0, 5);
    return `${startTime} - ${endTime} WIB`;
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

  // Helper Penentu Status Otomatis
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

  // Helper Warna Badge Status Dinamis
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case "Terjadwal":
        return {
          backgroundColor: "#dcfce7",
          color: "#15803d",
        };
      case "Selesai":
        return {
          backgroundColor: "#dbeafe",
          color: "#1d4ed8",
        };
      case "Batal":
        return {
          backgroundColor: "#fee2e2",
          color: "#b91c1c",
        };
      default:
        return {
          backgroundColor: "#f3f4f6",
          color: "#374151",
        };
    }
  };

  // Fetch Data Rapat & Notulensi Sekaligus
  const fetchMeetingAndMinuteData = async () => {
    try {
      setLoading(true);

      // Fetch Detail Rapat
      const resMeeting = await fetch(`http://localhost:5000/api/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resultMeeting = await resMeeting.json();
      if (resMeeting.ok) {
        setMeetingData(resultMeeting.data);
      }

      // Fetch Data Notulensi
      const resMinute = await fetch(`http://localhost:5000/api/minutes/meeting/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resultMinute = await resMinute.json();

      if (resMinute.ok && resultMinute.data) {
        setMinuteData(resultMinute.data);
        setDiscussion(resultMinute.data.discussion || "");
        setDecisions(resultMinute.data.decisions || "");
      } else {
        setMinuteData(null);
      }
    } catch (err) {
      console.error("Error fetching detail data:", err);
      showAlert("error", "Error!", "Gagal memuat detail rapat dan notulensi.");
    } finally {
      setLoading(false);
    }
  };

  // FUNGSI EXPORT PDF NOTULEN RAPAT (PREVIEW DI TAB BARU)
  const handleExportPDF = async () => {
    try {
      if (!minuteData) {
        showAlert("error", "Export Gagal", "Belum ada data notulensi untuk diekspor.");
        return;
      }

      const activeMeeting = meetingData || {};
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const startX = 20;
      const endX = 190;
      const contentWidth = endX - startX;
      const pageHeight = doc.internal.pageSize.getHeight();

      let currentY = 15;

      // Logo Kementan
      try {
        const logoObj = await getBase64ImageFromUrl(logo);
        doc.addImage(logoObj.data, logoObj.format, startX, currentY, 13, 13);
      } catch (e) {
        console.warn("Logo tidak dimuat:", e);
      }

      // Teks Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("BALAI VETERINER BUKITTINGGI", (startX + endX) / 2, currentY + 4, { align: "center" });

      doc.setFontSize(10);
      doc.text("NOTULEN RAPAT", (startX + endX) / 2, currentY + 9, { align: "center" });

      currentY += 18;

      const formatDateForPDF = (dateStr) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return date.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      };

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);

      doc.text("Hari/Tanggal", startX, currentY);
      doc.text(`:  ${formatDateForPDF(activeMeeting.date)}`, startX + 30, currentY);

      currentY += 5;
      doc.text("Tempat", startX, currentY);
      doc.text(`:  ${activeMeeting.location || activeMeeting.room || "-"}`, startX + 30, currentY);

      currentY += 5;
      doc.text("Topik", startX, currentY);
      doc.text(`:  ${activeMeeting.title || activeMeeting.agenda || "-"}`, startX + 30, currentY);

      currentY += 4;

      // Garis Pembatas Kop Surat
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
        maxWidth: contentWidth,
      });
      currentY += discussionLines.length * 4.5 + 6;

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
        maxWidth: contentWidth,
      });
      currentY += decisionLines.length * 4.5 + 6;

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

          const xPos = startX + col * (imgWidth + gap);
          try {
            const imgObj = await getBase64ImageFromUrl(imageList[i]);
            doc.addImage(
              imgObj.data,
              imgObj.format,
              xPos,
              currentY,
              imgWidth,
              imgHeight
            );
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

      const formattedDateForName = activeMeeting.date
        ? new Date(activeMeeting.date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
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

  const showAlert = (type, title, message) => {
    setAlertModal({ show: true, type, title, message });
  };

  const closeAlert = () => {
    setAlertModal({ ...alertModal, show: false });
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

  const isMobile = windowWidth <= 768;
  const isSmallMobile = windowWidth <= 480;

  const currentStatus = getComputedStatus(meetingData);
  const badgeStyle = getStatusBadgeStyle(currentStatus);

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
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
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
      gap: "12px",
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
      fontSize: "clamp(14px, 3.5vw, 18px)",
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
      maxWidth: isSmallMobile ? "90px" : "160px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    logoutBtn: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      color: "#ffffff",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      padding: "6px 12px",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "clamp(11px, 2.8vw, 13px)",
      fontWeight: 500,
      marginLeft: isSmallMobile ? "4px" : "12px",
      transition: "background-color 0.2s",
    },
    avatarCircle: {
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      backgroundColor: "#ffffff",
      color: "#2D7A68",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "bold",
      flexShrink: 0,
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
      padding: "10px 0",
      color: "#ffffff",
      fontWeight: 700,
      borderBottom: "3px solid #ffffff",
      fontSize: "clamp(12px, 3vw, 14px)",
      whiteSpace: "nowrap",
      background: "none",
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
      cursor: "pointer",
    },
    navLink: {
      padding: "10px 0",
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
      maxWidth: "1000px",
      width: "100%",
      margin: "0 auto",
      padding: "clamp(12px, 3vw, 24px)",
      display: "flex",
      flexDirection: "column",
      gap: "clamp(16px, 3vw, 20px)",
      boxSizing: "border-box",
    },
    meetingCard: {
      backgroundColor: "#ffffff",
      borderRadius: "10px",
      padding: "clamp(12px, 3vw, 16px)",
      border: "1px solid #e5e7eb",
      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      textAlign: "left",
    },
    actionBar: {
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: "12px",
    },
    btnExportPdf: {
      backgroundColor: "#2D7A68",
      color: "#ffffff",
      border: "none",
      padding: "8px 16px",
      borderRadius: "6px",
      fontSize: "clamp(12px, 2.8vw, 13px)",
      fontWeight: 600,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    sectionBlock: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      textAlign: "left",
    },
    sectionHeaderTitle: {
      fontSize: "clamp(14px, 3.5vw, 15px)",
      fontWeight: 700,
      color: "#1f2937",
      margin: 0,
    },
    cardBlock: {
      backgroundColor: "#ffffff",
      borderRadius: "12px",
      border: "1px solid #e5e7eb",
      padding: "clamp(14px, 3.5vw, 20px)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
    },
    sectionContent: {
      fontSize: "clamp(12px, 3vw, 13px)",
      color: "#4b5563",
      lineHeight: 1.6,
      whiteSpace: "pre-line",
      margin: 0,
      textAlign: "justify",
    },
    imageGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(clamp(140px, 30vw, 220px), 1fr))",
      gap: "16px",
      marginTop: "8px",
    },
    imageContainer: {
      position: "relative",
      borderRadius: "8px",
      overflow: "hidden",
      border: "1px solid #e5e7eb",
      height: "clamp(120px, 25vw, 160px)",
      backgroundColor: "#f9fafb",
    },
    imagePreview: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      display: "block",
    },
    footer: {
      backgroundColor: "#2D7A68",
      color: "#ffffff",
      padding: "12px 16px",
      textAlign: "center",
      fontSize: "clamp(11px, 2.5vw, 12px)",
      marginTop: "auto",
    },
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100vh",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
      padding: "16px",
      boxSizing: "border-box",
    },
    modalCard: {
      backgroundColor: "#ffffff",
      borderRadius: "16px",
      width: "100%",
      maxWidth: "600px",
      maxHeight: "85vh",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
      overflow: "hidden",
      boxSizing: "border-box",
    },
    btnBatal: {
      padding: "8px 20px",
      border: "1px solid #d1d5db",
      borderRadius: "8px",
      backgroundColor: "#ff6b6b",
      color: "#ffffff",
      fontSize: "clamp(12px, 2.8vw, 13px)",
      fontWeight: 600,
      cursor: "pointer",
    },
    alertCard: {
      backgroundColor: "#ffffff",
      borderRadius: "20px",
      width: "100%",
      maxWidth: "380px",
      padding: "clamp(24px, 6vw, 32px) clamp(16px, 4vw, 24px) clamp(16px, 4vw, 24px) clamp(16px, 4vw, 24px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
      boxSizing: "border-box",
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
      fontSize: "clamp(18px, 4.5vw, 20px)",
      fontWeight: "700",
      color: "#111827",
      marginBottom: "8px",
    },
    alertMessage: {
      fontSize: "clamp(13px, 3vw, 14px)",
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
      fontSize: "clamp(13px, 3vw, 14px)",
      fontWeight: "700",
      cursor: "pointer",
    },
  };

  const invitationImagesList = minuteData ? parseImages(minuteData.invitation_img) : [];
  const documentationImagesList = minuteData ? parseImages(minuteData.documentation_img) : [];

  return (
    <div style={styles.container}>
      {/* Header Navbar */}
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

        <div style={styles.headerNav}>
          <button onClick={() => navigate("/user/dashboard-user")} style={styles.navLink}>
            Home
          </button>
          <button onClick={() => navigate("/user/jadwal-rapat")} style={styles.navLinkActive}>
            Jadwal Rapat
          </button>
          <button onClick={() => navigate("/user/tindak-lanjut")} style={styles.navLink}>
            Tindak Lanjut
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={styles.main}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#6b7280", fontSize: "13px" }}>
            Memuat data rapat dan notulensi...
          </div>
        ) : (
          <>
            {/* 1. Header Card Detail Rapat */}
            <div style={styles.meetingCard}>
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
                    {meetingData?.title || "Judul Rapat"}
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
                    {meetingData?.description || meetingData?.agenda || "-"}
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
                  {meetingData?.meeting_code || meetingData?.code || "-"}
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
                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>{formatDate(meetingData?.date)}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <span>{formatTimeRange(meetingData?.start_time || meetingData?.time, meetingData?.end_time)}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>{meetingData?.creator ? meetingData.creator.name : "Admin"}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={badgeStyle.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span
                    style={{
                      backgroundColor: badgeStyle.backgroundColor,
                      color: badgeStyle.color,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontWeight: 600,
                      fontSize: "11px",
                      display: "inline-block",
                    }}
                  >
                    {currentStatus}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>{meetingData?.location || "-"}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 8 10"></polyline>
                  </svg>
                  <span style={{ color: "#9ca3af" }}>Dibuat: {formatCreatedDate(meetingData?.created_at)}</span>
                </div>
              </div>
            </div>

            {/* 2. Tombol Export PDF */}
            <div style={styles.actionBar}>
              <button style={styles.btnExportPdf} onClick={handleExportPDF}>
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

            {/* 3. Deskripsi Notulensi */}
            <div style={styles.sectionBlock}>
              <h3 style={styles.sectionHeaderTitle}>Deskripsi Notulensi</h3>
              <div style={styles.cardBlock}>
                <p style={styles.sectionContent}>
                  {minuteData?.discussion || "Belum ada deskripsi notulensi."}
                </p>
              </div>
            </div>

            {/* 4. Keputusan */}
            <div style={styles.sectionBlock}>
              <h3 style={styles.sectionHeaderTitle}>Keputusan</h3>
              <div style={styles.cardBlock}>
                <p style={styles.sectionContent}>
                  {minuteData?.decisions || "Belum ada keputusan rapat."}
                </p>
              </div>
            </div>

            {/* 5. Undangan */}
            <div style={styles.sectionBlock}>
              <h3 style={styles.sectionHeaderTitle}>Undangan</h3>
              <div style={styles.cardBlock}>
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
                    Tidak ada gambar undangan.
                  </p>
                )}
              </div>
            </div>

            {/* 6. Dokumentasi */}
            <div style={styles.sectionBlock}>
              <h3 style={styles.sectionHeaderTitle}>Dokumentasi</h3>
              <div style={styles.cardBlock}>
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
                    Tidak ada gambar dokumentasi.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modal Logout */}
      {showLogoutModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalCard, maxWidth: "340px", padding: "24px", textAlign: "center" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Konfirmasi Logout</h3>
            <p style={{ fontSize: "13px", color: "#4b5563", margin: "12px 0 20px 0" }}>
              Apakah Anda yakin ingin keluar dari aplikasi?
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowLogoutModal(false)}
                style={{ ...styles.btnBatal, flex: 1, backgroundColor: "#ffffff", color: "#374151" }}
              >
                Batal
              </button>
              <button
                onClick={executeLogout}
                style={{ ...styles.btnBatal, flex: 1, backgroundColor: "#dc2626" }}
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Alert Feedback */}
      {alertModal.show && (
        <div style={styles.modalOverlay}>
          <div style={styles.alertCard}>
            <div style={styles.alertIconError}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h3 style={styles.alertTitle}>{alertModal.title}</h3>
            <p style={styles.alertMessage}>{alertModal.message}</p>
            <button style={styles.alertButton} onClick={closeAlert}>
              OK
            </button>
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