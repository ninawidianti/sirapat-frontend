import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo_kementan.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [userName, setUserName] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Email atau password salah");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setUserName(data.user.name);
      setShowSuccessPopup(true);

      // Tunda navigasi sebentar (1.5 detik) agar user sempat membaca popup-nya
      setTimeout(() => {
        if (data.user.role === "Admin") {
          navigate("/admin/dashboard-admin");
        } else {
          navigate("/user/dashboard-user");
        }
      }, 1500);
    } catch (err) {
      console.error("Error login:", err);
      setError("Tidak dapat terhubung ke server. Pastikan backend sedang berjalan.");
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      width: "100%",
      minHeight: "100vh",
      backgroundColor: "#f1f1f1",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "20px",
      borderTop: "3px solid #2f80b9",
      boxSizing: "border-box",
      fontFamily: "Arial, Helvetica, sans-serif",
    },
    card: {
      width: "100%",
      maxWidth: "360px",
      backgroundColor: "#ffffff",
      borderRadius: "10px",
      padding: "32px",
      boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.15)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      boxSizing: "border-box",
    },
    logoContainer: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
    },
    logoImg: {
      width: "70px",
      height: "70px",
      objectFit: "contain",
      marginBottom: "14px",
    },
    titleContainer: {
      width: "100%",
      textAlign: "center",
      marginBottom: "24px",
    },
    subtitle: {
      fontSize: "12px",
      color: "#666666",
      marginBottom: "6px",
    },
    title: {
      fontSize: "16px",
      color: "#4a4a4a",
      fontWeight: 600,
      lineHeight: 1.4,
      margin: 0,
    },
    form: {
      width: "100%",
    },
    formGroup: {
      width: "100%",
      marginBottom: "12px",
    },
    input: {
      width: "100%",
      height: "42px",
      border: "1px solid #d1d1d1",
      borderRadius: "6px",
      padding: "0 12px",
      fontSize: "12px",
      color: "#333333",
      backgroundColor: "#ffffff",
      outline: "none",
      boxSizing: "border-box",
    },
    button: {
      width: "100%",
      height: "42px",
      marginTop: "8px",
      border: "none",
      borderRadius: "6px",
      backgroundColor: loading ? "#8ca9a4" : "#397c70",
      color: "#ffffff",
      fontSize: "12px",
      fontWeight: 500,
      cursor: loading ? "not-allowed" : "pointer",
    },
    error: {
      width: "100%",
      marginTop: "12px",
      padding: "9px 10px",
      backgroundColor: "#fff0f0",
      border: "1px solid #ffd1d1",
      borderRadius: "5px",
      textAlign: "center",
      color: "#d32f2f",
      fontSize: "10px",
      lineHeight: "15px",
      boxSizing: "border-box",
    },
    footer: {
      width: "100%",
      marginTop: "24px",
      textAlign: "center",
    },
    footerText: {
      fontSize: "9px",
      color: "#777777",
      lineHeight: "15px",
      margin: 0,
    },
    popupOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100vh",
      backgroundColor: "rgba(0, 0, 0, 0.4)", // Efek latar belakang redup
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    },
    popupCard: {
      backgroundColor: "#ffffff",
      padding: "24px 32px",
      borderRadius: "12px",
      boxShadow: "0px 10px 25px rgba(0, 0, 0, 0.2)",
      textAlign: "center",
      maxWidth: "320px",
      width: "90%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "12px",
    },
    popupIcon: {
      fontSize: "40px",
    },
    popupTitle: {
      fontSize: "18px",
      fontWeight: 700,
      color: "#2D7A68",
      margin: 0,
    },
    popupText: {
      fontSize: "13px",
      color: "#4b5563",
      margin: 0,
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <img src={logo} alt="Logo Balai Veteriner" style={styles.logoImg} />
        </div>

        <div style={styles.titleContainer}>
          <p style={styles.subtitle}>Sistem Notulensi Rapat</p>
          <h2 style={styles.title}>Balai Veteriner Bukittinggi</h2>
        </div>

        <form style={styles.form} onSubmit={handleLogin}>
          <div style={styles.formGroup}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Logging In..." : "Log In"}
          </button>

          {error && <div style={styles.error}>{error}</div>}
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Design and constructed by Magang @ BVet Bukittinggi
          </p>
          <p style={styles.footerText}>– 2026 All Right Reserved –</p>
        </div>
      </div>
      {/* MODAL / POPUP SUCCESS */}
      {showSuccessPopup && (
        <div style={styles.popupOverlay}>
          <div style={styles.popupCard}>
            <div style={styles.popupIcon}>🎉</div>
            <h3 style={styles.popupTitle}>Login Berhasil!</h3>
            <p style={styles.popupText}>Selamat datang, <b>{userName}</b></p>
          </div>
        </div>
      )}
    </div>
  );
}