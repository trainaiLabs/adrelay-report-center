'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Pagination from '@/components/pagination'
import {
    KeyRound,
    Pencil,
    Play,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    X,
} from 'lucide-react'

type ApiKeyItem = {
    id: string
    syndicator_id: string
    company_name: string | null
    provider_code: string
    api_key: string | null
    api_secret: string | null
    api_base_url: string | null
    is_active: boolean
    last_used_at: string | null
    last_collected_at: string | null
    last_collect_status: string | null
    last_error_message: string | null
    memo: string | null
    created_at: string
    ad_syndicators: {
        name: string
    } | null
}

type SyndicatorOption = {
    id: string
    name: string
}

export default function ApiKeysPage() {
    const [items, setItems] = useState<ApiKeyItem[]>([])
    const [syndicators, setSyndicators] = useState<SyndicatorOption[]>([])
    const [loading, setLoading] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editingItem, setEditingItem] = useState<ApiKeyItem | null>(null)
    const [collectingId, setCollectingId] = useState<string | null>(null)

    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [totalCount, setTotalCount] = useState(0)

    const [searchParams, setSearchParams] = useState({
        keyword: '',
    })

    const totalPages = Math.ceil(totalCount / pageSize)

    const [form, setForm] = useState({
        syndicator_id: '',
        company_name: '',
        provider_code: '',
        api_base_url: '',
        api_key: '',
        api_secret: '',
        is_active: true,
        memo: '',
    })

    useEffect(() => {
        loadSyndicators()
    }, [])

    useEffect(() => {
        loadItems()
    }, [page, pageSize, searchParams])

    async function loadSyndicators() {
        const { data } = await supabase
            .from('ad_syndicators')
            .select('id, name')
            .order('name')

        if (data) {
            setSyndicators(data)
        }
    }

    async function loadItems() {
        setLoading(true)

        let query = supabase
            .from('ad_syndicator_api_keys')
            .select(
                `
        id,
        syndicator_id,
        company_name,
        provider_code,
        api_key,
        api_secret,
        api_base_url,
        is_active,
        last_used_at,
        last_collected_at,
        last_collect_status,
        last_error_message,
        memo,
        created_at,
        ad_syndicators(name)
      `,
                { count: 'exact' }
            )
            .order('created_at', { ascending: false })

        if (searchParams.keyword.trim()) {
            const keywordText = searchParams.keyword.trim()

            query = query.or(
                `provider_code.ilike.%${keywordText}%,memo.ilike.%${keywordText}%`
            )
        }

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        query = query.range(from, to)

        const { data, error, count } = await query

        if (!error && data) {
            setItems(data as unknown as ApiKeyItem[])
            setTotalCount(count ?? 0)
        }

        setLoading(false)
    }

    function resetForm() {
        setForm({
            syndicator_id: '',
            company_name: '',
            provider_code: '',
            api_base_url: '',
            api_key: '',
            api_secret: '',
            is_active: true,
            memo: '',
        })

        setEditingItem(null)
    }

    function openCreateModal() {
        resetForm()
        setModalOpen(true)
    }

    function openEditModal(item: ApiKeyItem) {
        setEditingItem(item)

        setForm({
            syndicator_id: item.syndicator_id,
            company_name: item.company_name ?? '',
            provider_code: item.provider_code,
            api_base_url: item.api_base_url ?? '',
            api_key: item.api_key ?? '',
            api_secret: item.api_secret ?? '',
            is_active: item.is_active,
            memo: item.memo ?? '',
        })

        setModalOpen(true)
    }

    function maskValue(value: string | null) {
        if (!value) return '-'

        if (value.length <= 8) {
            return '********'
        }

        return `${value.slice(0, 4)}********${value.slice(-4)}`
    }

    function formatDateTime(value: string | null) {
        if (!value) return '-'

        return new Date(value).toLocaleString('ko-KR', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
        })
    }

    function getStatusBadge(status: string | null) {
        if (status === 'success') return 'bg-green-50 text-green-700'
        if (status === 'failed') return 'bg-red-50 text-red-700'
        if (status === 'running') return 'bg-blue-50 text-blue-700'
        return 'bg-zinc-100 text-zinc-500'
    }

    async function handleSave() {
        if (!form.syndicator_id) {
            alert('신디사를 선택해 주세요.')
            return
        }

        if (!form.provider_code.trim()) {
            alert('provider_code를 입력해 주세요.')
            return
        }

        setSaving(true)

        const payload = {
            syndicator_id: form.syndicator_id,
            company_name: form.company_name.trim(),
            provider_code: form.provider_code.trim(),
            api_base_url: form.api_base_url.trim() || null,
            api_key: form.api_key.trim() || null,
            api_secret: form.api_secret.trim() || null,
            is_active: form.is_active,
            memo: form.memo.trim() || null,
        }

        const { error } = editingItem
            ? await supabase
                .from('ad_syndicator_api_keys')
                .update(payload)
                .eq('id', editingItem.id)
            : await supabase.from('ad_syndicator_api_keys').insert(payload)

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

    async function handleDelete(item: ApiKeyItem) {
        const ok = confirm(
            `'${item.ad_syndicators?.name ?? '-'} / ${item.provider_code}' API KEY를 삭제할까요?`
        )

        if (!ok) return

        const { error } = await supabase
            .from('ad_syndicator_api_keys')
            .delete()
            .eq('id', item.id)

        if (error) {
            alert(`삭제 실패: ${error.message}`)
            return
        }

        alert('삭제되었습니다.')
        loadItems()
    }

    async function handleCollect(item: ApiKeyItem) {
        const startDate = prompt('수집 시작일을 입력해 주세요. 예: 2026-05-12')

        if (!startDate) return

        const endDate = prompt('수집 종료일을 입력해 주세요. 예: 2026-05-21', startDate)

        if (!endDate) return

        setCollectingId(item.id)

        try {
            const response = await fetch('/api/collect-api-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiKeyId: item.id,
                    startDate,
                    endDate,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                alert(`수집 실패: ${result.error}`)
                return
            }

            alert(
                `수집 완료: ${result.rawCount ?? 0}건\n리포트 생성: ${result.reportCount ?? 0
                }건`
            )

            loadItems()
        } catch (error) {
            console.error(error)
            alert('수집 처리 중 오류가 발생했습니다.')
        } finally {
            setCollectingId(null)
        }
    }

    return (
        <main className="min-h-screen bg-zinc-50 px-4 py-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="text-xl font-bold">API KEY 관리</h1>
                            <p className="mt-1 text-sm text-zinc-500">
                                신디사별 외부 광고 API 인증 정보와 수집 상태를 관리합니다.
                            </p>
                        </div>

                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800"
                        >
                            <Plus size={16} />
                            API KEY 등록
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
                                placeholder="provider_code 또는 메모 검색"
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
                                    신디사
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    provider_code
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    API URL
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    API KEY
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    SECRET
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">
                                    상태
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    최근수집
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    비고
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">
                                    관리
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">
                                        불러오는 중...
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">
                                        등록된 API KEY가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="border-b border-zinc-100 hover:bg-zinc-50"
                                    >
                                        <td className="pl-6 pr-4 py-3 font-medium">
                                            {item.ad_syndicators?.name ?? '-'}
                                        </td>
                                        <td className="px-4 py-3">{item.provider_code}</td>
                                        <td className="max-w-[140px] px-4 py-3">
                                            <div
                                                className="truncate"
                                                title={item.api_base_url ?? ''}
                                            >
                                                {item.api_base_url ?? '-'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{maskValue(item.api_key)}</td>
                                        <td className="px-4 py-3">{maskValue(item.api_secret)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span
                                                    className={`rounded-full px-2 py-1 text-xs ${item.is_active
                                                        ? 'bg-green-50 text-green-700'
                                                        : 'bg-zinc-100 text-zinc-500'
                                                        }`}
                                                >
                                                    {item.is_active ? '활성' : '비활성'}
                                                </span>

                                                {item.last_collect_status && (
                                                    <span
                                                        className={`rounded-full px-2 py-1 text-xs ${getStatusBadge(
                                                            item.last_collect_status
                                                        )}`}
                                                    >
                                                        {item.last_collect_status}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>{formatDateTime(item.last_collected_at)}</div>
                                            {item.last_error_message && (
                                                <div className="mt-1 text-xs text-red-600">
                                                    {item.last_error_message}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">{item.memo ?? '-'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleCollect(item)}
                                                    disabled={collectingId === item.id || !item.is_active}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-50"
                                                >
                                                    <Play size={14} />
                                                    {collectingId === item.id ? '수집중' : '수집'}
                                                </button>

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
                            등록된 API KEY가 없습니다.
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                            >
                                <div className="mb-3 flex items-start gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                                        <KeyRound size={18} />
                                    </div>

                                    <div>
                                        <div className="font-semibold">
                                            {item.ad_syndicators?.name ?? '-'}
                                        </div>
                                        <div className="text-sm text-zinc-500">
                                            {item.provider_code}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-zinc-600">
                                    <div className="flex gap-1">
                                        <span className="font-medium">URL:</span>

                                        <span
                                            className="truncate"
                                            title={item.api_base_url ?? ''}
                                        >
                                            {item.api_base_url ?? '-'}
                                        </span>
                                    </div>
                                    <div>API KEY: {maskValue(item.api_key)}</div>
                                    <div>SECRET: {maskValue(item.api_secret)}</div>
                                    <div>최근수집: {formatDateTime(item.last_collected_at)}</div>
                                    {item.last_error_message && (
                                        <div className="text-red-600">
                                            오류: {item.last_error_message}
                                        </div>
                                    )}
                                    <div>비고: {item.memo ?? '-'}</div>
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={() => handleCollect(item)}
                                        disabled={collectingId === item.id || !item.is_active}
                                        className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
                                    >
                                        <Play size={14} />
                                        {collectingId === item.id ? '수집중' : '수집'}
                                    </button>

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
                                {editingItem ? 'API KEY 수정' : 'API KEY 등록'}
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
                                <label className="mb-1 block text-sm font-medium text-zinc-700">
                                    회사명
                                </label>

                                <input
                                    value={form.company_name}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            company_name: e.target.value,
                                        }))
                                    }
                                    placeholder="예: 코지마망"
                                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    provider_code *
                                </label>
                                <input
                                    value={form.provider_code}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            provider_code: e.target.value
                                                .toLowerCase()
                                                .replace(/[^a-z0-9_]/g, ''),
                                        })
                                    }
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    placeholder="예: coupang"
                                />
                                <p className="mt-1 text-xs text-zinc-400">
                                    영문 소문자, 숫자, 언더바만 사용합니다.
                                </p>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">API URL</label>
                                <input
                                    value={form.api_base_url}
                                    onChange={(e) =>
                                        setForm({ ...form, api_base_url: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    placeholder="https://api.example.com"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">API KEY</label>
                                <input
                                    value={form.api_key}
                                    onChange={(e) =>
                                        setForm({ ...form, api_key: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    placeholder="API KEY"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">API SECRET</label>
                                <input
                                    value={form.api_secret}
                                    onChange={(e) =>
                                        setForm({ ...form, api_secret: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    placeholder="API SECRET"
                                />
                            </div>

                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={(e) =>
                                        setForm({ ...form, is_active: e.target.checked })
                                    }
                                />
                                활성화
                            </label>

                            <div>
                                <label className="mb-1 block text-sm font-medium">비고</label>
                                <textarea
                                    value={form.memo}
                                    onChange={(e) => setForm({ ...form, memo: e.target.value })}
                                    className="min-h-20 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
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