"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import UserSidebar from "../_components/user-sidebar";
import {
  ACCESS_TOKEN_KEY,
  USER_EMAIL_KEY,
  USER_ROLE_KEY,
  getMyAccount,
  ApiEmployee,
} from "@/lib/api";
import {
  User,
  GraduationCap,
  Briefcase,
  TrendingUp,
  Menu,
  CalendarDays,
  Bell,
  ChevronRight,
  FileText,
  BadgeCheck,
  LogOut,
  AlertCircle,
  Mail,
  Phone,
  CreditCard,
  Hash,
} from "lucide-react";

// ====== Helper: format tanggal lahir dari "YYYY-MM-DD"
function formatTanggalLahir(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

// ====== Helper: hitung masa kerja dari tmt_golongan
function hitungMasaKerja(tmtGolongan?: string | null): string {
  if (!tmtGolongan) return "-";
  try {
    const tmt = new Date(tmtGolongan);
    const now = new Date();
    let years = now.getFullYear() - tmt.getFullYear();
    let months = now.getMonth() - tmt.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    return `${years} Thn ${months} Bln`;
  } catch {
    return "-";
  }
}

// ====== Helper: ambil inisial dari nama
function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ====== Helper: format tim kerja tanpa singkatan
function formatTimKerja(value?: string | null): string {
  if (!value) return "-";
  const trimmed = value.trim();
  if (trimmed === "TU") return "Tata Usaha";
  if (trimmed === "KI") return "Perkamusan dan Peristilahan";
  if (trimmed === "Molin") return "Pemodernan dan Pelindungan";
  return trimmed;
}

// ====== Komponen: Baris info
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-slate-400 font-medium mb-0.5">{label}</p>
      <p className="font-bold text-slate-800 break-words">{value || "-"}</p>
    </div>
  );
}

