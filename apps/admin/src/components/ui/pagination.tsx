'use client'

interface PaginationProps {
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions?: number[]
  noun?: string
}

export function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
  noun = 'rows',
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  function pages(): (number | '…')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const result: (number | '…')[] = [1]
    if (page > 3) result.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) result.push(i)
    if (page < totalPages - 2) result.push('…')
    result.push(totalPages)
    return result
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 py-3 mt-2">
      <p className="text-xs text-gray-500 shrink-0">
        {total === 0 ? `No ${noun}` : `${start}–${end} of ${total} ${noun}`}
      </p>
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1) }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
        >
          {pageSizeOptions.map((s) => (
            <option key={s} value={s}>{s} / page</option>
          ))}
        </select>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          ‹
        </button>
        {pages().map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="text-xs text-gray-400 w-6 text-center">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition ${
                p === page
                  ? 'bg-orange-500 text-white'
                  : 'border border-gray-200 text-gray-600 hover:border-orange-300'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          ›
        </button>
      </div>
    </div>
  )
}
