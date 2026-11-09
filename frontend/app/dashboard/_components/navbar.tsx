"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  LogOut,
  Moon,
  Sun,
  X,
} from "lucide-react";
import {
  ACCESS_TOKEN_KEY,
  getEmployees,
  USER_EMAIL_KEY,
  USER_ROLE_KEY,
  type ApiEmployee,
} from "@/lib/api";
import { processEmployeeKGB } from "@/lib/kgb";
import { processEmployeePension } from "@/lib/pension";
import { useDashboardTheme } from "./dashboard-theme";
import { useSidebar } from "./sidebar-context";

type DashboardNotification = {
  key: string;
  category: "Pensiun" | "KGB";
  employeeName: string;
  detail: string;
  urgencyDays: number;
  href: string;
};

const READ_NOTIFICATIONS_KEY = "pusbanglin_read_notifications";
const NOTIFICATIONS_READ_EVENT = "pusbanglin-notifications-read";

function getInitials(email: string) {
  const localPart = email.split("@")[0] || "";
  const parts = localPart.split(/[._-]+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
}

function subscribeToEmail() {
  return () => {};
}

function getEmailSnapshot() {
  if (typeof window === "undefined" || !sessionStorage.getItem(ACCESS_TOKEN_KEY)) return "";
  return sessionStorage.getItem(USER_EMAIL_KEY) || "";
}

function getAccessTokenSnapshot() {
  if (typeof window === "undefined") return "";
  return (
    sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    ""
  );
}

function getServerEmailSnapshot() {
  return "";
}

function subscribeToReadNotifications(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(NOTIFICATIONS_READ_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(NOTIFICATIONS_READ_EVENT, onChange);
  };
}

function getReadNotificationsSnapshot() {
  return localStorage.getItem(READ_NOTIFICATIONS_KEY) || "[]";
}

function getServerReadNotificationsSnapshot() {
  return "[]";
}

export default function Navbar() {
  const router = useRouter();
  const email = useSyncExternalStore(subscribeToEmail, getEmailSnapshot, getServerEmailSnapshot);
  const accessToken = useSyncExternalStore(
    subscribeToEmail,
    getAccessTokenSnapshot,
    getServerEmailSnapshot
  );
  const readNotificationsSnapshot = useSyncExternalStore(
    subscribeToReadNotifications,
    getReadNotificationsSnapshot,
    getServerReadNotificationsSnapshot
  );
  const { theme, toggleTheme } = useDashboardTheme();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [notificationError, setNotificationError] = useState("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<DashboardNotification["category"]>>(
    () => new Set()
  );

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();
    if (!accessToken) return;

    getEmployees(accessToken, controller.signal)
      .then((data) => {
        if (isActive) {
          setNotificationError("");
          setEmployees(data);
        }
      })
      .catch((fetchError: unknown) => {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          return;
        }

        if (isActive) {
          setNotificationError(
            fetchError instanceof Error
              ? fetchError.message
              : "Gagal memuat notifikasi."
          );
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingNotifications(false);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [accessToken]);

  const notifications = useMemo<DashboardNotification[]>(() => {
    const pensionNotifications = employees.flatMap((employee, index) => {
      const record = processEmployeePension(employee);
      if (record.status !== "kritis" || !record.remainingTime) return [];

      return [{
        key: `pension-${employee.id ?? employee.nip ?? index}`,
        category: "Pensiun" as const,
        employeeName: employee.nama_lengkap || employee.nama || "Pegawai",
        detail: `Pensiun ${record.remainingTime.text}`,
        urgencyDays: record.remainingTime.totalDays,
        href: "/dashboard/pensiun",
      }];
    });

    const kgbNotifications = employees.flatMap((employee, index) => {
      const record = processEmployeeKGB(employee);
      if (!record.remainingTime || record.remainingTime.days > 30) return [];

      return [{
        key: `kgb-${employee.id ?? employee.nip ?? index}`,
        category: "KGB" as const,
        employeeName: employee.nama_lengkap || employee.nama || "Pegawai",
        detail:
          record.remainingTime.days <= 0
            ? "Jatuh tempo (perlu SK)"
            : record.remainingTime.text,
        urgencyDays: record.remainingTime.days,
        href: "/dashboard/kgb",
      }];
    });

    return [...pensionNotifications, ...kgbNotifications].sort(
      (a, b) => a.urgencyDays - b.urgencyDays
    );
  }, [employees]);

  const readNotificationKeys = useMemo<Set<string>>(() => {
    const parsed: unknown = JSON.parse(readNotificationsSnapshot);
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((key): key is string => typeof key === "string")
        : []
    );
  }, [readNotificationsSnapshot]);

  const unreadNotifications = notifications.filter(
    (notification) => !readNotificationKeys.has(notification.key)
  );

  const notificationGroups = (["KGB", "Pensiun"] as const).map((category) => ({
    category,
    notifications: notifications.filter(
      (notification) => notification.category === category
    ),
    unreadCount: notifications.filter(
      (notification) =>
        notification.category === category &&
        !readNotificationKeys.has(notification.key)
    ).length,
  }));

  function toggleNotificationGroup(category: DashboardNotification["category"]) {
    const isExpanded = expandedCategories.has(category);
    setExpandedCategories((current) => {
      const next = new Set(current);
      if (isExpanded) next.delete(category);
      else next.add(category);
      return next;
    });

    if (!isExpanded) {
      const readKeys = new Set(readNotificationKeys);
      notifications
        .filter((notification) => notification.category === category)
        .forEach((notification) => readKeys.add(notification.key));
      localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify([...readKeys]));
      window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT));
    }
  }

  function handleLogout() {
    // Hapus sessionStorage
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(USER_EMAIL_KEY);
    sessionStorage.removeItem(USER_ROLE_KEY);

    // Hapus cookie role agar middleware tidak redirect balik ke dashboard
    document.cookie = "pusbanglin_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";

    router.replace("/auth/login");
  }

  return (
    <header className="topbar home-topbar sticky top-0 z-40">
      <div className="topbar-right home-topbar-right">
        <button
          aria-label={theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
          aria-pressed={theme === "dark"}
          className="admin-theme-toggle"
          onClick={toggleTheme}
          title={theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
          type="button"
        >
          {theme === "dark" ? <Sun aria-hidden="true" size={16} /> : <Moon aria-hidden="true" size={16} />}
        </button>
        <div className="notification-control">
          <button
            aria-expanded={isNotificationOpen}
            aria-controls="dashboard-notifications"
            aria-haspopup="dialog"
            aria-label={`Notifikasi${unreadNotifications.length ? `, ${unreadNotifications.length} belum dibaca` : ""}`}
            className="notification-button"
            onClick={() => setIsNotificationOpen((open) => !open)}
            title="Notifikasi"
            type="button"
          >
            <Bell aria-hidden="true" size={18} />
            {unreadNotifications.length > 0 && (
              <span className="notification-count">
                {unreadNotifications.length > 99 ? "99+" : unreadNotifications.length}
              </span>
            )}
          </button>
          {isNotificationOpen && (
            <section
              aria-label="Daftar notifikasi"
              className="notification-popover"
              id="dashboard-notifications"
              role="dialog"
            >
              <div className="notification-heading">
                <div>
                  <strong>Notifikasi</strong>
                  <span>{unreadNotifications.length} belum dibaca</span>
                </div>
                <button
                  aria-label="Tutup notifikasi"
                  className="notification-close"
                  onClick={() => setIsNotificationOpen(false)}
                  type="button"
                >
                  <X aria-hidden="true" size={17} />
                </button>
              </div>
              {!accessToken ? (
                <p className="notification-message notification-error">
                  Sesi login tidak ditemukan. Silakan masuk kembali.
                </p>
              ) : isLoadingNotifications ? (
                <p className="notification-message">Memuat notifikasi...</p>
              ) : notificationError ? (
                <p className="notification-message notification-error">
                  {notificationError}
                </p>
              ) : notifications.length === 0 ? (
                <p className="notification-message">
                  Tidak ada notifikasi mendesak saat ini.
                </p>
              ) : (
                <div className="notification-groups">
                  {notificationGroups
                    .filter((group) => group.notifications.length > 0)
                    .map((group) => {
                      const isExpanded = expandedCategories.has(group.category);
                      return (
                        <section className="notification-group" key={group.category}>
                          <button
                            aria-expanded={isExpanded}
                            className="notification-group-toggle"
                            onClick={() => toggleNotificationGroup(group.category)}
                            type="button"
                          >
                            <span className="notification-item-icon" aria-hidden="true">
                              {group.category === "Pensiun" ? (
                                <CalendarClock size={17} />
                              ) : (
                                <CalendarDays size={17} />
                              )}
                            </span>
                            <span className="notification-group-title">
                              <strong>{group.category}</strong>
                              <span>
                                {group.category === "KGB"
                                  ? "Jadwal kenaikan gaji berkala"
                                  : "Masa pensiun pegawai"}
                              </span>
                            </span>
                            {group.unreadCount > 0 && (
                              <span className="notification-group-count">
                                {group.unreadCount}
                              </span>
                            )}
                            <ChevronDown
                              aria-hidden="true"
                              className={`notification-group-chevron${isExpanded ? " is-expanded" : ""}`}
                              size={18}
                            />
                          </button>
                          {isExpanded && (
                            <ul className="notification-list">
                              {group.notifications.map((notification) => (
                                <li key={notification.key}>
                                  <Link
                                    className="notification-item"
                                    href={notification.href}
                                    onClick={() => setIsNotificationOpen(false)}
                                  >
                                    <span className="notification-item-copy">
                                      <strong>{notification.employeeName}</strong>
                                      <span>{notification.detail}</span>
                                    </span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </section>
                      );
                    })}
                </div>
              )}
            </section>
          )}
        </div>
        <span aria-hidden="true" className="home-profile-avatar">{email ? getInitials(email) : "HR"}</span>
        <div className="home-profile-copy"><strong>{email || "Admin HR"}</strong><span>HR Manager</span></div>
        <button aria-label="Keluar dari akun" className="home-logout-button" onClick={handleLogout} title="Keluar dari akun" type="button">
          <LogOut aria-hidden="true" size={16} />
          <span>Keluar</span>
        </button>
      </div>
    </header>
  );
}