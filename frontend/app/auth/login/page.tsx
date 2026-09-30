"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ACCESS_TOKEN_KEY, USER_EMAIL_KEY, USER_ROLE_KEY, loginWithBackend } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    try {
      const { accessToken, role } = await loginWithBackend(email, password);
      sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      sessionStorage.setItem(USER_EMAIL_KEY, email);
      sessionStorage.setItem(USER_ROLE_KEY, role);

      // Simpan role ke cookie agar Next.js middleware bisa membacanya
      document.cookie = `pusbanglin_role=${role}; path=/; SameSite=Lax`;

      // Redirect berdasarkan role
      if (role === "admin") {
        router.replace("/dashboard");
      } else {
        router.replace("/Homepage/Profile");
      }
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login gagal. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
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
          <p className="story-kicker">People, in good order</p>
          <h1>Kerja lebih rapi. Tim lebih berarti.</h1>
          <p>Semua urusan tim, dari data karyawan sampai aktivitas harian, ada di satu ruang.</p>
        </div>
        <p className="story-footer">Pusat Pengembangan dan Pelindungan Bahasa dan Sastra</p>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <p className="eyebrow">Selamat datang kembali</p>
          <h2>Masuk ke akun</h2>
          <p className="auth-intro">Gunakan email kantor untuk melanjutkan.</p>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              Email kantor
              <input autoComplete="email" name="email" placeholder="nama@perusahaan.com" required type="email" />
            </label>
            <label className="field">
              Kata sandi
              <input autoComplete="current-password" name="password" placeholder="Masukkan kata sandi" required type="password" />
            </label>
            <div className="form-row">
              <label className="check-label">
                <input name="remember" type="checkbox" />
                Ingat saya
              </label>
              <Link className="text-link" href="/auth/forgot-password">Lupa kata sandi?</Link>
            </div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Memeriksa akun..." : "Masuk"}
            </button>
          </form>
          <p className="auth-switch">Belum punya akun? <Link className="text-link" href="/auth/register">Daftar sekarang</Link></p>
        </div>
      </section>
    </main>
  );
}