'use client'

import { useEffect, useMemo, useState } from 'react'
import Pagination from '@/components/pagination'
import { supabase } from '@/lib/supabase/client'
import {
    Download,
    FileDown,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    Trash2,
    X,
} from 'lucide-react'

type ReportRow = {
    id: string
    report_date: string
    placement_id: string
    revenue_option: string
    revenue_option_value: number
    impressions: number
    clicks: number
    purchase_amount: number
    cancel_amount: number
    final_purchase_amount: number
    ad_cost: number
    revenue_amount: number
    final_profit_amount: number
    source: string | null
    memo: string | null
    ad_syndicators: { name: string } | null
    ad_media_companies: { name: string } | null
    ad_placements: { name: string } | null
}

type PlacementOption = {
    id: string
    name: string
    syndicator_id: string
    media_company_id: string
    revenue_option: string
    revenue_option_value: number
    ad_syndicators: { name: string } | null
    ad_media_companies: { name: string } | null
}

type SelectOption = {
    id: string
    name: string
}

export default function ReportsPage() {
    const [reports, setReports] = useState<ReportRow[]>([])
    const [loading, setLoading] = useState(false)
    const [modalOpen, setModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [placements, setPlacements] = useState<PlacementOption[]>([])
    const [editingReport, setEditingReport] = useState<ReportRow | null>(null)
    const [syndicators, setSyndicators] = useState<SelectOption[]>([])
    const [mediaCompanies, setMediaCompanies] = useState<SelectOption[]>([])
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [totalCount, setTotalCount] = useState(0)
    const [adminRole, setAdminRole] = useState('')
    const [allowedSyndicatorIds, setAllowedSyndicatorIds] = useState<string[]>([])

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        syndicatorId: '',
        mediaCompanyId: '',
        placementKeyword: '',
    })

    const canEdit =
        adminRole === 'super_admin' || adminRole === 'manager_full'

    const reportSummary = useMemo(() => {
        return reports.reduce(
            (sum, row) => {
                sum.impressions += Number(row.impressions || 0)
                sum.clicks += Number(row.clicks || 0)
                sum.final_purchase_amount += Number(row.final_purchase_amount || 0)
                sum.ad_cost += Number(row.ad_cost || 0)
                sum.revenue_amount += Number(row.revenue_amount || 0)
                sum.final_profit_amount += Number(row.final_profit_amount || 0)

                return sum
            },
            {
                impressions: 0,
                clicks: 0,
                final_purchase_amount: 0,
                ad_cost: 0,
                revenue_amount: 0,
                final_profit_amount: 0,
            }
        )
    }, [reports])

    const [searchParams, setSearchParams] = useState(filters)

    const [form, setForm] = useState({
        report_date: '',
        placement_id: '',
        impressions: '',
        clicks: '',
        final_purchase_amount: '',
        revenue_amount: '',
        memo: '',
    })

    useEffect(() => {
        loadAdminRole()
        loadPlacements()
    }, [])

    useEffect(() => {
        loadFilterOptions()
    }, [adminRole, allowedSyndicatorIds])

    useEffect(() => {
        loadReports()
    }, [page, pageSize, searchParams])

    async function loadReports() {
        setLoading(true)

        let query = supabase
            .from('ad_report_rows')
            .select(`
                id,
                report_date,
                placement_id,
                source,
                revenue_option,
                revenue_option_value,
                impressions,
                clicks,
                final_purchase_amount,
                ad_cost,
                revenue_amount,
                final_profit_amount,
                memo,
                ad_syndicators(name),
                ad_media_companies(name),
                ad_placements(name)
            `,
                { count: 'exact' }
            )
            .order('report_date', { ascending: false })

        if (
            adminRole === 'manager_readonly' ||
            adminRole === 'syndicator'
        ) {
            if (allowedSyndicatorIds.length === 0) {
                setReports([])
                setTotalCount(0)
                setLoading(false)
                return
            }

            query = query.in('syndicator_id', allowedSyndicatorIds)
        }

        if (searchParams.startDate) {
            query = query.gte('report_date', searchParams.startDate)
        }

        if (searchParams.endDate) {
            query = query.lte('report_date', searchParams.endDate)
        }

        if (searchParams.syndicatorId) {
            query = query.eq('syndicator_id', searchParams.syndicatorId)
        }

        if (searchParams.mediaCompanyId) {
            query = query.eq('media_company_id', searchParams.mediaCompanyId)
        }

        if (searchParams.placementKeyword.trim()) {
            const { data: placementData } = await supabase
                .from('ad_placements')
                .select('id')
                .ilike('name', `%${searchParams.placementKeyword.trim()}%`)

            const placementIds = (placementData ?? []).map((item) => item.id)

            if (placementIds.length === 0) {
                setReports([])
                setTotalCount(0)
                setLoading(false)
                return
            }

            query = query.in('placement_id', placementIds)
        }

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        query = query.range(from, to)

        const { data, error, count } = await query

        if (!error && data) {
            const mergedRows = mergeReportRows(data as unknown as ReportRow[])

            setReports(mergedRows)
            setTotalCount(mergedRows.length)
        }

        setLoading(false)
    }

    async function loadAdminRole() {
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data: adminData } = await supabase
            .from('ad_admin_users')
            .select('id, role')
            .eq('auth_user_id', user.id)
            .single()

        if (!adminData) return

        setAdminRole(adminData.role)

        if (
            adminData.role === 'manager_readonly' ||
            adminData.role === 'syndicator'
        ) {
            const { data: accessData } = await supabase
                .from('ad_admin_syndicator_access')
                .select('syndicator_id')
                .eq('admin_user_id', adminData.id)

            setAllowedSyndicatorIds(
                (accessData ?? []).map((item) => item.syndicator_id)
            )
        }
    }

    function resetFilters() {
        const emptyFilters = {
            startDate: '',
            endDate: '',
            syndicatorId: '',
            mediaCompanyId: '',
            placementKeyword: '',
        }

        setFilters(emptyFilters)
        setSearchParams(emptyFilters)
        setPage(1)
    }

    async function loadPlacements() {
        const { data } = await supabase
            .from('ad_placements')
            .select(`
      id,
      name,
      syndicator_id,
      media_company_id,
      revenue_option,
      revenue_option_value,
      ad_syndicators(name),
      ad_media_companies(name)
    `)
            .eq('is_active', true)
            .order('name')

        if (data) {
            setPlacements(data as unknown as PlacementOption[])
        }
    }

    async function loadFilterOptions() {
        let syndicatorQuery = supabase
            .from('ad_syndicators')
            .select('id, name')
            .order('name')

        if (
            (adminRole === 'manager_readonly' || adminRole === 'syndicator') &&
            allowedSyndicatorIds.length > 0
        ) {
            syndicatorQuery = syndicatorQuery.in('id', allowedSyndicatorIds)
        }

        const { data: syndicatorData } = await syndicatorQuery

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

    function formatNumber(value: number) {
        return Math.round(Number(value || 0)).toLocaleString()
    }

    function mergeReportRows(rows: ReportRow[]) {
        const map = new Map<string, ReportRow>()

        rows.forEach((row) => {
            const key = `${row.report_date}_${row.placement_id}`

            const existing = map.get(key)

            if (!existing) {
                map.set(key, { ...row })
                return
            }

            existing.impressions += row.impressions ?? 0
            existing.clicks += row.clicks ?? 0
            existing.final_purchase_amount += row.final_purchase_amount ?? 0
            existing.ad_cost += row.ad_cost ?? 0
            existing.revenue_amount += row.revenue_amount ?? 0
            existing.final_profit_amount += row.final_profit_amount ?? 0

            existing.memo = existing.memo || row.memo
        })

        return Array.from(map.values())
    }

    function formatDate(value: string) {
        const date = new Date(value)

        const year = String(date.getFullYear()).slice(2)
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')

        return `${year}-${month}-${day}`
    }

    function getCtr(impressions: number, clicks: number) {
        if (!impressions) return '0.00%'
        return `${((clicks / impressions) * 100).toFixed(2)}%`
    }

    const selectedPlacement = placements.find(
        (item) => item.id === form.placement_id
    )

    const totalPages = Math.ceil(totalCount / pageSize)

    function escapeCsvValue(value: string | number | null | undefined) {
        const text = String(value ?? '')
        return `"${text.replace(/"/g, '""')}"`
    }

    function handleDownloadCsv() {
        if (reports.length === 0) {
            alert('다운로드할 데이터가 없습니다.')
            return
        }

        const headers = [
            '날짜',
            '신디사명',
            '지면명',
            '매출옵션',
            '노출수',
            '클릭수',
            'CTR',
            '최종구매금액',
            '광고비',
            '수익금',
            '최종수익금',
        ]

        const rows = reports.map((row) => [
            row.report_date,
            row.ad_syndicators?.name ?? '',
            row.ad_placements?.name ?? '',
            row.revenue_option === 'CPS'
                ? `${row.revenue_option}/${formatNumber(row.revenue_option_value)}%`
                : `${row.revenue_option}/${formatNumber(row.revenue_option_value)}원`,
            formatNumber(row.impressions),
            formatNumber(row.clicks),
            getCtr(row.impressions, row.clicks),
            formatNumber(row.final_purchase_amount),
            formatNumber(row.ad_cost),
            formatNumber(row.revenue_amount),
            formatNumber(row.final_profit_amount),
        ])

        const csvContent = [
            headers.map(escapeCsvValue).join(','),
            ...rows.map((row) => row.map(escapeCsvValue).join(',')),
        ].join('\n')

        const blob = new Blob(['\uFEFF' + csvContent], {
            type: 'text/csv;charset=utf-8;',
        })

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')

        const today = new Date().toISOString().slice(0, 10)

        link.href = url
        link.download = `adrelay_report_${today}.csv`
        link.click()

        URL.revokeObjectURL(url)
    }

    async function handleDownloadSettlementReport() {
        if (reports.length === 0) {
            alert('다운로드할 데이터가 없습니다.')
            return
        }

        const hasCps = reports.some(
            (row) => row.revenue_option === 'CPS'
        )

        const type = hasCps ? 'CPS' : 'CPM'

        const firstDate =
            reports[0]?.report_date ?? new Date().toISOString()

        const monthText = firstDate.slice(0, 7)

        const syndicatorName =
            reports[0]?.ad_syndicators?.name ?? '정산'

        try {
            const response = await fetch(
                '/api/settlement-report',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        reports,
                        type,
                        syndicatorName,
                        monthText,
                    }),
                }
            )

            if (!response.ok) {
                throw new Error('정산 리포트 생성 실패')
            }

            const blob = await response.blob()

            const url = window.URL.createObjectURL(blob)

            const link = document.createElement('a')

            link.href = url

            link.download =
                `${syndicatorName}_${monthText}_정산서.xlsx`

            document.body.appendChild(link)

            link.click()

            link.remove()

            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error(error)
            alert('정산 리포트 다운로드 실패')
        }
    }

    function resetForm() {
        setForm({
            report_date: '',
            placement_id: '',
            impressions: '',
            clicks: '',
            final_purchase_amount: '',
            revenue_amount: '',
            memo: '',
        })

        setEditingReport(null)
    }

    function openEditModal(row: ReportRow) {
        setEditingReport(row)

        setForm({
            report_date: row.report_date,
            placement_id: row.placement_id,
            impressions: String(row.impressions ?? ''),
            clicks: String(row.clicks ?? ''),
            final_purchase_amount: String(row.final_purchase_amount ?? ''),
            revenue_amount: String(row.revenue_amount ?? ''),
            memo: row.memo ?? '',
        })

        setModalOpen(true)
    }

    async function handleDeleteReport(row: ReportRow) {
        const ok = confirm(`${row.report_date} / ${row.ad_placements?.name ?? ''} 리포트를 삭제할까요?`)

        if (!ok) return

        const { error } = await supabase
            .from('ad_report_rows')
            .delete()
            .eq('id', row.id)

        if (error) {
            alert(`삭제 실패: ${error.message}`)
            return
        }

        loadReports()
    }

    async function handleSaveReport() {
        if (!form.report_date) {
            alert('날짜를 선택해 주세요.')
            return
        }

        if (!selectedPlacement) {
            alert('지면을 선택해 주세요.')
            return
        }

        setSaving(true)

        const payload = {
            report_date: form.report_date,
            syndicator_id: selectedPlacement.syndicator_id,
            media_company_id: selectedPlacement.media_company_id,
            placement_id: selectedPlacement.id,
            revenue_option: selectedPlacement.revenue_option,
            revenue_option_value: selectedPlacement.revenue_option_value,
            impressions: Number(form.impressions || 0),
            clicks: Number(form.clicks || 0),
            purchase_amount: Number(form.final_purchase_amount || 0),
            cancel_amount: 0,
            final_purchase_amount: Number(form.final_purchase_amount || 0),
            revenue_amount: Number(form.revenue_amount || 0),
            source: 'manual',
            memo: form.memo.trim() || null,
        }

        const { error } = editingReport
            ? await supabase
                .from('ad_report_rows')
                .update(payload)
                .eq('id', editingReport.id)
            : await supabase.from('ad_report_rows').insert(payload)

        setSaving(false)

        if (error) {
            alert(`저장 실패: ${error.message}`)
            return
        }

        resetForm()
        setModalOpen(false)
        loadReports()
    }

    return (
        <main className="min-h-screen bg-zinc-50 px-4 py-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="text-xl font-bold">리포트</h1>
                            <p className="mt-1 text-sm text-zinc-500">
                                일자별 광고 성과와 광고비를 조회합니다.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={handleDownloadCsv}
                                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
                            >
                                <Download size={16} />
                                엑셀 다운로드
                            </button>

                            {canEdit && (
                                <button
                                    onClick={handleDownloadSettlementReport}
                                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
                                >
                                    <FileDown size={16} />
                                    정산리포트
                                </button>
                            )}

                            {canEdit && (
                                <button
                                    onClick={() => setModalOpen(true)}
                                    className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800"
                                >
                                    <Plus size={16} />
                                    리포트 등록
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
                        <div>
                            <label className="mb-1 block text-xs text-zinc-500">시작일</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) =>
                                    setFilters({ ...filters, startDate: e.target.value })
                                }
                                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs text-zinc-500">종료일</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) =>
                                    setFilters({ ...filters, endDate: e.target.value })
                                }
                                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs text-zinc-500">신디사</label>
                            <select
                                value={filters.syndicatorId}
                                onChange={(e) =>
                                    setFilters({ ...filters, syndicatorId: e.target.value })
                                }
                                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                            >
                                <option value="">전체</option>
                                {syndicators.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs text-zinc-500">매체</label>
                            <select
                                value={filters.mediaCompanyId}
                                onChange={(e) =>
                                    setFilters({ ...filters, mediaCompanyId: e.target.value })
                                }
                                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                            >
                                <option value="">전체</option>
                                {mediaCompanies.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs text-zinc-500">지면명</label>
                            <input
                                value={filters.placementKeyword}
                                onChange={(e) =>
                                    setFilters({ ...filters, placementKeyword: e.target.value })
                                }
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setPage(1)
                                        setSearchParams(filters)
                                    }
                                }}
                                placeholder="지면 검색"
                                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="flex items-end gap-2">
                            <button
                                onClick={() => {
                                    setPage(1)
                                    setSearchParams(filters)
                                }}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-black px-3 py-2 text-sm text-white hover:bg-zinc-800"
                            >
                                <Search size={16} />
                                검색
                            </button>

                            <button
                                onClick={resetFilters}
                                className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                            >
                                <RotateCcw size={16} />
                            </button>
                        </div>
                    </div>
                </section>

                <section className="hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:block">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm leading-tight">
                            <thead className="border-b border-zinc-200 bg-zinc-100 text-zinc-600">
                                <tr>
                                    <th className="pl-4 pr-4 py-3 text-center text-sm font-semibold">날짜</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold">신디사명</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold">지면명</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold">매출옵션</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold">노출</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold">클릭</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold">CTR</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold">최종구매금액</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold">광고비</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold">수익금</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold">최종수익금</th>
                                    {canEdit && (
                                        <th className="px-4 py-3 text-center text-sm font-semibold">
                                            관리
                                        </th>
                                    )}
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={canEdit ? 12 : 11} className="px-4 py-10 text-center text-zinc-500">
                                            불러오는 중...
                                        </td>
                                    </tr>
                                ) : reports.length === 0 ? (
                                    <tr>
                                        <td colSpan={canEdit ? 12 : 11} className="px-4 py-10 text-center text-zinc-500">
                                            조회된 리포트가 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        <tr className="border-b-2 border-zinc-300 bg-zinc-100/70 font-bold">
                                            <td className="px-3 py-2 text-center whitespace-nowrap text-xs">
                                                합계
                                            </td>

                                            <td className="px-3 py-2 text-xs"></td>

                                            <td className="px-3 py-2 text-xs"></td>

                                            <td className="px-3 py-2 text-xs"></td>

                                            <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">
                                                {formatNumber(reportSummary.impressions)}
                                            </td>

                                            <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">
                                                {formatNumber(reportSummary.clicks)}
                                            </td>

                                            <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">
                                                {getCtr(reportSummary.impressions, reportSummary.clicks)}
                                            </td>

                                            <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">
                                                {formatNumber(reportSummary.final_purchase_amount)}
                                            </td>

                                            <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">
                                                {formatNumber(reportSummary.ad_cost)}
                                            </td>

                                            <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">
                                                {formatNumber(reportSummary.revenue_amount)}
                                            </td>

                                            <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">
                                                {formatNumber(reportSummary.final_profit_amount)}
                                            </td>

                                            {canEdit && (
                                                <td className="px-3 py-2 text-center text-xs"></td>
                                            )}
                                        </tr>

                                        {reports.map((row) => (
                                            <tr key={row.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                                                <td className="px-3 py-2 text-center text-xs tabular-nums whitespace-nowrap">{formatDate(row.report_date)}</td>
                                                <td className="px-3 py-2 text-center text-xs tabular-nums whitespace-nowrap">{row.ad_syndicators?.name ?? '-'}</td>
                                                <td className="px-3 py-2 text-center text-xs tabular-nums whitespace-nowrap">{row.ad_placements?.name ?? '-'}</td>
                                                <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">
                                                    {row.revenue_option === 'CPS'
                                                        ? `${formatNumber(row.revenue_option_value)}%`
                                                        : `${formatNumber(row.revenue_option_value)}원`}
                                                </td>
                                                <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">{formatNumber(row.impressions)}</td>
                                                <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">{formatNumber(row.clicks)}</td>
                                                <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">{getCtr(row.impressions, row.clicks)}</td>
                                                <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">{formatNumber(row.final_purchase_amount)}</td>
                                                <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">{formatNumber(row.ad_cost)}</td>
                                                <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">{formatNumber(row.revenue_amount)}</td>
                                                <td className="px-3 py-2 text-right text-xs tabular-nums whitespace-nowrap">{formatNumber(row.final_profit_amount)}</td>
                                                {canEdit && (
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => openEditModal(row)}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50"
                                                            >
                                                                <Pencil size={14} />
                                                                수정
                                                            </button>

                                                            <button
                                                                onClick={() => handleDeleteReport(row)}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                                                            >
                                                                <Trash2 size={14} />
                                                                삭제
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>

                                        ))}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="space-y-3 lg:hidden">
                    {reports.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500 shadow-sm">
                            등록된 리포트가 없습니다.
                        </div>
                    ) : (
                        reports.map((row) => (
                            <div
                                key={row.id}
                                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                            >
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-sm text-zinc-500">{row.report_date}</div>
                                        <div className="mt-1 font-semibold">
                                            {row.ad_media_companies?.name ?? '-'} / {row.ad_placements?.name ?? '-'}
                                        </div>
                                        <div className="mt-1 text-sm text-zinc-500">
                                            {row.ad_syndicators?.name ?? '-'} · {row.revenue_option}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-xs text-zinc-500">광고비</div>
                                        <div className="font-bold">{formatNumber(row.ad_cost)}원</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div className="rounded-xl bg-zinc-50 p-3">
                                        <div className="text-xs text-zinc-500">노출</div>
                                        <div className="font-semibold">{formatNumber(row.impressions)}</div>
                                    </div>

                                    <div className="rounded-xl bg-zinc-50 p-3">
                                        <div className="text-xs text-zinc-500">클릭</div>
                                        <div className="font-semibold">{formatNumber(row.clicks)}</div>
                                    </div>

                                    <div className="rounded-xl bg-zinc-50 p-3">
                                        <div className="text-xs text-zinc-500">CTR</div>
                                        <div className="font-semibold">{getCtr(row.impressions, row.clicks)}</div>
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
                    <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                            <h2 className="font-semibold">
                                {editingReport ? '리포트 수정' : '리포트 등록'}
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
                                <label className="mb-1 block text-sm font-medium">날짜 *</label>
                                <input
                                    type="date"
                                    value={form.report_date}
                                    onChange={(e) =>
                                        setForm({ ...form, report_date: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">지면 *</label>
                                <select
                                    value={form.placement_id}
                                    onChange={(e) =>
                                        setForm({ ...form, placement_id: e.target.value })
                                    }
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                >
                                    <option value="">지면 선택</option>
                                    {placements.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.ad_syndicators?.name ?? '-'} /{' '}
                                            {item.ad_media_companies?.name ?? '-'} / {item.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {selectedPlacement && (
                                <div className="rounded-xl bg-zinc-50 p-4 text-sm">
                                    <div className="font-medium">선택된 지면 정보</div>
                                    <div className="mt-2 text-zinc-600">
                                        신디사: {selectedPlacement.ad_syndicators?.name ?? '-'}
                                    </div>
                                    <div className="text-zinc-600">
                                        매체: {selectedPlacement.ad_media_companies?.name ?? '-'}
                                    </div>
                                    <div className="text-zinc-600">
                                        매출옵션: {selectedPlacement.revenue_option}
                                    </div>
                                    <div className="text-zinc-600">
                                        단가/%:{' '}
                                        {selectedPlacement.revenue_option === 'CPS'
                                            ? `${selectedPlacement.revenue_option_value}%`
                                            : `${Number(
                                                selectedPlacement.revenue_option_value
                                            ).toLocaleString()}원`}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium">노출수</label>
                                    <input
                                        type="number"
                                        value={form.impressions}
                                        onChange={(e) =>
                                            setForm({ ...form, impressions: e.target.value })
                                        }
                                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium">클릭수</label>
                                    <input
                                        type="number"
                                        value={form.clicks}
                                        onChange={(e) => setForm({ ...form, clicks: e.target.value })}
                                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium">최종구매금액</label>
                                    <input
                                        type="number"
                                        value={form.final_purchase_amount}
                                        onChange={(e) =>
                                            setForm({ ...form, final_purchase_amount: e.target.value })
                                        }
                                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium">수익금</label>
                                    <input
                                        type="number"
                                        value={form.revenue_amount}
                                        onChange={(e) =>
                                            setForm({ ...form, revenue_amount: e.target.value })
                                        }
                                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                        placeholder="0"
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
                                onClick={handleSaveReport}
                                disabled={saving}
                                className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                            >
                                {saving
                                    ? '저장 중...'
                                    : editingReport
                                        ? '수정 저장'
                                        : '저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}