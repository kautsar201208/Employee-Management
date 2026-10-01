"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { ACCESS_TOKEN_KEY, USER_EMAIL_KEY, USER_ROLE_KEY, loginWithBackend } from "@/lib/api";

const REMEMBERED_EMAIL_KEY = "pusbanglin_remembered_email";

function subscribeToRememberedEmail(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("pusbanglin:remembered-email-change", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("pusbanglin:remembered-email-change", onStoreChange);
  };
}

function getRememberedEmailSnapshot() {
  return localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
}

function getServerRememberedEmailSnapshot() {
  return "";
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const rememberedEmail = useSyncExternalStore(
    subscribeToRememberedEmail,
    getRememberedEmailSnapshot,
    getServerRememberedEmailSnapshot
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const shouldRememberEmail = formData.get("remember") === "on";

    try {
      const { accessToken, role } = await loginWithBackend(email, password);
      sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      sessionStorage.setItem(USER_EMAIL_KEY, email);
      sessionStorage.setItem(USER_ROLE_KEY, role);
      if (shouldRememberEmail) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      window.dispatchEvent(new Event("pusbanglin:remembered-email-change"));

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
              <input autoComplete="email" defaultValue={rememberedEmail} key={rememberedEmail} name="email" placeholder="nama@perusahaan.com" required type="email" />
            </label>
            <div className="field">
              <label htmlFor="login-password">Kata sandi</label>
              <div className="password-input-wrap">
                <input autoComplete="current-password" id="login-password" name="password" placeholder="Masukkan kata sandi" required type={showPassword ? "text" : "password"} />
                <button
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  aria-pressed={showPassword}
                  className="password-visibility-button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  type="button"
                >
                  {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
                </button>
              </div>
            </div>
            <div className="form-row">
              <label className="check-label">
                <input defaultChecked={Boolean(rememberedEmail)} name="remember" onChange={(event) => {
                  if (!event.target.checked) localStorage.removeItem(REMEMBERED_EMAIL_KEY);
                }} type="checkbox" />
                Ingat email saya
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