export type DashboardSummary = {
  total_pegawai: number;
  total_TU: number;
  total_Molin: number;
  total_KI: number;
  total_Bidang: number;
  total_Kepala_Pusat: number;
};
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "");

export const ACCESS_TOKEN_KEY = "pusbanglin_access_token";
export const USER_EMAIL_KEY = "pusbanglin_user_email";
export const USER_ROLE_KEY = "pusbanglin_user_role";

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
  session?: {
    access_token?: string;
  };
};

export type ApiEmployee = {
  id?: string | number | null;
  no?: string | number | null;
  nip?: string | null;
  nama_lengkap?: string | null;
  nama?: string | null;
  email?: string | null;
  jabatan?: string | null;
  jenis_jabatan?: string | null;
  tim_kerja?: string | null;
  status?: string | null;
  tmt_golongan?: string | null;
  pangkat_golongan?: string | null;
  jenjang_pendidikan?: string | null;
  jurusan_pendidikan?: string | null;
  jenis_kelamin?: string | null;
  tempat_lahir?: string | null;
  tanggal_lahir?: string | null;
  profile_image?: string | null;
  nomor_ktp?: string | null;
  nomor_ponsel?: string | null;
  
};

export type EmployeeInput = Omit<ApiEmployee, "id" | "no" | "nama_lengkap" | "nip"> & {
  nama_lengkap: string;
  nip: string;
};

async function readApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const result = await response.json().catch(() => null) as ApiResponse<T> | null;

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || `Permintaan gagal (${response.status})`);
  }

  return result;
}

export async function loginWithBackend(
  email: string,
  password: string
): Promise<{ accessToken: string; role: string }> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error(`Backend tidak dapat dihubungi di ${API_BASE_URL}.`);
  }

  const result = await readApiResponse<{ role?: string }>(response);
  const accessToken = (result as unknown as { session?: { access_token?: string } }).session?.access_token;

  if (!accessToken) {
    throw new Error("Login berhasil, tetapi backend tidak mengirim access token.");
  }

  // Ambil role dari endpoint /api/auth/me
  let role = "user";
  try {
    const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meData = await meRes.json().catch(() => null);
    if (meData?.data?.role) {
      role = meData.data.role;
    }
  } catch {
    // fallback ke "user" jika endpoint belum ada
  }

  return { accessToken, role };
}

export async function getEmployees(accessToken: string, signal?: AbortSignal): Promise<ApiEmployee[]> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/employees`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new Error(`Backend tidak dapat dihubungi di ${API_BASE_URL}.`);
  }

  if (response.status === 401) {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    throw new Error("Sesi login tidak valid. Silakan masuk kembali.");
  }

  const result = await readApiResponse<ApiEmployee[]>(response);
  return Array.isArray(result.data) ? result.data : [];
}

export async function getEmployeeById(accessToken: string, id: string, signal?: AbortSignal): Promise<ApiEmployee> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/employees/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new Error(`Backend tidak dapat dihubungi di ${API_BASE_URL}.`);
  }

  if (response.status === 401) {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    throw new Error("Sesi login tidak valid. Silakan masuk kembali.");
  }

  const result = await readApiResponse<ApiEmployee>(response);
  if (!result.data) {
    throw new Error("Backend tidak mengirim detail pegawai.");
  }

  return result.data;
}

async function mutateEmployee(
  accessToken: string,
  method: "POST" | "PUT" | "DELETE",
  id?: string,
  employee?: EmployeeInput,
): Promise<ApiEmployee> {
  const endpoint = id
    ? `${API_BASE_URL}/api/employees/${encodeURIComponent(id)}`
    : `${API_BASE_URL}/api/employees`;
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(employee ? { "Content-Type": "application/json" } : {}),
      },
      body: employee ? JSON.stringify(employee) : undefined,
    });
  } catch {
    throw new Error(`Backend tidak dapat dihubungi di ${API_BASE_URL}.`);
  }

  if (response.status === 401) {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    throw new Error("Sesi login tidak valid. Silakan masuk kembali.");
  }

  const result = await readApiResponse<ApiEmployee>(response);
  if (!result.data) {
    throw new Error("Backend tidak mengirim data pegawai.");
  }

  return result.data;
}

export function createEmployee(accessToken: string, employee: EmployeeInput): Promise<ApiEmployee> {
  return mutateEmployee(accessToken, "POST", undefined, employee);
}

export function updateEmployee(accessToken: string, id: string, employee: EmployeeInput): Promise<ApiEmployee> {
  return mutateEmployee(accessToken, "PUT", id, employee);
}

export async function deleteEmployee(accessToken: string, id: string): Promise<void> {
  await mutateEmployee(accessToken, "DELETE", id);
}

export async function getDashboardSummary(accessToken: string, signal?: AbortSignal): Promise<DashboardSummary> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/dashboard`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new Error(`Backend tidak dapat dihubungi di ${API_BASE_URL}.`);
  }

  if (response.status === 401) {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    throw new Error("Sesi login tidak valid. Silakan masuk kembali.");
  }

  const result = await readApiResponse<DashboardSummary>(response);
  if (!result.data) {
    throw new Error("Backend tidak mengirim ringkasan dashboard.");
  }

  return result.data;
}

export type DocumentItem = {
  id: string;
  employee_id: string;
  nama_file: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  updated_at?: string;
  kategori: string;
  signed_url?: string | null;
};

export type AccountInfo = {
  role: string;
  employee: ApiEmployee | null;
};

export async function getMyAccount(accessToken: string): Promise<AccountInfo> {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (res.status === 401) {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    throw new Error("Sesi login tidak valid.");
  }
  const json = await res.json().catch(() => null);
  return json?.data || { role: "user", employee: null };
}

export async function getUserDocuments(accessToken: string): Promise<DocumentItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/documents`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (res.status === 401) {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    throw new Error("Sesi login telah berakhir. Silakan masuk kembali.");
  }
  const json = await res.json().catch(() => null);
  if (!json?.success) {
    throw new Error(json?.message || "Gagal mengambil data berkas.");
  }
  return Array.isArray(json.data) ? json.data : [];
}

export async function uploadUserDocument(
  accessToken: string,
  formData: FormData,
  onProgress?: (pct: number) => void
): Promise<DocumentItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/api/documents/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          onProgress(pct);
        }
      };
    }

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && json.success) {
          resolve(json.data);
        } else {
          reject(new Error(json.message || `Gagal mengunggah berkas (${xhr.status})`));
        }
      } catch {
        reject(new Error("Format respon server tidak valid."));
      }
    };

    xhr.onerror = () => reject(new Error("Gagal terhubung ke server backend."));
    xhr.send(formData);
  });
}

export async function deleteUserDocument(accessToken: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/documents/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || "Gagal menghapus berkas.");
  }
}