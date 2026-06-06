'use client'

import { useEffect, useState } from 'react'
import {
    BarChart3,
    ChevronDown,
    KeyRound,
    LogOut,
    X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type AdminProfile = {
    name: string
    role: string
    email: string
}

export default function AdminHeader() {
    const [profile, setProfile] = useState<AdminProfile | null>(null)
    const [menuOpen, setMenuOpen] = useState(false)
    const [passwordModalOpen, setPasswordModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    })

    useEffect(() => {
        loadProfile()
    }, [])

    async function loadProfile() {
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data } = await supabase
            .from('ad_admin_users')
            .select('name, role')
            .eq('auth_user_id', user.id)
            .single()

        if (data) {
            setProfile({
                name: data.name,
                role: data.role,
                email: user.email ?? '',
            })
        }
    }

    function getRoleLabel(role: string) {
        if (role === 'super_admin') return '슈퍼관리자'
        if (role === 'manager_full') return '전체관리자'
        if (role === 'manager_readonly') return '읽기관리자'
        if (role === 'syndicator') return '신디사'
        return role
    }

    function resetPasswordForm() {
        setPasswordForm({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        })
    }

    async function handleChangePassword() {
        if (!profile?.email) {
            alert('로그인 정보를 확인할 수 없습니다.')
            return
        }

        if (!passwordForm.currentPassword.trim()) {
            alert('기존 비밀번호를 입력해 주세요.')
            return
        }

        if (!passwordForm.newPassword.trim()) {
            alert('새 비밀번호를 입력해 주세요.')
            return
        }

        if (passwordForm.newPassword.length < 6) {
            alert('새 비밀번호는 6자 이상 입력해 주세요.')
            return
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            alert('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.')
            return
        }

        setSaving(true)

        const { error: verifyError } =
            await supabase.auth.signInWithPassword({
                email: profile.email,
                password: passwordForm.currentPassword,
            })

        if (verifyError) {
            setSaving(false)
            alert('기존 비밀번호가 올바르지 않습니다.')
            return
        }

        const { error: updateError } =
            await supabase.auth.updateUser({
                password: passwordForm.newPassword,
            })

        setSaving(false)

        if (updateError) {
            alert(`비밀번호 변경 실패: ${updateError.message}`)
            return
        }

        alert('비밀번호가 변경되었습니다. 다시 로그인해 주세요.')

        resetPasswordForm()
        setPasswordModalOpen(false)
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    async function handleLogout() {
        const ok = confirm('로그아웃할까요?')

        if (!ok) return

        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    return (
        <header className="border-b border-zinc-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-white">
                        <BarChart3 size={22} />
                    </div>

                    <div>
                        <h1 className="text-xl font-bold text-zinc-950">
                            AdRelay Report Center
                        </h1>
                        <p className="text-sm font-medium text-zinc-800">
                            광고 리포트 관리자
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left hover:bg-zinc-50"
                    >
                        <div>
                            <div className="text-sm font-semibold text-zinc-950">
                                관리자명: {profile?.name ?? '-'}
                            </div>
                            <div className="text-sm font-medium text-zinc-800">
                                권한: {profile ? getRoleLabel(profile.role) : '-'}
                            </div>
                        </div>

                        <ChevronDown size={16} className="text-zinc-400" />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                            <button
                                onClick={() => {
                                    setMenuOpen(false)
                                    setPasswordModalOpen(true)
                                }}
                                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-zinc-50"
                            >
                                <KeyRound size={16} />
                                비밀번호 변경
                            </button>

                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center gap-2 border-t border-zinc-100 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                            >
                                <LogOut size={16} />
                                로그아웃
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {passwordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                            <h2 className="font-semibold">비밀번호 변경</h2>

                            <button
                                onClick={() => {
                                    resetPasswordForm()
                                    setPasswordModalOpen(false)
                                }}
                                className="rounded-lg p-1 hover:bg-zinc-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4 p-5">
                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    기존 비밀번호
                                </label>
                                <input
                                    type="password"
                                    value={passwordForm.currentPassword}
                                    onChange={(e) =>
                                        setPasswordForm({
                                            ...passwordForm,
                                            currentPassword: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    placeholder="기존 비밀번호"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    새 비밀번호
                                </label>
                                <input
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) =>
                                        setPasswordForm({
                                            ...passwordForm,
                                            newPassword: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    placeholder="6자 이상"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">
                                    새 비밀번호 확인
                                </label>
                                <input
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) =>
                                        setPasswordForm({
                                            ...passwordForm,
                                            confirmPassword: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    placeholder="새 비밀번호 확인"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4">
                            <button
                                onClick={() => {
                                    resetPasswordForm()
                                    setPasswordModalOpen(false)
                                }}
                                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
                            >
                                취소
                            </button>

                            <button
                                onClick={handleChangePassword}
                                disabled={saving}
                                className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                            >
                                {saving ? '변경 중...' : '비밀번호 변경'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    )
}