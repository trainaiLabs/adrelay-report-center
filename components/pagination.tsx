'use client'

type Props = {
    page: number
    totalPages: number
    totalCount: number
    pageSize: number
    onPageChange: (page: number) => void
    onPageSizeChange: (size: number) => void
}

export default function Pagination({
    page,
    totalPages,
    totalCount,
    pageSize,
    onPageChange,
    onPageSizeChange,
}: Props) {
    if (totalPages <= 0) return null

    const pages = []

    const startPage = Math.max(1, page - 2)
    const endPage = Math.min(totalPages, page + 2)

    for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
    }

    return (
        <div className="flex flex-col gap-4 border-t border-zinc-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-zinc-500">
                총 <span className="font-semibold">{totalCount.toLocaleString()}</span>
                건 · {page} / {totalPages} 페이지
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                >
                    <option value={10}>10개씩</option>
                    <option value={20}>20개씩</option>
                    <option value={50}>50개씩</option>
                    <option value={100}>100개씩</option>
                </select>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1}
                        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-40"
                    >
                        이전
                    </button>

                    {startPage > 1 && (
                        <>
                            <button
                                onClick={() => onPageChange(1)}
                                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                            >
                                1
                            </button>

                            {startPage > 2 && (
                                <span className="px-2 text-sm text-zinc-400">...</span>
                            )}
                        </>
                    )}

                    {pages.map((pageNumber) => (
                        <button
                            key={pageNumber}
                            onClick={() => onPageChange(pageNumber)}
                            className={`rounded-lg px-3 py-2 text-sm ${pageNumber === page
                                ? 'bg-black text-white'
                                : 'border border-zinc-200 hover:bg-zinc-50'
                                }`}
                        >
                            {pageNumber}
                        </button>
                    ))}

                    {endPage < totalPages && (
                        <>
                            {endPage < totalPages - 1 && (
                                <span className="px-2 text-sm text-zinc-400">...</span>
                            )}

                            <button
                                onClick={() => onPageChange(totalPages)}
                                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                            >
                                {totalPages}
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= totalPages}
                        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-40"
                    >
                        다음
                    </button>
                </div>
            </div>
        </div>
    )
}