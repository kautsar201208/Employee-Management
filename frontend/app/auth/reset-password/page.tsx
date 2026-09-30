"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, type FormEvent } from "react";
import { Lock, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "");

type PageState = "loading" | "ready" | "submitting" | "success" | "invalid";

export default function ResetPasswordPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [accessToken, setAccessToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Supabase kirim token lewat URL hash (#access_token=xxx&type=recovery) atau query params
  useEffect(() => {
    // 1. Cek parameter dari hash URL
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const hashParams = new URLSearchParams(hash);

    // 2. Cek parameter dari query string URL
    const searchParams = new URLSearchParams(window.location.search);

    const errorDesc = hashParams.get("error_description") || searchParams.get("error_description");
    if (errorDesc) {
      setErrorMsg(decodeURIComponent(errorDesc.replace(/\+/g, " ")));
      setPageState("invalid");
      return;
    }

    const token =
      hashParams.get("access_token") ||
      hashParams.get("token") ||
      searchParams.get("access_token") ||
      searchParams.get("token");

    if (token) {
      setAccessToken(token);
      setPageState("ready");
    } else {
      setPageState("invalid");
    }
  }, []);

  const passwordStrength = (pwd: string) => {
    if (pwd.length === 0) return null;
    if (pwd.length < 6) return { label: "Terlalu pendek", color: "#EF4444", pct: 20 };
    if (pwd.length < 8) return { label: "Lemah", color: "#F97316", pct: 40 };
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) return { label: "Cukup", color: "#EAB308", pct: 65 };
    return { label: "Kuat", color: "#22C55E", pct: 100 };
  };

  const strength = passwordStrength(newPassword);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    if (newPassword.length < 6) {
      setErrorMsg("Password minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Konfirmasi password tidak cocok.");
      return;
    }

    setPageState("submitting");

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/update-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ new_password: newPassword, token: accessToken }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Gagal memperbarui password.");
      setPageState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setPageState("ready");
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="Pusat Pengembangan dan Pelindungan Bahasa dan Sastra">
        <Link className="brand" href="/auth/login">
          <Image className="brand-logo" src="/pusbanglin-logo.png" alt="Logo Pusbanglin" width={40} height={40} />
          <span className="brand-name">Pusat Pengembangan dan Pelindungan Bahasa dan Sastra</span>
        </Link>
        <div className="story-copy">
          <p className="story-kicker">Keamanan akun Anda</p>
          <h1>Buat kata sandi baru</h1>
          <p>Pilih kata sandi yang kuat dan belum pernah digunakan sebelumnya untuk melindungi akun Anda.</p>
        </div>
        <p className="story-footer">Pusat Pengembangan dan Pelindungan Bahasa dan Sastra</p>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">

          {/* ── LOADING ── */}
          {pageState === "loading" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Loader2 size={40} color="#094CB2" style={{ margin: "0 auto 16px", display: "block" }} className="animate-spin" />
              <p style={{ color: "#535F71", fontSize: 14 }}>Memverifikasi tautan reset...</p>
            </div>
          )}

          {/* ── LINK TIDAK VALID ── */}
          {pageState === "invalid" && (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "#FEF2F2", display: "flex", alignItems: "center",
                justifyContent: "center", margin: "0 auto 20px"
              }}>
                <AlertCircle size={32} color="#EF4444" />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#121C2A", marginBottom: 8 }}>
                Tautan tidak valid
              </h2>
              <p style={{ fontSize: 14, color: "#535F71", lineHeight: 1.6, marginBottom: 24 }}>
                {errorMsg || "Tautan reset kata sandi ini tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru."}
              </p>
              <Link
                href="/auth/forgot-password"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "11px 24px", borderRadius: 10, background: "#094CB2",
                  color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none"
                }}
              >
                Minta Tautan Baru
              </Link>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {pageState === "success" && (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "#ECFDF5", display: "flex", alignItems: "center",
                justifyContent: "center", margin: "0 auto 20px"
              }}>
                <CheckCircle2 size={32} color="#059669" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#121C2A", marginBottom: 8 }}>
                Kata sandi berhasil diubah!
              </h2>
              <p style={{ fontSize: 14, color: "#535F71", lineHeight: 1.6, marginBottom: 28 }}>
                Kata sandi akun Anda telah berhasil diperbarui. Silakan masuk menggunakan kata sandi baru Anda.
              </p>
              <Link
                href="/auth/login"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "11px 24px", borderRadius: 10, background: "#094CB2",
                  color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none"
                }}
              >
                Masuk Sekarang
              </Link>
            </div>
          )}

          {/* ── FORM ── */}
          {(pageState === "ready" || pageState === "submitting") && (
            <>
              <p className="eyebrow">Atur Ulang Kata Sandi</p>
              <h2>Buat kata sandi baru</h2>
              <p className="auth-intro">
                Kata sandi baru harus minimal 6 karakter dan berbeda dari sebelumnya.
              </p>

              <form className="auth-form" onSubmit={handleSubmit}>
                {/* New Password */}
                <label className="field">
                  Kata sandi baru
                  <div style={{ position: "relative" }}>
                    <input
                      type={showNew ? "text" : "password"}
                      placeholder="Minimal 8 karakter"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ paddingRight: 44, width: "100%", boxSizing: "border-box" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      style={{
                        position: "absolute", right: 12, top: "50%",
                        transform: "translateY(-50%)", background: "none",
                        border: "none", cursor: "pointer", color: "#94A3B8", padding: 0,
                        display: "flex", alignItems: "center"
                      }}
                      aria-label={showNew ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Password strength bar */}
                  {strength && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ height: 4, background: "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${strength.pct}%`,
                          background: strength.color,
                          borderRadius: 4, transition: "width 0.3s, background 0.3s"
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: strength.color, fontWeight: 600 }}>
                        Kekuatan: {strength.label}
                      </span>
                    </div>
                  )}
                </label>

                {/* Confirm Password */}
                <label className="field">
                  Konfirmasi kata sandi baru
                  <div style={{ position: "relative" }}>
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Ulangi kata sandi baru"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{
                        paddingRight: 44, width: "100%", boxSizing: "border-box",
                        borderColor: confirmPassword && newPassword !== confirmPassword ? "#EF4444" : undefined
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      style={{
                        position: "absolute", right: 12, top: "50%",
                        transform: "translateY(-50%)", background: "none",
                        border: "none", cursor: "pointer", color: "#94A3B8", padding: 0,
                        display: "flex", alignItems: "center"
                      }}
                      aria-label={showConfirm ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 600 }}>
                      Kata sandi tidak cocok
                    </span>
                  )}
                  {confirmPassword && newPassword === confirmPassword && (
                    <span style={{ fontSize: 11, color: "#22C55E", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={12} /> Kata sandi cocok
                    </span>
                  )}
                </label>

                {errorMsg && (
                  <p className="auth-error" role="alert">{errorMsg}</p>
                )}

                <button
                  className="primary-button"
                  type="submit"
                  disabled={pageState === "submitting"}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {pageState === "submitting" ? (
                    <><Loader2 size={16} className="animate-spin" /> Memperbarui...</>
                  ) : (
                    <><Lock size={16} /> Ubah Kata Sandi</>
                  )}
                </button>
              </form>

              <p className="auth-switch">
                Ingat kata sandi?{" "}
                <Link className="text-link" href="/auth/login">Masuk sekarang</Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
