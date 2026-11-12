"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, type FormEvent } from "react";
import { Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { registerWithBackend, checkNipFromBackend } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  const [nip, setNip] = useState("");
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status pengecekan NIP
  const [isCheckingNip, setIsCheckingNip] = useState(false);
  const [nipStatus, setNipStatus] = useState<"idle" | "found" | "notFound">("idle");
  const [nipMessage, setNipMessage] = useState("");

  // Pengecekan otomatis saat user mengetik NIP (Debounce)
  useEffect(() => {
    const trimmedNip = nip.trim();

    if (!trimmedNip) {
      setNama("");
      setNipStatus("idle");
      setNipMessage("");
      setIsCheckingNip(false);
      return;
    }

    if (trimmedNip.length < 5) {
      setNama("");
      setNipStatus("idle");
      setNipMessage("");
      setIsCheckingNip(false);
      return;
    }

    setIsCheckingNip(true);
    setNipMessage("Memeriksa data NIP...");

    const timer = setTimeout(async () => {
      try {
        const emp = await checkNipFromBackend(trimmedNip);
        setNama(emp.nama);
        setNipStatus("found");
        setNipMessage(`Pegawai ditemukan: ${emp.nama}`);
      } catch (err) {
        setNama("");
        setNipStatus("notFound");
        setNipMessage(err instanceof Error ? err.message : "NIP tidak ditemukan dalam data pegawai.");
      } finally {
        setIsCheckingNip(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [nip]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!nip.trim()) {
      setError("Silakan masukkan NIP Anda terlebih dahulu.");
      return;
    }

    if (nipStatus !== "found" || !nama) {
      setError("NIP tidak valid atau belum ditemukan dalam data pegawai.");
      return;
    }

    if (!email.trim()) {
      setError("Silakan masukkan email perusahaan Anda.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }

    setIsSubmitting(true);
    try {
      await registerWithBackend({ nip: nip.trim(), nama, email: email.trim(), password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="Pusat Pengembangan dan Pelindungan Bahasa dan Sastra">
        <Link className="brand" href="/auth/login">
          <Image className="brand-logo" src="/pusbanglin-logo.png" alt="Logo Pusbanglin" width={60} height={60} priority />
          <span className="brand-name">Pusat Pengembangan dan Pelindungan Bahasa dan Sastra</span>
        </Link>
        <div className="story-copy">
          <p className="story-kicker">Start with your people</p>
          <h1>Bangun ruang kerja yang terasa lebih manusiawi.</h1>
          <p>Mulai kelola tim dengan informasi yang jelas dan alur kerja yang sederhana.</p>
        </div>
        <p className="story-footer">Pusat Pengembangan dan Pelindungan Bahasa dan Sastra</p>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <p className="eyebrow">Mulai bersama tim</p>
          <h2>Buat akun baru</h2>
          <p className="auth-intro">Isi data berikut untuk menyiapkan akun Anda.</p>

          {success ? (
            <div className="auth-success">
              <p>✅ Akun berhasil dibuat dan terhubung dengan data pegawai Anda! Silakan masuk ke akun Anda.</p>
              <Link className="primary-button" href="/auth/login" style={{ display: "inline-block", marginTop: "1rem" }}>
                Masuk sekarang
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {error && <p className="auth-error" role="alert">{error}</p>}

              <label className="field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>NIP</span>
                  {isCheckingNip && (
                    <span style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Loader2 size={12} className="animate-spin" /> Memeriksa...
                    </span>
                  )}
                  {!isCheckingNip && nipStatus === "found" && (
                    <span style={{ fontSize: "12px", color: "#16a34a", display: "flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle2 size={13} /> NIP Valid
                    </span>
                  )}
                  {!isCheckingNip && nipStatus === "notFound" && (
                    <span style={{ fontSize: "12px", color: "#dc2626", display: "flex", alignItems: "center", gap: "4px" }}>
                      <AlertCircle size={13} /> NIP Tidak Ditemukan
                    </span>
                  )}
                </div>
                <input
                  autoComplete="off"
                  name="nip"
                  placeholder="Masukkan Nomor Induk Pegawai"
                  required
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Nama lengkap</span>
                <input
                  autoComplete="name"
                  name="nama"
                  placeholder={
                    isCheckingNip
                      ? "Sedang memeriksa data pegawai..."
                      : nipStatus === "found"
                      ? nama
                      : "Nama otomatis muncul setelah NIP dimasukkan"
                  }
                  required
                  readOnly
                  value={nama}
                  style={{
                    backgroundColor: nama ? "#f8fafc" : "#f1f5f9",
                    color: nama ? "#0f172a" : "#64748b",
                    fontWeight: nama ? 600 : 400,
                    cursor: "not-allowed",
                  }}
                />
                {nipStatus === "found" && nama && (
                  <span style={{ fontSize: "12px", color: "#16a34a", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={12} /> Terverifikasi atas nama: <strong>{nama}</strong>
                  </span>
                )}
                {nipStatus === "notFound" && (
                  <span style={{ fontSize: "12px", color: "#dc2626", marginTop: "2px" }}>
                    NIP tidak cocok dengan data kepegawaian. Periksa kembali NIP Anda.
                  </span>
                )}
              </label>

              <label className="field">
                <span>Email kantor</span>
                <input
                  autoComplete="email"
                  name="email"
                  placeholder="nama@instansi.go.id"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Kata sandi</span>
                <div className="password-input-wrap">
                  <input
                    autoComplete="new-password"
                    minLength={8}
                    name="password"
                    placeholder="Minimal 8 karakter"
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-visibility-button"
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <label className="field">
                <span>Konfirmasi kata sandi</span>
                <div className="password-input-wrap">
                  <input
                    autoComplete="new-password"
                    minLength={8}
                    name="confirmPassword"
                    placeholder="Ulangi kata sandi"
                    required
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="password-visibility-button"
                    aria-label={showConfirm ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    onClick={() => setShowConfirm((v) => !v)}
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <button className="primary-button" type="submit" disabled={isSubmitting || isCheckingNip}>
                {isSubmitting ? "Memproses…" : "Buat akun"}
              </button>
            </form>
          )}

          <p className="auth-switch">Sudah memiliki akun? <Link className="text-link" href="/auth/login">Masuk</Link></p>
        </div>
      </section>
    </main>
  );
}
