"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../_components/sidebar";
import Navbar from "../_components/navbar";
import {
  ACCESS_TOKEN_KEY,
  getUserDocuments,
  deleteUserDocument,
  type DocumentItem,
} from "@/lib/api";
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  FolderKanban,
  FileCheck,
  FileCode,
  Image as ImageIcon,
  Building2,
  Calendar,
  X,
  ExternalLink,
  Layers,
  LayoutGrid,
  List,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  HardDrive,
  Users,
  Clock,
  Sparkles,
} from "lucide-react";

// Normalisasi kategori berkas
const CATEGORIES = [
  { id: "all", label: "Semua Kategori" },
  { id: "sk", label: "Surat Keputusan (SK)" },
  { id: "pendidikan", label: "Pendidikan Formal" },
  { id: "sertifikat", label: "Sertifikasi & Pelatihan" },
  { id: "kependudukan", label: "Dokumen Kependudukan" },
  { id: "skp", label: "Penilaian Kinerja (SKP)" },
];

const TIM_KERJA_LIST = [
  "Semua Tim Kerja",
  "Tata Usaha",
  "Perkamusan dan Peristilahan",
  "Pemodernan dan Pelindungan",
  "Bidang",
  "Kepala Pusat",
];

function getCategoryColor(categoryName?: string) {
  const cat = (categoryName || "").toLowerCase();
  if (cat.includes("sk") || cat.includes("keputusan")) {
    return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
  }
  if (cat.includes("pendidikan") || cat.includes("ijazah")) {
    return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
  }
  if (cat.includes("sertifikat") || cat.includes("sertifikasi")) {
    return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
  }
  if (cat.includes("kependudukan") || cat.includes("ktp") || cat.includes("kk")) {
    return { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" };
  }
  if (cat.includes("skp") || cat.includes("kinerja")) {
    return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
  }
  return { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(isoDate?: string): string {
  if (!isoDate) return "Baru saja";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTimKerja, setSelectedTimKerja] = useState("Semua Tim Kerja");
  const [selectedFileType, setSelectedFileType] = useState<"all" | "pdf" | "image">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Preview & Delete modal state
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch documents
  const loadDocuments = async () => {
    setIsLoading(true);
    setError("");
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setError("Silakan masuk dengan akun Admin untuk melihat dokumen.");
      setIsLoading(false);
      return;
    }

    try {
      const data = await getUserDocuments(token);
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil daftar dokumen.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, []);

  // Handle delete document
  const handleDelete = async (doc: DocumentItem) => {
    if (!window.confirm(`Hapus berkas "${doc.nama_file}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;

    setDeletingId(doc.id);
    setFeedback(null);
    try {
      await deleteUserDocument(token, doc.id);
      setDocuments((current) => current.filter((d) => d.id !== doc.id));
      setFeedback({ type: "success", message: `Berkas "${doc.nama_file}" berhasil dihapus.` });
      if (previewDoc?.id === doc.id) {
        setPreviewDoc(null);
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal menghapus berkas.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // Keyboard escape for modal
  useEffect(() => {
    if (!previewDoc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewDoc(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewDoc]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const q = searchQuery.toLowerCase().trim();
      const emp = doc.employee || doc.pegawai;
      const empName = (emp?.nama_lengkap || emp?.nama || "").toLowerCase();
      const empNip = (emp?.nip || "").toLowerCase();
      const fileName = (doc.nama_file || "").toLowerCase();
      const category = (doc.kategori || "").toLowerCase();

      // Search match
      const matchesSearch =
        !q ||
        fileName.includes(q) ||
        empName.includes(q) ||
        empNip.includes(q) ||
        category.includes(q);

      // Category match
      let matchesCategory = true;
      if (selectedCategory !== "all") {
        if (selectedCategory === "sk") matchesCategory = category.includes("sk") || category.includes("keputusan");
        else if (selectedCategory === "pendidikan") matchesCategory = category.includes("pendidikan") || category.includes("ijazah");
        else if (selectedCategory === "sertifikat") matchesCategory = category.includes("sertifikat") || category.includes("sertifikasi");
        else if (selectedCategory === "kependudukan") matchesCategory = category.includes("kependudukan") || category.includes("ktp") || category.includes("kk");
        else if (selectedCategory === "skp") matchesCategory = category.includes("skp") || category.includes("kinerja");
      }

      // Tim Kerja match
      let matchesTimKerja = true;
      if (selectedTimKerja !== "Semua Tim Kerja") {
        const empTimKerja = (emp?.tim_kerja || "").toLowerCase();
        matchesTimKerja = empTimKerja.includes(selectedTimKerja.toLowerCase());
      }

      // File Type match
      let matchesFileType = true;
      const mime = (doc.file_type || "").toLowerCase();
      const ext = (doc.nama_file || "").split(".").pop()?.toLowerCase() || "";
      const isPdf = mime.includes("pdf") || ext === "pdf";
      const isImage = mime.includes("image") || ["jpg", "jpeg", "png", "webp"].includes(ext);

      if (selectedFileType === "pdf") matchesFileType = isPdf;
      else if (selectedFileType === "image") matchesFileType = isImage;

      return matchesSearch && matchesCategory && matchesTimKerja && matchesFileType;
    });
  }, [documents, searchQuery, selectedCategory, selectedTimKerja, selectedFileType]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalFiles = documents.length;
    let totalBytes = 0;
    let pdfCount = 0;
    let imageCount = 0;
    const uniqueEmployees = new Set<string>();

    for (const d of documents) {
      totalBytes += d.file_size || 0;
      const mime = (d.file_type || "").toLowerCase();
      const ext = (d.nama_file || "").split(".").pop()?.toLowerCase() || "";
      if (mime.includes("pdf") || ext === "pdf") pdfCount++;
      else if (mime.includes("image") || ["jpg", "jpeg", "png", "webp"].includes(ext)) imageCount++;

      if (d.employee_id) uniqueEmployees.add(d.employee_id);
    }

    return {
      totalFiles,
      totalBytesFormatted: formatFileSize(totalBytes),
      pdfCount,
      imageCount,
      employeeCount: uniqueEmployees.size,
    };
  }, [documents]);

  return (
    <main className="dashboard-shell">
      <Sidebar activePage="documents" />

      <section className="dashboard-main">
        <Navbar />

        <div className="employees-content">
          {/* HEADER SECTION */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <Link href="/dashboard" className="hover:text-[#3366CC] transition-colors">
                  Dashboard
                </Link>
                <ChevronRight size={14} className="text-slate-400" />
                <span className="font-semibold text-slate-800">Berkas &amp; Dokumen Pegawai</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#0D1B2E] tracking-tight">
                Kelola Berkas Pegawai
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Akses, tinjau, dan unduh seluruh berkas, sertifikat, dan dokumen yang diunggah oleh pegawai.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                onClick={loadDocuments}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs disabled:opacity-60"
                title="Muat ulang data"
              >
                <RefreshCw size={14} className={isLoading ? "animate-spin text-[#3366CC]" : ""} />
                <span>Segarkan</span>
              </button>
            </div>
          </header>

          {/* NOTIFICATION FEEDBACK */}
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-medium ${
                feedback.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{feedback.message}</span>
              </div>
              <button
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={15} />
              </button>
            </motion.div>
          )}

          {/* TOP METRIC CARDS */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Total Dokumen */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Total Berkas
                </span>
                <span className="text-2xl font-black text-[#0D1B2E]">
                  {stats.totalFiles}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Dokumen terunggah
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#3366CC] flex items-center justify-center shrink-0">
                <FolderKanban size={20} />
              </div>
            </div>

            {/* Pegawai Terkait */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Pegawai Pengunggah
                </span>
                <span className="text-2xl font-black text-[#0D1B2E]">
                  {stats.employeeCount}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Pegawai aktif
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#8B5CF6] flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
            </div>

            {/* Format File */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Format Dokumen
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-[#0D1B2E]">{stats.pdfCount}</span>
                  <span className="text-[11px] text-rose-600 font-semibold">PDF</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xl font-bold text-[#0D1B2E]">{stats.imageCount}</span>
                  <span className="text-[11px] text-blue-600 font-semibold">Gambar</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Tipe berkas valid
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <FileCheck size={20} />
              </div>
            </div>

            {/* Total Penyimpanan */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Penyimpanan
                </span>
                <span className="text-2xl font-black text-[#0D1B2E]">
                  {stats.totalBytesFormatted}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Kapasitas terpakai
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <HardDrive size={20} />
              </div>
            </div>
          </section>

          {/* FILTER & SEARCH TOOLBAR */}
          <section className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama berkas, nama pegawai, atau NIP..."
                className="w-full pl-10 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3366CC]/20 focus:border-[#3366CC] transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Kategori */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#3366CC] transition-all cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>

              {/* Filter Tim Kerja */}
              <select
                value={selectedTimKerja}
                onChange={(e) => setSelectedTimKerja(e.target.value)}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#3366CC] transition-all cursor-pointer"
              >
                {TIM_KERJA_LIST.map((tk) => (
                  <option key={tk} value={tk}>
                    {tk}
                  </option>
                ))}
              </select>

              {/* Filter Tipe File */}
              <select
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value as "all" | "pdf" | "image")}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#3366CC] transition-all cursor-pointer"
              >
                <option value="all">Semua Tipe</option>
                <option value="pdf">Hanya PDF</option>
                <option value="image">Hanya Gambar</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "grid"
                      ? "bg-white text-[#3366CC] shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Tampilan Kartu (Grid)"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "table"
                      ? "bg-white text-[#3366CC] shadow-xs font-semibold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Tampilan Tabel (List)"
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </section>

          {/* MAIN CONTENT AREA */}
          {isLoading && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-10 h-10 border-3 border-slate-200 border-t-[#3366CC] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Mengambil daftar berkas pegawai...</p>
              <p className="text-xs text-slate-400 mt-1">Menyiapkan pratinjau dokumen dari penyimpanan cloud</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-800">
              <AlertCircle size={32} className="mx-auto mb-2 text-rose-500" />
              <h3 className="text-sm font-bold">{error}</h3>
              <p className="text-xs text-rose-600 mt-1">
                Silakan pastikan Anda memiliki akses administrator atau coba masuk kembali.
              </p>
              <button
                onClick={loadDocuments}
                className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {!isLoading && !error && filteredDocuments.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
                <FolderKanban size={26} />
              </div>
              <h3 className="text-base font-bold text-slate-800">Tidak ada berkas yang ditemukan</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {searchQuery || selectedCategory !== "all" || selectedTimKerja !== "Semua Tim Kerja"
                  ? "Coba ubah kata kunci pencarian atau sesuaikan filter untuk melihat dokumen lainnya."
                  : "Belum ada dokumen atau berkas yang diunggah oleh pengguna."}
              </p>
              {(searchQuery || selectedCategory !== "all" || selectedTimKerja !== "Semua Tim Kerja") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setSelectedTimKerja("Semua Tim Kerja");
                    setSelectedFileType("all");
                  }}
                  className="mt-4 px-4 py-2 bg-[#3366CC] text-white text-xs font-semibold rounded-xl hover:bg-[#2850a7] transition-all shadow-xs"
                >
                  Reset Semua Filter
                </button>
              )}
            </div>
          )}

          {/* VIEW: GRID MODE */}
          {!isLoading && !error && filteredDocuments.length > 0 && viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => {
                const emp = doc.employee || doc.pegawai;
                const empName = emp?.nama_lengkap || emp?.nama || "Pegawai Belum Terhubung";
                const catStyle = getCategoryColor(doc.kategori);
                const isPdf =
                  (doc.file_type || "").toLowerCase().includes("pdf") ||
                  (doc.nama_file || "").toLowerCase().endsWith(".pdf");

                return (
                  <motion.div
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-slate-300 transition-all p-4.5 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar: Category badge & File Type tag */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                        >
                          {doc.kategori || "Dokumen"}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isPdf ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          {isPdf ? "PDF" : "GAMBAR"}
                        </span>
                      </div>

                      {/* File Icon & Name */}
                      <div className="flex items-start gap-3 mb-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isPdf ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          {isPdf ? <FileText size={20} /> : <ImageIcon size={20} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3
                            className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 hover:text-[#3366CC] transition-colors cursor-pointer"
                            onClick={() => setPreviewDoc(doc)}
                            title={doc.nama_file}
                          >
                            {doc.nama_file}
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{formatFileSize(doc.file_size)}</span>
                            <span>•</span>
                            <span>{formatDate(doc.created_at)}</span>
                          </p>
                        </div>
                      </div>

                      {/* Owner Employee Card */}
                      <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center gap-2.5 mb-3.5">
                        {emp?.profile_image ? (
                          <Image
                            src={emp.profile_image}
                            alt={empName}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                            unoptimized
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#3366CC]/10 text-[#3366CC] font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(empName)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-800 truncate" title={empName}>
                            {empName}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {emp?.nip ? `NIP: ${emp.nip}` : "NIP: —"}{" "}
                            {emp?.tim_kerja ? `• ${emp.tim_kerja}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons footer */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#3366CC] bg-blue-50/80 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Pratinjau Dokumen"
                        >
                          <Eye size={13} />
                          <span>Lihat</span>
                        </button>
                        {doc.signed_url && (
                          <a
                            href={doc.signed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={doc.nama_file}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            title="Unduh Berkas"
                          >
                            <Download size={13} />
                            <span>Unduh</span>
                          </a>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={deletingId === doc.id}
                        onClick={() => handleDelete(doc)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Hapus Berkas"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* VIEW: TABLE MODE */}
          {!isLoading && !error && filteredDocuments.length > 0 && viewMode === "table" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Nama Dokumen</th>
                      <th className="py-3 px-4">Pegawai Pengunggah</th>
                      <th className="py-3 px-4">Tim Kerja</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Ukuran</th>
                      <th className="py-3 px-4">Tanggal Unggah</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDocuments.map((doc) => {
                      const emp = doc.employee || doc.pegawai;
                      const empName = emp?.nama_lengkap || emp?.nama || "—";
                      const catStyle = getCategoryColor(doc.kategori);
                      const isPdf =
                        (doc.file_type || "").toLowerCase().includes("pdf") ||
                        (doc.nama_file || "").toLowerCase().endsWith(".pdf");

                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900 max-w-[240px]">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  isPdf ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"
                                }`}
                              >
                                {isPdf ? <FileText size={15} /> : <ImageIcon size={15} />}
                              </span>
                              <span
                                className="truncate hover:text-[#3366CC] cursor-pointer"
                                onClick={() => setPreviewDoc(doc)}
                                title={doc.nama_file}
                              >
                                {doc.nama_file}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {emp?.profile_image ? (
                                <Image
                                  src={emp.profile_image}
                                  alt={empName}
                                  width={24}
                                  height={24}
                                  className="w-6 h-6 rounded-full object-cover shrink-0"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-[#3366CC]/10 text-[#3366CC] font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {getInitials(empName)}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-slate-800 block truncate">{empName}</span>
                                <span className="text-[10px] text-slate-400 block">{emp?.nip || "—"}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {emp?.tim_kerja || "—"}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                            >
                              {doc.kategori || "Umum"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {formatFileSize(doc.file_size)}
                          </td>
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {formatDate(doc.created_at)}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setPreviewDoc(doc)}
                                className="p-1.5 text-slate-500 hover:text-[#3366CC] hover:bg-blue-50 rounded-lg transition-colors"
                                title="Lihat Berkas"
                              >
                                <Eye size={15} />
                              </button>
                              {doc.signed_url && (
                                <a
                                  href={doc.signed_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={doc.nama_file}
                                  className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Unduh Berkas"
                                >
                                  <Download size={15} />
                                </a>
                              )}
                              <button
                                disabled={deletingId === doc.id}
                                onClick={() => handleDelete(doc)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Hapus Berkas"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table footer count */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>
                  Menampilkan <strong>{filteredDocuments.length}</strong> dari <strong>{documents.length}</strong> total berkas
                </span>
                <span className="text-[11px] text-slate-400">Pusbanglin Cloud Storage</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* MODAL PREVIEW DOKUMEN */}
      <AnimatePresence>
        {previewDoc && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setPreviewDoc(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <header className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#3366CC] flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-900 truncate" title={previewDoc.nama_file}>
                      {previewDoc.nama_file}
                    </h2>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{previewDoc.kategori}</span>
                      <span>•</span>
                      <span>{formatFileSize(previewDoc.file_size)}</span>
                      <span>•</span>
                      <span>{formatDate(previewDoc.created_at)}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {previewDoc.signed_url && (
                    <>
                      <a
                        href={previewDoc.signed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
                        title="Buka di tab baru"
                      >
                        <ExternalLink size={13} />
                        <span className="hidden sm:inline">Buka Tab Baru</span>
                      </a>
                      <a
                        href={previewDoc.signed_url}
                        download={previewDoc.nama_file}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#3366CC] rounded-xl hover:bg-[#2850a7] transition-colors shadow-2xs"
                        title="Unduh Berkas"
                      >
                        <Download size={13} />
                        <span>Unduh</span>
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1"
                    aria-label="Tutup Pratinjau"
                  >
                    <X size={18} />
                  </button>
                </div>
              </header>

              {/* Owner Info Bar */}
              {previewDoc.employee && (
                <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">Pengunggah:</span>
                    <strong className="text-slate-800 font-bold">{previewDoc.employee.nama_lengkap}</strong>
                    {previewDoc.employee.nip && (
                      <span className="text-slate-500 font-mono">({previewDoc.employee.nip})</span>
                    )}
                  </div>
                  <span className="text-slate-500 font-medium">
                    Tim Kerja: <strong className="text-slate-800">{previewDoc.employee.tim_kerja || "—"}</strong>
                  </span>
                </div>
              )}

              {/* Modal Viewer Body */}
              <div className="flex-1 overflow-auto p-4 bg-slate-100/50 flex items-center justify-center min-h-[400px]">
                {previewDoc.signed_url ? (
                  (previewDoc.file_type || "").toLowerCase().includes("pdf") ||
                  previewDoc.nama_file.toLowerCase().endsWith(".pdf") ? (
                    <iframe
                      src={previewDoc.signed_url}
                      className="w-full h-[65vh] rounded-xl border border-slate-200 bg-white shadow-inner"
                      title={previewDoc.nama_file}
                    />
                  ) : (
                    <div className="max-h-[65vh] flex items-center justify-center">
                      <Image
                        src={previewDoc.signed_url}
                        alt={previewDoc.nama_file}
                        width={800}
                        height={600}
                        className="max-h-[65vh] w-auto object-contain rounded-xl shadow-md border border-slate-200 bg-white"
                        unoptimized
                      />
                    </div>
                  )
                ) : (
                  <div className="text-center p-8 text-slate-500">
                    <AlertCircle size={32} className="mx-auto mb-2 text-amber-500" />
                    <p className="font-bold text-sm">URL berkas tidak dapat dibuat</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Berkas mungkin telah dihapus dari penyimpanan cloud atau sesi telah kedaluwarsa.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
