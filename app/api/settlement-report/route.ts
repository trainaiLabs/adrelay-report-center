import { NextRequest } from 'next/server'
import ExcelJS from 'exceljs'

export const runtime = 'nodejs'

type ReportRow = {
    report_date: string
    placement_id: string
    revenue_option: string
    revenue_option_value: number
    impressions: number
    clicks: number
    final_purchase_amount: number
    ad_cost: number
    ad_placements?: { name: string } | null
}

function monthLabel(dateText: string) {
    const [year, month] = dateText.slice(0, 7).split('-')
    return `${year}년 ${Number(month)}월`
}

function lastDayOfMonth(dateText: string) {
    const [year, month] = dateText.slice(0, 7).split('-').map(Number)
    return new Date(year, month, 0)
}

function lastDayAfterTwoMonths(dateText: string) {
    const [year, month] = dateText.slice(0, 7).split('-').map(Number)
    return new Date(year, month + 2, 0)
}

function formatDate(date: Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function aggregateReports(reports: ReportRow[]) {
    const map = new Map<string, ReportRow>()

    reports.forEach((row) => {
        const key = `${row.placement_id}_${row.revenue_option}_${row.revenue_option_value}`

        const prev = map.get(key)

        if (!prev) {
            map.set(key, { ...row })
            return
        }

        prev.impressions += Number(row.impressions || 0)
        prev.clicks += Number(row.clicks || 0)
        prev.final_purchase_amount += Number(row.final_purchase_amount || 0)
        prev.ad_cost += Number(row.ad_cost || 0)
    })

    return Array.from(map.values())
}

function setBorder(cell: ExcelJS.Cell) {
    cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
    }
}

function styleCell(
    cell: ExcelJS.Cell,
    options?: {
        bold?: boolean
        fill?: string
        color?: string
        size?: number
        align?: 'left' | 'center' | 'right'
    }
) {
    cell.font = {
        name: '맑은 고딕',
        size: options?.size ?? 10,
        bold: options?.bold ?? false,
        color: { argb: options?.color ?? 'FF000000' },
    }

    cell.alignment = {
        vertical: 'middle',
        horizontal: options?.align ?? 'center',
        wrapText: true,
    }

    if (options?.fill) {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: options.fill },
        }
    }

    setBorder(cell)
}

function styleRange(
    ws: ExcelJS.Worksheet,
    row: number,
    startCol: number,
    endCol: number,
    options?: {
        bold?: boolean
        fill?: string
        color?: string
        size?: number
        align?: 'left' | 'center' | 'right'
    }
) {
    for (let col = startCol; col <= endCol; col++) {
        styleCell(ws.getCell(row, col), options)
    }
}

