"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import UserSidebar from "../_components/user-sidebar";
import { ACCESS_TOKEN_KEY, USER_EMAIL_KEY, USER_ROLE_KEY } from "@/lib/api";
import {
  User,
  MapPin,
  GraduationCap,
  Briefcase,
  BookOpen,
  Info,
  TrendingUp,
  Menu,
  CalendarDays,
  Bell,
  ChevronRight,
  FileText,
  BadgeCheck,
  PenLine,
  CheckCircle2,
  LogOut,
} from "lucide-react";

const employee = {
  fullName: "Siti Rahayu, S.S., M.Hum.",
  role: "Peneliti Kebahasaan Ahli Muda",
  nip: "19915142881881281",
  kklp: "KKLP Pelindungan & Pemodernan Bahasa",
  location: "Rawamangun, Jakarta Timur",
  statusBadges: ["Pegawai Aktif", "PNS Tetap", "Golongan Penata (III/c)"],
  masaKerja: "6 Thn 2 Bln",
  masaKerjaSejak: "TMT Sejak 2018",
  angkaKreditPct: 87.1,
  angkaKreditLabel: "Target Kenaikan Pangkat",
  nik: "32750815428918812801",
  birthPlace: "Bandung, 14 Mei 1991",
  gender: "Perempuan",
  religion: "Islam",
  emailDinas: "siti.rahayu@kemdikbud.go.id",
  emailPersonal: "sitirahayu.hum@gmail.com",
  phone: "+62 812-3456-7890",
  address: "Jl. Cempaka Putih Tengah No. 14, RT 004/RW 007, Cempaka Putih, Jakarta Pusat, DKI Jakarta 10510",
  pakCurrent: 348.5,
  pakTarget: 400.0,
  golonganSekarang: "III/c",
  golonganMenuju: "Penata Tk. I (III/d)",
  nomorSK: "4821/B1/KP.02/2023",
  tmtJabatan: "03 Maret 2021",
  bidangKepakaran: "Dialektologi & Revitalisasi Bahasa Daerah Terancam Punah",
  atasanLangsung: "Dr. I Made Suparta, M.Hum.",
  education: [
    {
      level: "S2",
      degree: "Magister Humaniora (M.Hum.) – Linguistik Terapan",
      graduationYear: "2016",
      university: "Universitas Gadjah Mada (UGM)",
      city: "Yogyakarta",
      ipk: "3.88 / 4.00",
      predikat: "Cum Laude",
    },
    {
      level: "S1",
      degree: "Sarjana Sastra (S.S.) – Sastra Indonesia",
      graduationYear: "2013",
      university: "Universitas Padjadjaran (UNPAD)",
      city: "Jatinangor, Sumedang",
      ipk: "3.75 / 4.00",
      predikat: "Sangat Memuaskan",
    },
  ],
  publications: [
    {
      status: "Dalam Penulisan",
      year: 2024,
      title: "Vitalitas Bahasa Reta di Pulau Alor, NTT",
      description: "Studi sosiolinguistik pemetaan transmisi antargenerasi di wilayah kepulauan Nusa Tenggara Timur.",
      tag: "Pratinjau Abstrak & Manuskrip",
      tagColor: "blue",
    },
    {
      status: "Selesai",
      year: 2023,
      title: "Modul Revitalisasi Bahasa Enggano Berbasis Komunitas Generasi Muda",
      description: "Panduan ajar kontekstual berbasis muatan lokal untuk siswa sekolah dasar di Pulau Enggano, Bengkulu.",
      tag: "Terdaftar pada Repositori Kemdikbud (ISBN 978-602-xxx)",
      tagColor: "emerald",
    },
    {
      status: "Selesai",
      year: 2022,
      title: "Kamus Saku Dialek Using Banyuwangi: Fonologi dan Kosakata Dasar",
      description: "Dokumentasi tekstual variasi fonetis bahasa Using untuk pelestarian sastra tutur lisan.",
      tag: "Diterbitkan oleh Balai Bahasa Provinsi Jawa Timur",
      tagColor: "slate",
    },
  ],
  totalPublications: 14,
};

