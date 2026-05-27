import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { sourceId, targetDate } = body

        if (!sourceId || !targetDate) {
            return Response.json(
                { error: 'sourceId와 targetDate가 필요합니다.' },
                { status: 400 }
            )
        }

        const { data: rawReports, error: rawError } = await supabaseAdmin
            .from('ad_external_raw_reports')
            .select(`
        *,
        ad_external_api_sources (
            provider_code
        )
    `)
            .eq('source_id', sourceId)
            .eq('report_date', targetDate)

        if (rawError) {
            return Response.json({ error: rawError.message }, { status: 500 })
        }

        if (!rawReports || rawReports.length === 0) {
            return Response.json({
                success: true,
                message: '처리할 원본 데이터가 없습니다.',
                count: 0,
            })
        }

        const { data: mappings, error: mappingError } = await supabaseAdmin
            .from('ad_placement_mapping_rules')
            .select(`
        id,
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
            .eq('source_id', sourceId)
            .eq('is_active', true)

        if (mappingError) {
            return Response.json({ error: mappingError.message }, { status: 500 })
        }

        const mappingMap = new Map<string, any>()

            ; (mappings ?? []).forEach((item: any) => {
                if (item.external_placement_name) {
                    mappingMap.set(item.external_placement_name, item)
                }
            })

        const reportRows = []

        for (const raw of rawReports) {
            const externalName = raw.external_placement_name

            if (!externalName) continue

            const mapping = mappingMap.get(externalName)

            if (!mapping?.ad_placements) continue

            const placement = mapping.ad_placements
            const rawData = raw.raw_data || {}

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

                source:
                    raw.ad_external_api_sources?.provider_code || 'api',
                memo: `자동수집: ${externalName}`,
            })
        }

        if (reportRows.length === 0) {
            return Response.json({
                success: true,
                message: '매칭된 데이터가 없습니다.',
                count: 0,
            })
        }

        const { error: upsertError } = await supabaseAdmin
            .from('ad_report_rows')
            .upsert(reportRows, {
                onConflict: 'report_date,placement_id,source',
            })

        if (upsertError) {
            return Response.json({ error: upsertError.message }, { status: 500 })
        }

        return Response.json({
            success: true,
            message: '리포트 생성 완료',
            count: reportRows.length,
        })
    } catch (error) {
        console.error(error)

        return Response.json(
            { error: '원본 데이터 처리 실패' },
            { status: 500 }
        )
    }
}