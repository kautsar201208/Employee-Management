import Image from "next/image";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="Pusat Pengembangan dan Pelindungan Bahasa dan Sastra">
        <Link className="brand" href="/auth/login">
          <Image className="brand-logo" src="/pusbanglin-logo.png" alt="Logo Pusbanglin" width={40} height={40} />
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
          <form className="auth-form">
            <label className="field">
              Nama lengkap
              <input autoComplete="name" name="name" placeholder="Nama Anda" required />
            </label>
            <label className="field">
              Email kantor
              <input autoComplete="email" name="email" placeholder="nama@perusahaan.com" required type="email" />
            </label>
            <label className="field">
              Nama perusahaan
              <input autoComplete="organization" name="company" placeholder="Nama perusahaan" required />
            </label>
            <label className="field">
              Kata sandi
              <input autoComplete="new-password" minLength={8} name="password" placeholder="Minimal 8 karakter" required type="password" />
            </label>
            <button className="primary-button" type="submit">Buat akun</button>
          </form>
          <p className="auth-switch">Sudah memiliki akun? <Link className="text-link" href="/auth/login">Masuk</Link></p>
        </div>
      </section>
    </main>
  );
}