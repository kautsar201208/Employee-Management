"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import UserSidebar from "../_components/user-sidebar";
import {
  ACCESS_TOKEN_KEY,
  USER_EMAIL_KEY,
  getUserDocuments,
  uploadUserDocument,
  deleteUserDocument,
  getMyAccount,
  DocumentItem,
  ApiEmployee,
} from "@/lib/api";
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
  Bell,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface UploadedDocument {
  id: string;
  title: string;
  documentNumber: string;
  category: "sk" | "pendidikan" | "sertifikat" | "kependudukan" | "skp";
  categoryLabel: string;
  fileType: "PDF" | "JPG" | "PNG";
  fileSize: string;
  rawBytes?: number;
  uploadDate: string;
  effectiveDate?: string;
  status: "verified" | "pending" | "rejected";
  statusLabel: string;
  signedUrl?: string | null;
}

const categoryLabels: Record<string, string> = {
  sk: "Surat Keputusan",
  pendidikan: "Pendidikan Formal",
  sertifikat: "Sertifikasi",
  kependudukan: "Dokumen Pribadi",
  skp: "Penilaian Kinerja",
};

function mapBackendDocument(doc: DocumentItem): UploadedDocument {
  const mime = doc.file_type || "";
  const ext = (doc.nama_file || "").split(".").pop()?.toUpperCase();
  const fileType: "PDF" | "JPG" | "PNG" =
    ext === "PNG" || mime.includes("png")
      ? "PNG"
      : ext === "JPG" || ext === "JPEG" || mime.includes("jpeg") || mime.includes("jpg")
      ? "JPG"
      : "PDF";

  const sizeMB = doc.file_size
    ? `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`
    : "1.0 MB";

  const catRaw = (doc.kategori || "").toLowerCase();
  let category: UploadedDocument["category"] = "sk";
  if (catRaw.includes("pendidikan") || catRaw.includes("ijazah")) category = "pendidikan";
  else if (catRaw.includes("sertifikat") || catRaw.includes("sertifikasi")) category = "sertifikat";
  else if (catRaw.includes("kependudukan") || catRaw.includes("ktp") || catRaw.includes("kk")) category = "kependudukan";
  else if (catRaw.includes("skp") || catRaw.includes("kinerja")) category = "skp";

  let formattedDate = "Baru saja";
  if (doc.created_at) {
    try {
      formattedDate = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(doc.created_at));
    } catch {
      formattedDate = "Hari ini";
    }
  }

  return {
    id: doc.id,
    title: doc.nama_file || "Dokumen Kepegawaian",
    documentNumber: `DOC-${doc.id.slice(0, 8).toUpperCase()}`,
    category,
    categoryLabel: doc.kategori || categoryLabels[category],
    fileType,
    fileSize: sizeMB,
    rawBytes: doc.file_size || 0,
    uploadDate: formattedDate,
    status: "verified",
    statusLabel: "Terverifikasi Sistem",
    signedUrl: doc.signed_url || null,
  };
}

export default function UnggahKelolaBerkasPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<UploadedDocument | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<UploadedDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // User info state
  const [currentEmployee, setCurrentEmployee] = useState<ApiEmployee | null>(null);
  const [userEmail, setUserEmail] = useState("");

  // Upload Form State
  const [formCategory, setFormCategory] = useState<UploadedDocument["category"]>("sk");
  const [formTitle, setFormTitle] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccessAlert, setUploadSuccessAlert] = useState(false);
  const [uploadErrorAlert, setUploadErrorAlert] = useState<string | null>(null);
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

  // Fetch initial documents & user info
  useEffect(() => {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    const email = sessionStorage.getItem(USER_EMAIL_KEY) || "";
    setUserEmail(email);

    async function loadData() {
      if (!token) return;
      setIsLoadingDocs(true);

      // 1. Ambil data akun pegawai
      try {
        const account = await getMyAccount(token);
        if (account.employee) {
          setCurrentEmployee(account.employee);
        }
      } catch (err) {
        console.warn("Notice loading account:", err);
      }

      // 2. Ambil dokumen
      try {
        const docs = await getUserDocuments(token);
        setDocuments(docs.map(mapBackendDocument));
      } catch (err) {
        console.error("Gagal memuat berkas:", err);
      } finally {
        setIsLoadingDocs(false);
      }
    }

    loadData();
  }, [router]);

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
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !formTitle) return;

    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setUploadErrorAlert(null);

    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("kategori", categoryLabels[formCategory] || formCategory);
      fd.append("title", formTitle);
      if (formNumber) {
        fd.append("documentNumber", formNumber);
      }

      const uploaded = await uploadUserDocument(token, fd, (pct) => {
        setUploadProgress(Math.max(15, pct));
      });

      const mapped = mapBackendDocument(uploaded);
      setDocuments((prev) => [mapped, ...prev]);

      // Reset Form
      setSelectedFile(null);
      setFormTitle("");
      setFormNumber("");
      setUploadProgress(100);
      setUploadSuccessAlert(true);
      setTimeout(() => setUploadSuccessAlert(false), 5000);
    } catch (err) {
      setUploadErrorAlert(err instanceof Error ? err.message : "Gagal mengunggah berkas");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Delete Document
  const handleDeleteDocument = async (id: string) => {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;

    setIsDeleting(true);
    try {
      await deleteUserDocument(token, id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setDeleteConfirmDoc(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus berkas");
    } finally {
      setIsDeleting(false);
    }
  };

  // Download Document
  const handleDownload = (doc: UploadedDocument) => {
    if (doc.signedUrl) {
      window.open(doc.signedUrl, "_blank", "noopener,noreferrer");
    } else {
      alert("Tautan unduhan tidak tersedia atau telah kedaluwarsa.");
    }
  };

  // Calculate stats
  const totalBytes = documents.reduce((sum, d) => sum + (d.rawBytes || 0), 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
  const storagePct = Math.min(100, Math.round((totalBytes / (100 * 1024 * 1024)) * 100));

  const userName = currentEmployee?.nama_lengkap || currentEmployee?.nama || userEmail.split("@")[0] || "Pegawai";
  const userNip = currentEmployee?.nip || "Pegawai Terdaftar";

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#121C2A] font-sans antialiased flex flex-col md:flex-row selection:bg-[#3366CC] selection:text-white">
      {/* 1. SIDEBAR */}
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
                Arsip berkas resmi kepegawaian digital terintegrasi aman di cloud
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
              <div className="relative w-9 h-9 rounded-full ring-2 ring-[#094CB2]/20 overflow-hidden bg-slate-200 flex-shrink-0 flex items-center justify-center font-bold text-xs text-[#094CB2]">
                {currentEmployee?.profile_image ? (
                  <Image
                    src={currentEmployee.profile_image}
                    alt={userName}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                ) : (
                  userName.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="font-bold text-xs text-[#121C2A] leading-tight">
                  {userName}
                </span>
                <span className="text-[11px] text-[#535F71] leading-tight">
                  {userNip.startsWith("19") ? `NIP: ${userNip}` : userNip}
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
                className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span>
                    Berkas berhasil diunggah! Dokumen kini tersimpan di arsip digital Anda.
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

          {/* Error Banner */}
          <AnimatePresence>
            {uploadErrorAlert && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <span>{uploadErrorAlert}</span>
                </div>
                <button
                  onClick={() => setUploadErrorAlert(null)}
                  className="text-red-600 hover:text-red-900"
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
                <span className="text-2xl font-bold text-[#094CB2]">{totalMB} MB</span>
                <span className="text-[11px] font-semibold text-slate-500">/ 100 MB</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className="bg-[#094CB2] h-full rounded-full transition-all duration-500" style={{ width: `${storagePct}%` }} />
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
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
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
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F8F9FF] border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Upload Progress Bar if uploading */}
                {isUploading && (
                  <div className="space-y-1 mt-1">
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                      <span>Mengunggah berkas ke server...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#094CB2] h-full rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!selectedFile || !formTitle || isUploading}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-bold bg-[#094CB2] text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sedang Mengunggah ({uploadProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Unggah Berkas Sekarang</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>

            {/* Panduan & Info Box (5 cols) */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-5 bg-gradient-to-br from-[#094CB2] to-[#121C2A] text-white p-6 rounded-3xl shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Petunjuk Pengunggahan</h3>
                    <p className="text-[11px] text-white/70">Standar Pengarsipan Dokumen Resmi Pusbanglin</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-white/80">
                      <strong>Dokumen Asli / Legalisir:</strong> Pastikan hasil pindai (scan) terlihat jelas dan tidak buram.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-white/80">
                      <strong>Format File:</strong> Utamakan format PDF multi-halaman jika dokumen memiliki lampiran.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-white/80">
                      <strong>Kerahasiaan Terjamin:</strong> Seluruh berkas disimpan terenkripsi dan hanya dapat diakses oleh Anda dan Tim Kepegawaian resmi.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/70">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-300" /> Terenkripsi AES-256
                </span>
                <span>Pusbanglin Cloud Archive</span>
              </div>
            </motion.div>
          </div>

          {/* Section: Document Archive Table & Filter */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-3xl border border-[#E2E8F0]/80 shadow-xs overflow-hidden flex flex-col"
          >
            {/* Table Header Filter Toolbar */}
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-[#094CB2]">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[#121C2A]">Daftar Berkas Terunggah</h3>
                <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold">
                  {documents.length} Berkas
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Search Input */}
                <div className="relative flex-1 sm:w-60">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari judul atau nomor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#F8F9FF] border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Category Filter Select */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-[#F8F9FF] border border-slate-200 text-slate-700 font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Semua Kategori</option>
                  <option value="sk">Surat Keputusan</option>
                  <option value="pendidikan">Pendidikan Formal</option>
                  <option value="sertifikat">Sertifikasi</option>
                  <option value="kependudukan">Dokumen Pribadi</option>
                  <option value="skp">Penilaian Kinerja</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 bg-[#F8F9FF]/60 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Nama &amp; Tanggal Dokumen</th>
                    <th className="py-3.5 px-4">Kategori &amp; Nomor</th>
                    <th className="py-3.5 px-4">Ukuran</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {isLoadingDocs ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#094CB2]" />
                        <span>Memuat arsip berkas Anda...</span>
                      </td>
                    </tr>
                  ) : filteredDocuments.length > 0 ? (
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
                              onClick={() => handleDownload(doc)}
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
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">Belum ada berkas tersimpan</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Unggah berkas pertama Anda melalui formulir di atas.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Table Info */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-[#535F71]">
              <span>Menampilkan {filteredDocuments.length} dari {documents.length} total berkas</span>
              <span className="text-[11px] text-slate-400">Pusbanglin Digital Storage</span>
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
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 relative text-center max-h-[90vh] flex flex-col"
            >
              <button
                onClick={() => setPreviewDoc(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 text-left mb-4">
                <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {previewDoc.fileType}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">{previewDoc.title}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{previewDoc.documentNumber} • {previewDoc.categoryLabel} • {previewDoc.fileSize}</p>
                </div>
              </div>

              {/* Document Preview Box */}
              <div className="flex-1 min-h-[300px] max-h-[460px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative mb-4 flex items-center justify-center">
                {previewDoc.signedUrl ? (
                  previewDoc.fileType === "PDF" ? (
                    <iframe
                      src={previewDoc.signedUrl}
                      className="w-full h-full min-h-[360px]"
                      title={previewDoc.title}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewDoc.signedUrl}
                      alt={previewDoc.title}
                      className="max-h-[360px] w-auto max-w-full object-contain mx-auto"
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 p-8 text-slate-400">
                    <FileCheck className="w-12 h-12 text-slate-300" />
                    <span className="text-xs">Pratinjau langsung tidak tersedia untuk berkas ini.</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Tutup
                </button>
                {previewDoc.signedUrl && (
                  <button
                    onClick={() => handleDownload(previewDoc)}
                    className="px-4 py-2 text-xs font-semibold bg-[#094CB2] text-white hover:bg-blue-700 rounded-xl shadow-xs inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh Dokumen
                  </button>
                )}
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
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
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
                Apakah Anda yakin ingin menghapus <strong>&quot;{deleteConfirmDoc.title}&quot;</strong> dari arsip Anda? Berkas akan dihapus permanen dari server.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setDeleteConfirmDoc(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDeleteDocument(deleteConfirmDoc.id)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 rounded-xl shadow-xs inline-flex items-center gap-1.5"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <span>Ya, Hapus</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
