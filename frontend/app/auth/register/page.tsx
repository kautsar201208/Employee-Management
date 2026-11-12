"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { registerWithBackend } from "@/lib/api";

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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

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
      await registerWithBackend({ nip, nama, email, password });
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
              <p>✅ Akun berhasil dibuat! Silakan cek email Anda untuk verifikasi, lalu masuk.</p>
              <Link className="primary-button" href="/auth/login" style={{ display: "inline-block", marginTop: "1rem" }}>
                Masuk sekarang
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {error && <p className="auth-error" role="alert">{error}</p>}

              <label className="field">
                NIP
                <input
                  autoComplete="off"
                  name="nip"
                  placeholder="Nomor Induk Pegawai"
                  required
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                />
              </label>

              <label className="field">
                Nama lengkap
                <input
                  autoComplete="name"
                  name="nama"
                  placeholder="Nama Anda"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                />
              </label>

              <label className="field">
                Email perusahaan
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
                Kata sandi
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
                Konfirmasi kata sandi
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

              <button className="primary-button" type="submit" disabled={isSubmitting}>
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
