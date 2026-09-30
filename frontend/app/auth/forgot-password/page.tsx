"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "");

type PageState = "idle" | "loading" | "success" | "error";

export default function ForgotPasswordPage() {
  const [state, setState] = useState<PageState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [email, setEmail] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");

    try {
      const redirectTo = `${window.location.origin}/auth/reset-password`;
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Gagal mengirim email reset.");
      setState("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
      setState("error");
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
          <h1>Lupa kata sandi?</h1>
          <p>Masukkan email terdaftar, kami akan kirimkan tautan untuk mengatur ulang kata sandi Anda.</p>
        </div>
        <p className="story-footer">Pusat Pengembangan dan Pelindungan Bahasa dan Sastra</p>
      </section>

      <section className="auth-panel">
        <div className="auth-form-wrap">

          {state === "success" ? (
            /* ── SUCCESS STATE ── */
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "#ECFDF5", display: "flex", alignItems: "center",
                justifyContent: "center", margin: "0 auto 20px"
              }}>
                <CheckCircle2 size={32} color="#059669" />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#121C2A", marginBottom: 8 }}>
                Email terkirim!
              </h2>
              <p style={{ fontSize: 14, color: "#535F71", lineHeight: 1.6, marginBottom: 24 }}>
                Kami telah mengirimkan tautan reset kata sandi ke{" "}
                <strong style={{ color: "#121C2A" }}>{email}</strong>.
                Periksa kotak masuk atau folder spam Anda.
              </p>
              <div style={{
                background: "#F8F9FF", border: "1px solid #E2E8F0",
                borderRadius: 12, padding: "14px 16px", marginBottom: 28,
                fontSize: 13, color: "#535F71", textAlign: "left", lineHeight: 1.6
              }}>
                <strong style={{ color: "#121C2A", display: "block", marginBottom: 4 }}>Langkah selanjutnya:</strong>
                1. Buka email dari Supabase / Pusbanglin<br />
                2. Klik tombol <strong>"Reset Password"</strong><br />
                3. Anda akan diarahkan ke halaman ubah kata sandi
              </div>
              <Link
                href="/auth/login"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 8, padding: "11px 20px", borderRadius: 10,
                  background: "#094CB2", color: "#fff", fontWeight: 600,
                  fontSize: 14, textDecoration: "none", transition: "background 0.2s"
                }}
              >
                <ArrowLeft size={16} />
                Kembali ke Halaman Login
              </Link>
            </div>
          ) : (
            /* ── FORM STATE ── */
            <>
              <p className="eyebrow">Pemulihan Akun</p>
              <h2>Lupa kata sandi</h2>
              <p className="auth-intro">
                Masukkan alamat email kantor Anda. Tautan reset akan dikirimkan ke email tersebut.
              </p>

              <form className="auth-form" onSubmit={handleSubmit}>
                <label className="field">
                  Email kantor
                  <input
                    type="email"
                    name="email"
                    placeholder="nama@perusahaan.com"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                {state === "error" && (
                  <p className="auth-error" role="alert">{errorMsg}</p>
                )}

                <button
                  className="primary-button"
                  type="submit"
                  disabled={state === "loading"}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {state === "loading" ? (
                    <><Loader2 size={16} className="animate-spin" /> Mengirim email...</>
                  ) : (
                    <><Mail size={16} /> Kirim Tautan Reset</>
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
