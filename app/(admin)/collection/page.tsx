'use client'

import { useEffect, useState } from 'react'
import Pagination from '@/components/pagination'
import { supabase } from '@/lib/supabase/client'
import {
    RefreshCw,
} from 'lucide-react'


type CollectionJob = {
    id: string
    target_start_date: string
    target_end_date: string
    status: string
    success_count: number
    failed_count: number
    error_message: string | null
    started_at: string | null
    finished_at: string | null
    created_at: string
    ad_external_api_sources: {
        name: string
    } | null
}

export default function CollectionPage() {
    const [jobs, setJobs] = useState<CollectionJob[]>([])
    const [jobsLoading, setJobsLoading] = useState(false)
    const [jobPage, setJobPage] = useState(1)
    const [jobPageSize, setJobPageSize] = useState(20)
    const [jobTotalCount, setJobTotalCount] = useState(0)

    const jobTotalPages = Math.ceil(jobTotalCount / jobPageSize)

    useEffect(() => {
        loadJobs()
    }, [jobPage, jobPageSize])

    async function loadJobs() {
        setJobsLoading(true)

        let query = supabase
            .from('ad_collection_jobs')
            .select(
                `
      id,
      target_start_date,
      target_end_date,
      status,
      success_count,
      failed_count,
      error_message,
      started_at,
      finished_at,
      created_at,
      ad_external_api_sources(name)
    `,
                { count: 'exact' }
            )
            .order('created_at', { ascending: false })

        const from = (jobPage - 1) * jobPageSize
        const to = from + jobPageSize - 1

        query = query.range(from, to)

        const { data, error, count } = await query

        if (!error && data) {
            setJobs(data as unknown as CollectionJob[])
            setJobTotalCount(count ?? 0)
        }

        setJobsLoading(false)
    }

    function getStatusBadge(status: string) {
        if (status === 'success') {
            return 'bg-green-50 text-green-700'
        }

        if (status === 'failed') {
            return 'bg-red-50 text-red-700'
        }

        if (status === 'running') {
            return 'bg-blue-50 text-blue-700'
        }

        return 'bg-zinc-100 text-zinc-500'
    }

    function formatDateTime(value: string | null) {
        if (!value) return '-'

        return new Date(value).toLocaleString('ko-KR', {
            year: '2-digit',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    return (
        <main className="min-h-screen bg-zinc-50 px-4 py-6">
            <div className="mx-auto max-w-7xl space-y-6">
                <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="text-xl font-bold">데이터 수집 관리</h1>
                            <p className="mt-1 text-sm text-zinc-500">
                                최근 실행된 데이터 수집 작업 상태를 확인합니다.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                        <div>
                            <h2 className="font-semibold">최근 수집 기록</h2>
                            <p className="mt-1 text-sm text-zinc-500">
                                최근 실행된 데이터 수집 작업 상태입니다.
                            </p>
                        </div>

                        <button
                            onClick={loadJobs}
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                        >
                            <RefreshCw size={16} />
                            새로고침
                        </button>
                    </div>

                    <div className="hidden overflow-x-auto lg:block">
                        <table className="w-full min-w-[960px] text-sm">
                            <thead className="border-b border-zinc-200 bg-zinc-100 text-zinc-600">
                                <tr>
                                    <th className="pl-6 pr-4 py-3 text-left text-sm font-semibold">
                                        외부회사
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">
                                        대상기간
                                    </th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold">
                                        상태
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold">
                                        성공
                                    </th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold">
                                        실패
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">
                                        시작시간
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">
                                        종료시간
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold">
                                        실패사유
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {jobsLoading ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                                            불러오는 중...
                                        </td>
                                    </tr>
                                ) : jobs.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                                            수집 기록이 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    jobs.map((job) => (
                                        <tr
                                            key={job.id}
                                            className="border-b border-zinc-100 hover:bg-zinc-50"
                                        >
                                            <td className="pl-6 pr-4 py-3 font-medium">
                                                {job.ad_external_api_sources?.name ?? '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {job.target_start_date === job.target_end_date
                                                    ? job.target_start_date
                                                    : `${job.target_start_date} ~ ${job.target_end_date}`}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={`rounded-full px-2 py-1 text-xs ${getStatusBadge(
                                                        job.status
                                                    )}`}
                                                >
                                                    {job.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {job.success_count.toLocaleString()}
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                {job.failed_count.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {formatDateTime(job.started_at)}
                                            </td>

                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {formatDateTime(job.finished_at)}
                                            </td>
                                            <td className="max-w-[360px] px-4 py-3 text-red-600">
                                                {job.error_message ? (
                                                    <button
                                                        onClick={() => alert(job.error_message)}
                                                        className="block max-w-[360px] truncate text-left hover:underline"
                                                        title="클릭해서 전체 오류 보기"
                                                    >
                                                        {job.error_message}
                                                    </button>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="space-y-3 p-4 lg:hidden">
                        {jobs.length === 0 ? (
                            <div className="rounded-xl bg-zinc-50 p-4 text-center text-sm text-zinc-500">
                                수집 기록이 없습니다.
                            </div>
                        ) : (
                            jobs.map((job) => (
                                <div
                                    key={job.id}
                                    className="rounded-xl border border-zinc-200 bg-white p-4"
                                >
                                    <div className="mb-2 flex items-center justify-between">
                                        <div className="font-medium">
                                            {job.ad_external_api_sources?.name ?? '-'}
                                        </div>

                                        <span
                                            className={`rounded-full px-2 py-1 text-xs ${getStatusBadge(
                                                job.status
                                            )}`}
                                        >
                                            {job.status}
                                        </span>
                                    </div>

                                    <div className="space-y-1 text-sm text-zinc-600">
                                        <div>
                                            대상기간:{' '}
                                            {job.target_start_date === job.target_end_date
                                                ? job.target_start_date
                                                : `${job.target_start_date} ~ ${job.target_end_date}`}
                                        </div>
                                        <div>성공: {job.success_count.toLocaleString()}건</div>
                                        <div>실패: {job.failed_count.toLocaleString()}건</div>
                                        <div>시작: {formatDateTime(job.started_at)}</div>
                                        <div>종료: {formatDateTime(job.finished_at)}</div>
                                        {job.error_message && (
                                            <div className="text-red-600">사유: {job.error_message}</div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
                <Pagination
                    page={jobPage}
                    totalPages={jobTotalPages}
                    totalCount={jobTotalCount}
                    pageSize={jobPageSize}
                    onPageChange={setJobPage}
                    onPageSizeChange={(size) => {
                        setJobPageSize(size)
                        setJobPage(1)
                    }}
                />
            </div>
        </main>
    )
}