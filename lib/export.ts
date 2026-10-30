import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export type Fila = (string | number)[]

export function exportarExcel(datos: Fila[], columnas: string[], nombreArchivo: string, hoja = 'Datos') {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([columnas, ...datos])
  ws['!cols'] = columnas.map(() => ({ wch: 22 }))
  XLSX.utils.book_append_sheet(wb, ws, hoja)
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
}

export function exportarPDF(titulo: string, subtitulo: string, columnas: string[], datos: Fila[], nombreArchivo: string) {
  const doc = new jsPDF({ orientation: datos.length > 20 || columnas.length > 6 ? 'l' : 'p' })
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(titulo, 14, 18)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(100); doc.text(subtitulo, 14, 26); doc.setTextColor(0)
  autoTable(doc, {
    head: [columnas], body: datos, startY: 32,
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [31, 19, 0], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 250, 240] },
    margin: { left: 14, right: 14 },
  })
  doc.save(`${nombreArchivo}.pdf`)
}

export function descargarJSON(obj: unknown, nombre: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nombre; a.click()
  URL.revokeObjectURL(url)
}

export async function leerExcel(file: File): Promise<Record<string, unknown>[]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' })
}
