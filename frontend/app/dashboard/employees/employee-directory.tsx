"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ACCESS_TOKEN_KEY,
  createEmployee as createEmployeeRequest,
  deleteEmployee as deleteEmployeeRequest,
  getEmployeeById,
  getEmployees,
  updateEmployee as updateEmployeeRequest,
  type ApiEmployee,
  type EmployeeInput,
} from "@/lib/api";

const EMPLOYEES_PER_PAGE = 25;

type EmployeeFormValues = {
  nama_lengkap: string;
  nip: string;
  email: string;
  jabatan: string;
  jenis_jabatan: string;
  tim_kerja: string;
  status: string;
  keterangan: string;
  pangkat_golongan: string;
  tmt_golongan: string;
  jenjang_pendidikan: string;
  jurusan_pendidikan: string;
  jenis_kelamin: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  nomor_ktp: string;
  nomor_ponsel: string;
};

const employeeFormFields: Array<{
  key: keyof EmployeeFormValues;
  label: string;
  type?: "email" | "date";
  required?: boolean;
}> = [
  { key: "nama_lengkap", label: "Nama lengkap", required: true },
  { key: "nip", label: "NIP", required: true },
  { key: "email", label: "Email", type: "email" },
  { key: "nomor_ponsel", label: "Nomor ponsel" },
  { key: "jabatan", label: "Jabatan" },
  { key: "jenis_jabatan", label: "Jenis jabatan" },
  { key: "tim_kerja", label: "Tim kerja" },
  { key: "status", label: "Status" },
  { key: "keterangan", label: "Keterangan" },
  { key: "pangkat_golongan", label: "Pangkat / golongan" },
  { key: "tmt_golongan", label: "TMT golongan", type: "date" },
  { key: "jenjang_pendidikan", label: "Jenjang pendidikan" },
  { key: "jurusan_pendidikan", label: "Jurusan pendidikan" },
  { key: "jenis_kelamin", label: "Jenis kelamin" },
  { key: "tempat_lahir", label: "Tempat lahir" },
  { key: "tanggal_lahir", label: "Tanggal lahir", type: "date" },
  { key: "nomor_ktp", label: "Nomor KTP" },
];

function createEmptyEmployeeForm(): EmployeeFormValues {
  return {
    nama_lengkap: "",
    nip: "",
    email: "",
    jabatan: "",
    jenis_jabatan: "",
    tim_kerja: "",
    status: "",
    keterangan: "",
    pangkat_golongan: "",
    tmt_golongan: "",
    jenjang_pendidikan: "",
    jurusan_pendidikan: "",
    jenis_kelamin: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    nomor_ktp: "",
    nomor_ponsel: "",
  };
}

function formatTimKerja(value?: string | null): string {
  if (!value) return "—";
  const trimmed = value.trim();
  if (trimmed === "TU") return "Tata Usaha";
  if (trimmed === "KI") return "Perkamusan dan Peristilahan";
  if (trimmed === "Molin") return "Pemodernan dan Pelindungan";
  return trimmed;
}

function normalizeTimKerjaForm(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed === "TU") return "Tata Usaha";
  if (trimmed === "KI") return "Perkamusan dan Peristilahan";
  if (trimmed === "Molin") return "Pemodernan dan Pelindungan";
  return trimmed;
}

function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return "—";
  const trimmed = phone.trim();
  if (trimmed.startsWith("8")) {
    return "0" + trimmed;
  }
  return trimmed;
}

function normalizePhoneNumber(phone?: string | null): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;
  // Strip leading 0 so stored value always starts with 8 (matches DB convention)
  if (trimmed.startsWith("08")) {
    return trimmed.slice(1);
  }
  return trimmed;
}

/**
 * Menentukan jenis jabatan secara otomatis dari nama jabatan.
 * Mengembalikan "Fungsional", "Struktural", atau "Pelaksana".
 *
 * Aturan (prioritas dari atas):
 * 1. Struktural: Kepala Pusat, Kepala Bidang, Kepala Sub/Subbagian
 * 2. Fungsional: mengandung kata level (Utama, Madya, Muda, Pertama, Penyelia,
 *    Mahir, Terampil, Pemula) ATAU nama jabatan fungsional tertentu
 * 3. Pelaksana: selain kedua di atas
 */
function inferJenisJabatan(jabatan: string): string {
  const j = jabatan.toLowerCase().trim();
  if (!j) return "";

  // ── 1. Struktural ─────────────────────────────────────────────
  if (
    j.includes("kepala pusat") ||
    j.includes("kepala bidang") ||
    j.includes("kepala sub") ||
    j.includes("kasubbag") ||
    j.includes("subbagian")
  ) {
    return "Struktural";
  }

  // ── 2. Fungsional – level kata (word-boundary sensitive) ───────
  // Kata-kata ini biasanya muncul di akhir / tengah nama jabatan fungsional ASN
  const levelWords = [
    "utama",
    "madya",
    "muda",
    "pertama",
    "penyelia",
    "mahir",
    "terampil",
    "pemula",
  ];
  for (const kw of levelWords) {
    // Cocokkan sebagai kata utuh (didahului/diikuti spasi, awal/akhir string, atau tanda baca)
    if (new RegExp(`(^|\\s)${kw}(\\s|$)`, "i").test(j)) return "Fungsional";
  }

  // ── 3. Fungsional – nama jabatan khas fungsional ────────────────
  const fungsionalPrefixes = [
    "widyabasa",
    "widyaiswara",
    "arsiparis",
    "pranata",
    "analis",
    "perencana",
    "peneliti",
    "pengembang teknologi",
    "auditor",
    "dokter",
    "apoteker",
    "perawat",
    "bidan",
    "sanitarian",
    "instruktur",
    "lektor",
    "pustakawan",
    "statistisi",
    "aktuaris",
    "diplomat",
    "jaksa",
    "hakim",
    "konselor",
    "penyuluh",
    "pengawas",
    "inspektur",
  ];
  for (const prefix of fungsionalPrefixes) {
    if (j.includes(prefix)) return "Fungsional";
  }

  // ── 4. Default: Pelaksana ───────────────────────────────────────
  return "Pelaksana";
}

