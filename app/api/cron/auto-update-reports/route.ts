import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getKstDate(offsetDays: number) {
    const now = new Date()
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)

    kst.setDate(kst.getDate() + offsetDays)

    const yyyy = kst.getUTCFullYear()
    const mm = String(kst.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(kst.getUTCDate()).padStart(2, '0')

    return `${yyyy}-${mm}-${dd}`
}

export async function GET(req: NextRequest) {
    try {
        const secret = req.nextUrl.searchParams.get('secret')

        if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            )
        }

        const baseUrl =
            process.env.NEXT_PUBLIC_SITE_URL || 'https://reports.adrelay.kr'

        const yesterday = getKstDate(-1)
        const twoDaysAgo = getKstDate(-2)

        const targetDates = [yesterday, twoDaysAgo]

        const { data: apiKeys, error: apiKeyError } = await supabaseAdmin
            .from('ad_syndicator_api_keys')
            .select('id, provider_code, is_active')
            .eq('is_active', true)

        if (apiKeyError) {
            throw new Error(apiKeyError.message)
        }

        const results = []

        for (const apiKey of apiKeys ?? []) {
            for (const targetDate of targetDates) {
                try {
                    const res = await fetch(`${baseUrl}/api/collect-api-key`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        cache: 'no-store',
                        body: JSON.stringify({
                            apiKeyId: apiKey.id,
                            startDate: targetDate,
                            endDate: targetDate,
                        }),
                    })

                    const json = await res.json().catch(() => null)

                    results.push({
                        apiKeyId: apiKey.id,
                        providerCode: apiKey.provider_code,
                        targetDate,
                        success: res.ok,
                        status: res.status,
                        result: json,
                    })
                } catch (error) {
                    results.push({
                        apiKeyId: apiKey.id,
                        providerCode: apiKey.provider_code,
                        targetDate,
                        success: false,
                        status: 500,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    })
                }
            }
        }

        const successCount = results.filter((item) => item.success).length
        const failedCount = results.filter((item) => !item.success).length

        return NextResponse.json({
            success: failedCount === 0,
            message: '자동 리포트 업데이트 실행 완료',
            targetDates,
            totalCount: results.length,
            successCount,
            failedCount,
            results,
        })
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}