export default function ProfilePage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [todayFormatted, setTodayFormatted] = useState("Rabu, 30 September 2026");

  function handleLogout() {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(USER_EMAIL_KEY);
    sessionStorage.removeItem(USER_ROLE_KEY);
    // Hapus cookie role agar middleware tidak redirect balik
    document.cookie = "pusbanglin_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    router.replace("/auth/login");
  }

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

  const pakPct = Math.round((employee.pakCurrent / employee.pakTarget) * 100);

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-[#121C2A] font-sans antialiased flex flex-col md:flex-row selection:bg-[#3366CC] selection:text-white">
      <UserSidebar
        activePage="profil"
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 md:pl-[280px] flex flex-col min-w-0">
        {/* TOPBAR */}
        <header className="sticky top-0 z-30 h-[68px] bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-[#121C2A]">Profil Pegawai</h1>
              <p className="text-[11px] text-slate-500 leading-none mt-0.5">Data Kepegawaian Terintegrasi BKN</p>
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
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#3366CC]/20 bg-slate-100">
                <Image src="/stitch-assets/siti-rahayu.png" alt="Siti Rahayu" fill sizes="32px" className="object-cover" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-xs font-bold text-[#121C2A] leading-tight">Siti Rahayu</span>
                <span className="text-[11px] text-slate-500 leading-tight">Peneliti Ahli Muda</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Keluar dari akun"
              className="flex items-center gap-1.5 ml-1 px-3 py-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors text-xs font-semibold border border-slate-200 hover:border-red-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        {/* BODY */}
        <main className="p-4 sm:p-6 max-w-6xl w-full mx-auto flex flex-col gap-5">

          {/* 1. HERO CARD */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden ring-2 ring-slate-200 bg-slate-100 flex-shrink-0 self-start">
                <Image src="/stitch-assets/siti-rahayu.png" alt={employee.fullName} fill sizes="96px" className="object-cover" priority />
                <div className="absolute bottom-1 right-1 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {employee.statusBadges.map((badge) => (
                    <span key={badge} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {badge === "Pegawai Aktif" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />}
                      {badge}
                    </span>
                  ))}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0D1B2E] tracking-tight leading-tight">{employee.fullName}</h2>
                <p className="text-sm font-semibold text-[#3366CC] mt-0.5">{employee.role}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-slate-700">NIP:</span>
                    <span className="font-mono">{employee.nip}</span>
                  </span>
                  <span className="hidden sm:inline text-slate-300">·</span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    {employee.kklp}
                  </span>
                  <span className="hidden sm:inline text-slate-300">·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {employee.location}
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col gap-6 sm:gap-4 sm:items-end sm:text-right shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Masa Kerja</p>
                  <p className="text-2xl font-bold text-[#0D1B2E] leading-tight">{employee.masaKerja}</p>
                  <p className="text-[11px] text-slate-500">{employee.masaKerjaSejak}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Status Angka Kredit</p>
                  <p className="text-2xl font-bold text-[#3366CC] leading-tight">{employee.angkaKreditPct}%</p>
                  <p className="text-[11px] text-slate-500">{employee.angkaKreditLabel}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 2. TWO-COLUMN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* LEFT */}
            <div className="flex flex-col gap-5">

              {/* Informasi Pribadi */}
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
                    Terverifikasi Dukcapil
                  </span>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-400 font-medium mb-0.5">Nomor Induk Kependudukan (NIK)</p>
                    <p className="font-bold font-mono text-slate-800">{employee.nik}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium mb-0.5">Tempat, Tanggal Lahir</p>
                    <p className="font-bold text-slate-800">{employee.birthPlace}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium mb-0.5">Jenis Kelamin</p>
                    <p className="font-bold text-slate-800">{employee.gender}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium mb-0.5">Agama</p>
                    <p className="font-bold text-slate-800">{employee.religion}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium mb-0.5">Email Kedinasan (Kemdikbudristek)</p>
                    <a href={"mailto:" + employee.emailDinas} className="font-semibold text-[#3366CC] hover:underline break-all">{employee.emailDinas}</a>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium mb-0.5">Email Pribadi</p>
                    <a href={"mailto:" + employee.emailPersonal} className="font-semibold text-[#3366CC] hover:underline break-all">{employee.emailPersonal}</a>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-400 font-medium mb-0.5">Nomor HP / WhatsApp</p>
                    <p className="font-bold text-slate-800">{employee.phone}</p>
                  </div>
                  <div className="col-span-2 pt-3 border-t border-slate-100">
                    <p className="text-slate-400 font-medium mb-0.5">Alamat Domisili Sesuai KTP</p>
                    <p className="font-semibold text-slate-700 leading-relaxed">{employee.address}</p>
                  </div>
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
                    <h3 className="text-sm font-bold text-[#0D1B2E]">Riwayat Pendidikan Formal</h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                    {employee.education.length} Jenjang Terdata
                  </span>
                </div>
                <div className="p-5 flex flex-col gap-3">
                  {employee.education.map((edu) => (
                    <div key={edu.level} className="flex items-start gap-3.5 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-9 h-9 rounded-xl bg-[#3366CC] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {edu.level}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 leading-snug">{edu.degree}</p>
                          <span className="text-[11px] font-bold text-[#3366CC] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                            Lulus {edu.graduationYear}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-[#3366CC] mt-0.5">
                          {edu.university} <span className="text-slate-400 font-normal">• {edu.city}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Indeks Prestasi Kumulatif (IPK): <strong className="text-slate-700">{edu.ipk}</strong>
                          {" "}· Predikat: <strong className="text-slate-700">{edu.predikat}</strong>
                        </p>
                      </div>
                    </div>
                  ))}
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
                  <button className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                    <Info className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-5 flex flex-col gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-slate-700">Angka Kredit Kumulatif (PAK)</span>
                      <span className="font-bold text-[#3366CC]">{employee.pakCurrent} / {employee.pakTarget}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-[#3366CC] h-full rounded-full" style={{ width: pakPct + "%" }} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-slate-500">
                        Golongan Saat Ini: <strong className="text-slate-800">{employee.golonganSekarang}</strong>
                      </span>
                      <span className="text-slate-500">
                        Menuju: <strong className="text-[#3366CC]">{employee.golonganMenuju}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <div>
                      <p className="text-slate-400 font-medium mb-0.5">Nomor SK Terakhir</p>
                      <p className="font-bold font-mono text-slate-800">{employee.nomorSK}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium mb-0.5">TMT Jabatan Fungsional</p>
                      <p className="font-bold text-slate-800">{employee.tmtJabatan}</p>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-slate-100">
                    <p className="text-slate-400 font-medium mb-1">Bidang Kepakaran Utama</p>
                    <p className="font-bold text-[#3366CC] leading-snug">{employee.bidangKepakaran}</p>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <p className="text-slate-400 font-medium">Atasan Langsung (Penilai)</p>
                    <p className="font-bold text-slate-800">{employee.atasanLangsung}</p>
                  </div>
                </div>
              </motion.div>

              {/* Fokus Riset & Publikasi */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.12 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#3366CC]" />
                    <h3 className="text-sm font-bold text-[#0D1B2E]">Fokus Riset &amp; Publikasi</h3>
                  </div>
                  <Link href="#" className="text-[11px] font-semibold text-[#3366CC] hover:underline flex items-center gap-0.5">
                    Lihat Semua ({employee.totalPublications})
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="divide-y divide-slate-100">
                  {employee.publications.map((pub, idx) => (
                    <div key={idx} className="px-5 py-4 hover:bg-slate-50/70 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <span className={"inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 " + (pub.status === "Dalam Penulisan" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200")}>
                          {pub.status === "Dalam Penulisan" ? <PenLine className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          {pub.status}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          Tahun {pub.year}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#0D1B2E] leading-snug mb-1">{pub.title}</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed mb-2">{pub.description}</p>
                      <span className={"inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded " + (pub.tagColor === "blue" ? "text-[#3366CC] bg-blue-50" : pub.tagColor === "emerald" ? "text-emerald-700 bg-emerald-50" : "text-slate-600 bg-slate-100")}>
                        <FileText className="w-3 h-3" />
                        {pub.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
