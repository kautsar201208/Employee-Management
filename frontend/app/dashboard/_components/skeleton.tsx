import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
  as?: "span" | "div";
}

/**
 * Komponen dasar Skeleton dengan efek shimmer gelombang kilauan cahaya.
 * Menggunakan <span> (inline-block) secara default agar aman dan valid bersarang
 * di dalam elemen apa pun (<p>, <strong>, <td>, <button>, <div>) tanpa memicu
 * React hydration error di Next.js.
 */
export function Skeleton({ as: Component = "span", className = "", ...props }: SkeletonProps) {
  const displayClass =
    className.includes("block") || className.includes("flex") || className.includes("inline")
      ? ""
      : "inline-block";

  return (
    <Component
      className={`skeleton-shimmer rounded-md ${displayClass} ${className}`.trim()}
      aria-hidden="true"
      {...props}
    />
  );
}

/**
 * Skeleton untuk kartu ringkasan metrik statistik (Top Stats)
 */
export function SkeletonStatCard() {
  return (
    <div className="home-stat-card p-4 rounded-xl border border-slate-200/80 bg-white dark:bg-[#1c2738] dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="space-y-1.5 pt-1">
        <Skeleton className="h-2.5 w-36" />
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton untuk baris tabel data pegawai
 */
export function SkeletonTableRow({
  cols = 8,
  hasAvatar = true,
  avatarCol = 1,
}: {
  cols?: number;
  hasAvatar?: boolean;
  avatarCol?: number;
}) {
  return (
    <tr className="border-none">
      {Array.from({ length: cols }).map((_, i) => {
        if (i === avatarCol && hasAvatar) {
          return (
            <td key={i} className="py-3 px-3.5 whitespace-nowrap">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-32 block" />
                  <Skeleton className="h-2.5 w-24 block" />
                </div>
              </div>
            </td>
          );
        }

        if (i === cols - 1) {
          return (
            <td key={i} className="py-3 px-3.5 text-center whitespace-nowrap">
              <Skeleton className="h-7 w-16 mx-auto block rounded-lg" />
            </td>
          );
        }

        if (i === 0 && avatarCol !== 0) {
          return (
            <td key={i} className="py-3 px-3.5 text-center whitespace-nowrap">
              <Skeleton className="h-4 w-6 mx-auto block" />
            </td>
          );
        }

        return (
          <td key={i} className="py-3 px-3.5 whitespace-nowrap">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-24 block" />
              {i % 2 === 0 && <Skeleton className="h-2.5 w-16 block" />}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

/**
 * Skeleton untuk item daftar statistik breakdown demografi di Beranda
 */
export function SkeletonBreakdownItem() {
  return (
    <div className="stat-list-item p-3 rounded-lg border border-slate-100 dark:border-slate-800/80 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-2.5 w-2.5 rounded-full" />
          <Skeleton className="h-3.5 w-28" />
        </div>
        <Skeleton className="h-3.5 w-14" />
      </div>
      <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
  );
}

