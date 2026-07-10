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

        const apiKey =
            req.headers.get('x-api-key') ||
            req.headers.get('X-API-KEY')
        const startDate = formatDate(searchParams.get('startDate'))
        const endDate = formatDate(searchParams.get('endDate'))

        if (!apiKey || !startDate || !endDate) {
            return Response.json(
                {
                    success: false,
                    error: 'x-api-key 헤더, startDate, endDate가 필요합니다.',
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
                ad_cost,                
                ad_media_companies (
                    name
                ),
                ad_placements (
                    name,                    
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

        const syndicatorInfo = keyData.ad_syndicators as any
        const syndicatorName = Array.isArray(syndicatorInfo)
            ? syndicatorInfo[0]?.name ?? ''
            : syndicatorInfo?.name ?? ''

        return Response.json({
            success: true,
            syndicator: syndicatorName,
            startDate,
            endDate,
            count: rows?.length ?? 0,
            data: (rows ?? []).map((row: any) => ({
                date: row.report_date,
                mediaName: row.ad_media_companies?.name ?? '',
                placementName: row.ad_placements?.name ?? '',
                impressions: row.impressions ?? 0,
                clicks: row.clicks ?? 0,
                adCost: row.ad_cost ?? 0,
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