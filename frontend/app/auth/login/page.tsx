import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
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
          <form className="auth-form">
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
              <a className="text-link" href="#forgot-password">Lupa kata sandi?</a>
            </div>
            <button className="primary-button" type="submit">Masuk</button>
          </form>
          <p className="auth-switch">Belum punya akun? <Link className="text-link" href="/auth/register">Daftar sekarang</Link></p>
        </div>
      </section>
    </main>
  );
}