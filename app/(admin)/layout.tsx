'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import AdminSidebar from '@/components/admin-sidebar'
import AdminHeader from '@/components/admin-header'
import { supabase } from '@/lib/supabase/client'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const [checking, setChecking] = useState(true)

    useEffect(() => {
        checkAccess()
    }, [pathname])

    async function checkAccess() {
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            router.push('/login')
            return
        }

        const { data } = await supabase
            .from('ad_admin_users')
            .select('role, is_active')
            .eq('auth_user_id', user.id)
            .single()

        if (!data || !data.is_active) {
            await supabase.auth.signOut()
            router.push('/login')
            return
        }

        const readonlyRoles = ['manager_readonly', 'syndicator']

        const readonlyAllowedPaths = [
            '/reports',
            '/daily-sales',
        ]

        if (
            readonlyRoles.includes(data.role) &&
            !readonlyAllowedPaths.some((path) =>
                pathname.startsWith(path)
            )
        ) {
            router.replace('/reports')
            return
        }

        setChecking(false)
    }

    if (checking) {
        return (
            <div className="min-h-screen bg-zinc-50 p-6 text-sm text-zinc-500">
                권한 확인 중...
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-50">
            <AdminSidebar />

            <div className="min-h-screen lg:pl-72">
                <AdminHeader />

                <main>{children}</main>
            </div>
        </div>
    )
}