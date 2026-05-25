'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    BarChart3,
    FileText,
    Building2,
    Newspaper,
    LayoutGrid,
    RefreshCw,
    KeyRound,
    Users,
    CalendarDays,
    Link2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

const menus = [
    {
        href: '/dashboard',
        label: '대시보드',
        icon: BarChart3,
        roles: ['super_admin', 'manager_full'],
    },
    {
        href: '/reports',
        label: '리포트',
        icon: FileText,
        roles: ['super_admin', 'manager_full', 'manager_readonly', 'syndicator'],
    },
    {
        href: '/daily-sales',
        label: '일일매출보고',
        icon: CalendarDays,
        roles: ['super_admin', 'manager_full'],
    },
    {
        href: '/syndicators',
        label: '신디사 관리',
        icon: Building2,
        roles: ['super_admin', 'manager_full'],
    },
    {
        href: '/media',
        label: '매체 관리',
        icon: Newspaper,
        roles: ['super_admin', 'manager_full'],
    },
    {
        href: '/placements',
        label: '지면 관리',
        icon: LayoutGrid,
        roles: ['super_admin', 'manager_full'],
    },
    {
        href: '/collection',
        label: '데이터 수집 관리',
        icon: RefreshCw,
        roles: ['super_admin', 'manager_full'],
    },
    {
        href: '/collection/unmatched',
        label: '미매칭 데이터',
        icon: Link2,
        roles: ['super_admin', 'manager_full'],
    },
    {
        href: '/api-keys',
        label: 'API KEY 관리',
        icon: KeyRound,
        roles: ['super_admin', 'manager_full'],
    },
    {
        href: '/admins',
        label: '관리자 관리',
        icon: Users,
        roles: ['super_admin'],
    },
]

export default function AdminSidebar() {
    const pathname = usePathname()
    const [adminRole, setAdminRole] = useState('')

    useEffect(() => {
        loadAdminRole()
    }, [])

    async function loadAdminRole() {
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data } = await supabase
            .from('ad_admin_users')
            .select('role')
            .eq('auth_user_id', user.id)
            .single()

        if (data) {
            setAdminRole(data.role)
        }
    }

    const visibleMenus = menus.filter((menu) =>
        menu.roles.includes(adminRole)
    )

    return (
        <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 border-r border-zinc-200 bg-white px-4 py-5 lg:block">
            <div className="mb-8 flex items-center gap-3 px-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-white">
                    <BarChart3 size={22} />
                </div>

                <div>
                    <h1 className="text-lg font-bold">AdRelay</h1>
                    <p className="text-xs text-zinc-500">Report Center</p>
                </div>
            </div>

            <nav className="space-y-1">
                {visibleMenus.map((item) => {
                    const Icon = item.icon
                    const active =
                        pathname === item.href ||
                        (item.href !== '/collection' &&
                            pathname.startsWith(`${item.href}/`))

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${active
                                ? 'bg-black text-white'
                                : 'text-zinc-600 hover:bg-zinc-100 hover:text-black'
                                }`}
                        >
                            <Icon size={18} />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>
        </aside>
    )
}