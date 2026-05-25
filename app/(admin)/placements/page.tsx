'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Pagination from '@/components/pagination'
import {
    LayoutGrid,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    X,
} from 'lucide-react'

type Placement = {
    id: string
    name: string
    revenue_option: string
    revenue_option_value: number
    memo: string | null
    created_at: string
    syndicator_id: string
    media_company_id: string

    ad_syndicators: {
        name: string
    } | null

    ad_media_companies: {
        name: string
    } | null
}

type SyndicatorOption = {
    id: string
    name: string
}

type MediaOption = {
    id: string
    name: string
}

export default function PlacementsPage() {
    const [items, setItems] = useState<Placement[]>([])
    const [loading, setLoading] = useState(false)
    const [keyword, setKeyword] = useState('')

    const [modalOpen, setModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [totalCount, setTotalCount] = useState(0)

    const [searchParams, setSearchParams] = useState({
        keyword: '',
    })

    const totalPages = Math.ceil(totalCount / pageSize)

    const [editingItem, setEditingItem] =
        useState<Placement | null>(null)

    const [syndicators, setSyndicators] = useState<
        SyndicatorOption[]
    >([])

    const [mediaCompanies, setMediaCompanies] = useState<
        MediaOption[]
    >([])

    const [form, setForm] = useState({
        name: '',
        syndicator_id: '',
        media_company_id: '',
        revenue_option: 'CPM',
        revenue_option_value: '',
        memo: '',
    })

    useEffect(() => {
        loadOptions()
    }, [])

    useEffect(() => {
        loadItems()
    }, [page, pageSize, searchParams])

    async function loadItems() {
        setLoading(true)

        let query = supabase
            .from('ad_placements')
            .select(
                `
      id,
      syndicator_id,
      media_company_id,
      name,
      revenue_option,
      revenue_option_value,
      memo,
      created_at,
      ad_syndicators(name),
      ad_media_companies(name)
    `,
                { count: 'exact' }
            )
            .order('created_at', { ascending: false })

        if (searchParams.keyword.trim()) {
            query = query.ilike('name', `%${searchParams.keyword.trim()}%`)
        }

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        query = query.range(from, to)

        const { data, error, count } = await query

        if (!error && data) {
            setItems(data as unknown as Placement[])
            setTotalCount(count ?? 0)
        }

        setLoading(false)
    }

    async function loadOptions() {
        const { data: syndicatorData } = await supabase
            .from('ad_syndicators')
            .select('id, name')
            .order('name')

        const { data: mediaData } = await supabase
            .from('ad_media_companies')
            .select('id, name')
            .order('name')

        if (syndicatorData) {
            setSyndicators(syndicatorData)
        }

        if (mediaData) {
            setMediaCompanies(mediaData)
        }
    }

    function formatRevenueValue(
        option: string,
        value: number
    ) {
        if (option === 'CPS') {
            return `${value}%`
        }

        return `${Number(value).toLocaleString()}원`
    }

    function resetForm() {
        setForm({
            name: '',
            syndicator_id: '',
            media_company_id: '',
            revenue_option: 'CPM',
            revenue_option_value: '',
            memo: '',
        })

        setEditingItem(null)
    }

    function openCreateModal() {
        resetForm()
        setModalOpen(true)
    }

    function openEditModal(item: Placement) {
        setEditingItem(item)

        setForm({
            name: item.name ?? '',
            syndicator_id: item.syndicator_id,
            media_company_id: item.media_company_id,
            revenue_option: item.revenue_option ?? 'CPM',
            revenue_option_value: String(item.revenue_option_value ?? ''),
            memo: item.memo ?? '',
        })

        setModalOpen(true)
    }

    async function handleDelete(item: Placement) {
        const ok = confirm(`'${item.name}' 지면을 삭제할까요?`)

        if (!ok) return

        const { error } = await supabase
            .from('ad_placements')
            .delete()
            .eq('id', item.id)

        if (error) {
            alert('삭제 실패: 연결된 리포트가 있거나 권한 문제가 있을 수 있습니다.')
            return
        }

        loadItems()
    }

    async function handleSave() {
        if (!form.name.trim()) {
            alert('지면명을 입력해 주세요.')
            return
        }

        if (!form.syndicator_id) {
            alert('신디사를 선택해 주세요.')
            return
        }

        if (!form.media_company_id) {
            alert('매체를 선택해 주세요.')
            return
        }

        setSaving(true)

        const payload = {
            name: form.name.trim(),
            syndicator_id: form.syndicator_id,
            media_company_id: form.media_company_id,
            revenue_option: form.revenue_option,
            revenue_option_value: Number(
                form.revenue_option_value || 0
            ),
            memo: form.memo.trim() || null,
        }

        const { error } = editingItem
            ? await supabase
                .from('ad_placements')
                .update(payload)
                .eq('id', editingItem.id)
            : await supabase.from('ad_placements').insert(payload)

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

    return (
        <main className="min-h-screen bg-zinc-50 px-4 py-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="text-xl font-bold">지면 관리</h1>

                            <p className="mt-1 text-sm text-zinc-500">
                                광고 지면과 단가 및 신디사를 관리합니다.
                            </p>
                        </div>

                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800">
                            <Plus size={16} />
                            지면 등록
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
                                placeholder="지면명 검색"
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

                <section className="hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:block">
                    <table className="w-full text-sm leading-tight">
                        <thead className="border-b border-zinc-200 bg-zinc-100 text-zinc-600">
                            <tr>
                                <th className="pl-10 pr-4 py-3 text-left text-sm font-semibold">지면명</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">신디사명</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">매체명</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">매출옵션</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">단가 / %</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">비고</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">등록일</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">관리</th>
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
                                        등록된 지면이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr key={item.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                                        <td className="pl-6 pr-4 py-3 font-medium">
                                            {item.name}
                                        </td>

                                        <td className="px-4 py-3">
                                            {item.ad_syndicators?.name ?? '-'}
                                        </td>

                                        <td className="px-4 py-3">
                                            {item.ad_media_companies?.name ?? '-'}
                                        </td>

                                        <td className="px-4 py-3">
                                            {item.revenue_option}
                                        </td>

                                        <td className="px-4 py-3 text-right font-medium">
                                            {formatRevenueValue(
                                                item.revenue_option,
                                                item.revenue_option_value
                                            )}
                                        </td>

                                        <td className="px-4 py-3">
                                            {item.memo ?? '-'}
                                        </td>

                                        <td className="px-4 py-3">
                                            {item.created_at?.slice(0, 10)}
                                        </td>
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
                            등록된 지면이 없습니다.
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
                                            <LayoutGrid size={18} />
                                        </div>

                                        <div>
                                            <div className="font-semibold">
                                                {item.name}
                                            </div>

                                            <div className="text-sm text-zinc-500">
                                                {item.ad_media_companies?.name ?? '-'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-black px-2 py-1 text-xs text-white">
                                        {item.revenue_option}
                                    </div>
                                </div>

                                <div className="space-y-1 text-sm text-zinc-600">
                                    <div>
                                        신디사: {item.ad_syndicators?.name ?? '-'}
                                    </div>

                                    <div>
                                        단가:
                                        {' '}
                                        {formatRevenueValue(
                                            item.revenue_option,
                                            item.revenue_option_value
                                        )}
                                    </div>

                                    <div>
                                        비고: {item.memo ?? '-'}
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
                                {editingItem ? '지면 수정' : '지면 등록'}
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
                                <label className="mb-1 block text-sm font-medium">지면명 *</label>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    placeholder="예: 국제뉴스상단"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">신디사 *</label>
                                <select
                                    value={form.syndicator_id}
                                    onChange={(e) =>
                                        setForm({ ...form, syndicator_id: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                >
                                    <option value="">신디사 선택</option>
                                    {syndicators.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">매체 *</label>
                                <select
                                    value={form.media_company_id}
                                    onChange={(e) =>
                                        setForm({ ...form, media_company_id: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                >
                                    <option value="">매체 선택</option>
                                    {mediaCompanies.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium">매출옵션 *</label>
                                    <select
                                        value={form.revenue_option}
                                        onChange={(e) =>
                                            setForm({ ...form, revenue_option: e.target.value })
                                        }
                                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    >
                                        <option value="CPM">CPM</option>
                                        <option value="CPC">CPC</option>
                                        <option value="CPS">CPS</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium">
                                        {form.revenue_option === 'CPS' ? '수수료율 %' : '단가'}
                                    </label>
                                    <input
                                        type="number"
                                        value={form.revenue_option_value}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                revenue_option_value: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                        placeholder={form.revenue_option === 'CPS' ? '예: 15' : '예: 3000'}
                                    />
                                </div>
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