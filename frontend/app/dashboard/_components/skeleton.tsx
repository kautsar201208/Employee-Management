import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Komponen dasar Skeleton dengan efek shimmer gelombang kilauan cahaya
 */
export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer rounded-md ${className}`}
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
    <tr className="border-b border-slate-100 dark:border-slate-800/60">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-3.5 whitespace-nowrap">
          {i === avatarCol && hasAvatar ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            </div>
          ) : i === cols - 1 ? (
            <Skeleton className="h-7 w-16 mx-auto rounded-lg" />
          ) : i === 0 && avatarCol !== 0 ? (
            <Skeleton className="h-4 w-6 mx-auto" />
          ) : (
            <div className="space-y-1">
              <Skeleton className="h-3.5 w-20" />
              {i % 2 === 0 && <Skeleton className="h-2.5 w-14" />}
            </div>
          )}
        </td>
      ))}
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

