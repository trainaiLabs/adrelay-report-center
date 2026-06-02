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

        const { loginId, email, password, name, phone, role, memo } = body

        if (!loginId || !email || !password || !name || !role) {
            return Response.json(
                { error: '아이디, 이메일, 비밀번호, 이름, 권한은 필수입니다.' },
                { status: 400 }
            )
        }

        const normalizedLoginId = String(loginId).trim()
        const normalizedEmail = String(email).trim().toLowerCase()

        const { data: existingAdmin } = await supabaseAdmin
            .from('ad_admin_users')
            .select('id')
            .or(`login_id.eq.${normalizedLoginId},email.eq.${normalizedEmail}`)
            .maybeSingle()

        if (existingAdmin) {
            return Response.json(
                { error: '이미 사용 중인 아이디 또는 이메일입니다.' },
                { status: 409 }
            )
        }

        const { data: authData, error: authError } =
            await supabaseAdmin.auth.admin.createUser({
                email: normalizedEmail,
                password,
                email_confirm: true,
            })

        if (authError || !authData.user) {
            return Response.json(
                { error: authError?.message ?? 'Auth 계정 생성 실패' },
                { status: 500 }
            )
        }

        const { data: adminUserData, error: adminError } = await supabaseAdmin
            .from('ad_admin_users')
            .insert({
                auth_user_id: authData.user.id,
                login_id: normalizedLoginId,
                email: normalizedEmail,
                name,
                phone: phone || null,
                role,
                is_active: true,
                memo: memo || null,
            })
            .select('id')
            .single()

        if (adminError || !adminUserData) {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id)

            return Response.json(
                { error: adminError?.message ?? '관리자 정보 생성 실패' },
                { status: 500 }
            )
        }

        return Response.json({
            success: true,
            userId: authData.user.id,
            adminUserId: adminUserData.id,
        })
    } catch (error) {
        console.error(error)

        return Response.json(
            { error: '관리자 생성 중 오류가 발생했습니다.' },
            { status: 500 }
        )
    }
}