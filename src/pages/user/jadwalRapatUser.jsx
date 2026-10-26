import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/logo_kementan.png";

// ==========================================
// KOMPONEN SPINNER ALARM-STYLE TIME PICKER
// ==========================================
const AlarmTimePicker = ({ value, onChange, label }) => {
  const [hours, minutes] = (value || "08:00").split(":");

  const hoursList = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutesList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

  const hoursRef = useRef(null);
  const minutesRef = useRef(null);

  useEffect(() => {
    const itemHeight = 26;
    const selectedHourIndex = hoursList.indexOf(hours);
    const selectedMinuteIndex = minutesList.indexOf(minutes);

    if (hoursRef.current && selectedHourIndex !== -1) {
      hoursRef.current.scrollTo({
        top: selectedHourIndex * itemHeight,
        behavior: "smooth",
      });
    }

    if (minutesRef.current && selectedMinuteIndex !== -1) {
      minutesRef.current.scrollTo({
        top: selectedMinuteIndex * itemHeight,
        behavior: "smooth",
      });
    }
  }, [value]);

  const handleHourChange = (newHour) => {
    onChange(`${newHour}:${minutes}`);
  };

  const handleMinuteChange = (newMinute) => {
    onChange(`${hours}:${newMinute}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
      <span style={{ fontSize: "clamp(11px, 2.5vw, 12px)", fontWeight: 600, color: "#4b5563" }}>
        {label}
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          backgroundColor: "#f9fafb",
          borderRadius: "12px",
          padding: "8px 12px",
          border: "1px solid #e5e7eb",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Wheel Jam */}
        <div
          ref={hoursRef}
          style={{
            height: "80px",
            overflowY: "auto",
            scrollSnapType: "y mandatory",
            width: "48px",
            textAlign: "center",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {hoursList.map((h) => {
            const isSelected = h === hours;
            return (
              <div
                key={h}
                onClick={() => handleHourChange(h)}
                style={{
                  height: "26px",
                  lineHeight: "26px",
                  scrollSnapAlign: "center",
                  cursor: "pointer",
                  fontSize: isSelected ? "clamp(14px, 3.5vw, 16px)" : "clamp(12px, 3vw, 13px)",
                  fontWeight: isSelected ? "700" : "400",
                  color: isSelected ? "#2D7A68" : "#9ca3af",
                  backgroundColor: isSelected ? "#e6f4ea" : "transparent",
                  borderRadius: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                {h}
              </div>
            );
          })}
        </div>

        <span style={{ fontWeight: "700", color: "#2D7A68", fontSize: "16px", paddingBottom: "2px" }}>
          :
        </span>

        {/* Wheel Menit */}
        <div
          ref={minutesRef}
          style={{
            height: "80px",
            overflowY: "auto",
            scrollSnapType: "y mandatory",
            width: "48px",
            textAlign: "center",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {minutesList.map((m) => {
            const isSelected = m === minutes;
            return (
              <div
                key={m}
                onClick={() => handleMinuteChange(m)}
                style={{
                  height: "26px",
                  lineHeight: "26px",
                  scrollSnapAlign: "center",
                  cursor: "pointer",
                  fontSize: isSelected ? "clamp(14px, 3.5vw, 16px)" : "clamp(12px, 3vw, 13px)",
                  fontWeight: isSelected ? "700" : "400",
                  color: isSelected ? "#2D7A68" : "#9ca3af",
                  backgroundColor: isSelected ? "#e6f4ea" : "transparent",
                  borderRadius: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                {m}
              </div>
            );
          })}
        </div>

        <span style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", marginLeft: "4px" }}>
          WIB
        </span>
      </div>
    </div>
  );
};

export default function JadwalRapat() {
  const userStored = JSON.parse(localStorage.getItem("user") || "{}");
  const adminName = userStored.name || "Admin";
  const userRole = userStored.role ? String(userStored.role).toLowerCase() : "";

  const navigate = useNavigate();
  const location = useLocation();

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const [alertModal, setAlertModal] = useState({
    show: false,
    type: "success",
    title: "Berhasil!",
    message: "",
  });

  const showAlert = (message, type = "success", title = null) => {
    setAlertModal({
      show: true,
      type,
      title: title || (type === "success" ? "Berhasil!" : "Gagal!"),
      message,
    });
  };

  const closeAlert = () => {
    setAlertModal((prev) => ({ ...prev, show: false }));
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    agenda: "",
    date: "",
    start_time: "08:00",
    end_time: "09:00",
    location: "",
    description: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editFormData, setEditFormData] = useState({
    title: "",
    agenda: "",
    date: "",
    start_time: "",
    end_time: "",
    location: "",
    description: "",
    status: "Terjadwal",
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedMeetingForConfirm, setSelectedMeetingForConfirm] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("Hadir");
  const [notes, setNotes] = useState("");
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("2026");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  const isSmallMobile = windowWidth <= 480;

  const isAttendanceOpen = (meeting) => {
    if (!meeting || !meeting.date || !meeting.start_time) {
      return { isOpen: false, reason: "Data rapat tidak lengkap" };
    }

    const now = new Date();
    const dateStr = typeof meeting.date === "string" ? meeting.date.split("T")[0] : "";
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = meeting.start_time.split(":").map(Number);

    if (!year || !month || !day) {
      return { isOpen: false, reason: "Format tanggal tidak valid" };
    }

    const meetingStart = new Date(year, month - 1, day, hours || 0, minutes || 0, 0);
    // Konfirmasi dibuka 1 jam sebelum jadwal rapat
    const openTime = new Date(meetingStart.getTime() - 60 * 60 * 1000);
    // Batas waktu konfirmasi yaitu 2 minggu (14 hari) setelah jadwal rapat
    const closeTime = new Date(meetingStart.getTime() + 14 * 24 * 60 * 60 * 1000);

    if (now < openTime) {
      return { isOpen: false, reason: "Konfirmasi dibuka 1 jam sebelum rapat" };
    }

    if (now > closeTime) {
      return { isOpen: false, reason: "Waktu konfirmasi telah berakhir" };
    }

    return { isOpen: true, reason: "" };
  };

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
        return { backgroundColor: "#dcfce7", color: "#15803d" };
      case "Selesai":
        return { backgroundColor: "#dbeafe", color: "#1d4ed8" };
      case "Batal":
        return { backgroundColor: "#fee2e2", color: "#b91c1c" };
      default:
        return { backgroundColor: "#f3f4f6", color: "#374151" };
    }
  };

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/meetings", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengambil data rapat");
      }

      setMeetings(result.data || []);
    } catch (err) {
      console.error("Fetch meetings error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateMeetingSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal membuat jadwal rapat");
      }

      setFormData({
        title: "",
        agenda: "",
        date: "",
        start_time: "08:00",
        end_time: "09:00",
        location: "",
        description: "",
      });
      setShowCreateModal(false);

      showAlert("Berhasil menambahkan jadwal rapat!", "success", "Berhasil!");
      fetchMeetings();
    } catch (err) {
      console.error("Create meeting error:", err);
      setCreateError(err.message);
      showAlert(err.message || "Gagal membuat jadwal rapat", "error", "Gagal!");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenEditModal = (meeting) => {
    setSelectedMeetingId(meeting.meeting_id);
    setEditFormData({
      title: meeting.title || "",
      agenda: meeting.agenda || "",
      date: meeting.date ? meeting.date.split("T")[0] : "",
      start_time: meeting.start_time ? meeting.start_time.substring(0, 5) : "08:00",
      end_time: meeting.end_time ? meeting.end_time.substring(0, 5) : "09:00",
      location: meeting.location || "",
      description: meeting.description || "",
      status: meeting.status || "Terjadwal",
    });
    setEditError("");
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditMeetingSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/meetings/${selectedMeetingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal memperbarui rapat");
      }

      setShowEditModal(false);
      showAlert("Berhasil memperbarui data rapat!", "success", "Berhasil!");
      fetchMeetings();
    } catch (err) {
      setEditError(err.message);
      showAlert(err.message || "Gagal memperbarui rapat", "error", "Gagal!");
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenDeleteModal = (meeting) => {
    setMeetingToDelete(meeting);
    setDeleteError("");
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!meetingToDelete) return;

    setDeleteLoading(true);
    setDeleteError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/meetings/${meetingToDelete.meeting_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal menghapus rapat");
      }

      setShowDeleteModal(false);
      setMeetingToDelete(null);
      showAlert("Berhasil menghapus jadwal rapat!", "success", "Berhasil!");
      fetchMeetings();
    } catch (err) {
      setDeleteError(err.message);
      showAlert(err.message || "Gagal menghapus rapat", "error", "Gagal!");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOpenConfirmModal = (meetingItem) => {
    const timeCheck = isAttendanceOpen(meetingItem);
    if (!timeCheck.isOpen) {
      showAlert(timeCheck.reason, "error", "Perhatian");
      return;
    }

    setSelectedMeetingForConfirm(meetingItem);
    setSelectedStatus("Hadir");
    setNotes("");
    setShowConfirmModal(true);
  };

  const handleSubmitAttendance = async () => {
    if (!selectedMeetingForConfirm) return;

    try {
      setSubmittingAttendance(true);
      const token = localStorage.getItem("token");
      const statusToSubmit = selectedStatus || "Belum Konfirmasi";

      const response = await fetch(
        `http://localhost:5000/api/meetings/${selectedMeetingForConfirm.meeting_id}/confirm-attendance`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: statusToSubmit,
            notes: notes,
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        setShowConfirmModal(false);
        showAlert("Konfirmasi kehadiran berhasil disimpan!", "success", "Berhasil!");
        fetchMeetings();
      } else {
        showAlert(result.message || "Gagal melakukan konfirmasi kehadiran", "error", "Gagal!");
      }
    } catch (err) {
      console.error("Error konfirmasi kehadiran:", err);
      showAlert("Terjadi kesalahan jaringan.", "error", "Gagal!");
    } finally {
      setSubmittingAttendance(false);
    }
  };

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

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const meetingDatesSet = new Set(
    meetings.map((m) => {
      if (!m.date) return "";
      const d = new Date(m.date);
      const yStr = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, "0");
      const dStr = String(d.getDate()).padStart(2, "0");
      return `${yStr}-${mStr}-${dStr}`;
    })
  );

  const meetingsOnSelectedDate = meetings.filter((m) => {
    if (!m.date) return false;
    const d = new Date(m.date);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, "0");
    const dStr = String(d.getDate()).padStart(2, "0");
    return `${yStr}-${mStr}-${dStr}` === selectedDateStr;
  });

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
      fontFamily: "Arial, Helvetica, sans-serif",
      boxSizing: "border-box",
      position: "relative",
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
      gap: "24px",
      boxSizing: "border-box",
    },
    topSectionGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "340px 1fr",
      gap: "24px",
      alignItems: "start",
    },
    calendarCard: {
      backgroundColor: "#ffffff",
      borderRadius: "16px",
      padding: isSmallMobile ? "14px" : "20px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      border: "1px solid #f3f4f6",
      width: "100%",
      boxSizing: "border-box",
    },
    calendarHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontWeight: 700,
      color: "#374151",
      fontSize: "clamp(13px, 3.2vw, 14px)",
      marginBottom: "16px",
    },
    calendarGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      gap: isSmallMobile ? "4px" : "8px",
      textAlign: "center",
      fontSize: "clamp(10px, 2.6vw, 12px)",
    },
    dayLabel: {
      fontWeight: 600,
      color: "#9ca3af",
      paddingBottom: "8px",
    },
    dateCell: {
      padding: "8px 0",
      borderRadius: "50%",
      cursor: "pointer",
      color: "#374151",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: isSmallMobile ? "28px" : "32px",
      height: isSmallMobile ? "28px" : "32px",
      margin: "0 auto",
      boxSizing: "border-box",
    },
    dateSelected: {
      backgroundColor: "#2D7A68",
      color: "#ffffff",
      fontWeight: 700,
    },
    dateHasMeeting: {
      backgroundColor: "#e6f4ea",
      color: "#2D7A68",
      fontWeight: 700,
      border: "1px solid #2D7A68",
    },
    dateMuted: {
      color: "#d1d5db",
      cursor: "default",
    },
    rightTopSection: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      width: "100%",
    },
    topBarAction: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionTitle: {
      fontSize: "clamp(14px, 3.5vw, 16px)",
      fontWeight: 700,
      color: "#2D7A68",
      borderBottom: "2px solid #2D7A68",
      width: "fit-content",
      paddingBottom: "4px",
      margin: 0,
    },
    btnTambahRapat: {
      backgroundColor: "#2D7A68",
      color: "#ffffff",
      border: "none",
      padding: "10px 20px",
      borderRadius: "8px",
      fontWeight: 600,
      fontSize: "clamp(12px, 3vw, 13px)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    cardSelectedMeeting: {
      backgroundColor: "#ffffff",
      borderRadius: "16px",
      padding: isSmallMobile ? "14px" : "20px",
      border: "1px solid #e5e7eb",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      boxSizing: "border-box",
      width: "100%",
    },
    detailButton: {
      backgroundColor: "#2D7A68",
      color: "#ffffff",
      border: "none",
      padding: "6px 20px",
      borderRadius: "6px",
      fontSize: "clamp(11px, 2.8vw, 12px)",
      fontWeight: 600,
      cursor: "pointer",
      alignSelf: "flex-end",
    },
    btnKehadiranPrimary: {
      padding: "6px 14px",
      border: "none",
      borderRadius: "6px",
      fontSize: "clamp(11px, 2.8vw, 12px)",
      fontWeight: 600,
      color: "#ffffff",
      backgroundColor: "#2D7A68",
      cursor: "pointer",
    },
    btnKehadiranDisabled: {
      padding: "6px 14px",
      border: "none",
      borderRadius: "6px",
      fontSize: "clamp(11px, 2.8vw, 12px)",
      fontWeight: 500,
      color: "#9ca3af",
      backgroundColor: "#f3f4f6",
      cursor: "not-allowed",
    },
    btnKehadiranSecondary: {
      padding: "6px 14px",
      border: "none",
      borderRadius: "6px",
      fontSize: "clamp(11px, 2.8vw, 12px)",
      fontWeight: 500,
      color: "#6b7280",
      backgroundColor: "#e5e7eb",
      cursor: "not-allowed",
    },
    confirmModalCard: {
      backgroundColor: "#ffffff",
      borderRadius: "16px",
      width: "90%",
      maxWidth: "520px",
      padding: isSmallMobile ? "20px" : "28px 32px",
      boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.15)",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      boxSizing: "border-box",
    },
    confirmModalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    confirmModalTitle: {
      fontSize: "clamp(14px, 3.5vw, 16px)",
      fontWeight: 700,
      color: "#2D7A68",
      margin: 0,
    },
    confirmSelect: {
      width: "100%",
      padding: "12px 16px",
      borderRadius: "8px",
      border: "1px solid #d1d5db",
      fontSize: "clamp(13px, 3vw, 14px)",
      color: "#374151",
      outline: "none",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      boxSizing: "border-box",
    },
    confirmTextarea: {
      width: "100%",
      minHeight: "110px",
      padding: "12px 16px",
      borderRadius: "8px",
      border: "1px solid #d1d5db",
      fontSize: "clamp(13px, 3vw, 14px)",
      color: "#374151",
      outline: "none",
      fontFamily: "inherit",
      resize: "vertical",
      boxSizing: "border-box",
    },
    confirmBtnCancel: {
      padding: "8px 24px",
      border: "none",
      borderRadius: "8px",
      backgroundColor: "#ff5c5c",
      color: "#ffffff",
      fontSize: "clamp(12px, 3vw, 13px)",
      fontWeight: 600,
      cursor: "pointer",
    },
    confirmBtnSubmit: {
      padding: "8px 24px",
      border: "none",
      borderRadius: "8px",
      backgroundColor: "#2D7A68",
      color: "#ffffff",
      fontSize: "clamp(12px, 3vw, 13px)",
      fontWeight: 600,
      cursor: "pointer",
    },
    tableSectionCard: {
      backgroundColor: "#ffffff",
      borderRadius: "16px",
      padding: isSmallMobile ? "14px" : "20px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      border: "1px solid #f3f4f6",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      width: "100%",
      boxSizing: "border-box",
    },
    tableFilterHeader: {
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isMobile ? "stretch" : "center",
      gap: "12px",
    },
    filterControls: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      flexWrap: "wrap",
      width: isMobile ? "100%" : "auto",
    },
    selectInput: {
      padding: "8px 32px 8px 12px",
      borderRadius: "10px",
      border: "1px solid #d1d5db",
      fontSize: "clamp(11px, 2.8vw, 13px)",
      backgroundColor: "#ffffff",
      outline: "none",
      color: "#374151",
      cursor: "pointer",
      boxSizing: "border-box",
    },
    searchInput: {
      padding: "8px 12px 8px 34px",
      borderRadius: "10px",
      border: "1px solid #d1d5db",
      fontSize: "clamp(11px, 2.8vw, 13px)",
      outline: "none",
      width: isMobile ? "100%" : "280px",
      boxSizing: "border-box",
      backgroundColor: "#ffffff",
      color: "#374151",
    },
    tableWrapper: {
      overflowX: "auto",
      width: "100%",
      WebkitOverflowScrolling: "touch",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "clamp(11px, 2.8vw, 12px)",
      textAlign: "left",
      minWidth: "750px",
    },
    th: {
      padding: "12px 8px",
      color: "#374151",
      fontWeight: 600,
      borderBottom: "1px solid #e5e7eb",
      backgroundColor: "#f9fafb",
      fontSize: "clamp(11px, 2.8vw, 12px)",
      textAlign: "center",
    },
    td: {
      padding: "12px 8px",
      color: "#4b5563",
      borderBottom: "1px solid #f3f4f6",
      verticalAlign: "top",
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
    footer: {
      backgroundColor: "#2D7A68",
      color: "#ffffff",
      padding: "12px",
      textAlign: "center",
      fontSize: "clamp(11px, 2.8vw, 12px)",
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
      overflow: "hidden",
      padding: "16px",
      boxSizing: "border-box",
    },
    modalCard: {
      backgroundColor: "#ffffff",
      padding: isSmallMobile ? "20px" : "24px 32px",
      borderRadius: "16px",
      boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.15)",
      textAlign: "center",
      maxWidth: "340px",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "12px",
      boxSizing: "border-box",
    },
    modalCardFormClean: {
      backgroundColor: "#ffffff",
      padding: isSmallMobile ? "20px" : "32px",
      borderRadius: "24px",
      boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.1)",
      maxWidth: "460px",
      width: "100%",
      maxHeight: "90vh",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      position: "relative",
      boxSizing: "border-box",
    },
    modalHeaderClean: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "8px",
    },
    modalTitleClean: {
      fontSize: "clamp(14px, 3.5vw, 16px)",
      fontWeight: 700,
      color: "#2D7A68",
      margin: 0,
    },
    btnCloseClean: {
      background: "none",
      border: "none",
      fontSize: "20px",
      color: "#9ca3af",
      cursor: "pointer",
      padding: "4px",
      lineHeight: 1,
    },
    inputClean: {
      padding: "8px 12px",
      borderRadius: "10px",
      border: "1px solid #e5e7eb",
      backgroundColor: "#f9fafb",
      fontSize: "clamp(12px, 3vw, 13px)",
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
      color: "#374151",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    },
    textareaClean: {
      padding: "10px 14px",
      borderRadius: "10px",
      border: "1px solid #e5e7eb",
      backgroundColor: "#f9fafb",
      fontSize: "clamp(12px, 3vw, 13px)",
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
      color: "#374151",
      minHeight: "80px",
      resize: "vertical",
      fontFamily: "Arial, Helvetica, sans-serif",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    },
    modalActionRight: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "12px",
      marginTop: "12px",
    },
    btnCancelClean: {
      padding: "10px 24px",
      border: "none",
      borderRadius: "10px",
      backgroundColor: "#f3f4f6",
      color: "#4b5563",
      fontSize: "clamp(12px, 3vw, 14px)",
      fontWeight: 600,
      cursor: "pointer",
    },
    btnSaveClean: {
      padding: "10px 28px",
      border: "none",
      borderRadius: "10px",
      backgroundColor: "#2D7A68",
      color: "#ffffff",
      fontSize: "clamp(12px, 3vw, 14px)",
      fontWeight: 600,
      cursor: "pointer",
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
  };

  const renderCalendarCells = () => {
    const cells = [];

    for (let i = firstDayIndex; i > 0; i--) {
      cells.push(
        <span key={`prev-${i}`} style={{ ...styles.dateCell, ...styles.dateMuted }}>
          {prevMonthDays - i + 1}
        </span>
      );
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const mFormatted = String(month + 1).padStart(2, "0");
      const dFormatted = String(d).padStart(2, "0");
      const fullDateStr = `${year}-${mFormatted}-${dFormatted}`;

      const isSelected = selectedDateStr === fullDateStr;
      const hasMeeting = meetingDatesSet.has(fullDateStr);

      let cellStyle = { ...styles.dateCell };

      if (isSelected) {
        cellStyle = { ...cellStyle, ...styles.dateSelected };
      } else if (hasMeeting) {
        cellStyle = { ...cellStyle, ...styles.dateHasMeeting };
      }

      cells.push(
        <span
          key={`curr-${d}`}
          style={cellStyle}
          onClick={() => setSelectedDateStr(fullDateStr)}
        >
          {d}
        </span>
      );
    }

    const totalCells = cells.length;
    const remainingCells = 42 - totalCells;
    for (let j = 1; j <= remainingCells; j++) {
      cells.push(
        <span key={`next-${j}`} style={{ ...styles.dateCell, ...styles.dateMuted }}>
          {j}
        </span>
      );
    }

    return cells;
  };

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

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

        {/* Navigation Menu */}
        <div style={styles.headerNav}>
          <button
            onClick={() => navigate("/user/dashboard-user")}
            style={
              location.pathname === "/user/dashboard-user"
                ? styles.navLinkActive
                : styles.navLink
            }
          >
            Home
          </button>

          <button
            onClick={() => navigate("/user/jadwal-rapat")}
            style={
              location.pathname === "/user/jadwalRapat" ||
              location.pathname === "/user/jadwal-rapat"
                ? styles.navLinkActive
                : styles.navLink
            }
          >
            Jadwal Rapat
          </button>

          {/* Tombol Data Rapat khusus Role Pimpinan */}
          {userRole === "pimpinan" && (
            <button
              onClick={() => navigate("/user/data-rapat")}
              style={
                location.pathname === "/user/data-rapat" ||
                location.pathname.includes("data-rapat")
                  ? styles.navLinkActive
                  : styles.navLink
              }
            >
              Data Rapat
            </button>
          )}

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

      {/* Main Content */}
      <main style={styles.main}>
        {/* Bagian Atas: Kalender + Detail Rapat Terpilih */}
        <div style={styles.topSectionGrid}>
          {/* Widget Kalender Dinamis */}
          <div style={styles.calendarCard}>
            <div style={styles.calendarHeader}>
              <span style={{ cursor: "pointer", padding: "0 8px" }} onClick={prevMonth}>
                ‹
              </span>
              <span>{`${monthNames[month]} ${year}`}</span>
              <span style={{ cursor: "pointer", padding: "0 8px" }} onClick={nextMonth}>
                ›
              </span>
            </div>
            <div style={styles.calendarGrid}>
              <div style={styles.dayLabel}>Mo</div>
              <div style={styles.dayLabel}>Tu</div>
              <div style={styles.dayLabel}>We</div>
              <div style={styles.dayLabel}>Th</div>
              <div style={styles.dayLabel}>Fr</div>
              <div style={styles.dayLabel}>Sa</div>
              <div style={styles.dayLabel}>Su</div>

              {renderCalendarCells()}
            </div>
          </div>

          {/* Kolom Kanan Top: Header & Card Detail Rapat Terpilih */}
          <div style={styles.rightTopSection}>
            <div style={styles.topBarAction}>
              <h3 style={styles.sectionTitle}>Kalender Rapat</h3>
            </div>

            {/* Card Detail Rapat pada Tanggal Terpilih Dinamis dari API */}
            {meetingsOnSelectedDate.length > 0 ? (
              meetingsOnSelectedDate.map((item) => {
                const currentStatus = getComputedStatus(item);
                const timeStatus = isAttendanceOpen(item);
                const badgeStyle = getStatusBadgeStyle(currentStatus);

                return (
                  <div
                    key={item.meeting_id}
                    style={{
                      ...styles.cardSelectedMeeting,
                      padding: isSmallMobile ? "14px" : "16px",
                      borderRadius: "10px",
                      border: "1px solid #e5e7eb",
                      marginBottom: "12px",
                      backgroundColor: "#ffffff",
                    }}
                  >
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
                            fontSize: "clamp(13px, 3.2vw, 15px)",
                            fontWeight: 600,
                            color: "#111827",
                            textAlign: "left",
                          }}
                        >
                          {item.title}
                        </h4>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "clamp(11px, 2.8vw, 13px)",
                            color: "#6b7280",
                            lineHeight: 1.4,
                            textAlign: "left",
                          }}
                        >
                          {item.description || item.agenda}
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
                        {item.meeting_code}
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
                        <span style={{ fontWeight: 600, color: "#111827" }}>{formatDate(item.date)}</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>{formatTimeRange(item.start_time, item.end_time)}</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span>{item.creator ? item.creator.name : "Admin"}</span>
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
                        <span>{item.location}</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-start" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 8 10"></polyline>
                        </svg>
                        <span style={{ color: "#9ca3af" }}>Dibuat: {formatCreatedDate(item.created_at)}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "10px",
                        marginTop: "14px",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Tombol Konfirmasi Kehadiran */}
                      {item.attendance_status === "Belum Konfirmasi" ? (
                        timeStatus.isOpen ? (
                          <button
                            type="button"
                            style={styles.btnKehadiranPrimary}
                            onClick={() => handleOpenConfirmModal(item)}
                          >
                            Konfirmasi Kehadiran
                          </button>
                        ) : (
                          <button
                            type="button"
                            style={styles.btnKehadiranDisabled}
                            disabled
                            title={timeStatus.reason}
                          >
                            {timeStatus.reason}
                          </button>
                        )
                      ) : (
                        <button type="button" style={styles.btnKehadiranSecondary} disabled>
                          {item.attendance_status === "Hadir"
                            ? "Terkonfirmasi (Hadir)"
                            : `Status: ${item.attendance_status}`}
                        </button>
                      )}

                      <button
                        type="button"
                        style={{
                          ...styles.detailButton,
                          position: "relative",
                          zIndex: 10,
                        }}
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
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={styles.cardSelectedMeeting}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "clamp(11px, 2.8vw, 13px)",
                    color: "#6b7280",
                    textAlign: "center",
                  }}
                >
                  Tidak ada jadwal rapat pada tanggal <strong>{formatDate(selectedDateStr)}</strong>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bagian Bawah: Tabel Semua Jadwal Rapat */}
        <div style={styles.tableSectionCard}>
          <div style={styles.tableFilterHeader}>
            <h3 style={styles.sectionTitle}>Semua Jadwal Rapat</h3>

            <div style={styles.filterControls}>
              {/* Input Pencarian Rapat */}
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  flex: isMobile ? "1 1 100%" : "initial",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ position: "absolute", left: "12px", pointerEvents: "none" }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Cari berdasarkan kode/judul rapat, d..."
                  style={styles.searchInput}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Filter Status */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "clamp(12px, 3vw, 13px)", color: "#374151" }}>
                  Status:
                </span>
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

              {/* Filter Tahun */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "clamp(12px, 3vw, 13px)", color: "#374151" }}>
                  Tahun:
                </span>
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
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "20px", textAlign: "center" }}>
              Memuat data rapat...
            </div>
          ) : error ? (
            <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
              Terjadi Kesalahan: {error}
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>No</th>
                    <th style={styles.th}>Kode</th>
                    <th style={styles.th}>Judul Rapat</th>
                    <th style={styles.th}>Deskripsi</th>
                    <th style={styles.th}>Tanggal</th>
                    <th style={styles.th}>Waktu</th>
                    <th style={styles.th}>Tempat</th>
                    <th style={styles.th}>Dibuat Oleh</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Konfirmasi Kehadiran</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMeetings.length > 0 ? (
                    filteredMeetings.map((item, index) => {
                      const computedStatus = getComputedStatus(item);
                      const timeStatus = isAttendanceOpen(item);
                      const badgeStyle = getStatusBadgeStyle(computedStatus);

                      return (
                        <tr key={item.meeting_id}>
                          <td style={styles.td}>{index + 1}</td>
                          <td style={{ ...styles.td, fontFamily: "monospace", fontSize: "11px" }}>
                            {item.meeting_code}
                          </td>
                          <td style={{ ...styles.td, fontWeight: 600, color: "#1f2937" }}>
                            {item.title}
                          </td>
                          <td style={{ ...styles.td, fontSize: "11px", color: "#6b7280", maxWidth: "220px" }}>
                            {item.description || item.agenda}
                          </td>
                          <td style={styles.td}>{formatDate(item.date)}</td>
                          <td style={styles.td}>
                            {formatTimeRange(item.start_time, item.end_time)}
                          </td>
                          <td style={styles.td}>{item.location}</td>
                          <td style={styles.td}>
                            {item.creator ? item.creator.name : "-"}
                          </td>
                          <td style={{ ...styles.td, textAlign: "center" }}>
                            <span
                              style={{
                                backgroundColor: badgeStyle.backgroundColor,
                                color: badgeStyle.color,
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontWeight: 600,
                                fontSize: "11px",
                                display: "inline-block",
                              }}
                            >
                              {computedStatus}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {item.attendance_status === "Belum Konfirmasi" ? (
                              timeStatus.isOpen ? (
                                <button
                                  type="button"
                                  style={styles.btnKehadiranPrimary}
                                  onClick={() => handleOpenConfirmModal(item)}
                                >
                                  Konfirmasi Kehadiran
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  style={styles.btnKehadiranDisabled}
                                  disabled
                                  title={timeStatus.reason}
                                >
                                  {timeStatus.reason}
                                </button>
                              )
                            ) : (
                              <button type="button" style={styles.btnKehadiranSecondary} disabled>
                                {item.attendance_status === "Hadir"
                                  ? "Terkonfirmasi (Hadir)"
                                  : `Status: ${item.attendance_status}`}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="10" style={{ ...styles.td, textAlign: "center", padding: "20px" }}>
                        Tidak ada data rapat yang ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        © 2026 BVet Bukittinggi. All rights reserved.
      </footer>

      {/* POPUP MODAL FORM KONFIRMASI KEHADIRAN */}
      {showConfirmModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.confirmModalCard}>
            <div style={styles.confirmModalHeader}>
              <h3 style={styles.confirmModalTitle}>Konfirmasi Kehadiran Rapat</h3>
              <button
                style={styles.btnCloseClean}
                onClick={() => setShowConfirmModal(false)}
              >
                ✕
              </button>
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={styles.confirmSelect}
            >
              <option value="Hadir">Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
            </select>

            <textarea
              placeholder="Catatan"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={styles.confirmTextarea}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={styles.confirmBtnCancel}
                disabled={submittingAttendance}
              >
                Batal
              </button>
              <button
                onClick={handleSubmitAttendance}
                style={styles.confirmBtnSubmit}
                disabled={submittingAttendance}
              >
                {submittingAttendance ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL ALERT FEEDBACK (BERHASIL / GAGAL) */}
      {alertModal.show && (
        <div style={styles.modalOverlay}>
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: isSmallMobile ? "24px 20px" : "36px 32px 28px 32px",
              borderRadius: "28px",
              boxShadow: "0px 12px 32px rgba(0, 0, 0, 0.18)",
              textAlign: "center",
              maxWidth: "380px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "18px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                backgroundColor: alertModal.type === "success" ? "#dcfce7" : "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {alertModal.type === "success" ? (
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              )}
            </div>

            <h3
              style={{
                fontSize: "clamp(18px, 4vw, 22px)",
                fontWeight: 700,
                color: "#111827",
                margin: 0,
                letterSpacing: "-0.3px",
              }}
            >
              {alertModal.title}
            </h3>

            <p
              style={{
                fontSize: "clamp(12px, 3vw, 14px)",
                color: "#6b7280",
                margin: 0,
                lineHeight: 1.5,
                fontWeight: 400,
              }}
            >
              {alertModal.message}
            </p>

            <button
              onClick={closeAlert}
              style={{
                width: "100%",
                padding: "12px 0",
                backgroundColor: alertModal.type === "success" ? "#2D7A68" : "#dc2626",
                color: "#ffffff",
                border: "none",
                borderRadius: "12px",
                fontSize: "clamp(13px, 3.2vw, 15px)",
                fontWeight: 700,
                cursor: "pointer",
                marginTop: "6px",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* POP-UP MODAL TAMBAH JADWAL RAPAT */}
      {showCreateModal && (
        <div style={styles.modalOverlay}>
          <style>{`
            .modal-input-clean:focus {
              border-color: #2D7A68 !important;
              box-shadow: 0 0 0 1px #2D7A68 !important;
              background-color: #ffffff !important;
            }
            ::-webkit-scrollbar {
              display: none;
            }
            * {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>

          <div style={styles.modalCardFormClean}>
            <div style={styles.modalHeaderClean}>
              <h3 style={styles.modalTitleClean}>Tambah Jadwal Rapat</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={styles.btnCloseClean}
              >
                ✕
              </button>
            </div>

            {createError && (
              <p style={{ ...styles.modalText, color: "#dc2626", marginBottom: "8px" }}>
                {createError}
              </p>
            )}

            <form
              onSubmit={handleCreateMeetingSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <input
                type="text"
                name="title"
                className="modal-input-clean"
                required
                placeholder="Judul Rapat"
                style={styles.inputClean}
                value={formData.title}
                onChange={handleInputChange}
              />

              <textarea
                name="agenda"
                className="modal-input-clean"
                required
                placeholder="Agenda"
                style={styles.textareaClean}
                value={formData.agenda}
                onChange={handleInputChange}
              />

              <input
                type="date"
                name="date"
                className="modal-input-clean"
                required
                style={styles.inputClean}
                value={formData.date}
                onChange={handleInputChange}
              />

              <div style={{ display: "grid", gridTemplateColumns: isSmallMobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
                <AlarmTimePicker
                  label="Jam Mulai"
                  value={formData.start_time}
                  onChange={(newVal) => setFormData((prev) => ({ ...prev, start_time: newVal }))}
                />
                <AlarmTimePicker
                  label="Jam Selesai"
                  value={formData.end_time}
                  onChange={(newVal) => setFormData((prev) => ({ ...prev, end_time: newVal }))}
                />
              </div>

              <input
                type="text"
                name="location"
                className="modal-input-clean"
                required
                placeholder="Tempat / Lokasi"
                style={styles.inputClean}
                value={formData.location}
                onChange={handleInputChange}
              />

              <textarea
                name="description"
                className="modal-input-clean"
                placeholder="Deskripsi (Opsional)"
                style={styles.textareaClean}
                value={formData.description}
                onChange={handleInputChange}
              />

              <div style={styles.modalActionRight}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={styles.btnCancelClean}
                  disabled={createLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={styles.btnSaveClean}
                  disabled={createLoading}
                >
                  {createLoading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pop-up Modal Logout */}
      {showLogoutModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3 style={{ ...styles.sectionTitle, border: "none", margin: 0 }}>
              Konfirmasi Logout
            </h3>
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

      {/* POP-UP MODAL EDIT JADWAL RAPAT */}
      {showEditModal && (
        <div style={styles.modalOverlay}>
          <style>{`
            .modal-input-clean:focus {
              border-color: #2D7A68 !important;
              box-shadow: 0 0 0 1px #2D7A68 !important;
              background-color: #ffffff !important;
            }
            ::-webkit-scrollbar {
              display: none;
            }
            * {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
            .btn-close-hover:hover {
              background-color: #f3f4f6 !important;
              color: #1f2937 !important;
            }
          `}</style>

          <div style={styles.modalCardFormClean}>
            <div style={styles.modalHeaderClean}>
              <h3 style={styles.modalTitleClean}>Edit Jadwal Rapat</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="btn-close-hover"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "6px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#6b7280",
                  transition: "all 0.2s",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {editError && (
              <p style={{ ...styles.modalText, color: "#dc2626", marginBottom: "8px", fontSize: "14px" }}>
                {editError}
              </p>
            )}

            <form
              onSubmit={handleEditMeetingSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <input
                type="text"
                name="title"
                className="modal-input-clean"
                required
                placeholder="Judul Rapat *"
                style={styles.inputClean}
                value={editFormData.title}
                onChange={handleEditInputChange}
              />

              <textarea
                name="agenda"
                className="modal-input-clean"
                required
                placeholder="Agenda *"
                style={styles.textareaClean}
                value={editFormData.agenda}
                onChange={handleEditInputChange}
              />

              <div style={{ display: "grid", gridTemplateColumns: isSmallMobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
                <input
                  type="date"
                  name="date"
                  className="modal-input-clean"
                  required
                  style={styles.inputClean}
                  value={editFormData.date}
                  onChange={handleEditInputChange}
                />

                <select
                  name="status"
                  className="modal-input-clean"
                  required
                  style={styles.inputClean}
                  value={editFormData.status}
                  onChange={handleEditInputChange}
                >
                  <option value="Terjadwal">Status: Terjadwal</option>
                  <option value="Selesai">Status: Selesai</option>
                  <option value="Batal">Status: Batal</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isSmallMobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
                <AlarmTimePicker
                  label="Jam Mulai"
                  value={editFormData.start_time}
                  onChange={(newVal) => setEditFormData((prev) => ({ ...prev, start_time: newVal }))}
                />
                <AlarmTimePicker
                  label="Jam Selesai"
                  value={editFormData.end_time}
                  onChange={(newVal) => setEditFormData((prev) => ({ ...prev, end_time: newVal }))}
                />
              </div>

              <input
                type="text"
                name="location"
                className="modal-input-clean"
                required
                placeholder="Tempat / Lokasi *"
                style={styles.inputClean}
                value={editFormData.location}
                onChange={handleEditInputChange}
              />

              <textarea
                name="description"
                className="modal-input-clean"
                placeholder="Deskripsi (Opsional)"
                style={styles.textareaClean}
                value={editFormData.description}
                onChange={handleEditInputChange}
              />

              <div style={styles.modalActionRight}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={styles.btnCancelClean}
                  disabled={editLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={styles.btnSaveClean}
                  disabled={editLoading}
                >
                  {editLoading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP MODAL KONFIRMASI HAPUS RAPAT */}
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
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  padding: "10px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 600, color: "#111827" }}>
                  Hapus Jadwal Rapat
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "clamp(11px, 2.8vw, 13px)", color: "#6b7280" }}>
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <p style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "#374151", lineHeight: 1.5, margin: "12px 0 16px 0" }}>
              Apakah Anda yakin ingin menghapus rapat <strong>"{meetingToDelete?.title}"</strong>?
            </p>

            {deleteError && (
              <p style={{ color: "#dc2626", fontSize: "13px", marginBottom: "12px" }}>
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
                  padding: "8px 16px",
                  borderRadius: "6px",
                  fontSize: "clamp(12px, 3vw, 13px)",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}