function getCtr(clicks: number, impressions: number) {
    if (!impressions) return 0
    return clicks / impressions
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { reports, type, syndicatorName } = body

        if (!reports || reports.length === 0) {
            return Response.json(
                { error: '리포트 데이터가 없습니다.' },
                { status: 400 }
            )
        }

        const rows = aggregateReports(reports)
        const firstDate = reports[0].report_date
        const month = monthLabel(firstDate)
        const isCps = type === 'CPS'

        const workbook = new ExcelJS.Workbook()
        const ws = workbook.addWorksheet('매체 정산서')

        ws.views = [{ showGridLines: true }]

        ws.columns = [
            { width: 4 },
            { width: 14 },
            { width: 16 },
            { width: 16 },
            { width: 16 },
            { width: 14 },
            { width: 14 },
            { width: 12 },
            { width: 14 },
            { width: 14 },
            { width: 14 },
        ]

        const endCol = isCps ? 11 : 10

        ws.mergeCells(3, 2, 3, endCol)
        ws.getCell(3, 2).value = `[${syndicatorName}] ${month} 정산`
        styleRange(ws, 3, 2, endCol, {
            bold: true,
            fill: 'FF3A3A3A',
            color: 'FFFFFFFF',
        })

        ws.mergeCells(4, 2, 4, endCol)
        ws.getCell(4, 2).value = syndicatorName
        styleRange(ws, 4, 2, endCol, {
            bold: true,
            fill: 'FFD9E7F3',
        })

        ws.getRow(3).height = 22
        ws.getRow(4).height = 22

        if (isCps) {
            ws.mergeCells('C5:E5')
            ws.getCell('B5').value = '기간'
            ws.getCell('C5').value = '매체명'
            ws.getCell('F5').value = '노출수'
            ws.getCell('G5').value = '클릭수'
            ws.getCell('H5').value = 'CTR'
            ws.getCell('I5').value = '최종구매금액'
            ws.getCell('J5').value = 'CPS'
            ws.getCell('K5').value = '금액'
            styleRange(ws, 5, 2, 11, { bold: true })
        } else {
            const nonCpsOptions = Array.from(
                new Set(rows.map((row) => row.revenue_option))
            )

            const optionHeader =
                nonCpsOptions.length === 1 ? nonCpsOptions[0] : '매출옵션'

            ws.mergeCells('C5:E5')
            ws.getCell('B5').value = '기간'
            ws.getCell('C5').value = '매체명'
            ws.getCell('F5').value = '노출수'
            ws.getCell('G5').value = '클릭수'
            ws.getCell('H5').value = 'CTR'
            ws.getCell('I5').value = optionHeader
            ws.getCell('J5').value = '금액'
            styleRange(ws, 5, 2, 10, { bold: true })
        }

        let rowIndex = 6

        let totalImpressions = 0
        let totalClicks = 0
        let totalFinalPurchaseAmount = 0
        let totalAmount = 0

        rows.forEach((row, index) => {
            const impressions = Number(row.impressions || 0)
            const clicks = Number(row.clicks || 0)
            const finalPurchaseAmount = Number(row.final_purchase_amount || 0)
            const amount = Number(row.ad_cost || 0)

            totalImpressions += impressions
            totalClicks += clicks
            totalFinalPurchaseAmount += finalPurchaseAmount
            totalAmount += amount

            if (isCps) {
                ws.mergeCells(rowIndex, 3, rowIndex, 5)

                ws.getCell(rowIndex, 2).value = index === 0 ? month : ''
                ws.getCell(rowIndex, 3).value = row.ad_placements?.name ?? ''
                ws.getCell(rowIndex, 6).value = impressions
                ws.getCell(rowIndex, 7).value = clicks
                ws.getCell(rowIndex, 8).value = getCtr(clicks, impressions)
                ws.getCell(rowIndex, 9).value = finalPurchaseAmount
                ws.getCell(rowIndex, 10).value =
                    Number(row.revenue_option_value || 0) / 100
                ws.getCell(rowIndex, 11).value = amount

                styleRange(ws, rowIndex, 2, 11)

                ws.getCell(rowIndex, 8).numFmt = '0.00%'
                ws.getCell(rowIndex, 10).numFmt = '0.00%'
                ws.getCell(rowIndex, 6).numFmt = '#,##0'
                ws.getCell(rowIndex, 7).numFmt = '#,##0'
                ws.getCell(rowIndex, 9).numFmt = '#,##0'
                ws.getCell(rowIndex, 11).numFmt = '#,##0'
            } else {
                ws.mergeCells(rowIndex, 3, rowIndex, 5)

                ws.getCell(rowIndex, 2).value = index === 0 ? month : ''
                ws.getCell(rowIndex, 3).value = row.ad_placements?.name ?? ''
                ws.getCell(rowIndex, 6).value = impressions
                ws.getCell(rowIndex, 7).value = clicks
                ws.getCell(rowIndex, 8).value = getCtr(clicks, impressions)
                ws.getCell(rowIndex, 9).value = Number(row.revenue_option_value || 0)
                ws.getCell(rowIndex, 10).value = amount

                styleRange(ws, rowIndex, 2, 10)

                ws.getCell(rowIndex, 8).numFmt = '0.00%'
                ws.getCell(rowIndex, 6).numFmt = '#,##0'
                ws.getCell(rowIndex, 7).numFmt = '#,##0'
                ws.getCell(rowIndex, 9).numFmt = '#,##0'
                ws.getCell(rowIndex, 10).numFmt = '#,##0'
            }

            rowIndex++
        })

        if (isCps) {
            ws.mergeCells(rowIndex, 2, rowIndex, 8)
            ws.getCell(rowIndex, 2).value = '합계'
            ws.getCell(rowIndex, 9).value = totalFinalPurchaseAmount
            ws.getCell(rowIndex, 11).value = totalAmount

            styleRange(ws, rowIndex, 2, 11, {
                bold: true,
                fill: 'FFD9D9D9',
            })

            ws.getCell(rowIndex, 9).numFmt = '#,##0'
            ws.getCell(rowIndex, 11).numFmt = '#,##0'
        } else {
            ws.mergeCells(rowIndex, 2, rowIndex, 9)
            ws.getCell(rowIndex, 2).value = '합계'
            ws.getCell(rowIndex, 10).value = totalAmount

            styleRange(ws, rowIndex, 2, 10, {
                bold: true,
                fill: 'FFD9D9D9',
            })

            ws.getCell(rowIndex, 10).numFmt = '#,##0'
        }

        rowIndex += 2

        const bottomHeaderRow = rowIndex

        const issueDate = formatDate(lastDayOfMonth(firstDate))
        const payDate = formatDate(lastDayAfterTwoMonths(firstDate))

        if (isCps) {
            ws.mergeCells(bottomHeaderRow, 3, bottomHeaderRow, 4)
            ws.mergeCells(bottomHeaderRow, 5, bottomHeaderRow, 6)
            ws.mergeCells(bottomHeaderRow, 7, bottomHeaderRow, 8)
            ws.mergeCells(bottomHeaderRow, 10, bottomHeaderRow, 11)

            ws.getCell(bottomHeaderRow, 2).value = '발행일자'
            ws.getCell(bottomHeaderRow, 3).value = '지급예정일'
            ws.getCell(bottomHeaderRow, 5).value = '구분'
            ws.getCell(bottomHeaderRow, 7).value = '순매체비'
            ws.getCell(bottomHeaderRow, 9).value = '세액'
            ws.getCell(bottomHeaderRow, 10).value = '합계'

            styleRange(ws, bottomHeaderRow, 2, 11, {
                bold: true,
                fill: 'FFD9D9D9',
            })
        } else {
            ws.mergeCells(bottomHeaderRow, 3, bottomHeaderRow, 4)
            ws.mergeCells(bottomHeaderRow, 5, bottomHeaderRow, 6)
            ws.mergeCells(bottomHeaderRow, 9, bottomHeaderRow, 10)

            ws.getCell(bottomHeaderRow, 2).value = '발행일자'
            ws.getCell(bottomHeaderRow, 3).value = '지급예정일'
            ws.getCell(bottomHeaderRow, 5).value = '구분'
            ws.getCell(bottomHeaderRow, 7).value = '순매체비'
            ws.getCell(bottomHeaderRow, 8).value = '세액'
            ws.getCell(bottomHeaderRow, 9).value = '합계'

            styleRange(ws, bottomHeaderRow, 2, 10, {
                bold: true,
                fill: 'FFD9D9D9',
            })
        }

        rowIndex++

        let taxTotal = 0
        let grandTotal = 0

        rows.forEach((row, index) => {
            const amount = Number(row.ad_cost || 0)
            const tax = Math.round(amount * 0.1)
            const sum = amount + tax

            taxTotal += tax
            grandTotal += sum

            if (isCps) {
                ws.mergeCells(rowIndex, 3, rowIndex, 4)
                ws.mergeCells(rowIndex, 5, rowIndex, 6)
                ws.mergeCells(rowIndex, 7, rowIndex, 8)
                ws.mergeCells(rowIndex, 10, rowIndex, 11)

                ws.getCell(rowIndex, 2).value = index === 0 ? issueDate : ''
                ws.getCell(rowIndex, 3).value = index === 0 ? payDate : ''
                ws.getCell(rowIndex, 5).value = row.ad_placements?.name ?? ''
                ws.getCell(rowIndex, 7).value = amount
                ws.getCell(rowIndex, 9).value = tax
                ws.getCell(rowIndex, 10).value = sum

                styleRange(ws, rowIndex, 2, 11)

                ws.getCell(rowIndex, 7).numFmt = '#,##0'
                ws.getCell(rowIndex, 9).numFmt = '#,##0'
                ws.getCell(rowIndex, 10).numFmt = '#,##0'
            } else {
                ws.mergeCells(rowIndex, 3, rowIndex, 4)
                ws.mergeCells(rowIndex, 5, rowIndex, 6)
                ws.mergeCells(rowIndex, 9, rowIndex, 10)

                ws.getCell(rowIndex, 2).value = index === 0 ? issueDate : ''
                ws.getCell(rowIndex, 3).value = index === 0 ? payDate : ''
                ws.getCell(rowIndex, 5).value = row.ad_placements?.name ?? ''
                ws.getCell(rowIndex, 7).value = amount
                ws.getCell(rowIndex, 8).value = tax
                ws.getCell(rowIndex, 9).value = sum

                styleRange(ws, rowIndex, 2, 10)

                ws.getCell(rowIndex, 7).numFmt = '#,##0'
                ws.getCell(rowIndex, 8).numFmt = '#,##0'
                ws.getCell(rowIndex, 9).numFmt = '#,##0'
            }

            rowIndex++
        })

        if (isCps) {
            ws.mergeCells(rowIndex, 2, rowIndex, 6)
            ws.mergeCells(rowIndex, 7, rowIndex, 8)
            ws.mergeCells(rowIndex, 10, rowIndex, 11)

            ws.getCell(rowIndex, 2).value = '총계'
            ws.getCell(rowIndex, 7).value = totalAmount
            ws.getCell(rowIndex, 9).value = taxTotal
            ws.getCell(rowIndex, 10).value = grandTotal

            styleRange(ws, rowIndex, 2, 11, {
                bold: true,
                fill: 'FFD9D9D9',
                color: 'FFFF0000',
            })

            ws.getCell(rowIndex, 7).numFmt = '#,##0'
            ws.getCell(rowIndex, 9).numFmt = '#,##0'
            ws.getCell(rowIndex, 10).numFmt = '#,##0'
        } else {
            ws.mergeCells(rowIndex, 2, rowIndex, 6)
            ws.mergeCells(rowIndex, 9, rowIndex, 10)

            ws.getCell(rowIndex, 2).value = '총계'
            ws.getCell(rowIndex, 7).value = totalAmount
            ws.getCell(rowIndex, 8).value = taxTotal
            ws.getCell(rowIndex, 9).value = grandTotal

            styleRange(ws, rowIndex, 2, 10, {
                bold: true,
                fill: 'FFD9D9D9',
                color: 'FFFF0000',
            })

            ws.getCell(rowIndex, 7).numFmt = '#,##0'
            ws.getCell(rowIndex, 8).numFmt = '#,##0'
            ws.getCell(rowIndex, 9).numFmt = '#,##0'
        }

        ws.eachRow((row) => {
            row.height = row.height ?? 22
        })

        const buffer = await workbook.xlsx.writeBuffer()

        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(
                    `${syndicatorName}_${month}_정산서.xlsx`
                )}`,
            },
        })
    } catch (error) {
        console.error(error)

        return Response.json(
            { error: '엑셀 생성 실패' },
            { status: 500 }
        )
    }
}