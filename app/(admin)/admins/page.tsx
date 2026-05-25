'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import Pagination from '@/components/pagination'
import {
    Pencil,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    ToggleLeft,
    ToggleRight,
    X,
} from 'lucide-react'

type AdminUser = {
    id: string
    auth_user_id: string | null
    login_id: string
    name: string
    phone: string | null
    role: string
    is_active: boolean
    memo: string | null
    created_at: string
}

type SyndicatorOption = {
    id: string
    name: string
}

export default function AdminsPage() {
    const [items, setItems] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(false)
    const [keyword, setKeyword] = useState('')

    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [totalCount, setTotalCount] = useState(0)
    const [modalOpen, setModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editingItem, setEditingItem] = useState<AdminUser | null>(null)
    const [syndicators, setSyndicators] = useState<SyndicatorOption[]>([])
    const [selectedSyndicatorIds, setSelectedSyndicatorIds] = useState<string[]>([])

    const [form, setForm] = useState({
        email: '',
        password: '',
        name: '',
        phone: '',
        role: 'manager_readonly',
        memo: '',
    })

    const [searchParams, setSearchParams] = useState({
        keyword: '',
    })

    const totalPages = Math.ceil(totalCount / pageSize)

    useEffect(() => {
        loadSyndicators()
    }, [])

    useEffect(() => {
        loadItems()
    }, [page, pageSize, searchParams])

    async function loadItems() {
        setLoading(true)

        let query = supabase
            .from('ad_admin_users')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })

        if (searchParams.keyword.trim()) {
            const keywordText = searchParams.keyword.trim()

            query = query.or(
                `login_id.ilike.%${keywordText}%,name.ilike.%${keywordText}%,phone.ilike.%${keywordText}%`
            )
        }

        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        query = query.range(from, to)

        const { data, error, count } = await query

        if (!error && data) {
            setItems(data as AdminUser[])
            setTotalCount(count ?? 0)
        }

        setLoading(false)
    }

    async function loadSyndicators() {
        const { data } = await supabase
            .from('ad_syndicators')
            .select('id, name')
            .order('name')

        if (data) {
            setSyndicators(data)
        }
    }

    function getRoleLabel(role: string) {
        if (role === 'super_admin') return '슈퍼관리자'
        if (role === 'manager_full') return '전체관리자'
        if (role === 'manager_readonly') return '읽기관리자'
        if (role === 'syndicator') return '신디사'
        return role
    }

    function getRoleBadge(role: string) {
        if (role === 'super_admin') return 'bg-black text-white'
        if (role === 'manager_full') return 'bg-blue-50 text-blue-700'
        if (role === 'manager_readonly') return 'bg-zinc-100 text-zinc-700'
        if (role === 'syndicator') return 'bg-purple-50 text-purple-700'
        return 'bg-zinc-100 text-zinc-700'
    }

    function formatPhoneNumber(value: string) {
        const numbers = value.replace(/[^0-9]/g, '')

        if (numbers.length < 4) return numbers

        if (numbers.length < 8) {
            return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
        }

        return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(
            7,
            11
        )}`
    }

    function resetForm() {
        setForm({
            email: '',
            password: '',
            name: '',
            phone: '',
            role: 'manager_readonly',
            memo: '',
        })
        setSelectedSyndicatorIds([])
    }

    function openCreateModal() {
        resetForm()
        setEditingItem(null)
        setModalOpen(true)
    }

    function openEditModal(item: AdminUser) {
        setEditingItem(item)

        setForm({
            email: item.login_id,
            password: '',
            name: item.name,
            phone: item.phone ?? '',
            role: item.role,
            memo: item.memo ?? '',
        })

        setModalOpen(true)

        loadAdminSyndicatorAccess(item.id)
    }

    async function loadAdminSyndicatorAccess(adminUserId: string) {
        const { data } = await supabase
            .from('ad_admin_syndicator_access')
            .select('syndicator_id')
            .eq('admin_user_id', adminUserId)

        if (data) {
            setSelectedSyndicatorIds(data.map((item) => item.syndicator_id))
        }
    }

    async function saveAdminSyndicatorAccess(adminUserId: string) {
        await supabase
            .from('ad_admin_syndicator_access')
            .delete()
            .eq('admin_user_id', adminUserId)

        if (selectedSyndicatorIds.length === 0) return

        const rows = selectedSyndicatorIds.map((syndicatorId) => ({
            admin_user_id: adminUserId,
            syndicator_id: syndicatorId,
        }))

        const { error } = await supabase
            .from('ad_admin_syndicator_access')
            .insert(rows)

        if (error) {
            throw new Error(error.message)
        }
    }

    async function handleUpdateAdmin() {
        if (!editingItem) return

        if (!form.name.trim()) {
            alert('이름을 입력해 주세요.')
            return
        }

        setSaving(true)

        const { error } = await supabase
            .from('ad_admin_users')
            .update({
                name: form.name.trim(),
                phone: form.phone.trim() || null,
                role: form.role,
                memo: form.memo.trim() || null,
            })
            .eq('id', editingItem.id)

        setSaving(false)

        if (error) {
            alert(`수정 실패: ${error.message}`)
            return
        }

        try {
            await saveAdminSyndicatorAccess(editingItem.id)
        } catch (error) {
            alert(
                error instanceof Error
                    ? `접근 신디사 저장 실패: ${error.message}`
                    : '접근 신디사 저장 실패'
            )
            return
        }

        alert('수정되었습니다.')
        resetForm()
        setEditingItem(null)
        setModalOpen(false)
        setPage(1)
        setSearchParams({ keyword })
    }

    async function handleToggleActive(item: AdminUser) {
        const nextActive = !item.is_active

        const ok = confirm(
            `'${item.name}' 계정을 ${nextActive ? '활성화' : '비활성화'}할까요?`
        )

        if (!ok) return

        const { error } = await supabase
            .from('ad_admin_users')
            .update({
                is_active: nextActive,
            })
            .eq('id', item.id)

        if (error) {
            alert(`상태 변경 실패: ${error.message}`)
            return
        }

        loadItems()
    }

    async function handleDeleteAdmin(item: AdminUser) {
        const ok = confirm(
            `'${item.name}' 계정을 삭제할까요?\n삭제 후 로그인할 수 없습니다.`
        )

        if (!ok) return

        const { error } = await supabase
            .from('ad_admin_users')
            .delete()
            .eq('id', item.id)

        if (error) {
            alert(`삭제 실패: ${error.message}`)
            return
        }

        alert('삭제되었습니다.')
        loadItems()
    }

    async function handleCreateAdmin() {
        if (!form.email.trim()) {
            alert('이메일을 입력해 주세요.')
            return
        }

        if (!form.password.trim()) {
            alert('비밀번호를 입력해 주세요.')
            return
        }

        if (!form.name.trim()) {
            alert('이름을 입력해 주세요.')
            return
        }

        setSaving(true)

        try {
            const response = await fetch('/api/admin-users/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: form.email.trim(),
                    password: form.password.trim(),
                    name: form.name.trim(),
                    phone: form.phone.trim() || null,
                    role: form.role,
                    memo: form.memo.trim() || null,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                alert(`관리자 등록 실패: ${result.error}`)
                return
            }

            if (result.adminUserId) {
                try {
                    await saveAdminSyndicatorAccess(result.adminUserId)
                } catch (error) {
                    alert(
                        error instanceof Error
                            ? `관리자는 등록됐지만 접근 신디사 저장 실패: ${error.message}`
                            : '관리자는 등록됐지만 접근 신디사 저장 실패'
                    )
                    return
                }
            }

            alert('관리자가 등록되었습니다.')
            resetForm()
            setModalOpen(false)
            setPage(1)
            setSearchParams({ keyword })
        } catch (error) {
            console.error(error)
            alert('관리자 등록 중 오류가 발생했습니다.')
        } finally {
            setSaving(false)
        }
    }

    function formatPhone(phone: string | null) {
        if (!phone) return '-'

        const numbers = phone.replace(/\D/g, '')

        if (numbers.length === 11) {
            return numbers.replace(
                /(\d{3})(\d{4})(\d{4})/,
                '$1-$2-$3'
            )
        }

        if (numbers.length === 10) {
            return numbers.replace(
                /(\d{3})(\d{3})(\d{4})/,
                '$1-$2-$3'
            )
        }

        return phone
    }

    return (
        <main className="min-h-screen bg-zinc-50 px-4 py-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="text-xl font-bold">관리자 관리</h1>
                            <p className="mt-1 text-sm text-zinc-500">
                                로그인 가능한 관리자와 신디사 계정 권한을 관리합니다.
                            </p>
                        </div>

                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800"
                        >
                            <Plus size={16} />
                            관리자 등록
                        </button>
                    </div>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row">
                        <div className="relative flex-1">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                            />

                            <input
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setPage(1)
                                        setSearchParams({ keyword })
                                    }
                                }}
                                placeholder="아이디, 이름, 연락처 검색"
                                className="w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm"
                            />
                        </div>

                        <button
                            onClick={() => {
                                setPage(1)
                                setSearchParams({ keyword })
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800"
                        >
                            <Search size={16} />
                            검색
                        </button>

                        <button
                            onClick={() => {
                                setKeyword('')
                                setPage(1)
                                setSearchParams({ keyword: '' })
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
                        >
                            <RefreshCw size={16} />
                            초기화
                        </button>
                    </div>
                </section>

                <section className="hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:block">
                    <table className="w-full text-sm">
                        <thead className="border-b border-zinc-200 bg-zinc-100 text-zinc-600">
                            <tr>
                                <th className="pl-6 pr-4 py-3 text-left text-sm font-semibold">
                                    아이디
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    이름
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    연락처
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    권한
                                </th>
                                <th className="px-4 py-3 text-center text-sm font-semibold">
                                    상태
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    비고
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold">
                                    등록일
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold">
                                    관리
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                                        불러오는 중...
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                                        등록된 관리자가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="border-b border-zinc-100 hover:bg-zinc-50"
                                    >
                                        <td className="pl-6 pr-4 py-3 font-medium">
                                            {item.login_id}
                                        </td>
                                        <td className="px-4 py-3">{item.name}</td>
                                        <td className="px-4 py-3">{formatPhone(item.phone)}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`rounded-full px-2 py-1 text-xs ${getRoleBadge(
                                                    item.role
                                                )}`}
                                            >
                                                {getRoleLabel(item.role)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span
                                                className={`rounded-full px-2 py-1 text-xs ${item.is_active
                                                    ? 'bg-green-50 text-green-700'
                                                    : 'bg-red-50 text-red-700'
                                                    }`}
                                            >
                                                {item.is_active ? '활성' : '비활성'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{item.memo ?? '-'}</td>
                                        <td className="px-4 py-3">{item.created_at?.slice(0, 10)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                {item.role !== 'super_admin' && (
                                                    <button
                                                        onClick={() => openEditModal(item)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50"
                                                    >
                                                        <Pencil size={14} />
                                                        수정
                                                    </button>
                                                )}

                                                {item.role === 'manager_full' && (
                                                    <button
                                                        onClick={() => handleToggleActive(item)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50"
                                                    >
                                                        {item.is_active ? (
                                                            <ToggleRight size={14} />
                                                        ) : (
                                                            <ToggleLeft size={14} />
                                                        )}

                                                        {item.is_active ? '비활성' : '활성'}
                                                    </button>
                                                )}

                                                {(item.role === 'manager_readonly' ||
                                                    item.role === 'syndicator') && (
                                                        <button
                                                            onClick={() => handleDeleteAdmin(item)}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                                                        >
                                                            삭제
                                                        </button>
                                                    )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </section>

                <section className="space-y-3 lg:hidden">
                    {items.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500 shadow-sm">
                            등록된 관리자가 없습니다.
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.id}
                                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                            >
                                <div className="mb-3 flex items-start gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                                        <ShieldCheck size={18} />
                                    </div>

                                    <div>
                                        <div className="font-semibold">{item.name}</div>
                                        <div className="text-sm text-zinc-500">{item.login_id}</div>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-zinc-600">
                                    <div>연락처: {formatPhone(item.phone)}</div>
                                    <div>
                                        권한:{' '}
                                        <span
                                            className={`rounded-full px-2 py-1 text-xs ${getRoleBadge(
                                                item.role
                                            )}`}
                                        >
                                            {getRoleLabel(item.role)}
                                        </span>
                                    </div>
                                    <div>
                                        상태:{' '}
                                        <span
                                            className={`rounded-full px-2 py-1 text-xs ${item.is_active
                                                ? 'bg-green-50 text-green-700'
                                                : 'bg-red-50 text-red-700'
                                                }`}
                                        >
                                            {item.is_active ? '활성' : '비활성'}
                                        </span>
                                    </div>
                                    <div>비고: {item.memo ?? '-'}</div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    {item.role !== 'super_admin' && (
                                        <button
                                            onClick={() => openEditModal(item)}
                                            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                                        >
                                            <Pencil size={14} />
                                            수정
                                        </button>
                                    )}

                                    {item.role === 'manager_full' && (
                                        <button
                                            onClick={() => handleToggleActive(item)}
                                            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                                        >
                                            {item.is_active ? (
                                                <ToggleRight size={14} />
                                            ) : (
                                                <ToggleLeft size={14} />
                                            )}

                                            {item.is_active ? '비활성' : '활성'}
                                        </button>
                                    )}

                                    {(item.role === 'manager_readonly' ||
                                        item.role === 'syndicator') && (
                                            <button
                                                onClick={() => handleDeleteAdmin(item)}
                                                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                            >
                                                삭제
                                            </button>
                                        )}
                                </div>
                            </div>
                        ))
                    )}
                </section>

                <Pagination
                    page={page}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                        setPageSize(size)
                        setPage(1)
                    }}
                />

                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                        <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                                <h2 className="font-semibold">
                                    {editingItem ? '관리자 수정' : '관리자 등록'}
                                </h2>

                                <button
                                    onClick={() => {
                                        resetForm()
                                        setModalOpen(false)
                                    }}
                                    className="rounded-lg p-1 hover:bg-zinc-100"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-4 p-5">
                                <div>
                                    <label className="mb-1 block text-sm font-medium">이메일 *</label>
                                    <input
                                        value={form.email}
                                        disabled={!!editingItem}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:bg-zinc-100"
                                        placeholder="admin@example.com"
                                    />
                                </div>

                                {!editingItem && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium">비밀번호 *</label>
                                        <input
                                            type="password"
                                            value={form.password}
                                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                            placeholder="초기 비밀번호"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="mb-1 block text-sm font-medium">이름 *</label>
                                    <input
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                        placeholder="담당자명"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium">휴대폰</label>
                                    <input
                                        value={form.phone}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                phone: formatPhoneNumber(e.target.value),
                                            })
                                        }
                                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                        placeholder="010-0000-0000"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium">권한 *</label>
                                    <select
                                        value={form.role}
                                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                    >
                                        <option value="super_admin">슈퍼관리자</option>
                                        <option value="manager_full">전체관리자</option>
                                        <option value="manager_readonly">읽기관리자</option>
                                        <option value="syndicator">신디사</option>
                                    </select>
                                </div>

                                {(form.role === 'manager_readonly' ||
                                    form.role === 'syndicator') && (
                                        <div>
                                            <label className="mb-2 block text-sm font-medium">
                                                접근 가능한 신디사
                                            </label>

                                            <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-zinc-200 p-3">
                                                {syndicators.length === 0 ? (
                                                    <div className="text-sm text-zinc-500">
                                                        등록된 신디사가 없습니다.
                                                    </div>
                                                ) : (
                                                    syndicators.map((syndicator) => {
                                                        const checked = selectedSyndicatorIds.includes(
                                                            syndicator.id
                                                        )

                                                        return (
                                                            <label
                                                                key={syndicator.id}
                                                                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-zinc-50"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={checked}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedSyndicatorIds([
                                                                                ...selectedSyndicatorIds,
                                                                                syndicator.id,
                                                                            ])
                                                                        } else {
                                                                            setSelectedSyndicatorIds(
                                                                                selectedSyndicatorIds.filter(
                                                                                    (id) => id !== syndicator.id
                                                                                )
                                                                            )
                                                                        }
                                                                    }}
                                                                />

                                                                <span className="text-sm">
                                                                    {syndicator.name}
                                                                </span>
                                                            </label>
                                                        )
                                                    })
                                                )}
                                            </div>

                                            <p className="mt-1 text-xs text-zinc-500">
                                                선택된 신디사의 데이터만 조회 가능합니다.
                                            </p>
                                        </div>
                                    )}

                                <div>
                                    <label className="mb-1 block text-sm font-medium">비고</label>
                                    <textarea
                                        value={form.memo}
                                        onChange={(e) => setForm({ ...form, memo: e.target.value })}
                                        className="min-h-20 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                        placeholder="메모"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4">
                                <button
                                    onClick={() => {
                                        resetForm()
                                        setModalOpen(false)
                                    }}
                                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
                                >
                                    취소
                                </button>

                                <button
                                    onClick={editingItem ? handleUpdateAdmin : handleCreateAdmin}
                                    disabled={saving}
                                    className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                                >
                                    {saving ? '저장 중...' : editingItem ? '수정 저장' : '등록'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    )
}