import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function formatDate(date: string | null) {
    return date?.trim() || ''
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)

        const apiKey = searchParams.get('apiKey')
        const startDate = formatDate(searchParams.get('startDate'))
        const endDate = formatDate(searchParams.get('endDate'))

        if (!apiKey || !startDate || !endDate) {
            return Response.json(
                {
                    success: false,
                    error: 'apiKey, startDate, endDate가 필요합니다.',
                },
                { status: 400 }
            )
        }

        const { data: keyData, error: keyError } = await supabaseAdmin
            .from('ad_report_api_keys')
            .select(`
                id,
                api_key,
                is_active,
                syndicator_id,
                ad_syndicators (
                    id,
                    name
                )
            `)
            .eq('api_key', apiKey)
            .eq('is_active', true)
            .single()

        console.log('API KEY 조회 결과')
        console.log(JSON.stringify(keyData, null, 2))

        if (keyError || !keyData) {
            return Response.json(
                {
                    success: false,
                    error: '유효하지 않은 API KEY입니다.',
                },
                { status: 401 }
            )
        }

        const { data: rows, error: rowsError } = await supabaseAdmin
            .from('ad_report_rows')
            .select(`
                report_date,
                impressions,
                clicks,
                purchase_amount,
                cancel_amount,
                final_purchase_amount,
                ad_cost,
                revenue_amount,
                final_profit_amount,
                source,
                ad_media_companies (
                    name
                ),
                ad_placements (
                    name,
                    revenue_option,
                    revenue_option_value
                )
            `)
            .eq('syndicator_id', keyData.syndicator_id)
            .gte('report_date', startDate)
            .lte('report_date', endDate)
            .order('report_date', { ascending: true })
            .order('created_at', { ascending: true })

        if (rowsError) {
            return Response.json(
                {
                    success: false,
                    error: rowsError.message,
                },
                { status: 500 }
            )
        }

        return Response.json({
            success: true,
            syndicator: Array.isArray(keyData.ad_syndicators)
                ? keyData.ad_syndicators[0]?.name ?? ''
                : keyData.ad_syndicators?.name ?? '',
            startDate,
            endDate,
            count: rows?.length ?? 0,
            data: (rows ?? []).map((row: any) => ({
                date: row.report_date,
                mediaName: row.ad_media_companies?.name ?? '',
                placementName: row.ad_placements?.name ?? '',
                revenueOption: row.ad_placements?.revenue_option ?? '',
                revenueOptionValue: row.ad_placements?.revenue_option_value ?? 0,
                impressions: row.impressions ?? 0,
                clicks: row.clicks ?? 0,
                purchaseAmount: row.purchase_amount ?? 0,
                cancelAmount: row.cancel_amount ?? 0,
                finalPurchaseAmount: row.final_purchase_amount ?? 0,
                adCost: row.ad_cost ?? 0,
                revenueAmount: row.revenue_amount ?? 0,
                finalProfitAmount: row.final_profit_amount ?? 0,
                source: row.source ?? '',
            })),
        })
    } catch (error) {
        return Response.json(
            {
                success: false,
                error: '리포트 API 처리 실패',
            },
            { status: 500 }
        )
    }
}