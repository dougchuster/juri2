"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export default function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "Nenhum registro encontrado",
  pagination,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366f1]"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg p-8">
        <p className="text-center text-[#64748b]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.08)]">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-6 py-4 text-left text-sm font-semibold text-[#e2e8f0]"
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={`${(row as any).id || idx}`}
                className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[#252530] transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className="px-6 py-4 text-sm text-[#c7d2e0]"
                  >
                    {col.render
                      ? col.render((row as any)[col.key as string], row)
                      : (row as any)[col.key as string]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a24] border border-[rgba(255,255,255,0.08)] rounded-lg">
          <div className="text-sm text-[#64748b]">
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} registros)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.page === 1}
              className="p-2 hover:bg-[#252530] disabled:opacity-50 disabled:cursor-not-allowed rounded text-[#64748b]"
              title="Primeira página"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 hover:bg-[#252530] disabled:opacity-50 disabled:cursor-not-allowed rounded text-[#64748b]"
              title="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="p-2 hover:bg-[#252530] disabled:opacity-50 disabled:cursor-not-allowed rounded text-[#64748b]"
              title="Próxima página"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.totalPages)}
              disabled={pagination.page === pagination.totalPages}
              className="p-2 hover:bg-[#252530] disabled:opacity-50 disabled:cursor-not-allowed rounded text-[#64748b]"
              title="Última página"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
