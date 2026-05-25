'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
    BarChart3,
    Building2,
    FileText,
    LogOut,
    RefreshCw,
    Wallet,
    ChevronDown,
} from 'lucide-react'

type AdminInfo = {
    name: string
    role: string
}

export default function DashboardPage() {
    const router = useRouter()

    const [admin, setAdmin] = useState<AdminInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [menuOpen, setMenuOpen] = useState(false)

    useEffect(() => {
        loadAdmin()
    }, [])

    async function loadAdmin() {
        const { data: authData } = await supabase.auth.getUser()

        if (!authData.user) {
            router.push('/login')
            return
        }

        const { data, error } = await supabase
            .from('ad_admin_users')
            .select('name, role')
            .eq('auth_user_id', authData.user.id)
            .single()

        if (error || !data) {
            router.push('/login')
            return
        }

        setAdmin(data)
        setLoading(false)
    }

    async function handleLogout() {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-zinc-50 p-6">
                <div className="text-sm text-zinc-500">불러오는 중...</div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-zinc-50">
            <div className="mx-auto max-w-7xl px-4 py-6">
                <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">대시보드</h2>
                            <p className="mt-1 text-sm text-zinc-500">
                                오늘 기준 광고비와 리포트 상태를 확인합니다.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={loadAdmin}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
                        >
                            <RefreshCw size={16} />
                            새로고침
                        </button>
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-500">오늘 광고비</p>
                            <Wallet size={20} className="text-zinc-400" />
                        </div>
                        <h3 className="mt-3 text-3xl font-bold">0원</h3>
                        <p className="mt-2 text-xs text-zinc-400">오늘 수집된 데이터 기준</p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-500">이번 달 광고비</p>
                            <BarChart3 size={20} className="text-zinc-400" />
                        </div>
                        <h3 className="mt-3 text-3xl font-bold">0원</h3>
                        <p className="mt-2 text-xs text-zinc-400">월 누적 리포트 기준</p>
                    </div>

                    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-500">관리 지면 수</p>
                            <Building2 size={20} className="text-zinc-400" />
                        </div>
                        <h3 className="mt-3 text-3xl font-bold">0개</h3>
                        <p className="mt-2 text-xs text-zinc-400">활성 지면 기준</p>
                    </div>
                </section>

                <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-lg font-semibold">빠른 메뉴</h2>
                        <span className="text-sm text-zinc-500">준비 중</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <button className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4 text-left hover:bg-zinc-50">
                            <FileText size={20} />
                            <div>
                                <div className="font-medium">리포트</div>
                                <div className="text-sm text-zinc-500">일자별 광고 리포트</div>
                            </div>
                        </button>

                        <button className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4 text-left hover:bg-zinc-50">
                            <Building2 size={20} />
                            <div>
                                <div className="font-medium">신디사 관리</div>
                                <div className="text-sm text-zinc-500">신디사 및 접근 권한</div>
                            </div>
                        </button>

                        <button className="flex items-center gap-3 rounded-xl border border-zinc-200 p-4 text-left hover:bg-zinc-50">
                            <RefreshCw size={20} />
                            <div>
                                <div className="font-medium">데이터 수집</div>
                                <div className="text-sm text-zinc-500">자동/수동 수집 관리</div>
                            </div>
                        </button>
                    </div>
                </section>
            </div>
        </main>
    )
}