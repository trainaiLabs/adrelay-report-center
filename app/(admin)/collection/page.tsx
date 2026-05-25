'use client'

import { useEffect, useState } from 'react'
import Pagination from '@/components/pagination'
import { supabase } from '@/lib/supabase/client'
import {
    DatabaseZap,
    Pencil,
    Play,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    X,
} from 'lucide-react'

type ApiSource = {
    id: string
    name: string
    provider_code: string
    api_base_url: string | null
    api_key: string | null
    api_secret: string | null
    is_active: boolean
    memo: string | null
    created_at: string
}

type CollectionJob = {
    id: string
    target_start_date: string
    target_end_date: string
    status: string
    success_count: number
    failed_count: number
    error_message: string | null
    started_at: string | null
    finished_at: string | null
    created_at: string
    ad_external_api_sources: {
        name: string
    } | null
}

export default function CollectionPage() {
    const [items, setItems] = useState<ApiSource[]>([])
    const [loading, setLoading] = useState(false)
    const [keyword, setKeyword] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editingItem, setEditingItem] = useState<ApiSource | null>(null)
    const [collectingId, setCollectingId] = useState<string | null>(null)
    const [jobs, setJobs] = useState<CollectionJob[]>([])
    const [jobsLoading, setJobsLoading] = useState(false)
    const [jobPage, setJobPage] = useState(1)
    const [jobPageSize, setJobPageSize] = useState(20)
    const [jobTotalCount, setJobTotalCount] = useState(0)

    const jobTotalPages = Math.ceil(jobTotalCount / jobPageSize)

    const [searchParams, setSearchParams] = useState({
        keyword: '',
    })

    const [form, setForm] = useState({
        name: '',
        provider_code: '',
        api_base_url: '',
        api_key: '',
        api_secret: '',
        is_active: true,
        memo: '',
    })

    useEffect(() => {
        loadItems()
    }, [searchParams])

    useEffect(() => {
        loadJobs()
    }, [jobPage, jobPageSize])

    async function loadItems() {
        setLoading(true)

        let query = supabase
            .from('ad_external_api_sources')
            .select('*')
            .order('created_at', { ascending: false })

        if (searchParams.keyword.trim()) {
            query = query.or(
                `name.ilike.%${searchParams.keyword.trim()}%,provider_code.ilike.%${searchParams.keyword.trim()}%`
            )
        }

        const { data, error } = await query

        if (!error && data) {
            setItems(data as ApiSource[])
        }

        setLoading(false)
    }

    async function loadJobs() {
        setJobsLoading(true)

        let query = supabase
            .from('ad_collection_jobs')
            .select(
                `
      id,
      target_start_date,
      target_end_date,
      status,
      success_count,
      failed_count,
      error_message,
      started_at,
      finished_at,
      created_at,
      ad_external_api_sources(name)
    `,
                { count: 'exact' }
            )
            .order('created_at', { ascending: false })

        const from = (jobPage - 1) * jobPageSize
        const to = from + jobPageSize - 1

        query = query.range(from, to)

        const { data, error, count } = await query

        if (!error && data) {
            setJobs(data as unknown as CollectionJob[])
            setJobTotalCount(count ?? 0)
        }

        setJobsLoading(false)
    }

    function resetForm() {
        setForm({
            name: '',
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

    function openEditModal(item: ApiSource) {
        setEditingItem(item)

        setForm({
            name: item.name ?? '',
            provider_code: item.provider_code ?? '',
            api_base_url: item.api_base_url ?? '',
            api_key: item.api_key ?? '',
            api_secret: item.api_secret ?? '',
            is_active: item.is_active,
            memo: item.memo ?? '',
        })

        setModalOpen(true)
    }

    async function handleSave() {
        if (!form.name.trim()) {
            alert('회사명을 입력해 주세요.')
            return
        }

        if (!form.provider_code.trim()) {
            alert('provider_code를 입력해 주세요.')
            return
        }

        setSaving(true)

        const payload = {
            name: form.name.trim(),
            provider_code: form.provider_code.trim(),
            api_base_url: form.api_base_url.trim() || null,
            api_key: form.api_key.trim() || null,
            api_secret: form.api_secret.trim() || null,
            is_active: form.is_active,
            memo: form.memo.trim() || null,
        }

        const { error } = editingItem
            ? await supabase
                .from('ad_external_api_sources')
                .update(payload)
                .eq('id', editingItem.id)
            : await supabase.from('ad_external_api_sources').insert(payload)

        setSaving(false)

        if (error) {
            alert(`저장 실패: ${error.message}`)
            return
        }

        resetForm()
        setModalOpen(false)
        setSearchParams({ keyword })
    }

    function getStatusBadge(status: string) {
        if (status === 'success') {
            return 'bg-green-50 text-green-700'
        }

        if (status === 'failed') {
            return 'bg-red-50 text-red-700'
        }

        if (status === 'running') {
            return 'bg-blue-50 text-blue-700'
        }

        return 'bg-zinc-100 text-zinc-500'
    }

    function formatDateTime(value: string | null) {
        if (!value) return '-'

        return new Date(value).toLocaleString('ko-KR', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    async function handleDelete(item: ApiSource) {
        const ok = confirm(`'${item.name}' API 소스를 삭제할까요?`)

        if (!ok) return

        const { error } = await supabase
            .from('ad_external_api_sources')
            .delete()
            .eq('id', item.id)

        if (error) {
            alert('삭제 실패: 연결된 원본 데이터가 있거나 권한 문제가 있을 수 있습니다.')
            return
        }

        loadItems()
    }

    async function handleCollectTest(item: ApiSource) {
        const targetDate = prompt('수집할 날짜를 입력해 주세요. 예: 2026-05-18')

        if (!targetDate) return

        setCollectingId(item.id)

        try {
            const collectResponse = await fetch('/api/collect-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceId: item.id,
                    targetDate,
                }),
            })

            const collectResult = await collectResponse.json()

            if (!collectResponse.ok) {
                alert(`수집 실패: ${collectResult.error}`)
                return
            }

            const processResponse = await fetch('/api/process-raw-reports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceId: item.id,
                    targetDate,
                }),
            })

            const processResult = await processResponse.json()

            if (!processResponse.ok) {
                alert(`리포트 생성 실패: ${processResult.error}`)
                return
            }

            alert(
                `수집 완료: ${collectResult.count}건\n리포트 생성: ${processResult.count}건`
            )

            loadJobs()

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
                            <h1 className="text-xl font-bold">데이터 수집 관리</h1>
                            <p className="mt-1 text-sm text-zinc-500">
                                외부 API 소스를 등록하고 자동/수동 수집을 관리합니다.
                            </p>
                        </div>

                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800"
                        >
                            <Plus size={16} />
                            API 소스 등록
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
                                        setSearchParams({ keyword })
                                    }
                                }}
                                placeholder="회사명 또는 provider_code 검색"
                                className="w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm"
                            />
                        </div>

                        <button
                            onClick={() => {
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
                    <table className="w-full min-w-[960px] text-sm">
                        <thead className="border-b border-zinc-200 bg-zinc-100 text-zinc-600">
                            <tr>
                                <th className="pl-6 pr-4 py-3 text-left text-sm font-semibold">
                                    회사명
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
                                <th className="px-4 py-3 text-center text-sm font-semibold">
                                    상태
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
                                    <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                                        불러오는 중...
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                                        등록된 API 소스가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="border-b border-zinc-100 hover:bg-zinc-50"
                                    >
                                        <td className="pl-6 pr-4 py-3 font-medium">{item.name}</td>
                                        <td className="px-4 py-3">{item.provider_code}</td>
                                        <td className="px-4 py-3">{item.api_base_url ?? '-'}</td>
                                        <td className="px-4 py-3">
                                            {item.api_key ? '등록됨' : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span
                                                className={`rounded-full px-2 py-1 text-xs ${item.is_active
                                                    ? 'bg-green-50 text-green-700'
                                                    : 'bg-zinc-100 text-zinc-500'
                                                    }`}
                                            >
                                                {item.is_active ? '활성' : '비활성'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{item.created_at?.slice(0, 10)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleCollectTest(item)}
                                                    disabled={collectingId === item.id}
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
                            등록된 API 소스가 없습니다.
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                            >
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                                            <DatabaseZap size={18} />
                                        </div>

                                        <div>
                                            <div className="font-semibold">{item.name}</div>
                                            <div className="text-sm text-zinc-500">
                                                {item.provider_code}
                                            </div>
                                        </div>
                                    </div>

                                    <span
                                        className={`rounded-full px-2 py-1 text-xs ${item.is_active
                                            ? 'bg-green-50 text-green-700'
                                            : 'bg-zinc-100 text-zinc-500'
                                            }`}
                                    >
                                        {item.is_active ? '활성' : '비활성'}
                                    </span>
                                </div>

                                <div className="space-y-1 text-sm text-zinc-600">
                                    <div>API URL: {item.api_base_url ?? '-'}</div>
                                    <div>API KEY: {item.api_key ? '등록됨' : '-'}</div>
                                    <div>비고: {item.memo ?? '-'}</div>
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={() => handleCollectTest(item)}
                                        disabled={collectingId === item.id}
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
                <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                        <div>
                            <h2 className="font-semibold">최근 수집 기록</h2>
                            <p className="mt-1 text-sm text-zinc-500">
                                최근 실행된 데이터 수집 작업 상태입니다.
                            </p>
                        </div>

                        <button
                            onClick={loadJobs}
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                        >
                            <RefreshCw size={16} />
                            새로고침
                        </button>
                    </div>

                    <div className="hidden overflow-x-auto lg:block">
                        <table className="w-full min-w-[960px] text-sm">
                            <thead className="border-b border-zinc-200 bg-zinc-100 text-zinc-600">
                                <tr>
                                    <th className="pl-6 pr-4 py-3 text-left text-sm font-semibold">
                                        외부회사
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">
                                        대상기간
                                    </th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold">
                                        상태
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold">
                                        성공
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold">
                                        실패
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">
                                        시작시간
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">
                                        종료시간
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">
                                        실패사유
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {jobsLoading ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                                            불러오는 중...
                                        </td>
                                    </tr>
                                ) : jobs.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                                            수집 기록이 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    jobs.map((job) => (
                                        <tr
                                            key={job.id}
                                            className="border-b border-zinc-100 hover:bg-zinc-50"
                                        >
                                            <td className="pl-6 pr-4 py-3 font-medium">
                                                {job.ad_external_api_sources?.name ?? '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {job.target_start_date === job.target_end_date
                                                    ? job.target_start_date
                                                    : `${job.target_start_date} ~ ${job.target_end_date}`}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={`rounded-full px-2 py-1 text-xs ${getStatusBadge(
                                                        job.status
                                                    )}`}
                                                >
                                                    {job.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {job.success_count.toLocaleString()}
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                {job.failed_count.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {formatDateTime(job.started_at)}
                                            </td>

                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {formatDateTime(job.finished_at)}
                                            </td>
                                            <td className="max-w-[360px] px-4 py-3 text-red-600">
                                                {job.error_message ? (
                                                    <button
                                                        onClick={() => alert(job.error_message)}
                                                        className="block max-w-[360px] truncate text-left hover:underline"
                                                        title="클릭해서 전체 오류 보기"
                                                    >
                                                        {job.error_message}
                                                    </button>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-3 p-4 lg:hidden">
                        {jobs.length === 0 ? (
                            <div className="rounded-xl bg-zinc-50 p-4 text-center text-sm text-zinc-500">
                                수집 기록이 없습니다.
                            </div>
                        ) : (
                            jobs.map((job) => (
                                <div
                                    key={job.id}
                                    className="rounded-xl border border-zinc-200 bg-white p-4"
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <div className="font-medium">
                                            {job.ad_external_api_sources?.name ?? '-'}
                                        </div>

                                        <span
                                            className={`rounded-full px-2 py-1 text-xs ${getStatusBadge(
                                                job.status
                                            )}`}
                                        >
                                            {job.status}
                                        </span>
                                    </div>

                                    <div className="space-y-1 text-sm text-zinc-600">
                                        <div>
                                            대상기간:{' '}
                                            {job.target_start_date === job.target_end_date
                                                ? job.target_start_date
                                                : `${job.target_start_date} ~ ${job.target_end_date}`}
                                        </div>
                                        <div>성공: {job.success_count.toLocaleString()}건</div>
                                        <div>실패: {job.failed_count.toLocaleString()}건</div>
                                        <div>시작: {formatDateTime(job.started_at)}</div>
                                        <div>종료: {formatDateTime(job.finished_at)}</div>
                                        {job.error_message && (
                                            <div className="text-red-600">사유: {job.error_message}</div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
                <Pagination
                    page={jobPage}
                    totalPages={jobTotalPages}
                    totalCount={jobTotalCount}
                    pageSize={jobPageSize}
                    onPageChange={setJobPage}
                    onPageSizeChange={(size) => {
                        setJobPageSize(size)
                        setJobPage(1)
                    }}
                />
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                            <h2 className="font-semibold">
                                {editingItem ? 'API 소스 수정' : 'API 소스 등록'}
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
                                <label className="mb-1 block text-sm font-medium">회사명 *</label>
                                <input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    placeholder="예: 쿠팡"
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
                                    onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    placeholder="API KEY"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    API SECRET
                                </label>
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