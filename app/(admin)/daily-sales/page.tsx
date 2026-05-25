'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

type SyndicatorItem = {
    id: string
    name: string
}

type DailySalesRow = {
    report_date: string
    syndicator_names: string
    impressions: number
    clicks: number
    ad_cost: number
    revenue_amount: number
    final_profit_amount: number
    monthly_profit_amount: number

    source_breakdown: Record<
        string,
        {
            impressions: number
            clicks: number
            ad_cost: number
            revenue_amount: number
            final_profit_amount: number
        }
    >
}

function formatNumber(value: number) {
    const rounded = Math.round(Number(value || 0))

    if (Object.is(rounded, -0)) {
        return '0'
    }

    return rounded.toLocaleString()
}

function getMonthStart(date: string) {
    return `${date.slice(0, 7)}-01`
}

function getToday() {
    return new Date().toISOString().slice(0, 10)
}

function showBreakdown(
    title: string,
    breakdown: DailySalesRow['source_breakdown'],
    keyName: 'impressions' | 'clicks' | 'ad_cost' | 'revenue_amount' | 'final_profit_amount',
    suffix = ''
) {
    const message = Object.entries(breakdown)
        .map(([source, value]) => {
            return `${source}: ${formatNumber(value[keyName])}${suffix}`
        })
        .join('\n')

    alert(`${title}\n\n${message || '세부 데이터가 없습니다.'}`)
}

