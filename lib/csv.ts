// Small CSV helpers for in-browser report downloads (no server round trip
// beyond the data fetch itself — the file is built and downloaded entirely
// client-side).

function csvField(value: string): string {
  // Quote any field that contains a comma, quote or newline, doubling up
  // internal quotes per the CSV spec.
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvField).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = toCsv(rows)
  // Leading BOM so Excel opens UTF-8 (e.g. £ signs) correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
