import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const RELAY_URL = 'http://211.188.53.120:3001/proxy'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type CollectedRow = {
    report_date: string
    external_placement_name: string
    impressions: number
    clicks: number
    final_purchase_amount: number
    revenue_amount: number
}

function toYmd(dateText: string) {
    return dateText.replaceAll('-', '')
}

function toNumber(value: unknown) {
    if (value === null || value === undefined) return 0

    return Number(String(value).replaceAll(',', '').replaceAll('%', '')) || 0
}

async function collectByProvider(
    apiKey: any,
    startDate: string,
    endDate: string
): Promise<CollectedRow[]> {
    if (apiKey.provider_code === 'test_api' || apiKey.provider_code === 'mock') {
        return [
            {
                report_date: startDate,
                external_placement_name: '국제뉴스상단',
                impressions: 120000,
                clicks: 350,
                final_purchase_amount: 0,
                revenue_amount: 50000,
            },
            {
                report_date: startDate,
                external_placement_name: '국제뉴스하단',
                impressions: 80000,
                clicks: 210,
                final_purchase_amount: 0,
                revenue_amount: 30000,
            },
        ]
    }

    if (apiKey.provider_code.startsWith('cozymamang')) {
        const baseUrl =
            apiKey.api_base_url || 'http://media.cozymamang.com/report/json_new/'

        const url = new URL(baseUrl)


        url.searchParams.set('m_id', apiKey.api_key)
        url.searchParams.set('key', apiKey.api_secret)
        url.searchParams.set('sdate', toYmd(startDate))
        url.searchParams.set('edate', toYmd(endDate))

        const response = await fetch(url.toString(), {
            method: 'GET',
            cache: 'no-store',
        })

        if (!response.ok) {
            throw new Error(`코지마망 API 호출 실패: ${response.status}`)
        }

        const result = await response.json()
        console.log('🔥 코지마망 API 원본 응답')
        console.log(JSON.stringify(result, null, 2))
        const resultRoot = Array.isArray(result) ? result[0] : result
        console.log('코지마망 API 응답:', JSON.stringify(resultRoot, null, 2))

        if (resultRoot.RESULT_CD === '002') {
            return []
        }

        if (resultRoot.RESULT_CD !== '001') {
            throw new Error(
                `코지마망 API 결과 오류: ${resultRoot.RESULT_CD ?? resultRoot.result_cd ?? 'unknown'} / 응답: ${JSON.stringify(resultRoot).slice(0, 300)}`
            )
        }

        const entrList = Array.isArray(resultRoot.entrList) ? resultRoot.entrList : []

        return entrList
            .map((row: any) => ({
                report_date: String(row.LOG_DATE ?? '').replace(
                    /(\d{4})(\d{2})(\d{2})/,
                    '$1-$2-$3'
                ),
                external_placement_name: String(row.AD_NAME ?? '').trim(),
                impressions: toNumber(row.QUERY_CNT),
                clicks: toNumber(row.CLICK_CNT),
                final_purchase_amount: toNumber(row.Result_Gmv),
                revenue_amount: toNumber(row.Result_Commission),
            }))
            .filter(
                (row: CollectedRow) =>
                    row.report_date && row.external_placement_name
            )
    }

    if (apiKey.provider_code === 'emplan') {
        const baseUrl = apiKey.api_base_url || 'https://rpt.emplan.kr/api/report/'

        const partnerId = apiKey.api_secret || 'klmedia'
        const emplanStartDate = startDate
        const emplanEndDate = endDate

        const formData = new URLSearchParams()
        formData.set('partnerType', 'PUB')
        formData.set('partnerId', partnerId)
        formData.set('apiKey', apiKey.api_key)
        formData.set('viewType', 'D')
        formData.set('startDate', emplanStartDate)
        formData.set('endDate', emplanEndDate)

        console.log('엠플랜 요청값', {
            partnerId,
            startDate: emplanStartDate,
            endDate: emplanEndDate,
            viewType: 'D',
        })

        const response = await fetch(RELAY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
            body: JSON.stringify({
                url: baseUrl,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            }),
        })

        if (!response.ok) {
            throw new Error(`엠플랜 API 호출 실패: ${response.status}`)
        }

        const rawText = await response.text()

        console.log('엠플랜 RAW 응답')
        console.log(rawText)

        let result: any = {}

        try {
            result = JSON.parse(rawText)
        } catch (e) {
            throw new Error(`엠플랜 JSON 파싱 실패: ${rawText}`)
        }

        console.log('🔥 엠플랜 API 원본 응답')
        console.log(JSON.stringify(result, null, 2))

        if (result?.code !== 'OK') {
            throw new Error(
                `엠플랜 API 결과 오류: ${result?.code ?? 'unknown'} / 응답: ${JSON.stringify(result).slice(0, 300)}`
            )
        }

        const reports = Array.isArray(result?.report) ? result.report : []

        return reports
            .map((row: any) => ({
                report_date: String(row.date ?? ''),
                external_placement_name: String(row.adverIdx ?? row.pageId ?? row.siteId ?? '').trim(),
                impressions: toNumber(row.pv),
                clicks: toNumber(row.click),
                final_purchase_amount: toNumber(row.sales),
                revenue_amount: toNumber(row.sales),
            }))
            .filter(
                (row: CollectedRow) =>
                    row.report_date && row.external_placement_name
            )
    }

    if (apiKey.provider_code === 'digitalcamp') {
        const baseUrl =
            apiKey.api_base_url || 'http://sspmedia.digitalcamp.co.kr/API/report'

        const digitalcampStartDate = startDate.replaceAll('-', '')
        const digitalcampEndDate = endDate.replaceAll('-', '')

        const url = new URL(baseUrl)
        url.searchParams.set('apikey', apiKey.api_key)
        url.searchParams.set('sdate', digitalcampStartDate)
        url.searchParams.set('edate', digitalcampEndDate)
        // type은 비우면 전체 조회라서 넣지 않음

        console.log('디지털캠프 요청값', {
            url: url.toString().replace(apiKey.api_key, '****'),
            startDate: digitalcampStartDate,
            endDate: digitalcampEndDate,
        })

        const response = await fetch(url.toString(), {
            method: 'GET',
            cache: 'no-store',
        })

        if (!response.ok) {
            throw new Error(`디지털캠프 API 호출 실패: ${response.status}`)
        }

        const rawText = await response.text()

        console.log('디지털캠프 RAW 응답')
        console.log(rawText)

        let result: any

        try {
            result = JSON.parse(rawText)
        } catch {
            throw new Error(`디지털캠프 JSON 파싱 실패: ${rawText}`)
        }

        if (result?.data === 'no') {
            return []
        }

        const reports = Array.isArray(result?.data) ? result.data : []

        return reports
            .map((row: any) => ({
                report_date: String(row.date ?? ''),
                external_placement_name: String(row.zone ?? row.zoneid ?? '').trim(),
                impressions: toNumber(row.view),
                clicks: toNumber(row.click),
                final_purchase_amount: toNumber(row.sales),
                revenue_amount: toNumber(row.sales),
            }))
            .filter(
                (row: CollectedRow) =>
                    row.report_date && row.external_placement_name
            )
    }

    if (apiKey.provider_code === 'adpnut') {
        const baseUrl =
            apiKey.api_base_url ||
            'http://publishers.adpnut.com/common/api/adpnut/get_synd.jsp'

        const adpnutStartDate = startDate.replaceAll('-', '')
        const adpnutEndDate = endDate.replaceAll('-', '')

        const url = new URL(baseUrl)
        url.searchParams.set('loginid', apiKey.api_key)
        url.searchParams.set('beginday', adpnutStartDate)
        url.searchParams.set('endday', adpnutEndDate)
        url.searchParams.set('rtn_type', 'json')

        console.log('피넛테크 요청값', {
            url: url.toString().replace(apiKey.api_key, '****'),
            startDate: adpnutStartDate,
            endDate: adpnutEndDate,
        })

        const response = await fetch(RELAY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
            body: JSON.stringify({
                url: url.toString(),
                method: 'GET',
                headers: {},
            }),
        })

        if (!response.ok) {
            throw new Error(`피넛테크 API 호출 실패: ${response.status}`)
        }

        const rawText = await response.text()

        console.log('피넛테크 RAW 응답')
        console.log(rawText)

        let result: any

        try {
            result = JSON.parse(rawText)
        } catch {
            throw new Error(`피넛테크 JSON 파싱 실패: ${rawText}`)
        }

        const reports =
            Array.isArray(result)
                ? result
                : Array.isArray(result?.data)
                    ? result.data
                    : Array.isArray(result?.list)
                        ? result.list
                        : Array.isArray(result?.result)
                            ? result.result
                            : []

        return reports
            .map((row: any) => ({
                report_date: String(
                    row.date ??
                    row.day ??
                    row.regdate ??
                    row.beginday ??
                    ''
                ).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
                external_placement_name: String(
                    row.pageid ??
                    row.pageId ??
                    row.Pageid ??
                    row.zone ??
                    row.name ??
                    ''
                ).trim(),
                impressions: toNumber(
                    row.imp ??
                    row.impressions ??
                    row.view ??
                    row.pv ??
                    0
                ),
                clicks: toNumber(row.click ?? row.clicks ?? 0),
                final_purchase_amount: 0,
                revenue_amount: toNumber(
                    row.sales ??
                    row.revenue ??
                    row.amount ??
                    row.price ??
                    0
                ),
            }))
            .filter(
                (row: CollectedRow) =>
                    row.report_date && row.external_placement_name
            )
    }

    if (apiKey.provider_code === 'dable') {
        const baseUrl = apiKey.api_base_url

        if (!baseUrl) {
            throw new Error('데이블 API URL이 필요합니다.')
        }

        const url = new URL(
            `${baseUrl.replace(/\/$/, '')}/openapi/${apiKey.api_key}/stats/ctr/client/daily`
        )

        url.searchParams.set('access_key', apiKey.api_secret)
        url.searchParams.set('from_date', startDate)
        url.searchParams.set('to_date', endDate)
        url.searchParams.set('is_spread', '1')

        const response = await fetch(url.toString(), {
            method: 'GET',
            cache: 'no-store',
        })

        if (!response.ok) {
            throw new Error(`데이블 API 호출 실패: ${response.status}`)
        }

        const result = await response.json()

        console.log('🔥 데이블 API 원본 응답')
        console.log(JSON.stringify(result, null, 2))

        const services = Array.isArray(result?.result?.data)
            ? result.result.data
            : []

        const rows: CollectedRow[] = []


        for (const service of services) {
            const widgets = service.data ?? {}

            for (const widgetId of Object.keys(widgets)) {
                const widgetData = widgets[widgetId]

                const externalName =
                    String(widgetData.widgetName ?? '').trim() ||
                    String(service.widgetNameMap?.[widgetId] ?? '').trim() ||
                    String(service.serviceName ?? '').trim()

                if (!externalName) continue

                for (const dateKey of Object.keys(widgetData)) {
                    if (dateKey === 'sum' || dateKey === 'widgetName') continue

                    const stat = widgetData[dateKey]

                    if (!stat) continue

                    const revenue =
                        toNumber(stat.finalizedRevenue?.total) ||
                        toNumber(stat.estimatedRevenue?.total)

                    rows.push({
                        report_date: dateKey.replace(
                            /(\d{4})(\d{2})(\d{2})/,
                            '$1-$2-$3'
                        ),
                        external_placement_name: `${service.serviceId} / ${externalName}`,
                        impressions: toNumber(stat.impressions?.total),
                        clicks: toNumber(stat.clicks?.dsp1) || toNumber(stat.clicks?.total),
                        final_purchase_amount: 0,
                        revenue_amount: revenue,
                    })
                }
            }
        }

        return rows
    }

    throw new Error(`아직 지원하지 않는 provider_code 입니다: ${apiKey.provider_code}`)
}

