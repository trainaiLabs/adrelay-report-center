import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
    let jobId: string | null = null

    try {
        const body = await req.json()
        const { sourceId, targetDate } = body

        if (!sourceId || !targetDate) {
            return Response.json(
                { error: 'sourceId와 targetDate가 필요합니다.' },
                { status: 400 }
            )
        }

        const { data: jobData, error: jobCreateError } = await supabaseAdmin
            .from('ad_collection_jobs')
            .insert({
                source_id: sourceId,
                target_start_date: targetDate,
                target_end_date: targetDate,
                status: 'running',
                started_at: new Date().toISOString(),
                memo: '테스트 수동 수집',
            })
            .select('id')
            .single()

        if (jobCreateError) {
            return Response.json(
                { error: jobCreateError.message },
                { status: 500 }
            )
        }

        jobId = jobData.id

        const mockRows = [
            {
                external_placement_name: '국제뉴스상단',
                impressions: 120000,
                clicks: 350,
                final_purchase_amount: 0,
                revenue_amount: 50000,
            },
            {
                external_placement_name: '국제뉴스하단',
                impressions: 80000,
                clicks: 210,
                final_purchase_amount: 0,
                revenue_amount: 30000,
            },
        ]

        const rawRows = mockRows.map((row) => ({
            source_id: sourceId,
            report_date: targetDate,
            external_placement_key: row.external_placement_name,
            external_placement_name: row.external_placement_name,
            raw_data: row,
        }))

        const { error } = await supabaseAdmin
            .from('ad_external_raw_reports')
            .upsert(rawRows, {
                onConflict: 'source_id,report_date,external_placement_key',
            })

        if (error) {
            await supabaseAdmin
                .from('ad_collection_jobs')
                .update({
                    status: 'failed',
                    finished_at: new Date().toISOString(),
                    failed_count: rawRows.length,
                    error_message: error.message,
                })
                .eq('id', jobId)

            return Response.json({ error: error.message }, { status: 500 })
        }

        await supabaseAdmin
            .from('ad_collection_jobs')
            .update({
                status: 'success',
                finished_at: new Date().toISOString(),
                success_count: rawRows.length,
                failed_count: 0,
            })
            .eq('id', jobId)

        return Response.json({
            success: true,
            message: '테스트 수집 완료',
            count: rawRows.length,
            jobId,
        })
    } catch (error) {
        console.error(error)

        if (jobId) {
            await supabaseAdmin
                .from('ad_collection_jobs')
                .update({
                    status: 'failed',
                    finished_at: new Date().toISOString(),
                    error_message:
                        error instanceof Error ? error.message : '알 수 없는 오류',
                })
                .eq('id', jobId)
        }

        return Response.json(
            { error: '수집 테스트 실패' },
            { status: 500 }
        )
    }
}