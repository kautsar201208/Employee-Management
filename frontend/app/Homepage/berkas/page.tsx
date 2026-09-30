"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import UserSidebar from "../_components/user-sidebar";
import {
  FileUp,
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Building2,
  Calendar,
  X,
  FileCheck,
  Check,
  Info,
  ChevronDown,
  Sparkles,
  Menu,
  Bell
} from "lucide-react";

interface UploadedDocument {
  id: string;
  title: string;
  documentNumber: string;
  category: "sk" | "pendidikan" | "sertifikat" | "kependudukan" | "skp";
  categoryLabel: string;
  fileType: "PDF" | "JPG" | "PNG";
  fileSize: string;
  uploadDate: string;
  effectiveDate?: string;
  status: "verified" | "pending" | "rejected";
  statusLabel: string;
}

const INITIAL_DOCUMENTS: UploadedDocument[] = [
  {
    id: "DOC-001",
    title: "SK Kenaikan Pangkat Penata Tingkat I (III/d)",
    documentNumber: "823.3/0412/KP/2022",
    category: "sk",
    categoryLabel: "Surat Keputusan",
    fileType: "PDF",
    fileSize: "1.4 MB",
    uploadDate: "15 Apr 2022",
    effectiveDate: "01 Apr 2022",
    status: "verified",
    statusLabel: "Terverifikasi BKN",
  },
  {
    id: "DOC-002",
    title: "SK Pengangkatan Jabfung Pranata Komputer Ahli Muda",
    documentNumber: "821.29/019/JF/2021",
    category: "sk",
    categoryLabel: "Surat Keputusan",
    fileType: "PDF",
    fileSize: "2.1 MB",
    uploadDate: "20 Jan 2021",
    effectiveDate: "15 Jan 2021",
    status: "verified",
    statusLabel: "Terverifikasi",
  },
  {
    id: "DOC-003",
    title: "SK Pengangkatan Pegawai Negeri Sipil (PNS 100%)",
    documentNumber: "813.2/0289/PNS/2016",
    category: "sk",
    categoryLabel: "Surat Keputusan",
    fileType: "PDF",
    fileSize: "1.8 MB",
    uploadDate: "10 Apr 2016",
    effectiveDate: "01 Apr 2016",
    status: "verified",
    statusLabel: "Terverifikasi",
  },
  {
    id: "DOC-004",
    title: "Ijazah & Transkrip S2 Magister Humaniora (UI)",
    documentNumber: "UI-M.Hum/2018/08942",
    category: "pendidikan",
    categoryLabel: "Pendidikan Formal",
    fileType: "PDF",
    fileSize: "3.5 MB",
    uploadDate: "12 Sep 2018",
    effectiveDate: "30 Ags 2018",
    status: "verified",
    statusLabel: "Terverifikasi Kemdikbud",
  },
  {
    id: "DOC-005",
    title: "Ijazah & Transkrip S1 Sarjana Sastra (UGM)",
    documentNumber: "UGM-SS/2012/03141",
    category: "pendidikan",
    categoryLabel: "Pendidikan Formal",
    fileType: "PDF",
    fileSize: "2.9 MB",
    uploadDate: "20 Agu 2015",
    effectiveDate: "15 Jul 2012",
    status: "verified",
    statusLabel: "Terverifikasi Kemdikbud",
  },
  {
    id: "DOC-006",
    title: "Sertifikat Kelulusan Pelatihan UI/UX Design System (BNSP)",
    documentNumber: "BNSP-IT/2023/UX-7721",
    category: "sertifikat",
    categoryLabel: "Sertifikasi",
    fileType: "PDF",
    fileSize: "1.2 MB",
    uploadDate: "14 Nov 2023",
    effectiveDate: "01 Nov 2023",
    status: "verified",
    statusLabel: "Terverifikasi",
  },
  {
    id: "DOC-007",
    title: "Sertifikat Uji Kemahiran Berbahasa Indonesia (UKBI)",
    documentNumber: "UKBI/PB/2024/00810",
    category: "sertifikat",
    categoryLabel: "Sertifikasi",
    fileType: "PDF",
    fileSize: "0.9 MB",
    uploadDate: "10 Jun 2024",
    effectiveDate: "28 Mei 2024",
    status: "verified",
    statusLabel: "Predikat Istimewa",
  },
  {
    id: "DOC-008",
    title: "Laporan Sasaran Kinerja Pegawai (SKP) Periode 2024",
    documentNumber: "SKP-2024/MOLIN/089",
    category: "skp",
    categoryLabel: "Penilaian Kinerja",
    fileType: "PDF",
    fileSize: "1.6 MB",
    uploadDate: "Hari Ini, 09:30",
    effectiveDate: "30 Des 2024",
    status: "pending",
    statusLabel: "Menunggu Validasi SDM",
  },
];

