'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Link2, RefreshCw, Save, Trash2 } from 'lucide-react'
import Pagination from '@/components/pagination'

type RawReport = {
    id: string
    source_id: string
    report_date: string
    external_placement_name: string | null
    external_placement_key: string | null
    raw_data: {
        impressions?: number
        clicks?: number
        final_purchase_amount?: number
        revenue_amount?: number
    }
    ad_external_api_sources: {
        name: string
    } | null
}

type Placement = {
    id: string
    name: string
    ad_syndicators: { name: string } | null
    ad_media_companies: { name: string } | null
}

export default function UnmatchedPage() {
    const [items, setItems] = useState<RawReport[]>([])
    const [placements, setPlacements] = useState<Placement[]>([])
    const [loading, setLoading] = useState(false)
    const [savingId, setSavingId] = useState<string | null>(null)
    const [selectedMap, setSelectedMap] = useState<Record<string, string>>({})
    const [placementSearchMap, setPlacementSearchMap] = useState<Record<string, string>>({})
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [totalCount, setTotalCount] = useState(0)

    const totalPages = Math.ceil(totalCount / pageSize)

    useEffect(() => {
        loadPlacements()
    }, [])

    useEffect(() => {
        loadData()
    }, [page, pageSize])

    async function loadData() {
        setLoading(true)

        const { data: mappedData } = await supabase
            .from('ad_placement_mapping_rules')
            .select('source_id, external_placement_name')

        const mappedKeys = new Set(
            (mappedData ?? []).map(
                (item) => `${item.source_id}_${item.external_placement_name}`
            )
        )

        const { data, error } = await supabase
            .from('ad_external_raw_reports')
            .select(`
        id,
        source_id,
        report_date,
        external_placement_key,
        external_placement_name,
        raw_data,
        ad_external_api_sources(name)
      `)
            .order('collected_at', { ascending: false })

        if (!error && data) {
            const unmatched = (data as unknown as RawReport[]).filter((item) => {
                const key = `${item.source_id}_${item.external_placement_name}`
                return !mappedKeys.has(key)
            })

            setTotalCount(unmatched.length)

            const from = (page - 1) * pageSize
            const to = from + pageSize

            setItems(unmatched.slice(from, to))
        }

        setLoading(false)
    }

    async function loadPlacements() {
        const { data } = await supabase
            .from('ad_placements')
            .select(`
        id,
        name,
        ad_syndicators(name),
        ad_media_companies(name)
      `)
            .eq('is_active', true)
            .order('name')

        if (data) {
            setPlacements(data as unknown as Placement[])
        }
    }

    function formatNumber(value: number | undefined) {
        return Number(value || 0).toLocaleString()
    }

    async function handleSaveMapping(item: RawReport) {
        const placementId = selectedMap[item.id]

        if (!placementId) {
            alert('내부 지면을 선택해 주세요.')
            return
        }

        if (!item.external_placement_name) {
            alert('외부 지면명이 없어 매칭할 수 없습니다.')
            return
        }

        setSavingId(item.id)

        const { error } = await supabase
            .from('ad_placement_mapping_rules')
            .insert({
                source_id: item.source_id,
                placement_id: placementId,
                external_placement_key:
                    item.external_placement_key || item.external_placement_name,
                external_placement_name: item.external_placement_name,
            })

        if (error) {
            setSavingId(null)
            alert(`매칭 저장 실패: ${error.message}`)
            return
        }

        try {
            const processResponse = await fetch('/api/process-raw-reports', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceId: item.source_id,
                    targetDate: item.report_date,
                }),
            })

            const processResult = await processResponse.json()

            if (!processResponse.ok) {
                alert(`매칭은 저장됐지만 리포트 생성 실패: ${processResult.error}`)
                return
            }

            alert(`매칭 저장 완료\n리포트 생성: ${processResult.count}건`)
        } catch (error) {
            console.error(error)
            alert('매칭은 저장됐지만 리포트 생성 중 오류가 발생했습니다.')
        } finally {
            setSavingId(null)
            setPage(1)
            loadData()
        }
    }

    async function handleDeleteRaw(item: RawReport) {
        const ok = confirm(
            `'${item.external_placement_name ?? '-'}' 미매칭 데이터를 삭제할까요?`
        )

        if (!ok) return

        const { error } = await supabase
            .from('ad_external_raw_reports')
            .delete()
            .eq('id', item.id)

        if (error) {
            alert(`삭제 실패: ${error.message}`)
            return
        }

        alert('삭제되었습니다.')
        loadData()
    }

    return (
        <main className="min-h-screen bg-zinc-50 px-4 py-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="text-xl font-bold">미매칭 데이터</h1>
                            <p className="mt-1 text-sm text-zinc-500">
                                외부 API에서 수집된 지면명을 내부 지면과 연결합니다.
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                setPage(1)
                                loadData()
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
                        >
                            <RefreshCw size={16} />
                            새로고침
                        </button>
                    </div>
                </section>

                <section className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:block">
                    <table className="w-full text-sm">
                        <thead className="border-b border-zinc-200 bg-zinc-100 text-zinc-600">
                            <tr>
                                <th className="pl-6 pr-4 py-3 text-left text-sm font-semibold">
                                    외부회사
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    날짜
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    외부지면명
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">
                                    노출
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">
                                    클릭
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">
                                    최종구매금액
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">
                                    수익금
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    내부지면
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
                                        미매칭 데이터가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="border-b border-zinc-100 hover:bg-zinc-50"
                                    >
                                        <td className="pl-6 pr-4 py-3 font-medium">
                                            {item.ad_external_api_sources?.name ?? '-'}
                                        </td>
                                        <td className="px-4 py-3">{item.report_date}</td>
                                        <td className="px-4 py-3">
                                            {item.external_placement_name ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {formatNumber(item.raw_data?.impressions)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {formatNumber(item.raw_data?.clicks)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {formatNumber(item.raw_data?.final_purchase_amount)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {formatNumber(item.raw_data?.revenue_amount)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                list={`placement-options-${item.id}`}
                                                value={placementSearchMap[item.id] ?? ''}
                                                onChange={(e) => {
                                                    const value = e.target.value

                                                    const matchedPlacement = placements.find(
                                                        (placement) => placement.name === value
                                                    )

                                                    setPlacementSearchMap({
                                                        ...placementSearchMap,
                                                        [item.id]: value,
                                                    })

                                                    setSelectedMap({
                                                        ...selectedMap,
                                                        [item.id]: matchedPlacement?.id ?? '',
                                                    })
                                                }}
                                                placeholder="내부 지면 검색"
                                                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                            />

                                            <datalist id={`placement-options-${item.id}`}>
                                                {placements.map((placement) => (
                                                    <option key={placement.id} value={placement.name} />
                                                ))}
                                            </datalist>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleSaveMapping(item)}
                                                    disabled={savingId === item.id}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-black px-3 py-1.5 text-xs text-white hover:bg-zinc-800 disabled:opacity-50"
                                                >
                                                    <Save size={14} />
                                                    {savingId === item.id ? '저장중' : '매칭저장'}
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteRaw(item)}
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
                            미매칭 데이터가 없습니다.
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                            >
                                <div className="mb-3 flex items-start gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                                        <Link2 size={18} />
                                    </div>

                                    <div>
                                        <div className="font-semibold">
                                            {item.external_placement_name ?? '-'}
                                        </div>
                                        <div className="text-sm text-zinc-500">
                                            {item.ad_external_api_sources?.name ?? '-'} ·{' '}
                                            {item.report_date}
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                                    <div className="rounded-xl bg-zinc-50 p-3">
                                        <div className="text-xs text-zinc-500">노출</div>
                                        <div className="font-semibold">
                                            {formatNumber(item.raw_data?.impressions)}
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-zinc-50 p-3">
                                        <div className="text-xs text-zinc-500">클릭</div>
                                        <div className="font-semibold">
                                            {formatNumber(item.raw_data?.clicks)}
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-zinc-50 p-3">
                                        <div className="text-xs text-zinc-500">최종구매금액</div>
                                        <div className="font-semibold">
                                            {formatNumber(item.raw_data?.final_purchase_amount)}
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-zinc-50 p-3">
                                        <div className="text-xs text-zinc-500">수익금</div>
                                        <div className="font-semibold">
                                            {formatNumber(item.raw_data?.revenue_amount)}
                                        </div>
                                    </div>
                                </div>

                                <input
                                    list={`mobile-placement-options-${item.id}`}
                                    value={placementSearchMap[item.id] ?? ''}
                                    onChange={(e) => {
                                        const value = e.target.value

                                        const matchedPlacement = placements.find(
                                            (placement) => placement.name === value
                                        )

                                        setPlacementSearchMap({
                                            ...placementSearchMap,
                                            [item.id]: value,
                                        })

                                        setSelectedMap({
                                            ...selectedMap,
                                            [item.id]: matchedPlacement?.id ?? '',
                                        })
                                    }}
                                    placeholder="내부 지면 검색"
                                    className="mb-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                />

                                <datalist id={`mobile-placement-options-${item.id}`}>
                                    {placements.map((placement) => (
                                        <option key={placement.id} value={placement.name} />
                                    ))}
                                </datalist>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleSaveMapping(item)}
                                        disabled={savingId === item.id}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-black px-3 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                                    >
                                        <Save size={14} />
                                        {savingId === item.id ? '저장중' : '매칭저장'}
                                    </button>

                                    <button
                                        onClick={() => handleDeleteRaw(item)}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
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
        </main>
    )
}