function parseStatusAndKeterangan(rawStatus?: string | null, rawKeterangan?: string | null) {
  if (rawKeterangan && rawKeterangan !== "—") {
    return { status: rawStatus || "—", keterangan: rawKeterangan };
  }
  if (!rawStatus) {
    return { status: "—", keterangan: "—" };
  }
  const match = rawStatus.match(/^(.*?)\s*[\(\-\[]\s*(Tugas Belajar|Cuti di Luar Tanggungan Negara)\s*[\)\]]?$/i);
  if (match) {
    return {
      status: match[1].trim(),
      keterangan: match[2].trim(),
    };
  }
  return { status: rawStatus, keterangan: rawKeterangan || "—" };
}

function toEmployeeForm(employee: ApiEmployee): EmployeeFormValues {
  const dateValue = (value?: string | null) => value?.slice(0, 10) || "";
  const { status, keterangan } = parseStatusAndKeterangan(
    employee.status,
    employee.keterangan,
  );

  // jenis_jabatan: gunakan yang ada di DB, jika kosong auto-detect dari jabatan
  const storedJenisJabatan = employee.jenis_jabatan || "";
  const autoJenisJabatan = !storedJenisJabatan && employee.jabatan
    ? inferJenisJabatan(employee.jabatan)
    : storedJenisJabatan;

  return {
    nama_lengkap: employee.nama_lengkap || employee.nama || "",
    nip: employee.nip || "",
    email: employee.email || "",
    jabatan: employee.jabatan || "",
    jenis_jabatan: autoJenisJabatan,
    tim_kerja: normalizeTimKerjaForm(employee.tim_kerja),
    status: status === "—" ? "" : status,
    keterangan: keterangan === "—" ? "" : keterangan,
    pangkat_golongan: employee.pangkat_golongan || "",
    tmt_golongan: dateValue(employee.tmt_golongan),
    jenjang_pendidikan: employee.jenjang_pendidikan || "",
    jurusan_pendidikan: employee.jurusan_pendidikan || "",
    jenis_kelamin: employee.jenis_kelamin || "",
    tempat_lahir: employee.tempat_lahir || "",
    tanggal_lahir: dateValue(employee.tanggal_lahir),
    nomor_ktp: employee.nomor_ktp || "",
    nomor_ponsel: employee.nomor_ponsel
      ? employee.nomor_ponsel.trim().startsWith("8")
        ? "0" + employee.nomor_ponsel.trim()
        : employee.nomor_ponsel.trim()
      : "",
  };
}

function toEmployeeInput(values: EmployeeFormValues): EmployeeInput {
  const optionalValue = (value: string) => value.trim() || null;
  const namaLengkap = values.nama_lengkap.trim();

  return {
    nama_lengkap: namaLengkap,
    nama: namaLengkap,
    nip: values.nip.trim(),
    email: optionalValue(values.email),
    jabatan: optionalValue(values.jabatan),
    jenis_jabatan: optionalValue(values.jenis_jabatan),
    tim_kerja: optionalValue(normalizeTimKerjaForm(values.tim_kerja)),
    status: optionalValue(values.status),
    keterangan: optionalValue(values.keterangan),
    pangkat_golongan: optionalValue(values.pangkat_golongan),
    tmt_golongan: optionalValue(values.tmt_golongan),
    jenjang_pendidikan: optionalValue(values.jenjang_pendidikan),
    jurusan_pendidikan: optionalValue(values.jurusan_pendidikan),
    jenis_kelamin: optionalValue(values.jenis_kelamin),
    tempat_lahir: optionalValue(values.tempat_lahir),
    tanggal_lahir: optionalValue(values.tanggal_lahir),
    nomor_ktp: optionalValue(values.nomor_ktp),
    nomor_ponsel: normalizePhoneNumber(values.nomor_ponsel),
  };
}

type EmployeeRow = {
  key: string;
  recordId: string;
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  keterangan: string;
  joined: string;
  initials: string;
  profileImage: string | null;
};

function toEmployeeRow(employee: ApiEmployee, index: number): EmployeeRow {
  const name =
    employee.nama_lengkap || employee.nama || "Nama belum diisi";

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const { status, keterangan } = parseStatusAndKeterangan(
    employee.status || employee.jenis_jabatan,
    employee.keterangan,
  );

  return {
    key: String(employee.id ?? employee.nip ?? employee.no ?? index),
    recordId: employee.id == null ? "" : String(employee.id),
    id: String(employee.nip ?? employee.id ?? employee.no ?? "—"),
    name,
    email: employee.email || "—",
    role: employee.jabatan || employee.jenis_jabatan || "—",
    department: formatTimKerja(employee.tim_kerja),
    status: status || "—",
    keterangan: keterangan || "—",
    joined: employee.tmt_golongan || "—",
    initials: initials || "?",
    profileImage: employee.profile_image || null,
  };
}