export default function UnggahKelolaBerkasPage() {
  const [documents, setDocuments] = useState<UploadedDocument[]>(INITIAL_DOCUMENTS);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<UploadedDocument | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<UploadedDocument | null>(null);

  // Upload Form State
  const [formCategory, setFormCategory] = useState<UploadedDocument["category"]>("sk");
  const [formTitle, setFormTitle] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccessAlert, setUploadSuccessAlert] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Date format
  const [todayFormatted, setTodayFormatted] = useState("Rabu, 30 September 2026");
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

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!formTitle) {
        setFormTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  // Handle Drag Over & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!formTitle) {
        setFormTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  // Handle Upload Submission
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !formTitle) return;

    setIsUploading(true);
    setUploadProgress(15);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 100;
        }
        return prev + 25;
      });
    }, 150);

    setTimeout(() => {
      clearInterval(interval);
      setIsUploading(false);

      const categoryLabels: Record<string, string> = {
        sk: "Surat Keputusan",
        pendidikan: "Pendidikan Formal",
        sertifikat: "Sertifikasi",
        kependudukan: "Dokumen Pribadi",
        skp: "Penilaian Kinerja",
      };

      const newDoc: UploadedDocument = {
        id: `DOC-00${documents.length + 1}`,
        title: formTitle,
        documentNumber: formNumber || `DOK-${Date.now().toString().slice(-5)}`,
        category: formCategory,
        categoryLabel: categoryLabels[formCategory] || "Lainnya",
        fileType: selectedFile.name.endsWith(".png") ? "PNG" : selectedFile.name.endsWith(".jpg") ? "JPG" : "PDF",
        fileSize: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
        uploadDate: "Baru saja",
        effectiveDate: "2024",
        status: "pending",
        statusLabel: "Menunggu Validasi SDM",
      };

      setDocuments([newDoc, ...documents]);
      setSelectedFile(null);
      setFormTitle("");
      setFormNumber("");
      setUploadProgress(0);
      setUploadSuccessAlert(true);
      setTimeout(() => setUploadSuccessAlert(false), 4000);
    }, 900);
  };

  // Delete Document
  const handleDeleteDocument = (id: string) => {
    setDocuments(documents.filter((d) => d.id !== id));
    setDeleteConfirmDoc(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#121C2A] font-sans antialiased flex flex-col md:flex-row selection:bg-[#3366CC] selection:text-white">
      {/* 1. SIDEBAR (User Sidebar Identik) */}
      <UserSidebar
        activePage="berkas"
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobileMenu={() => setMobileMenuOpen(false)}
      />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 md:pl-[280px] flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-[74px] bg-white border-b border-[#E2E8F0]/80 px-4 sm:px-8 flex items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.03)] backdrop-blur-md bg-white/95">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 md:hidden transition-colors"
              aria-label="Buka menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-base font-bold text-[#121C2A] flex items-center gap-2">
                <span>Unggah &amp; Kelola Berkas</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-[#094CB2] px-2.5 py-0.5 rounded-full border border-blue-200">
                  <ShieldCheck className="w-3 h-3" /> Digital Archive
                </span>
              </h1>
              <p className="text-[11px] text-[#535F71]">
                Arsip berkas resmi kepegawaian digital terintegrasi BSrE &amp; BKN
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EFF4FF] text-[#094CB2] text-xs font-semibold border border-blue-100">
              <Calendar className="w-4 h-4 text-[#094CB2]" />
              <span>{todayFormatted}</span>
            </div>

            {/* Profile Avatar */}
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-full ring-2 ring-[#094CB2]/20 overflow-hidden bg-slate-200 flex-shrink-0">
                <Image
                  src="/stitch-assets/siti-rahayu.png"
                  alt="Siti Rahayu"
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="font-bold text-xs text-[#121C2A] leading-tight">
                  Siti Rahayu
                </span>
                <span className="text-[11px] text-[#535F71] leading-tight">
                  NIP: 19890514 201504 2 001
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
          {/* Success Banner */}
          <AnimatePresence>
            {uploadSuccessAlert && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    Berkas berhasil diunggah! Dokumen kini berstatus <strong>Menunggu Validasi SDM</strong>.
                  </span>
                </div>
                <button
                  onClick={() => setUploadSuccessAlert(false)}
                  className="text-emerald-600 hover:text-emerald-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top 4 Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0]/80 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-medium text-[#535F71]">Total Berkas Tersimpan</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-[#121C2A]">{documents.length}</span>
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Berkas</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2">Seluruh dokumen arsip</span>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0]/80 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-medium text-[#535F71]">Terverifikasi Resmi</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-emerald-600">
                  {documents.filter((d) => d.status === "verified").length}
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Sah</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2">Tervalidasi BKN &amp; BSrE</span>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0]/80 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-medium text-[#535F71]">Menunggu Verifikasi</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-amber-600">
                  {documents.filter((d) => d.status === "pending").length}
                </span>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">Proses</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2">Dalam tinjauan tim SDM</span>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0]/80 shadow-xs flex flex-col justify-between">
              <span className="text-xs font-medium text-[#535F71]">Kapasitas Penyimpanan</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-bold text-[#094CB2]">15.4 MB</span>
                <span className="text-[11px] font-semibold text-slate-500">/ 100 MB</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className="bg-[#094CB2] h-full rounded-full" style={{ width: "15.4%" }} />
              </div>
            </div>
          </div>

          {/* Section: Upload Area & Guide (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Upload Form Box (7 cols) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-7 bg-white p-6 rounded-3xl border border-[#E2E8F0]/80 shadow-xs flex flex-col gap-5"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-[#094CB2]">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#121C2A]">Unggah Berkas Baru</h2>
                    <p className="text-xs text-[#535F71]">Tambahkan dokumen atau pembaruan SK kepegawaian</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">PDF, JPG, PNG Maks. 10MB</span>
              </div>

              <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4 text-xs">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    selectedFile
                      ? "border-blue-400 bg-blue-50/40"
                      : "border-slate-200 hover:border-blue-300 hover:bg-[#F8F9FF]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#094CB2] flex items-center justify-center mb-1">
                    <FileUp className="w-6 h-6" />
                  </div>
                  {selectedFile ? (
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-slate-800 text-xs">{selectedFile.name}</span>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        Ukuran: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Klik untuk mengganti
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="font-bold text-slate-700 text-xs">
                        Tarik &amp; lepas berkas di sini, atau <span className="text-[#094CB2] underline">pilih berkas</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Format PDF lebih direkomendasikan untuk dokumen resmi
                      </p>
                    </>
                  )}
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Kategori Dokumen *</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as UploadedDocument["category"])}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F9FF] border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                    >
                      <option value="sk">Surat Keputusan (SK)</option>
                      <option value="pendidikan">Ijazah &amp; Transkrip Nilai</option>
                      <option value="sertifikat">Sertifikat Pelatihan &amp; Uji</option>
                      <option value="kependudukan">Dokumen Kependudukan (KTP/KK)</option>
                      <option value="skp">SKP &amp; Kinerja</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Nomor Dokumen / SK</label>
                    <input
                      type="text"
                      placeholder="Contoh: 823.3/0412/KP/2024"
                      value={formNumber}
                      onChange={(e) => setFormNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F9FF] border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">Judul / Nama Lengkap Dokumen *</label>
                    <input
                      type="text"
                      placeholder="Contoh: SK Kenaikan Pangkat Penata Tingkat I (III/d)"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F9FF] border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Upload Progress Bar if uploading */}
                {isUploading && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                      <span>Mengunggah dokumen ke peladen aman...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#094CB2] h-full rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setFormTitle("");
                        setFormNumber("");
                      }}
                      className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-colors"
                    >
                      Batal
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!selectedFile || !formTitle || isUploading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#094CB2] text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{isUploading ? "Mengunggah..." : "Kirim & Simpan Dokumen"}</span>
                  </button>
                </div>
              </form>
            </motion.div>

            {/* Right Guide & Verification Instructions (5 cols) */}
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#E2E8F0]/80 shadow-xs flex flex-col justify-between gap-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-[#121C2A]">Ketentuan Berkas Resmi</h3>
                </div>

                <div className="space-y-3 text-xs text-[#535F71]">
                  <div className="p-3.5 rounded-2xl bg-[#F8F9FF] border border-slate-100 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-[#094CB2] flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="leading-relaxed">
                      <strong>Hasil Pindai (Scan) Asli:</strong> Dokumen harus berasal dari dokumen asli berwarna atau salinan legalisir basah yang jelas.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F8F9FF] border border-slate-100 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-[#094CB2] flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="leading-relaxed">
                      <strong>Tanda Tangan Elektronik:</strong> Berkas SK ber-TTE resmi BKN/BSrE akan diverifikasi otomatis oleh sistem.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F8F9FF] border border-slate-100 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-[#094CB2] flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="leading-relaxed">
                      <strong>Waktu Verifikasi:</strong> Dokumen yang baru diunggah akan diverifikasi oleh Admin Kepegawaian maksimal <strong>2x24 jam kerja</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#EFF4FF] border border-blue-100 flex items-center gap-3 text-xs text-[#094CB2]">
                <Info className="w-5 h-5 flex-shrink-0" />
                <span className="text-[11px] leading-relaxed">
                  Perlu bantuan verifikasi berkas khusus? Hubungi Subbagian Tata Usaha &amp; Kepegawaian Pusbanglin.
                </span>
              </div>
            </div>
          </div>

          {/* Section: Uploaded Documents Table & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-[#E2E8F0]/80 shadow-xs overflow-hidden"
          >
            {/* Filter and Search Bar */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#121C2A]">Daftar Berkas Terunggah</h3>
                <p className="text-xs text-[#535F71] mt-0.5">Kelola berkas digital yang sudah tersimpan di pangkalan data</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search Input */}
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari berkas atau nomor SK..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#F8F9FF] text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-blue-400"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-[#F8F9FF] text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none text-slate-700 cursor-pointer"
                >
                  <option value="all">Semua Kategori</option>
                  <option value="sk">Surat Keputusan (SK)</option>
                  <option value="pendidikan">Pendidikan Formal</option>
                  <option value="sertifikat">Sertifikasi &amp; Uji</option>
                  <option value="skp">SKP &amp; Kinerja</option>
                </select>
              </div>
            </div>

            {/* Document List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[#F8F9FF] text-[#535F71] text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3.5 px-6">Nama Berkas</th>
                    <th className="py-3.5 px-4">Kategori &amp; Nomor SK</th>
                    <th className="py-3.5 px-4">Ukuran &amp; Tipe</th>
                    <th className="py-3.5 px-4">Status Verifikasi</th>
                    <th className="py-3.5 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-[#F8F9FF]/80 transition-colors group">
                        {/* Title & Upload Date */}
                        <td className="py-4 px-6">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 font-bold flex items-center justify-center text-xs flex-shrink-0">
                              {doc.fileType}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 group-hover:text-[#094CB2] transition-colors">
                                {doc.title}
                              </span>
                              <span className="text-[11px] text-slate-400 mt-0.5">
                                Diunggah: {doc.uploadDate}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category & Document Number */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 text-[11px]">
                              {doc.categoryLabel}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 mt-0.5">
                              {doc.documentNumber}
                            </span>
                          </div>
                        </td>

                        {/* File Size */}
                        <td className="py-4 px-4 text-slate-600 font-medium">
                          {doc.fileSize}
                        </td>

                        {/* Status Chip */}
                        <td className="py-4 px-4">
                          {doc.status === "verified" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              {doc.statusLabel}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              {doc.statusLabel}
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#094CB2] hover:bg-blue-50 transition-colors"
                              title="Lihat Pratinjau"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => alert(`Mengunduh berkas ${doc.title}...`)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Unduh Berkas"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmDoc(doc)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Hapus Berkas"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                        Tidak ada berkas yang cocok dengan pencarian atau filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Table Info */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-[#535F71]">
              <span>Menampilkan {filteredDocuments.length} dari {documents.length} total berkas</span>
              <span className="text-[11px] text-slate-400">Pembaruan terakhir: Hari ini, 09:30 WIB</span>
            </div>
          </motion.div>
        </main>
      </div>

      {/* 3. MODAL PREVIEW DOKUMEN */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewDoc(null)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative text-center"
            >
              <button
                onClick={() => setPreviewDoc(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 font-bold text-sm">
                {previewDoc.fileType}
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-1">{previewDoc.title}</h3>
              <p className="text-xs font-mono text-slate-500 mb-3">{previewDoc.documentNumber}</p>

              <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1.5 mb-4 text-left border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Kategori:</span>
                  <span className="font-semibold text-slate-800">{previewDoc.categoryLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ukuran Berkas:</span>
                  <span className="font-semibold text-slate-800">{previewDoc.fileSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal Unggah:</span>
                  <span className="font-semibold text-slate-800">{previewDoc.uploadDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Validasi:</span>
                  <span className="font-semibold text-emerald-600">{previewDoc.statusLabel}</span>
                </div>
              </div>

              <div className="h-44 bg-slate-100 rounded-2xl flex flex-col items-center justify-center border border-dashed border-slate-300 text-xs text-slate-400 mb-5 gap-2">
                <FileCheck className="w-8 h-8 text-slate-300" />
                <span>Pratinjau Dokumen Digital Terautentikasi</span>
              </div>

              <div className="flex items-center justify-center gap-2.5">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    alert(`Mengunduh ${previewDoc.title}...`);
                    setPreviewDoc(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-[#094CB2] text-white hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  Unduh Dokumen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. MODAL KONFIRMASI HAPUS DOKUMEN */}
      <AnimatePresence>
        {deleteConfirmDoc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirmDoc(null)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Hapus Berkas?</h3>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Apakah Anda yakin ingin menghapus <strong>&quot;{deleteConfirmDoc.title}&quot;</strong> dari arsip Anda?
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setDeleteConfirmDoc(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDeleteDocument(deleteConfirmDoc.id)}
                  className="px-4 py-2 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 rounded-xl shadow-xs"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