export async function POST(req: NextRequest) {
    let jobId: string | null = null

    try {
        const { apiKeyId, startDate, endDate } = await req.json()

        if (!apiKeyId || !startDate || !endDate) {
            return Response.json(
                { error: 'apiKeyId, startDate, endDate가 필요합니다.' },
                { status: 400 }
            )
        }

        const { data: apiKey, error: apiKeyError } = await supabaseAdmin
            .from('ad_syndicator_api_keys')
            .select('*')
            .eq('id', apiKeyId)
            .single()

        if (apiKeyError || !apiKey) {
            return Response.json(
                { error: apiKeyError?.message ?? 'API KEY 정보를 찾을 수 없습니다.' },
                { status: 404 }
            )
        }

        if (!apiKey.is_active) {
            return Response.json(
                { error: '비활성화된 API KEY입니다.' },
                { status: 400 }
            )
        }

        let { data: source } = await supabaseAdmin
            .from('ad_external_api_sources')
            .select('id')
            .eq('provider_code', apiKey.provider_code)
            .maybeSingle()

        if (!source) {
            const { data: createdSource, error: sourceCreateError } =
                await supabaseAdmin
                    .from('ad_external_api_sources')
                    .insert({
                        name: apiKey.provider_code,
                        provider_code: apiKey.provider_code,
                        api_base_url: apiKey.api_base_url,
                        api_key: apiKey.api_key,
                        api_secret: apiKey.api_secret,
                        is_active: true,
                        memo: 'API KEY 관리에서 자동 생성',
                    })
                    .select('id')
                    .single()

            if (sourceCreateError || !createdSource) {
                throw new Error(sourceCreateError?.message ?? '외부 API 소스 생성 실패')
            }

            source = createdSource
        }

        const { data: jobData, error: jobError } = await supabaseAdmin
            .from('ad_collection_jobs')
            .insert({
                source_id: source.id,
                target_start_date: startDate,
                target_end_date: endDate,
                status: 'running',
                started_at: new Date().toISOString(),
                memo: `API KEY 수동 수집: ${apiKey.provider_code}`,
            })
            .select('id')
            .single()

        if (jobError || !jobData) {
            throw new Error(jobError?.message ?? '수집 작업 생성 실패')
        }

        jobId = jobData.id

        await supabaseAdmin
            .from('ad_syndicator_api_keys')
            .update({
                last_collect_status: 'running',
                last_error_message: null,
            })
            .eq('id', apiKeyId)

        const collectedRows = await collectByProvider(apiKey, startDate, endDate)

        const filteredRows = collectedRows.filter(
            (row) => Number(row.impressions || 0) > 100
        )

        const rawRows = filteredRows.map((row) => ({
            source_id: source.id,
            report_date: row.report_date,
            external_placement_key: row.external_placement_name,
            external_placement_name: row.external_placement_name,
            raw_data: row,
        }))

        const { error: rawError } = await supabaseAdmin
            .from('ad_external_raw_reports')
            .upsert(rawRows, {
                onConflict: 'source_id,report_date,external_placement_key',
            })

        if (rawError) {
            throw new Error(rawError.message)
        }

        const { data: mappings, error: mappingError } = await supabaseAdmin
            .from('ad_placement_mapping_rules')
            .select(`
        source_id,
        external_placement_name,
        placement_id,
        ad_placements(
          id,
          syndicator_id,
          media_company_id,
          revenue_option,
          revenue_option_value
        )
      `)
            .eq('source_id', source.id)
            .eq('is_active', true)

        if (mappingError) {
            throw new Error(mappingError.message)
        }

        const mappingMap = new Map<string, any>()

            ; (mappings ?? []).forEach((item: any) => {
                if (item.external_placement_name) {
                    mappingMap.set(item.external_placement_name, item)
                }
            })

        const reportRows = []

        for (const raw of rawRows) {
            const mapping = mappingMap.get(raw.external_placement_name)

            if (!mapping?.ad_placements) continue

            const placement = mapping.ad_placements
            const rawData = raw.raw_data

            const impressions = Number(rawData.impressions || 0)

            if (impressions <= 100) continue

            reportRows.push({
                report_date: raw.report_date,
                syndicator_id: placement.syndicator_id,
                media_company_id: placement.media_company_id,
                placement_id: placement.id,
                revenue_option: placement.revenue_option,
                revenue_option_value: placement.revenue_option_value,
                impressions,
                clicks: Number(rawData.clicks || 0),
                purchase_amount: Number(rawData.final_purchase_amount || 0),
                cancel_amount: 0,
                final_purchase_amount: Number(rawData.final_purchase_amount || 0),
                revenue_amount: Number(rawData.revenue_amount || 0),
                source: apiKey.provider_code,
                memo: `API 수집: ${raw.external_placement_name}`,
            })
        }

        if (reportRows.length > 0) {
            const { error: reportError } = await supabaseAdmin
                .from('ad_report_rows')
                .upsert(reportRows, {
                    onConflict: 'report_date,placement_id,source',
                })

            if (reportError) {
                throw new Error(reportError.message)
            }
        }

        await supabaseAdmin
            .from('ad_collection_jobs')
            .update({
                status: 'success',
                success_count: rawRows.length,
                failed_count: 0,
                finished_at: new Date().toISOString(),
            })
            .eq('id', jobId)

        await supabaseAdmin
            .from('ad_syndicator_api_keys')
            .update({
                last_used_at: new Date().toISOString(),
                last_collected_at: new Date().toISOString(),
                last_collect_status: 'success',
                last_error_message: null,
            })
            .eq('id', apiKeyId)

        return Response.json({
            success: true,
            rawCount: rawRows.length,
            reportCount: reportRows.length,
        })
    } catch (error) {
        const message =
            error instanceof Error ? error.message : '알 수 없는 오류'

        if (jobId) {
            await supabaseAdmin
                .from('ad_collection_jobs')
                .update({
                    status: 'failed',
                    failed_count: 1,
                    error_message: message,
                    finished_at: new Date().toISOString(),
                })
                .eq('id', jobId)
        }

        const body = await req.json().catch(() => null)

        if (body?.apiKeyId) {
            await supabaseAdmin
                .from('ad_syndicator_api_keys')
                .update({
                    last_collect_status: 'failed',
                    last_error_message: message,
                    last_collected_at: new Date().toISOString(),
                })
                .eq('id', body.apiKeyId)
        }

        return Response.json({ error: message }, { status: 500 })
    }
}