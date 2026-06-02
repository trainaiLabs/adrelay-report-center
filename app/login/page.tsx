'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      setLoading(true)
      setError('')

      const normalizedLoginId = loginId.trim()

      if (!normalizedLoginId || !password.trim()) {
        setError('아이디와 비밀번호를 입력해 주세요.')
        return
      }

      const { data: adminLookup, error: lookupError } = await supabase
        .from('ad_admin_users')
        .select('email, is_active')
        .eq('login_id', normalizedLoginId)
        .single()

      if (lookupError || !adminLookup?.email) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.')
        return
      }

      if (!adminLookup.is_active) {
        setError('비활성화된 관리자 계정입니다.')
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminLookup.email,
        password,
      })

      if (error) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.')
        return
      }

      const { data: adminData } = await supabase
        .from('ad_admin_users')
        .select('role')
        .eq('auth_user_id', data.user.id)
        .single()

      if (
        adminData?.role === 'manager_readonly' ||
        adminData?.role === 'syndicator'
      ) {
        router.push('/reports')
      } else {
        router.push('/dashboard')
      }
    } catch (e) {
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-2">
          AdRelay
        </h1>

        <p className="text-gray-500 text-center mb-8">
          광고 리포트 관리자
        </p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="아이디"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleLogin()
              }
            }}
            className="w-full border rounded-xl px-4 py-3"
          />

          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleLogin()
              }
            }}
            className="w-full border rounded-xl px-4 py-3"
          />

          {error && (
            <div className="text-red-500 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-black text-white rounded-xl py-3 font-semibold disabled:opacity-60"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </div>
      </div>
    </div>
  )
}