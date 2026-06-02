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
        const loginId = String(body.loginId ?? '').trim()

        if (!loginId) {
            return Response.json(
                { error: '아이디를 입력해 주세요.' },
                { status: 400 }
            )
        }

        const { data, error } = await supabaseAdmin
            .from('ad_admin_users')
            .select('email, is_active')
            .eq('login_id', loginId)
            .single()

        if (error || !data?.email) {
            return Response.json(
                { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
                { status: 401 }
            )
        }

        if (!data.is_active) {
            return Response.json(
                { error: '비활성화된 관리자 계정입니다.' },
                { status: 403 }
            )
        }

        return Response.json({
            email: data.email,
        })
    } catch (error) {
        console.error(error)

        return Response.json(
            { error: '로그인 확인 중 오류가 발생했습니다.' },
            { status: 500 }
        )
    }
}