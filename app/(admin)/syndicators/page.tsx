'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Pagination from '@/components/pagination'
import {
    Building2,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    X,
} from 'lucide-react'

type Syndicator = {
    id: string
    name: string
    placement_count: number
    manager_name: string | null
    phone: string | null
    email: string | null
    memo: string | null
    created_at: string
}

export default function SyndicatorsPage() {
    const [items, setItems] = useState<Syndicator[]>([])
    const [loading, setLoading] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editingItem, setEditingItem] = useState<Syndicator | null>(null)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [totalCount, setTotalCount] = useState(0)

    const [searchParams, setSearchParams] = useState({
        keyword: '',
    })

    const totalPages = Math.ceil(totalCount / pageSize)

    const [form, setForm] = useState({
        name: '',
        manager_name: '',
        phone: '',
        email: '',
        memo: '',
    })

    useEffect(() => {
        loadItems()
    }, [page, pageSize, searchParams])

    async function loadItems() {
        setLoading(true)

        let query = supabase
            .from('ad_syndicator_summary')
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
            setItems(data as Syndicator[])
            setTotalCount(count ?? 0)
        }

        setLoading(false)
    }

    function formatPhoneNumber(value: string) {
        const numbers = value.replace(/[^0-9]/g, '')

        if (numbers.length < 4) {
            return numbers
        }

        if (numbers.length < 8) {
            return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
        }

        return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(
            7,
            11
        )}`
    }

    function resetForm() {
        setForm({
            name: '',
            manager_name: '',
            phone: '',
            email: '',
            memo: '',
        })

        setEditingItem(null)
    }

    function openCreateModal() {
        resetForm()
        setModalOpen(true)
    }

    function openEditModal(item: Syndicator) {
        setEditingItem(item)

        setForm({
            name: item.name ?? '',
            manager_name: item.manager_name ?? '',
            phone: item.phone ?? '',
            email: item.email ?? '',
            memo: item.memo ?? '',
        })

        setModalOpen(true)
    }

    async function handleSave() {
        if (!form.name.trim()) {
            alert('신디사명을 입력해 주세요.')
            return
        }

        setSaving(true)

        const payload = {
            name: form.name.trim(),
            manager_name: form.manager_name.trim() || null,
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
            memo: form.memo.trim() || null,
        }

        const { error } = editingItem
            ? await supabase
                .from('ad_syndicators')
                .update(payload)
                .eq('id', editingItem.id)
            : await supabase.from('ad_syndicators').insert(payload)

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

    async function handleDelete(item: Syndicator) {
        const ok = confirm(`'${item.name}' 신디사를 삭제할까요?`)

        if (!ok) return

        const { error } = await supabase
            .from('ad_syndicators')
            .delete()
            .eq('id', item.id)

        if (error) {
            alert(
                '삭제 실패: 연결된 지면이 있거나 권한 문제가 있을 수 있습니다.'
            )
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
                            <h1 className="text-xl font-bold">신디사 관리</h1>
                            <p className="mt-1 text-sm text-zinc-500">
                                매체와 지면을 관리하는 신디사를 등록하고 관리합니다.
                            </p>
                        </div>

                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800"
                        >
                            <Plus size={16} />
                            신디사 등록
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
                                placeholder="신디사명 검색"
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
                                    신디사명
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">
                                    관리지면수
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    담당자
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    연락처
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    이메일
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
                                    <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                                        불러오는 중...
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                                        등록된 신디사가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="border-b border-zinc-100 hover:bg-zinc-50"
                                    >
                                        <td className="pl-6 pr-4 py-3 font-medium">{item.name}</td>
                                        <td className="px-4 py-3 text-right">
                                            {item.placement_count.toLocaleString()}개
                                        </td>
                                        <td className="px-4 py-3">{item.manager_name ?? '-'}</td>
                                        <td className="px-4 py-3">{item.phone ?? '-'}</td>
                                        <td className="px-4 py-3">{item.email ?? '-'}</td>
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
                            등록된 신디사가 없습니다.
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
                                            <Building2 size={18} />
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
                                    <div>담당자: {item.manager_name ?? '-'}</div>
                                    <div>연락처: {item.phone ?? '-'}</div>
                                    <div>이메일: {item.email ?? '-'}</div>
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
                                {editingItem ? '신디사 수정' : '신디사 등록'}
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
                                <label className="mb-1 block text-sm font-medium">
                                    신디사명 *
                                </label>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    placeholder="예: 엠플랜"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">담당자</label>
                                <input
                                    value={form.manager_name}
                                    onChange={(e) =>
                                        setForm({ ...form, manager_name: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    placeholder="담당자명"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">연락처</label>
                                <input
                                    value={form.phone}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            phone: formatPhoneNumber(e.target.value),
                                        })
                                    }
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    placeholder="010-0000-0000"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">이메일</label>
                                <input
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    placeholder="example@adrelay.kr"
                                />
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