export default function DailySalesPage() {
    const [selectedDate, setSelectedDate] = useState(getToday())
    const [rows, setRows] = useState<DailySalesRow[]>([])
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')

    const [syndicators, setSyndicators] = useState<SyndicatorItem[]>([])
    const [selectedSyndicatorIds, setSelectedSyndicatorIds] = useState<string[]>([])

    async function loadDailySales() {
        setLoading(true)
        setErrorMessage('')

        const monthStart = getMonthStart(selectedDate)

        const { data: syndicatorData, error: syndicatorError } = await supabase
            .from('ad_syndicators')
            .select('id, name')
            .order('name', { ascending: true })

        if (syndicatorError) {
            setErrorMessage(syndicatorError.message)
            setLoading(false)
            return
        }

        const syndicatorList = (syndicatorData ?? []) as SyndicatorItem[]
        setSyndicators(syndicatorList)

        const targetIds =
            selectedSyndicatorIds.length > 0
                ? selectedSyndicatorIds
                : syndicatorList.map((item) => item.id)

        setSelectedSyndicatorIds(targetIds)

        if (targetIds.length === 0) {
            setRows([])
            setLoading(false)
            return
        }

        const { data: dailyReports, error: dailyError } = await supabase
            .from('ad_report_rows')
            .select(
                `
                    syndicator_id,
                    impressions,
                    source,
                    clicks,
                    ad_cost,
                    revenue_amount,
                    final_profit_amount
                `
            )
            .eq('report_date', selectedDate)
            .in('syndicator_id', targetIds)


        if (dailyError) {
            setErrorMessage(dailyError.message)
            setLoading(false)
            return
        }

        const { data: monthlyReports, error: monthlyError } = await supabase
            .from('ad_report_rows')
            .select(
                `
                    syndicator_id,
                    final_profit_amount
                `
            )
            .gte('report_date', monthStart)
            .lte('report_date', selectedDate)
            .in('syndicator_id', targetIds)


        if (monthlyError) {
            setErrorMessage(monthlyError.message)
            setLoading(false)
            return
        }

        const selectedSyndicatorNames = syndicatorList
            .filter((item) => targetIds.includes(item.id))
            .map((item) => item.name)
            .join(', ')

        const sourceBreakdown = (dailyReports ?? []).reduce((acc, row: any) => {
            const source = row.source || 'unknown'

            if (!acc[source]) {
                acc[source] = {
                    impressions: 0,
                    clicks: 0,
                    ad_cost: 0,
                    revenue_amount: 0,
                    final_profit_amount: 0,
                }
            }

            acc[source].impressions += Number(row.impressions || 0)
            acc[source].clicks += Number(row.clicks || 0)
            acc[source].ad_cost += Number(row.ad_cost || 0)
            acc[source].revenue_amount += Number(row.revenue_amount || 0)
            acc[source].final_profit_amount += Number(row.final_profit_amount || 0)

            return acc
        }, {} as DailySalesRow['source_breakdown'])



        const result = [
            {
                report_date: selectedDate,
                syndicator_names: selectedSyndicatorNames,
                source_breakdown: sourceBreakdown,
                impressions: (dailyReports ?? []).reduce(
                    (sum, row) => sum + Number(row.impressions || 0),
                    0
                ),
                clicks: (dailyReports ?? []).reduce(
                    (sum, row) => sum + Number(row.clicks || 0),
                    0
                ),
                ad_cost: (dailyReports ?? []).reduce(
                    (sum, row) => sum + Number(row.ad_cost || 0),
                    0
                ),
                revenue_amount: (dailyReports ?? []).reduce(
                    (sum, row) => sum + Number(row.revenue_amount || 0),
                    0
                ),
                final_profit_amount: (dailyReports ?? []).reduce(
                    (sum, row) => sum + Number(row.final_profit_amount || 0),
                    0
                ),
                monthly_profit_amount: (monthlyReports ?? []).reduce(
                    (sum, row) => sum + Number(row.final_profit_amount || 0),
                    0
                ),
            },
        ]

        setRows(result)

        setLoading(false)
    }

    useEffect(() => {
        loadDailySales()
    }, [])

    return (
        <main className="px-4 py-5 sm:px-6">
            <div className="mx-auto w-full max-w-4xl">
                <div className="mb-5 space-y-4">
                    <div>
                        <h1 className="text-2xl font-bold">일일매출보고</h1>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="h-10 w-full rounded-lg border border-zinc-300 px-3 text-sm sm:w-[180px]"
                        />

                        <button
                            type="button"
                            onClick={loadDailySales}
                            className="h-10 w-full rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white sm:w-auto"
                        >
                            조회
                        </button>
                    </div>
                    <div className="space-y-2">
                        <div className="text-sm font-semibold text-zinc-700">
                            신디사 선택
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {syndicators.map((item) => {
                                const checked = selectedSyndicatorIds.includes(item.id)

                                return (
                                    <label
                                        key={item.id}
                                        className={`
    cursor-pointer rounded-full border px-3 py-2 text-sm font-medium transition sm:px-4
    ${checked
                                                ? 'border-zinc-700 bg-zinc-600 text-white'
                                                : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500'
                                            }
`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedSyndicatorIds((prev) => [...prev, item.id])
                                                } else {
                                                    setSelectedSyndicatorIds((prev) =>
                                                        prev.filter((id) => id !== item.id)
                                                    )
                                                }
                                            }}
                                            className="hidden"
                                        />

                                        {item.name}
                                    </label>
                                )
                            })}
                        </div>
                    </div>

                </div>

                {errorMessage && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        {errorMessage}
                    </div>
                )}

                {loading ? (
                    <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
                        불러오는 중...
                    </div>
                ) : (
                    <div className="space-y-5">
                        {rows.map((row) => (
                            <section
                                key={row.report_date}
                                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
                            >

                                <h2 className="mb-4 break-keep text-base font-bold sm:mb-5 sm:text-lg">
                                    {row.report_date} {row.syndicator_names} 데이터 공유드립니다.
                                </h2>


                                <div className="overflow-hidden rounded-xl border border-zinc-200">
                                    <table className="w-full text-sm">
                                        <tbody>
                                            <tr className="border-b border-zinc-200">
                                                <th className="w-32 bg-zinc-50 px-3 py-3 text-left text-sm font-semibold sm:w-48 sm:px-4">
                                                    노출수
                                                </th>
                                                <td className="px-3 py-3 text-right text-sm font-bold tabular-nums sm:px-4">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            showBreakdown('노출수 세부내역', row.source_breakdown, 'impressions')
                                                        }
                                                        className="underline decoration-dotted underline-offset-4"
                                                    >
                                                        {formatNumber(row.impressions)}
                                                    </button>
                                                </td>
                                            </tr>

                                            <tr className="border-b border-zinc-200">
                                                <th className="w-32 bg-zinc-50 px-3 py-3 text-left text-sm font-semibold sm:w-48 sm:px-4">
                                                    클릭수
                                                </th>
                                                <td className="px-3 py-3 text-right text-sm font-bold tabular-nums sm:px-4">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            showBreakdown('클릭수 세부내역', row.source_breakdown, 'clicks')
                                                        }
                                                        className="underline decoration-dotted underline-offset-4"
                                                    >
                                                        {formatNumber(row.clicks)}
                                                    </button>
                                                </td>
                                            </tr>

                                            <tr className="border-b border-zinc-200">
                                                <th className="w-32 bg-zinc-50 px-3 py-3 text-left text-sm font-semibold sm:w-48 sm:px-4">
                                                    광고비
                                                </th>
                                                <td className="px-3 py-3 text-right text-sm font-bold tabular-nums sm:px-4">
                                                    {formatNumber(row.ad_cost)}원
                                                </td>
                                            </tr>

                                            <tr className="border-b border-zinc-200">
                                                <th className="w-32 bg-zinc-50 px-3 py-3 text-left text-sm font-semibold sm:w-48 sm:px-4">
                                                    수익금
                                                </th>
                                                <td className="px-3 py-3 text-right text-sm font-bold tabular-nums sm:px-4">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            showBreakdown('수익금 세부내역', row.source_breakdown, 'revenue_amount', '원')
                                                        }
                                                        className="underline decoration-dotted underline-offset-4"
                                                    >
                                                        {formatNumber(row.revenue_amount)}원
                                                    </button>
                                                </td>
                                            </tr>

                                            <tr className="border-b border-zinc-200">
                                                <th className="w-32 bg-zinc-100 px-3 py-3 text-left text-sm font-bold sm:w-48 sm:px-4">
                                                    순이익
                                                </th>
                                                <td className="px-3 py-3 text-right text-sm font-bold tabular-nums sm:px-4">
                                                    {formatNumber(row.final_profit_amount)}원
                                                </td>
                                            </tr>

                                            <tr>
                                                <th className="bg-zinc-100 px-4 py-3 text-left font-bold">
                                                    한달 누적 순이익
                                                </th>
                                                <td className="bg-zinc-100 px-3 py-3 text-right text-sm font-extrabold tabular-nums sm:px-4">
                                                    {formatNumber(row.monthly_profit_amount)}원
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </main>
    )
}