// ====== Komponen: Skeleton loading
function SkeletonCard({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-40 mb-4" />
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i}>
            <div className="h-3 bg-slate-100 rounded w-24 mb-1" />
            <div className="h-4 bg-slate-200 rounded w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [todayFormatted, setTodayFormatted] = useState("Memuat tanggal...");

  // State data pegawai
  const [employee, setEmployee] = useState<ApiEmployee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  function handleLogout() {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(USER_EMAIL_KEY);
    sessionStorage.removeItem(USER_ROLE_KEY);
    document.cookie = "pusbanglin_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    router.replace("/auth/login");
  }

  // Format hari ini
  useEffect(() => {
    try {
      setTodayFormatted(
        new Intl.DateTimeFormat("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date())
      );
    } catch {
      // fallback
    }
  }, []);

  // Fetch data akun / pegawai yang sedang login
  useEffect(() => {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    async function loadProfile() {
      if (!token) return;
      setIsLoading(true);
      setLoadError(null);
      try {
        const account = await getMyAccount(token);
        if (account.employee) {
          setEmployee(account.employee);
        } else {
          setLoadError("Akun ini belum terhubung dengan data pegawai. Hubungi administrator.");
        }
      } catch (err) {
        console.error("Gagal memuat profil:", err);
        setLoadError(err instanceof Error ? err.message : "Gagal memuat data profil.");
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [router]);

  // Derived data
  const displayName = employee?.nama_lengkap || employee?.nama || "-";
  const displayPhoto = employee?.profile_image || null;
  const masaKerja = hitungMasaKerja(employee?.tmt_golongan);
  const tmtSejak = employee?.tmt_golongan
    ? `TMT Sejak ${new Date(employee.tmt_golongan).getFullYear()}`
    : "-";

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-[#121C2A] font-sans antialiased flex flex-col md:flex-row selection:bg-[#3366CC] selection:text-white">
      <UserSidebar
        activePage="profil"
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 md:pl-[280px] flex flex-col min-w-0">
        {/* TOPBAR */}
        <header className="sticky top-0 z-30 h-[82px] bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-[#121C2A]">Profil Pegawai</h1>
              <p className="text-[11px] text-slate-500 leading-none mt-0.5">Data Kepegawaian Terintegrasi</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600">
              <CalendarDays className="w-3.5 h-3.5 text-[#3366CC]" />
              {todayFormatted}
            </div>
            <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            </button>

            {/* Avatar topbar */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#3366CC]/20 bg-[#3366CC] flex items-center justify-center flex-shrink-0">
                {displayPhoto ? (
                  <Image
                    src={displayPhoto}
                    alt={displayName}
                    fill
                    sizes="32px"
                    className="object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span className="text-white text-[11px] font-bold leading-none">
                    {getInitials(displayName)}
                  </span>
                )}
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-bold text-[#121C2A] leading-tight">
                  {isLoading ? "Memuat..." : displayName}
                </span>
                <span className="text-[11px] text-slate-500 leading-tight">
                  {employee?.jabatan || employee?.jenis_jabatan || "Pegawai"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* BODY */}
        <main className="p-4 sm:p-6 max-w-6xl w-full mx-auto flex flex-col gap-5">

          {/* State: Loading */}
          {isLoading && (
            <>
              {/* Hero skeleton */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 animate-pulse">
                <div className="flex flex-col sm:flex-row gap-5">
                  <div className="w-24 h-24 rounded-2xl bg-slate-200 flex-shrink-0" />
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="h-4 bg-slate-100 rounded w-32" />
                    <div className="h-7 bg-slate-200 rounded w-64" />
                    <div className="h-4 bg-slate-100 rounded w-48" />
                    <div className="h-4 bg-slate-100 rounded w-56" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SkeletonCard rows={6} />
                <SkeletonCard rows={4} />
              </div>
            </>
          )}

          {/* State: Error */}
          {!isLoading && loadError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 flex flex-col items-center gap-4 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 mb-1">Profil Tidak Ditemukan</h2>
                <p className="text-sm text-slate-500 max-w-sm">{loadError}</p>
              </div>
              <button
                onClick={() => router.push("/Homepage")}
                className="mt-2 px-5 py-2.5 bg-[#3366CC] text-white text-sm font-semibold rounded-xl hover:bg-[#2952a3] transition-colors"
              >
                Kembali ke Beranda
              </button>
            </motion.div>
          )}

          {/* State: Data loaded */}
          {!isLoading && !loadError && employee && (
            <>
              {/* 1. HERO CARD */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row gap-5">
                  {/* Foto */}
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden ring-2 ring-slate-200 bg-[#3366CC] flex items-center justify-center flex-shrink-0 self-start">
                    {displayPhoto && !imageError ? (
                      <Image
                        src={displayPhoto}
                        alt={displayName}
                        fill
                        sizes="96px"
                        className="object-cover"
                        priority
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <span className="text-white text-2xl font-bold">{getInitials(displayName)}</span>
                    )}
                    <div className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" />
                  </div>

                  {/* Info utama */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {employee.status && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          {employee.status}
                        </span>
                      )}
                      {employee.jenis_jabatan && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {employee.jenis_jabatan}
                        </span>
                      )}
                      {employee.pangkat_golongan && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Golongan {employee.pangkat_golongan}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#0D1B2E] tracking-tight leading-tight">
                      {displayName}
                    </h2>
                    <p className="text-sm font-semibold text-[#3366CC] mt-0.5">
                      {employee.jabatan || employee.jenis_jabatan || "-"}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs text-slate-500">
                      {employee.nip && (
                        <span className="flex items-center gap-1">
                          <span className="font-semibold text-slate-700">NIP:</span>
                          <span className="font-mono">{employee.nip}</span>
                        </span>
                      )}
                      {employee.tim_kerja && (
                        <>
                          <span className="hidden sm:inline text-slate-300">·</span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            {formatTimKerja(employee.tim_kerja)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stat kanan */}
                  <div className="flex sm:flex-col gap-6 sm:gap-4 sm:items-end sm:text-right shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Masa Kerja</p>
                      <p className="text-2xl font-bold text-[#0D1B2E] leading-tight">{masaKerja}</p>
                      <p className="text-[11px] text-slate-500">{tmtSejak}</p>
                    </div>
                    {employee.pangkat_golongan && (
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Pangkat / Gol.</p>
                        <p className="text-xl font-bold text-[#3366CC] leading-tight">{employee.pangkat_golongan}</p>
                        <p className="text-[11px] text-slate-500">
                          {employee.tmt_golongan ? `TMT: ${employee.tmt_golongan}` : "Golongan Aktif"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* 2. TWO-COLUMN GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* LEFT */}
                <div className="flex flex-col gap-5">

                  {/* Informasi Pribadi & Kontak */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.05 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[#3366CC]" />
                        <h3 className="text-sm font-bold text-[#0D1B2E]">Informasi Pribadi &amp; Kontak</h3>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <BadgeCheck className="w-3 h-3" />
                        Data Terverifikasi
                      </span>
                    </div>
                    <div className="p-5 grid grid-cols-2 gap-4 text-xs">
                      {employee.nomor_ktp && (
                        <div className="col-span-2">
                          <p className="text-slate-400 font-medium mb-0.5 flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            Nomor Induk Kependudukan (NIK)
                          </p>
                          <p className="font-bold font-mono text-slate-800">{employee.nomor_ktp}</p>
                        </div>
                      )}
                      {(employee.tempat_lahir || employee.tanggal_lahir) && (
                        <div>
                          <p className="text-slate-400 font-medium mb-0.5">Tempat, Tanggal Lahir</p>
                          <p className="font-bold text-slate-800">
                            {[employee.tempat_lahir, formatTanggalLahir(employee.tanggal_lahir)]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                      )}
                      {employee.jenis_kelamin && (
                        <div>
                          <p className="text-slate-400 font-medium mb-0.5">Jenis Kelamin</p>
                          <p className="font-bold text-slate-800">{employee.jenis_kelamin}</p>
                        </div>
                      )}
                      {employee.email && (
                        <div className="col-span-2">
                          <p className="text-slate-400 font-medium mb-0.5 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            Email
                          </p>
                          <a
                            href={"mailto:" + employee.email}
                            className="font-semibold text-[#3366CC] hover:underline break-all"
                          >
                            {employee.email}
                          </a>
                        </div>
                      )}
                      {employee.nomor_ponsel && (
                        <div className="col-span-2">
                          <p className="text-slate-400 font-medium mb-0.5 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            Nomor HP / WhatsApp
                          </p>
                          <p className="font-bold text-slate-800">
                            {employee.nomor_ponsel.trim().startsWith("8")
                              ? "0" + employee.nomor_ponsel.trim()
                              : employee.nomor_ponsel}
                          </p>
                        </div>
                      )}

                      {/* Jika tidak ada field kontak sama sekali */}
                      {!employee.nomor_ktp &&
                        !employee.tempat_lahir &&
                        !employee.tanggal_lahir &&
                        !employee.jenis_kelamin &&
                        !employee.email &&
                        !employee.nomor_ponsel && (
                          <div className="col-span-2 text-center py-4 text-slate-400 text-xs">
                            Data pribadi belum diisi. Hubungi administrator.
                          </div>
                        )}
                    </div>
                  </motion.div>

                  {/* Riwayat Pendidikan */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.1 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-[#3366CC]" />
                        <h3 className="text-sm font-bold text-[#0D1B2E]">Riwayat Pendidikan</h3>
                      </div>
                    </div>
                    <div className="p-5 flex flex-col gap-3 text-xs">
                      {employee.jenjang_pendidikan ? (
                        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="w-9 h-9 rounded-xl bg-[#3366CC] text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 uppercase">
                            {employee.jenjang_pendidikan.substring(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 leading-snug">
                              {employee.jenjang_pendidikan}
                              {employee.jurusan_pendidikan ? ` – ${employee.jurusan_pendidikan}` : ""}
                            </p>
                            {employee.jurusan_pendidikan && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Jurusan: <strong className="text-slate-700">{employee.jurusan_pendidikan}</strong>
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-slate-400">
                          Data pendidikan belum tersedia.
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* RIGHT */}
                <div className="flex flex-col gap-5">

                  {/* Kepangkatan & Jabatan */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.07 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#3366CC]" />
                        <h3 className="text-sm font-bold text-[#0D1B2E]">Kepangkatan &amp; Jabatan</h3>
                      </div>
                    </div>
                    <div className="p-5 flex flex-col gap-4 text-xs">
                      <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                        <InfoRow label="Jabatan" value={employee.jabatan} />
                        <InfoRow label="Jenis Jabatan" value={employee.jenis_jabatan} />
                        <InfoRow label="Pangkat / Golongan" value={employee.pangkat_golongan} />
                        <InfoRow label="TMT Golongan" value={employee.tmt_golongan} />
                        <InfoRow label="Tim Kerja / Unit" value={formatTimKerja(employee.tim_kerja)} />
                        <InfoRow label="Status Kepegawaian" value={employee.status} />
                      </div>
                    </div>
                  </motion.div>

                  {/* Identitas Kepegawaian */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.12 }}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                      <Hash className="w-4 h-4 text-[#3366CC]" />
                      <h3 className="text-sm font-bold text-[#0D1B2E]">Identitas Kepegawaian</h3>
                    </div>
                    <div className="p-5 flex flex-col gap-4 text-xs">
                      <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                        <div className="col-span-2">
                          <p className="text-slate-400 font-medium mb-0.5">NIP (Nomor Induk Pegawai)</p>
                          <p className="font-bold font-mono text-slate-800 text-sm">{employee.nip || "-"}</p>
                        </div>
                        <InfoRow label="Nama Lengkap" value={employee.nama_lengkap} />
                        <InfoRow label="Nama (Pendek)" value={employee.nama} />
                      </div>

                      {/* Link ke Berkas */}
                      <div className="mt-2 pt-3 border-t border-slate-100">
                        <Link
                          href="/Homepage/berkas"
                          className="inline-flex items-center gap-1.5 text-[#3366CC] text-xs font-semibold hover:underline"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Kelola Berkas Kepegawaian
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Tombol Keluar Akun — di bagian paling bawah */}
              <div className="pt-4 pb-8 flex items-center justify-end border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-sm transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar dari Akun
                </button>
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}