function EmployeeListAvatar({
  imageUrl,
  name,
  initials,
}: {
  imageUrl: string | null;
  name: string;
  initials: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!imageUrl || imageFailed) {
    return (
      <span aria-hidden="true" className="employees-initials">
        {initials}
      </span>
    );
  }

  return (
    <Image
      alt={`Foto profil ${name}`}
      className="employees-initials employees-profile-image"
      height={36}
      onError={() => setImageFailed(true)}
      src={imageUrl}
      unoptimized
      width={36}
    />
  );
}

function getProfileInitials(name: string) {
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

export default function EmployeeDirectory() {
  const shouldReduceMotion = useReducedMotion();

  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [selectedProfile, setSelectedProfile] =
    useState<ApiEmployee | null>(null);

  const [profileImageError, setProfileImageError] = useState(false);

  const [isEmployeeFormOpen, setIsEmployeeFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] =
    useState<ApiEmployee | null>(null);

  const [employeeForm, setEmployeeForm] =
    useState<EmployeeFormValues>(createEmptyEmployeeForm);

  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [deletingEmployeeId, setDeletingEmployeeId] =
    useState<string | null>(null);

  const [mutationFeedback, setMutationFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchEmployees = () => {
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);

    if (!accessToken) {
      setError("Silakan masuk untuk melihat data karyawan.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    getEmployees(accessToken)
      .then((data) => {
        setEmployees(data);
      })
      .catch((fetchError: unknown) => {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Gagal mengambil data karyawan.",
        );
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (!isProfileOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [isProfileOpen]);

  useEffect(() => {
    if (!isEmployeeFormOpen || isSavingEmployee) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsEmployeeFormOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [isEmployeeFormOpen, isSavingEmployee]);

  const employeeRows = useMemo(
    () => employees.map(toEmployeeRow),
    [employees],
  );

  const departments = useMemo(
    () =>
      [
        ...new Set(
          employeeRows
            .map((employee) => employee.department)
            .filter((value) => value !== "—"),
        ),
      ].sort(),
    [employeeRows],
  );

  const statuses = useMemo(
    () =>
      [
        ...new Set(
          employeeRows
            .map((employee) => employee.status)
            .filter((value) => value !== "—"),
        ),
      ].sort(),
    [employeeRows],
  );

  const roles = useMemo(
    () =>
      [
        ...new Set(
          employeeRows
            .map((employee) => employee.role)
            .filter((value) => value !== "—"),
        ),
      ].sort(),
    [employeeRows],
  );

  const filteredEmployees = employeeRows.filter((employee) => {
    const searchable =
      `${employee.name} ${employee.id} ${employee.email} ${employee.role} ${employee.department} ${employee.status} ${employee.keterangan}`.toLowerCase();

    return (
      searchable.includes(query.trim().toLowerCase()) &&
      (department === "all" || employee.department === department) &&
      (status === "all" || employee.status === status) &&
      (role === "all" || employee.role === role)
    );
  });

  const totalPages = Math.ceil(
    filteredEmployees.length / EMPLOYEES_PER_PAGE,
  );

  const activePage = Math.min(
    currentPage,
    Math.max(totalPages, 1),
  );

  const firstEmployeeIndex =
    (activePage - 1) * EMPLOYEES_PER_PAGE;

  const visibleEmployees = filteredEmployees.slice(
    firstEmployeeIndex,
    firstEmployeeIndex + EMPLOYEES_PER_PAGE,
  );

  const firstVisiblePage = Math.max(
    1,
    Math.min(activePage - 2, totalPages - 4),
  );

  const lastVisiblePage = Math.min(
    totalPages,
    firstVisiblePage + 4,
  );

  const pageNumbers: number[] = [];

  for (
    let pageNumber = firstVisiblePage;
    pageNumber <= lastVisiblePage;
    pageNumber += 1
  ) {
    pageNumbers.push(pageNumber);
  }

  const filtersActive =
    query.trim() !== "" ||
    department !== "all" ||
    status !== "all" ||
    role !== "all";

  const employmentType = (employee: EmployeeRow) =>
    employee.status.toLowerCase();

  const permanentCount = employeeRows.filter((employee) =>
    /tetap|pns|pppk/.test(employmentType(employee)),
  ).length;

  const contractCount = employeeRows.filter((employee) =>
    /kontrak|pkwt/.test(employmentType(employee)),
  ).length;

  const internCount = employeeRows.filter((employee) =>
    /magang|intern/.test(employmentType(employee)),
  ).length;

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 8,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.32,
        ease: "easeOut" as const,
      },
    },
  };

  const employeeStats = [
    {
      label: "Total Karyawan",
      value: String(employeeRows.length),
      icon: "♙",
    },
    {
      label: "Pegawai Tetap",
      value: String(permanentCount),
      icon: "✓",
    },
    {
      label: "Kontrak (PKWT)",
      value: String(contractCount),
      icon: "▤",
    },
    {
      label: "Magang & Internship",
      value: String(internCount),
      icon: "▦",
    },
  ];

  function resetFilters() {
    setQuery("");
    setDepartment("all");
    setStatus("all");
    setRole("all");
    setCurrentPage(1);
  }

  function openCreateForm() {
    setEditingEmployee(null);
    setEmployeeForm(createEmptyEmployeeForm());
    setMutationFeedback(null);
    setIsEmployeeFormOpen(true);
  }

  function openEditForm(row: EmployeeRow) {
    const employee = employees.find(
      (item) => String(item.id) === row.recordId,
    );

    if (!row.recordId || !employee) {
      setMutationFeedback({
        type: "error",
        message:
          "ID database karyawan tidak tersedia untuk diubah.",
      });
      return;
    }

    setEditingEmployee(employee);
    setEmployeeForm(toEmployeeForm(employee));
    setMutationFeedback(null);
    setIsEmployeeFormOpen(true);
  }

  async function saveEmployee(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const accessToken =
      sessionStorage.getItem(ACCESS_TOKEN_KEY);

    if (!accessToken) {
      setMutationFeedback({
        type: "error",
        message:
          "Sesi login tidak tersedia. Silakan masuk kembali.",
      });
      return;
    }

    setIsSavingEmployee(true);
    setMutationFeedback(null);

    try {
      const payload = toEmployeeInput(employeeForm);

      if (editingEmployee?.id != null) {
        const updatedEmployee =
          await updateEmployeeRequest(
            accessToken,
            String(editingEmployee.id),
            payload,
          );

        setEmployees((current) =>
          current.map((employee) =>
            String(employee.id) ===
            String(updatedEmployee.id)
              ? updatedEmployee
              : employee,
          ),
        );

        setMutationFeedback({
          type: "success",
          message: "Data karyawan berhasil diperbarui.",
        });
      } else {
        const createdEmployee =
          await createEmployeeRequest(
            accessToken,
            payload,
          );

        setEmployees((current) => [
          createdEmployee,
          ...current,
        ]);

        setCurrentPage(1);
        setQuery("");
        setDepartment("all");
        setStatus("all");

        setMutationFeedback({
          type: "success",
          message: "Data karyawan berhasil ditambahkan.",
        });
      }

      setIsEmployeeFormOpen(false);
    } catch (saveError) {
      setMutationFeedback({
        type: "error",
        message:
          saveError instanceof Error
            ? saveError.message
            : "Gagal menyimpan data karyawan.",
      });
    } finally {
      setIsSavingEmployee(false);
    }
  }

  async function removeEmployee(row: EmployeeRow) {
    if (!row.recordId) {
      setMutationFeedback({
        type: "error",
        message:
          "ID database karyawan tidak tersedia untuk dihapus.",
      });
      return;
    }

    if (
      !window.confirm(
        `Hapus data karyawan ${row.name}? Tindakan ini tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }

    const accessToken =
      sessionStorage.getItem(ACCESS_TOKEN_KEY);

    if (!accessToken) {
      setMutationFeedback({
        type: "error",
        message:
          "Sesi login tidak tersedia. Silakan masuk kembali.",
      });
      return;
    }

    setDeletingEmployeeId(row.recordId);
    setMutationFeedback(null);

    try {
      await deleteEmployeeRequest(
        accessToken,
        row.recordId,
      );

      setEmployees((current) =>
        current.filter(
          (employee) =>
            String(employee.id) !== row.recordId,
        ),
      );

      setMutationFeedback({
        type: "success",
        message: "Data karyawan berhasil dihapus.",
      });
    } catch (deleteError) {
      setMutationFeedback({
        type: "error",
        message:
          deleteError instanceof Error
            ? deleteError.message
            : "Gagal menghapus data karyawan.",
      });
    } finally {
      setDeletingEmployeeId(null);
    }
  }

  async function viewEmployeeProfile(
    employee: EmployeeRow,
  ) {
    setIsProfileOpen(true);
    setSelectedProfile(null);
    setProfileImageError(false);
    setProfileError("");
    setIsProfileLoading(true);

    if (!employee.recordId) {
      setProfileError(
        "ID database pegawai tidak tersedia untuk mengambil profil.",
      );
      setIsProfileLoading(false);
      return;
    }

    const accessToken =
      sessionStorage.getItem(ACCESS_TOKEN_KEY);

    if (!accessToken) {
      setProfileError(
        "Sesi login tidak tersedia. Silakan masuk kembali.",
      );
      setIsProfileLoading(false);
      return;
    }

    try {
      const profile = await getEmployeeById(
        accessToken,
        employee.recordId,
      );

      // DEBUG: melihat data asli yang diterima frontend
      console.log(
        "====================================",
      );
      console.log("PROFILE EMPLOYEE:", profile);
      console.log("NAMA:", profile.nama_lengkap || profile.nama);
      console.log("NIP:", profile.nip);
      console.log(
        "PROFILE IMAGE:",
        profile.profile_image,
      );
      console.log(
        "====================================",
      );

      setSelectedProfile(profile);

      if (!profile.profile_image) {
        console.warn(
          "Pegawai ini belum mempunyai profile_image.",
        );
      }
    } catch (fetchError) {
      console.error(
        "GAGAL MENGAMBIL PROFILE:",
        fetchError,
      );

      setProfileError(
        fetchError instanceof Error
          ? fetchError.message
          : "Gagal mengambil profil pegawai.",
      );
    } finally {
      setIsProfileLoading(false);
    }
  }

  function exportEmployees() {
    const headers = [
      "ID Karyawan",
      "Nama",
      "Email",
      "Jabatan",
      "Departemen",
      "Status",
      "Tanggal Bergabung",
    ];

    const rows = filteredEmployees.map((employee) => [
      employee.id,
      employee.name,
      employee.email,
      employee.role,
      employee.department,
      employee.status,
      employee.joined,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${value.replaceAll('"', '""')}"`,
          )
          .join(","),
      )
      .join("\r\n");

    const file = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(file);
    const downloadLink = document.createElement("a");

    downloadLink.href = url;
    downloadLink.download = "data-karyawan.csv";
    downloadLink.click();

    window.setTimeout(
      () => URL.revokeObjectURL(url),
      1000,
    );
  }

  return (
    <div className="space-y-5">
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
              Data Karyawan
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Kelola Data Karyawan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Akses, tinjau, dan kelola seluruh direktori data kepegawaian ASN secara terpusat.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={fetchEmployees}
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

      <motion.section
        animate="visible"
        aria-label="Daftar karyawan"
        className="employee-directory"
        initial="hidden"
        variants={cardVariants}
      >
      <section
        className="employees-summary-grid"
        aria-label="Ringkasan data karyawan"
      >
        {employeeStats.map((stat) => (
          <motion.article
            className="employees-summary-card"
            key={stat.label}
            variants={cardVariants}
            whileHover={
              shouldReduceMotion
                ? undefined
                : { y: -2 }
            }
          >
            <div>
              <span>{stat.label}</span>
              <strong>
                {isLoading ? "—" : stat.value}
              </strong>
            </div>

            <span
              className="employees-summary-icon"
              aria-hidden="true"
            >
              {stat.icon}
            </span>
          </motion.article>
        ))}
      </section>

      {!isEmployeeFormOpen && mutationFeedback && (
        <p
          className={`employee-mutation-feedback is-${mutationFeedback.type}`}
          role={
            mutationFeedback.type === "error"
              ? "alert"
              : "status"
          }
        >
          {mutationFeedback.message}
        </p>
      )}

      <div className="employees-toolbar">
        <div className="employees-filter-group">
          <label className="employees-search">
            <span aria-hidden="true">⌕</span>

            <input
              aria-label="Cari karyawan"
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama atau ID karyawan..."
              type="search"
              value={query}
            />
          </label>

          <label className="employees-select">
            <span className="visually-hidden">
              Filter departemen
            </span>

            <select
              onChange={(event) => {
                setDepartment(event.target.value);
                setCurrentPage(1);
              }}
              value={department}
            >
              <option value="all">
                Semua Departemen
              </option>

              {departments.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="employees-select">
            <span className="visually-hidden">
              Filter status
            </span>

            <select
              onChange={(event) => {
                setStatus(event.target.value);
                setCurrentPage(1);
              }}
              value={status}
            >
              <option value="all">
                Semua Status
              </option>

              {statuses.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="employees-select">
            <span className="visually-hidden">
              Filter jabatan
            </span>

            <select
              aria-label="Filter jabatan"
              onChange={(event) => {
                setRole(event.target.value);
                setCurrentPage(1);
              }}
              value={role}
            >
              <option value="all">
                Semua Jabatan
              </option>

              {roles.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {filtersActive && (
            <button
              className="employees-reset"
              onClick={resetFilters}
              type="button"
            >
              Reset filter
            </button>
          )}
        </div>

        <div className="employees-toolbar-actions">
          <button
            className="primary-button employees-add"
            onClick={openCreateForm}
            type="button"
          >
            <Plus
              aria-hidden="true"
              size={16}
            />
            Tambah Karyawan
          </button>

          <button
            className="employees-export"
            onClick={exportEmployees}
            type="button"
          >
            Ekspor CSV
          </button>
        </div>
      </div>

      <div className="employees-table-panel">
        <div className="employees-table-wrap">
          <table className="employees-table">
            <thead>
              <tr>
                <th scope="col">Karyawan</th>
                <th scope="col">NIP</th>
                <th scope="col">Jabatan</th>
                <th scope="col">Tim Kerja</th>
                <th scope="col" style={{ width: "95px", whiteSpace: "nowrap" }}>Status</th>
                <th scope="col" style={{ minWidth: "150px", whiteSpace: "nowrap" }}>Keterangan</th>
                <th scope="col">
                  TMT Golongan
                </th>
                <th
                  className="employees-actions-heading"
                  scope="col"
                >
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleEmployees.map((employee) => (
                <tr key={employee.key}>
                  <td>
                    <div className="employees-person">
                      <EmployeeListAvatar
                        key={`${employee.key}-${employee.profileImage ?? ""}`}
                        imageUrl={employee.profileImage}
                        initials={employee.initials}
                        name={employee.name}
                      />

                      <span>
                        <strong>
                          {employee.name}
                        </strong>

                        <small>
                          {employee.email}
                        </small>
                      </span>
                    </div>
                  </td>

                  <td className="employee-id">
                    {employee.id}
                  </td>

                  <td>{employee.role}</td>

                  <td>
                    <span className="employee-department">
                      {employee.department}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`employee-status status-${employee.status.toLowerCase()}`}
                    >
                      <i aria-hidden="true" />
                      {employee.status}
                    </span>
                  </td>

                  <td>
                    {employee.keterangan && employee.keterangan !== "—" ? (
                      <span
                        className={`keterangan-badge ${
                          employee.keterangan.toLowerCase().includes("tugas")
                            ? "keterangan-tugas"
                            : "keterangan-cuti"
                        }`}
                      >
                        {employee.keterangan}
                      </span>
                    ) : (
                      <span className="keterangan-empty">—</span>
                    )}
                  </td>

                  <td>{employee.joined}</td>

                  <td className="employees-actions-cell">
                    <div className="employees-actions">
                      <button
                        aria-label={`Lihat profil ${employee.name}`}
                        onClick={() =>
                          void viewEmployeeProfile(
                            employee,
                          )
                        }
                        title="Lihat Profil"
                        type="button"
                      >
                        <Eye
                          aria-hidden="true"
                          size={16}
                          strokeWidth={1.8}
                        />
                      </button>

                      <button
                        aria-label={`Ubah data ${employee.name}`}
                        onClick={() =>
                          openEditForm(employee)
                        }
                        title="Ubah Data"
                        type="button"
                      >
                        <Pencil
                          aria-hidden="true"
                          size={16}
                          strokeWidth={1.8}
                        />
                      </button>

                      <button
                        aria-label={`Hapus ${employee.name}`}
                        disabled={
                          deletingEmployeeId ===
                          employee.recordId
                        }
                        onClick={() =>
                          void removeEmployee(employee)
                        }
                        title="Hapus Karyawan"
                        type="button"
                      >
                        <Trash2
                          aria-hidden="true"
                          size={16}
                          strokeWidth={1.8}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!isLoading &&
                !error &&
                visibleEmployees.length === 0 && (
                  <tr>
                    <td
                      className="employees-empty"
                      colSpan={8}
                    >
                      Karyawan tidak ditemukan.
                      Coba ubah kata kunci atau
                      filter Anda.
                    </td>
                  </tr>
                )}

              {isLoading && (
                <tr>
                  <td
                    className="employees-empty"
                    colSpan={8}
                  >
                    Mengambil data karyawan dari
                    backend...
                  </td>
                </tr>
              )}

              {error && (
                <tr>
                  <td
                    className="employees-empty"
                    colSpan={8}
                  >
                    <span role="alert">
                      {error}
                    </span>

                    {error.includes(
                      "Silakan masuk",
                    ) && (
                      <Link
                        className="employees-login-link"
                        href="/auth/login"
                      >
                        Masuk
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="employees-table-footer">
          <nav
            aria-label="Halaman data karyawan"
            className="employees-pagination"
          >
            <button
              aria-label="Halaman sebelumnya"
              disabled={activePage === 1}
              onClick={() =>
                setCurrentPage(activePage - 1)
              }
              type="button"
            >
              <ChevronLeft
                aria-hidden="true"
                size={15}
              />
            </button>

            {firstVisiblePage > 1 && (
              <>
                <button
                  onClick={() =>
                    setCurrentPage(1)
                  }
                  type="button"
                >
                  1
                </button>

                {firstVisiblePage > 2 && (
                  <span aria-hidden="true">
                    …
                  </span>
                )}
              </>
            )}

            {pageNumbers.map((pageNumber) => (
              <button
                aria-current={
                  pageNumber === activePage
                    ? "page"
                    : undefined
                }
                key={pageNumber}
                onClick={() =>
                  setCurrentPage(pageNumber)
                }
                type="button"
              >
                {pageNumber}
              </button>
            ))}

            {lastVisiblePage < totalPages && (
              <>
                {lastVisiblePage <
                  totalPages - 1 && (
                  <span aria-hidden="true">
                    …
                  </span>
                )}

                <button
                  onClick={() =>
                    setCurrentPage(totalPages)
                  }
                  type="button"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              aria-label="Halaman berikutnya"
              disabled={
                activePage === totalPages ||
                totalPages === 0
              }
              onClick={() =>
                setCurrentPage(activePage + 1)
              }
              type="button"
            >
              <ChevronRight
                aria-hidden="true"
                size={15}
              />
            </button>
          </nav>
        </footer>
      </div>

      {/* =========================
          PROFILE MODAL
      ========================= */}
      {isProfileOpen && (
        <div
          className="employee-profile-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setIsProfileOpen(false);
            }
          }}
        >
          <section
            aria-labelledby="employee-profile-title"
            aria-modal="true"
            className="employee-profile-dialog"
            role="dialog"
          >
            <header className="employee-profile-header">
              <div className="employee-profile-identity">
                <span
                  className="employee-profile-photo"
                  aria-label="Foto profil pegawai"
                >
                  {selectedProfile?.profile_image &&
                  !profileImageError ? (
                    <Image
                      alt={`Foto ${
                        selectedProfile.nama_lengkap ||
                        selectedProfile.nama ||
                        "pegawai"
                      }`}
                      className="employee-profile-photo-image"
                      height={80}
                      onError={(event) => {
                        console.error(
                          "GAGAL MEMUAT FOTO:",
                          selectedProfile.profile_image,
                        );

                        setProfileImageError(true);

                        console.error(
                          "IMAGE ERROR ELEMENT:",
                          event.currentTarget,
                        );
                      }}
                      onLoad={() => {
                        console.log(
                          "FOTO BERHASIL DIMUAT:",
                          selectedProfile.profile_image,
                        );
                      }}
                      src={selectedProfile.profile_image}
                      unoptimized
                      width={80}
                    />
                  ) : (
                    <span>
                      {getProfileInitials(
                        selectedProfile?.nama_lengkap ||
                          selectedProfile?.nama ||
                          "?",
                      )}
                    </span>
                  )}
                </span>

                <div>
                  <p className="eyebrow">
                    Data pegawai
                  </p>

                  <h2 id="employee-profile-title">
                    {selectedProfile?.nama_lengkap ||
                      selectedProfile?.nama ||
                      "Profil Karyawan"}
                  </h2>

                  {/* Informasi debug sementara */}
                  {selectedProfile &&
                    !selectedProfile.profile_image && (
                      <small
                        style={{
                          display: "block",
                          marginTop: "6px",
                          color: "#b42318",
                        }}
                      >
                        Foto belum tersedia
                        pada data API.
                      </small>
                    )}

                  {selectedProfile?.profile_image &&
                    profileImageError && (
                      <small
                        style={{
                          display: "block",
                          marginTop: "6px",
                          color: "#b42318",
                        }}
                      >
                        URL foto tersedia,
                        tetapi gambar gagal
                        dimuat.
                      </small>
                    )}
                </div>
              </div>

              <button
                aria-label="Tutup profil"
                className="employee-profile-close"
                onClick={() =>
                  setIsProfileOpen(false)
                }
                type="button"
              >
                <X size={19} />
              </button>
            </header>

            {isProfileLoading && (
              <p className="employee-profile-message">
                Mengambil profil dari backend...
              </p>
            )}

            {profileError && (
              <p
                className="employee-profile-message"
                role="alert"
              >
                {profileError}
              </p>
            )}

            {selectedProfile && (
              <dl className="employee-profile-fields">
                <div>
                  <dt>NIP</dt>
                  <dd>
                    {selectedProfile.nip || "—"}
                  </dd>
                </div>

                <div>
                  <dt>Email</dt>
                  <dd>
                    {selectedProfile.email || "—"}
                  </dd>
                </div>

                <div>
                  <dt>Status</dt>
                  <dd>
                    {parseStatusAndKeterangan(selectedProfile.status, selectedProfile.keterangan).status || "—"}
                  </dd>
                </div>

                <div>
                  <dt>Keterangan</dt>
                  <dd>
                    {parseStatusAndKeterangan(selectedProfile.status, selectedProfile.keterangan).keterangan || "—"}
                  </dd>
                </div>

                <div>
                  <dt>Jenis Jabatan</dt>
                  <dd>
                    {selectedProfile.jenis_jabatan ||
                      "—"}
                  </dd>
                </div>

                <div>
                  <dt>Jabatan</dt>
                  <dd>
                    {selectedProfile.jabatan || "—"}
                  </dd>
                </div>

                <div>
                  <dt>Tim Kerja</dt>
                  <dd>
                    {formatTimKerja(selectedProfile.tim_kerja)}
                  </dd>
                </div>

                <div>
                  <dt>Pangkat / Golongan</dt>
                  <dd>
                    {selectedProfile.pangkat_golongan ||
                      "—"}
                  </dd>
                </div>

                <div>
                  <dt>TMT Golongan</dt>
                  <dd>
                    {selectedProfile.tmt_golongan ||
                      "—"}
                  </dd>
                </div>

                <div>
                  <dt>Pendidikan</dt>
                  <dd>
                    {selectedProfile.jenjang_pendidikan ||
                      "—"}
                  </dd>
                </div>

                <div>
                  <dt>Jurusan</dt>
                  <dd>
                    {selectedProfile.jurusan_pendidikan ||
                      "—"}
                  </dd>
                </div>

                <div>
                  <dt>Jenis Kelamin</dt>
                  <dd>
                    {selectedProfile.jenis_kelamin ||
                      "—"}
                  </dd>
                </div>

                <div>
                  <dt>Tempat, Tanggal Lahir</dt>
                  <dd>
                    {[
                      selectedProfile.tempat_lahir,
                      selectedProfile.tanggal_lahir,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </dd>
                </div>

                <div>
                  <dt>Nomor Ponsel</dt>
                  <dd>
                    {formatPhoneNumber(selectedProfile.nomor_ponsel)}
                  </dd>
                </div>
              </dl>
            )}
          </section>
        </div>
      )}

      {/* =========================
          ADD / EDIT FORM
      ========================= */}
      {isEmployeeFormOpen && (
        <div
          className="employee-profile-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !isSavingEmployee
            ) {
              setIsEmployeeFormOpen(false);
            }
          }}
        >
          <section
            aria-labelledby="employee-form-title"
            aria-modal="true"
            className="employee-profile-dialog employee-form-dialog"
            role="dialog"
          >
            <header className="employee-profile-header">
              <div>
                <p className="eyebrow">
                  Data pegawai
                </p>

                <h2 id="employee-form-title">
                  {editingEmployee
                    ? "Ubah Data Karyawan"
                    : "Tambah Karyawan"}
                </h2>
              </div>

              <button
                aria-label="Tutup formulir"
                className="employee-profile-close"
                disabled={isSavingEmployee}
                onClick={() =>
                  setIsEmployeeFormOpen(false)
                }
                type="button"
              >
                <X size={19} />
              </button>
            </header>

            {mutationFeedback?.type ===
              "error" && (
              <p
                className="employee-profile-message"
                role="alert"
              >
                {mutationFeedback.message}
              </p>
            )}

            <form
              className="employee-form"
              onSubmit={(event) =>
                void saveEmployee(event)
              }
            >
              <div className="employee-form-grid">
                {employeeFormFields.map((field) => {
                  /* Status & Keterangan: rendered as a grouped div spanning 2 cols */
                  if (field.key === "status") {
                    return (
                      <div
                        key="status-keterangan-group"
                        className="employee-form-field employee-form-field--full"
                      >
                        <div className="status-keterangan-row">
                          {/* Status */}
                          <div className="status-keterangan-col">
                            <label
                              htmlFor="employee-status"
                              className="employee-form-sublabel"
                            >
                              Status
                            </label>
                            <select
                              autoComplete="off"
                              id="employee-status"
                              className="employee-form-select"
                              onChange={(event) =>
                                setEmployeeForm((current) => ({
                                  ...current,
                                  status: event.target.value,
                                }))
                              }
                              value={employeeForm.status}
                            >
                              <option value="">Pilih Status</option>
                              <option value="PNS">PNS</option>
                              <option value="PPPK">PPPK</option>
                              <option value="PPPK Paruh Waktu">PPPK Paruh Waktu</option>
                              <option value="ASN">ASN</option>
                            </select>
                          </div>

                          {/* Keterangan */}
                          <div className="status-keterangan-col">
                            <label
                              htmlFor="employee-keterangan"
                              className="employee-form-sublabel"
                            >
                              Keterangan
                            </label>
                            <select
                              autoComplete="off"
                              id="employee-keterangan"
                              className="employee-form-select"
                              onChange={(event) =>
                                setEmployeeForm((current) => ({
                                  ...current,
                                  keterangan: event.target.value,
                                }))
                              }
                              value={employeeForm.keterangan}
                            >
                              <option value="">— Tidak Ada / Aktif —</option>
                              <option value="Tugas Belajar">Tugas Belajar</option>
                              <option value="Cuti di Luar Tanggungan Negara">Cuti di Luar Tanggungan Negara</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  /* Keterangan: already rendered inside status block */
                  if (field.key === "keterangan") return null;

                  /* jenis_jabatan: rendered as dedicated labeled dropdown */
                  if (field.key === "jenis_jabatan") {
                    const autoDetected = employeeForm.jabatan
                      ? inferJenisJabatan(employeeForm.jabatan)
                      : "";
                    const isAutoMatch =
                      autoDetected !== "" &&
                      employeeForm.jenis_jabatan === autoDetected;

                    return (
                      <label
                        key="jenis_jabatan"
                        className="employee-form-field"
                        htmlFor="employee-jenis_jabatan"
                      >
                        <span className="flex items-center gap-1.5">
                          Jenis jabatan
                          {isAutoMatch && (
                            <span
                              title="Terdeteksi otomatis dari nama jabatan"
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                              ✦ otomatis
                            </span>
                          )}
                        </span>
                        <select
                          autoComplete="off"
                          id="employee-jenis_jabatan"
                          className="employee-form-select"
                          onChange={(event) =>
                            setEmployeeForm((current) => ({
                              ...current,
                              jenis_jabatan: event.target.value,
                            }))
                          }
                          value={employeeForm.jenis_jabatan}
                        >
                          <option value="">— Pilih / Biarkan otomatis —</option>
                          <option value="Fungsional">Fungsional</option>
                          <option value="Struktural">Struktural</option>
                          <option value="Pelaksana">Pelaksana</option>
                        </select>
                      </label>
                    );
                  }

                  return (
                    <label
                      className={`employee-form-field${field.key === "tim_kerja" ? " employee-form-field--full" : ""}`}
                      htmlFor={`employee-${field.key}`}
                      key={field.key}
                    >
                      <span>
                        {field.label}
                        {field.required ? " *" : ""}
                      </span>

                      {field.key === "jabatan" ? (
                        <input
                          autoComplete="off"
                          id="employee-jabatan"
                          onChange={(event) => {
                            const newJabatan = event.target.value;
                            const autoJenis = inferJenisJabatan(newJabatan);
                            setEmployeeForm((current) => ({
                              ...current,
                              jabatan: newJabatan,
                              // Selalu gunakan hasil auto-detect jika tersedia,
                              // hanya fallback ke nilai lama jika field jabatan dikosongkan
                              jenis_jabatan: autoJenis !== "" ? autoJenis : current.jenis_jabatan,
                            }));
                          }}
                          required={field.required}
                          type="text"
                          value={employeeForm.jabatan}
                        />
                      ) : field.key === "tim_kerja" ? (
                        <select
                          autoComplete="off"
                          id={`employee-${field.key}`}
                          className="employee-form-select"
                          onChange={(event) =>
                            setEmployeeForm((current) => ({
                              ...current,
                              [field.key]: event.target.value,
                            }))
                          }
                          required={field.required}
                          value={employeeForm[field.key]}
                        >
                          <option value="">Pilih Tim Kerja</option>
                          <option value="Tata Usaha">Tata Usaha</option>
                          <option value="Perkamusan dan Peristilahan">Perkamusan dan Peristilahan</option>
                          <option value="Pemodernan dan Pelindungan">Pemodernan dan Pelindungan</option>
                          <option value="Bidang">Bidang</option>
                          <option value="Kepala Pusat">Kepala Pusat</option>
                        </select>
                      ) : (
                        <input
                          autoComplete="off"
                          id={`employee-${field.key}`}
                          onChange={(event) =>
                            setEmployeeForm((current) => ({
                              ...current,
                              [field.key]: event.target.value,
                            }))
                          }
                          required={field.required}
                          type={field.type || "text"}
                          value={employeeForm[field.key]}
                        />
                      )}
                    </label>
                  );
                })}
              </div>

              <div className="employee-form-actions">
                <button
                  className="employees-reset"
                  disabled={isSavingEmployee}
                  onClick={() =>
                    setIsEmployeeFormOpen(false)
                  }
                  type="button"
                >
                  Batal
                </button>

                <button
                  className="primary-button"
                  disabled={isSavingEmployee}
                  type="submit"
                >
                  {isSavingEmployee
                    ? "Menyimpan..."
                    : editingEmployee
                      ? "Simpan Perubahan"
                      : "Tambah Karyawan"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </motion.section>
    </div>
  );
}