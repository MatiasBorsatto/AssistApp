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

export type Hoja = { nombre: string; columnas: string[]; filas: Fila[]; anchos?: number[] }

/** Excel con varias hojas (resumen, detalle por persona, novedades…), con encabezado fijo y filtros. */
export function exportarExcelMulti(hojas: Hoja[], nombreArchivo: string) {
  const wb = XLSX.utils.book_new()
  hojas.forEach(h => {
    const ws = XLSX.utils.aoa_to_sheet([h.columnas, ...h.filas])
    ws['!cols'] = h.columnas.map((c, i) => ({ wch: h.anchos?.[i] ?? Math.max(12, Math.min(40, Math.max(c.length, ...h.filas.map(f => String(f[i] ?? '').length)) + 2)) }))
    ws['!freeze'] = { xSplit: 0, ySplit: 1 } as never
    if (h.filas.length) ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: h.filas.length, c: h.columnas.length - 1 } }) }
    XLSX.utils.book_append_sheet(wb, ws, h.nombre.slice(0, 31))
  })
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
}

export type Seccion = { titulo: string; columnas: string[]; filas: Fila[]; vacio?: string }

/** PDF con encabezado, varias secciones, numeración de páginas y fecha de emisión. */
export function exportarPDFMulti(p: { titulo: string; lineas: string[]; secciones: Seccion[] }, nombreArchivo: string) {
  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  doc.setFillColor(31, 19, 0); doc.rect(0, 0, W, 64, 'F')
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('ASISTAPP', 40, 32)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(p.titulo, 40, 50)
  doc.setTextColor(40); doc.setFontSize(10)
  let y = 86
  p.lineas.forEach(l => { doc.text(l, 40, y); y += 14 })
  y += 6
  p.secciones.forEach(s => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(143, 88, 0)
    if (y > 740) { doc.addPage(); y = 50 }
    doc.text(s.titulo, 40, y); y += 8
    if (!s.filas.length) { doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(100); doc.text(s.vacio ?? 'Sin datos en el período.', 40, y + 12); y += 34; return }
    autoTable(doc, { head: [s.columnas], body: s.filas, startY: y, styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3 }, headStyles: { fillColor: [31, 19, 0], textColor: 255 }, alternateRowStyles: { fillColor: [255, 250, 240] }, margin: { left: 40, right: 40 } })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24
  })
  const n = doc.getNumberOfPages()
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120); doc.text(`Emitido el ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`, 40, 820); doc.text(`Página ${i} de ${n}`, W - 40, 820, { align: 'right' }) }
  doc.save(`${nombreArchivo}.pdf`)
}
