'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Pagination from '@/components/pagination'
import {
    Globe,
    Newspaper,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    X,
} from 'lucide-react'

type MediaCompany = {
    id: string
    name: string
    homepage: string | null
    placement_count: number
    memo: string | null
    created_at: string
}

export default function MediaPage() {
    const [items, setItems] = useState<MediaCompany[]>([])
    const [loading, setLoading] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editingItem, setEditingItem] = useState<MediaCompany | null>(null)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [totalCount, setTotalCount] = useState(0)

    const [searchParams, setSearchParams] = useState({
        keyword: '',
    })

    const totalPages = Math.ceil(totalCount / pageSize)

    const [form, setForm] = useState({
        name: '',
        homepage: '',
        memo: '',
    })

    useEffect(() => {
        loadItems()
    }, [page, pageSize, searchParams])

    async function loadItems() {
        setLoading(true)

        let query = supabase
            .from('ad_media_company_summary')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })

        if (searchParams.keyword.trim()) {
            query = query.ilike('name', `%${searchParams.keyword.trim()}%`)
        }

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        query = query.range(from, to)

        const { data, error, count } = await query

        if (!error && data) {
            setItems(data as MediaCompany[])
            setTotalCount(count ?? 0)
        }

        setLoading(false)
    }

    function resetForm() {
        setForm({
            name: '',
            homepage: '',
            memo: '',
        })

        setEditingItem(null)
    }

    function openCreateModal() {
        resetForm()
        setModalOpen(true)
    }

    function openEditModal(item: MediaCompany) {
        setEditingItem(item)

        setForm({
            name: item.name ?? '',
            homepage: item.homepage ?? '',
            memo: item.memo ?? '',
        })

        setModalOpen(true)
    }

    function normalizeHomepage(value: string) {
        const trimmed = value.trim()

        if (!trimmed) return null

        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return trimmed
        }

        return `https://${trimmed}`
    }

    async function handleSave() {
        if (!form.name.trim()) {
            alert('매체명을 입력해 주세요.')
            return
        }

        setSaving(true)

        const payload = {
            name: form.name.trim(),
            homepage: normalizeHomepage(form.homepage),
            memo: form.memo.trim() || null,
        }

        const { error } = editingItem
            ? await supabase
                .from('ad_media_companies')
                .update(payload)
                .eq('id', editingItem.id)
            : await supabase.from('ad_media_companies').insert(payload)

        setSaving(false)

        if (error) {
            alert(`저장 실패: ${error.message}`)
            return
        }

        resetForm()
        setModalOpen(false)
        setPage(1)
        setSearchParams({ keyword })
    }

    async function handleDelete(item: MediaCompany) {
        const ok = confirm(`'${item.name}' 매체를 삭제할까요?`)

        if (!ok) return

        const { error } = await supabase
            .from('ad_media_companies')
            .delete()
            .eq('id', item.id)

        if (error) {
            alert('삭제 실패: 연결된 지면이 있거나 권한 문제가 있을 수 있습니다.')
            return
        }

        loadItems()
    }

    return (
        <main className="min-h-screen bg-zinc-50 px-4 py-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="text-xl font-bold">매체 관리</h1>
                            <p className="mt-1 text-sm text-zinc-500">
                                광고가 노출되는 매체사를 관리합니다.
                            </p>
                        </div>

                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800"
                        >
                            <Plus size={16} />
                            매체 등록
                        </button>
                    </div>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row">
                        <div className="relative flex-1">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                            />

                            <input
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setPage(1)
                                        setSearchParams({ keyword })
                                    }
                                }}
                                placeholder="매체명 검색"
                                className="w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm"
                            />
                        </div>

                        <button
                            onClick={() => {
                                setPage(1)
                                setSearchParams({ keyword })
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800"
                        >
                            <Search size={16} />
                            검색
                        </button>

                        <button
                            onClick={() => {
                                setKeyword('')
                                setPage(1)
                                setSearchParams({ keyword: '' })
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
                        >
                            <RefreshCw size={16} />
                            초기화
                        </button>
                    </div>
                </section>

                <section className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:block">
                    <table className="w-full text-sm">
                        <thead className="border-b border-zinc-200 bg-zinc-100 text-zinc-600">
                            <tr>
                                <th className="pl-6 pr-4 py-3 text-left text-sm font-semibold">
                                    매체명
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    홈페이지
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">
                                    관리지면수
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    비고
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    등록일
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">
                                    관리
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                                        불러오는 중...
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                                        등록된 매체가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="border-b border-zinc-100 hover:bg-zinc-50"
                                    >
                                        <td className="pl-6 pr-4 py-3 font-medium">{item.name}</td>

                                        <td className="px-4 py-3">
                                            {item.homepage ? (
                                                <a
                                                    href={item.homepage}
                                                    target="_blank"
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {item.homepage}
                                                </a>
                                            ) : (
                                                '-'
                                            )}
                                        </td>

                                        <td className="px-4 py-3 text-right">
                                            {item.placement_count.toLocaleString()}개
                                        </td>

                                        <td className="px-4 py-3">{item.memo ?? '-'}</td>
                                        <td className="px-4 py-3">{item.created_at?.slice(0, 10)}</td>

                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(item)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50"
                                                >
                                                    <Pencil size={14} />
                                                    수정
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 size={14} />
                                                    삭제
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </section>

                <section className="space-y-3 lg:hidden">
                    {items.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500 shadow-sm">
                            등록된 매체가 없습니다.
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                            >
                                <div className="mb-3 flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                                            <Newspaper size={18} />
                                        </div>

                                        <div>
                                            <div className="font-semibold">{item.name}</div>
                                            <div className="text-sm text-zinc-500">
                                                관리지면 {item.placement_count}개
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1 text-sm text-zinc-600">
                                    <div className="flex items-center gap-2">
                                        <Globe size={14} />
                                        {item.homepage ?? '-'}
                                    </div>

                                    <div>비고: {item.memo ?? '-'}</div>
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={() => openEditModal(item)}
                                        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                                    >
                                        <Pencil size={14} />
                                        수정
                                    </button>

                                    <button
                                        onClick={() => handleDelete(item)}
                                        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 size={14} />
                                        삭제
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </section>
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                        setPageSize(size)
                        setPage(1)
                    }}
                />
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                            <h2 className="font-semibold">
                                {editingItem ? '매체 수정' : '매체 등록'}
                            </h2>

                            <button
                                onClick={() => {
                                    resetForm()
                                    setModalOpen(false)
                                }}
                                className="rounded-lg p-1 hover:bg-zinc-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4 p-5">
                            <div>
                                <label className="mb-1 block text-sm font-medium">매체명 *</label>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    placeholder="예: 국제뉴스"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">홈페이지</label>
                                <input
                                    value={form.homepage}
                                    onChange={(e) =>
                                        setForm({ ...form, homepage: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    placeholder="예: gukjenews.com"
                                />
                                <p className="mt-1 text-xs text-zinc-400">
                                    http:// 또는 https:// 없이 입력해도 자동으로 보정됩니다.
                                </p>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">비고</label>
                                <textarea
                                    value={form.memo}
                                    onChange={(e) => setForm({ ...form, memo: e.target.value })}
                                    className="min-h-24 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    placeholder="메모"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4">
                            <button
                                onClick={() => {
                                    resetForm()
                                    setModalOpen(false)
                                }}
                                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
                            >
                                취소
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                            >
                                {saving ? '저장 중...' : editingItem ? '수정 저장' : '저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}