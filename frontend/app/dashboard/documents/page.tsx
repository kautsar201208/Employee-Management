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
  Download,
  Eye,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  ChevronRight,
  HardDrive,
  Users,
  LayoutGrid,
  List,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";

function formatFileSize(bytes?: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function DocumentCardPreview({
  doc,
  isPdf,
  onOpenPreview,
}: {
  doc: DocumentItem;
  isPdf: boolean;
  onOpenPreview: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const showImage = !isPdf && !!doc.signed_url && !imageError;

  return (
    <div
      className="relative w-full h-40 sm:h-44 rounded-xl bg-[#F6F9FD] border border-slate-100/90 flex items-center justify-center overflow-hidden cursor-pointer group"
      onClick={onOpenPreview}
    >
      {/* Badge Tag Top-Right */}
      <span
        className={`absolute top-3 right-3 z-10 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-2xs ${
          isPdf
            ? "bg-[#FEE2E2] text-[#DC2626]"
            : "bg-white/90 backdrop-blur-xs text-[#2563EB] border border-blue-100/80"
        }`}
      >
        {isPdf ? "PDF" : "GAMBAR"}
      </span>

      {/* Content */}
      {isPdf ? (
        <FileText
          size={48}
          strokeWidth={1.5}
          className="text-[#EF4444] group-hover:scale-105 transition-transform"
        />
      ) : showImage ? (
        <div className="relative w-full h-full bg-slate-50">
          <Image
            src={doc.signed_url!}
            alt={doc.nama_file}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
            unoptimized
          />
          <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors" />
        </div>
      ) : (
        <ImageIcon
          size={48}
          strokeWidth={1.5}
          className="text-[#3B82F6] group-hover:scale-105 transition-transform"
        />
      )}
    </div>
  );
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua Kategori");
  const [selectedTimKerja, setSelectedTimKerja] = useState("Semua Tim Kerja");
  const [selectedFileType, setSelectedFileType] = useState<
    "all" | "pdf" | "image"
  >("all");
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
      setError(
        err instanceof Error ? err.message : "Gagal mengambil daftar dokumen.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments();
  }, []);

  // Handle delete document
  const handleDelete = async (doc: DocumentItem) => {
    if (
      !window.confirm(
        `Hapus berkas "${doc.nama_file}"? Tindakan ini tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }

    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;

    setDeletingId(doc.id);
    setFeedback(null);
    try {
      await deleteUserDocument(token, doc.id);
      setDocuments((current) => current.filter((d) => d.id !== doc.id));
      setFeedback({
        type: "success",
        message: `Berkas "${doc.nama_file}" berhasil dihapus.`,
      });
      if (previewDoc?.id === doc.id) {
        setPreviewDoc(null);
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : "Gagal menghapus berkas.",
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

  // Dynamic filter lists based on actual data
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      if (d.kategori?.trim()) set.add(d.kategori.trim());
    });
    return ["Semua Kategori", ...Array.from(set).sort()];
  }, [documents]);

  const timKerjaOptions = useMemo(() => {
    const set = new Set<string>();
    documents.forEach((d) => {
      const emp = d.employee || d.pegawai;
      if (emp?.tim_kerja?.trim()) set.add(emp.tim_kerja.trim());
    });
    return ["Semua Tim Kerja", ...Array.from(set).sort()];
  }, [documents]);

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
      if (selectedCategory !== "Semua Kategori") {
        matchesCategory =
          (doc.kategori || "").toLowerCase() === selectedCategory.toLowerCase();
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
      const isImage =
        mime.includes("image") || ["jpg", "jpeg", "png", "webp"].includes(ext);

      if (selectedFileType === "pdf") matchesFileType = isPdf;
      else if (selectedFileType === "image") matchesFileType = isImage;

      return (
        matchesSearch && matchesCategory && matchesTimKerja && matchesFileType
      );
    });
  }, [
    documents,
    searchQuery,
    selectedCategory,
    selectedTimKerja,
    selectedFileType,
  ]);

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
      else if (
        mime.includes("image") ||
        ["jpg", "jpeg", "png", "webp"].includes(ext)
      )
        imageCount++;

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

        <div className="employees-content space-y-5">
          {/* HEADER SECTION */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Link
                  href="/dashboard"
                  className="hover:text-[#2563EB] transition-colors"
                >
                  Dashboard
                </Link>
                <ChevronRight size={13} className="text-slate-400" />
                <span className="font-semibold text-slate-800">
                  Berkas &amp; Dokumen Pegawai
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                Kelola Berkas Pegawai
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Akses, tinjau, dan unduh seluruh berkas, sertifikat, dan dokumen
                yang diunggah oleh pegawai.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                onClick={loadDocuments}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs disabled:opacity-60"
                title="Muat ulang data"
              >
                <RefreshCw
                  size={14}
                  className={isLoading ? "animate-spin text-[#2563EB]" : "text-slate-600"}
                />
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
                {feedback.type === "success" ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
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

          {/* TOP METRIC CARDS (4 cards) */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Berkas */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase block mb-1">
                  TOTAL BERKAS
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] leading-tight block">
                  {stats.totalFiles}
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  Dokumen terunggah
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#EBF3FE] text-[#2563EB] flex items-center justify-center shrink-0">
                <FileText size={18} strokeWidth={2} />
              </div>
            </div>

            {/* 2. Pegawai Pengunggah */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase block mb-1">
                  PEGAWAI PENGUNGGAH
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] leading-tight block">
                  {stats.employeeCount}
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  Pegawai aktif
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#EBF3FE] text-[#2563EB] flex items-center justify-center shrink-0">
                <Users size={18} strokeWidth={2} />
              </div>
            </div>

            {/* 3. Format Dokumen */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase block mb-1">
                  FORMAT DOKUMEN
                </span>
                <div className="flex items-baseline gap-1 my-0.5">
                  <span className="text-xl sm:text-2xl font-extrabold text-[#DC2626]">
                    {stats.pdfCount}
                  </span>
                  <span className="text-xs font-bold text-[#DC2626] mr-1.5">
                    PDF
                  </span>
                  <span className="text-slate-300 font-bold">•</span>
                  <span className="text-xl sm:text-2xl font-extrabold text-[#2563EB] ml-1.5">
                    {stats.imageCount}
                  </span>
                  <span className="text-xs font-bold text-[#2563EB]">
                    Gambar
                  </span>
                </div>
                <span className="text-xs text-slate-400 block mt-1">
                  Tipe berkas valid
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#EBF3FE] text-[#2563EB] flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} strokeWidth={2} />
              </div>
            </div>

            {/* 4. Penyimpanan */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase block mb-1">
                  PENYIMPANAN
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] leading-tight block">
                  {stats.totalBytesFormatted}
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  Kapasitas terpakai
                </span>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#EBF3FE] text-[#2563EB] flex items-center justify-center shrink-0">
                <HardDrive size={18} strokeWidth={2} />
              </div>
            </div>
          </section>

          {/* FILTER & SEARCH TOOLBAR */}
          <section className="bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px] flex items-center">
              <Search
                size={16}
                className="absolute left-3 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama berkas, nama pegawai, atau NIP..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all placeholder:text-slate-400 text-slate-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                  title="Hapus pencarian"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Dropdowns & View Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Kategori */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2563EB] transition-all cursor-pointer"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Filter Tim Kerja */}
              <select
                value={selectedTimKerja}
                onChange={(e) => setSelectedTimKerja(e.target.value)}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2563EB] transition-all cursor-pointer"
              >
                {timKerjaOptions.map((tk) => (
                  <option key={tk} value={tk}>
                    {tk}
                  </option>
                ))}
              </select>

              {/* Filter Tipe File */}
              <select
                value={selectedFileType}
                onChange={(e) =>
                  setSelectedFileType(e.target.value as "all" | "pdf" | "image")
                }
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#2563EB] transition-all cursor-pointer"
              >
                <option value="all">Semua Tipe</option>
                <option value="pdf">Hanya PDF</option>
                <option value="image">Hanya Gambar</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 pl-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "grid"
                      ? "bg-blue-50 text-[#2563EB] font-bold"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Tampilan Kotak (Grid)"
                >
                  <LayoutGrid size={17} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === "table"
                      ? "bg-blue-50 text-[#2563EB] font-bold"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Tampilan Tabel (List)"
                >
                  <List size={17} strokeWidth={2} />
                </button>
              </div>
            </div>
          </section>

          {/* MAIN CONTENT AREA */}
          {isLoading && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
              <div className="w-10 h-10 border-3 border-slate-200 border-t-[#2563EB] rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">
                Mengambil daftar berkas pegawai...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Menyiapkan pratinjau dokumen dari penyimpanan cloud
              </p>
            </div>
          )}

          {error && !isLoading && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center text-rose-800">
              <AlertCircle size={32} className="mx-auto mb-2 text-rose-500" />
              <h3 className="text-sm font-bold">{error}</h3>
              <p className="text-xs text-rose-600 mt-1">
                Silakan pastikan Anda memiliki akses administrator atau coba
                masuk kembali.
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
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
              <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
                <FileText size={26} />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Tidak ada berkas yang ditemukan
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {searchQuery ||
                selectedCategory !== "Semua Kategori" ||
                selectedTimKerja !== "Semua Tim Kerja" ||
                selectedFileType !== "all"
                  ? "Coba ubah kata kunci pencarian atau sesuaikan filter untuk melihat dokumen lainnya."
                  : "Belum ada dokumen atau berkas yang diunggah oleh pengguna."}
              </p>
              {(searchQuery ||
                selectedCategory !== "Semua Kategori" ||
                selectedTimKerja !== "Semua Tim Kerja" ||
                selectedFileType !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("Semua Kategori");
                    setSelectedTimKerja("Semua Tim Kerja");
                    setSelectedFileType("all");
                  }}
                  className="mt-4 px-4 py-2 bg-[#2563EB] text-white text-xs font-semibold rounded-xl hover:bg-[#1d4ed8] transition-all shadow-xs"
                >
                  Reset Semua Filter
                </button>
              )}
            </div>
          )}

          {/* VIEW: GRID MODE (3 Kolom persis sesuai mockup) */}
          {!isLoading &&
            !error &&
            filteredDocuments.length > 0 &&
            viewMode === "grid" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDocuments.map((doc) => {
                  const emp = doc.employee || doc.pegawai;
                  const empName =
                    emp?.nama_lengkap || emp?.nama || "Pegawai Belum Terhubung";
                  const mime = (doc.file_type || "").toLowerCase();
                  const ext =
                    (doc.nama_file || "").split(".").pop()?.toLowerCase() || "";
                  const isPdf = mime.includes("pdf") || ext === "pdf";

                  return (
                    <motion.div
                      key={doc.id}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition-all p-4 flex flex-col justify-between"
                    >
                      <div>
                        {/* 1. Preview Box (Real Photo Thumbnail or PDF Icon) */}
                        <DocumentCardPreview
                          doc={doc}
                          isPdf={isPdf}
                          onOpenPreview={() => setPreviewDoc(doc)}
                        />

                        {/* 2. File Title & Metadata */}
                        <h3
                          className="text-sm font-bold text-slate-900 mt-3.5 truncate cursor-pointer hover:text-[#2563EB] transition-colors"
                          title={doc.nama_file}
                          onClick={() => setPreviewDoc(doc)}
                        >
                          {doc.nama_file}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">
                          {formatFileSize(doc.file_size)} •{" "}
                          {formatDate(doc.created_at)}
                        </p>

                        {/* 3. Category Pill */}
                        <div className="mt-2.5">
                          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-medium bg-[#EBF3FE] text-[#2563EB]">
                            {doc.kategori || "Dokumen Kepegawaian"}
                          </span>
                        </div>

                        {/* 4. Employee Information */}
                        <div className="mt-3.5 flex items-center gap-2.5">
                          {emp?.profile_image ? (
                            <Image
                              src={emp.profile_image}
                              alt={empName}
                              width={32}
                              height={32}
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                              unoptimized
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#E2E8F0] text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                              {getInitials(empName)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-xs font-bold text-slate-800 truncate"
                              title={empName}
                            >
                              {empName}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {emp?.nip ? `NIP: ${emp.nip}` : "NIP: —"} •{" "}
                              {emp?.tim_kerja || "Tata Usaha"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 5. Bottom Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#2563EB] bg-white border border-slate-200/90 rounded-lg hover:bg-blue-50/60 hover:border-blue-200 transition-colors"
                          >
                            <Eye size={13} strokeWidth={2} />
                            <span>Lihat</span>
                          </button>

                          {doc.signed_url ? (
                            <a
                              href={doc.signed_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={doc.nama_file}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200/90 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
                            >
                              <Download size={13} strokeWidth={2} />
                              <span>Unduh</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200/90 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              <Download size={13} strokeWidth={2} />
                              <span>Unduh</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={deletingId === doc.id}
                          onClick={() => handleDelete(doc)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Hapus Berkas"
                        >
                          <Trash2 size={15} strokeWidth={1.8} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

          {/* VIEW: TABLE MODE */}
          {!isLoading &&
            !error &&
            filteredDocuments.length > 0 &&
            viewMode === "table" && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
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
                        const mime = (doc.file_type || "").toLowerCase();
                        const ext =
                          (doc.nama_file || "")
                            .split(".")
                            .pop()
                            ?.toLowerCase() || "";
                        const isPdf = mime.includes("pdf") || ext === "pdf";

                        return (
                          <tr
                            key={doc.id}
                            className="hover:bg-slate-50/60 transition-colors"
                          >
                            <td className="py-3 px-4 font-semibold text-slate-900 max-w-[240px]">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0 border border-slate-100 ${
                                    isPdf
                                      ? "bg-rose-50 text-rose-600"
                                      : "bg-blue-50 text-blue-600"
                                  }`}
                                >
                                  {isPdf ? (
                                    <FileText size={15} />
                                  ) : doc.signed_url ? (
                                    <Image
                                      src={doc.signed_url}
                                      alt={doc.nama_file}
                                      width={28}
                                      height={28}
                                      className="w-full h-full object-cover"
                                      unoptimized
                                    />
                                  ) : (
                                    <ImageIcon size={15} />
                                  )}
                                </span>
                                <span
                                  className="truncate hover:text-[#2563EB] cursor-pointer"
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
                                  <div className="w-6 h-6 rounded-full bg-[#E2E8F0] text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                                    {getInitials(empName)}
                                  </div>
                                )}
                                <div>
                                  <span className="font-bold text-slate-800 block truncate">
                                    {empName}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block">
                                    {emp?.nip || "—"}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                              {emp?.tim_kerja || "—"}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#EBF3FE] text-[#2563EB]">
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
                                  className="p-1.5 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors"
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
                    Menampilkan <strong>{filteredDocuments.length}</strong> dari{" "}
                    <strong>{documents.length}</strong> total berkas
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Pusbanglin Cloud Storage
                  </span>
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
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <h2
                      className="text-sm font-bold text-slate-900 truncate"
                      title={previewDoc.nama_file}
                    >
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2563EB] rounded-xl hover:bg-[#1d4ed8] transition-colors shadow-2xs"
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
                    <span className="text-slate-400 font-medium">
                      Pengunggah:
                    </span>
                    <strong className="text-slate-800 font-bold">
                      {previewDoc.employee.nama_lengkap}
                    </strong>
                    {previewDoc.employee.nip && (
                      <span className="text-slate-500 font-mono">
                        ({previewDoc.employee.nip})
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 font-medium">
                    Tim Kerja:{" "}
                    <strong className="text-slate-800">
                      {previewDoc.employee.tim_kerja || "—"}
                    </strong>
                  </span>
                </div>
              )}

              {/* Modal Viewer Body */}
              <div className="flex-1 overflow-auto p-4 bg-slate-100/50 flex items-center justify-center min-h-[400px]">
                {previewDoc.signed_url ? (
                  (previewDoc.file_type || "")
                    .toLowerCase()
                    .includes("pdf") ||
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
                    <AlertCircle
                      size={32}
                      className="mx-auto mb-2 text-amber-500"
                    />
                    <p className="font-bold text-sm">
                      URL berkas tidak dapat dibuat
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Berkas mungkin telah dihapus dari penyimpanan cloud atau sesi
                      telah kedaluwarsa.
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
