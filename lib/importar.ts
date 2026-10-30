import { quitarTildes, type DiaKey, type Horario } from './domain'
import type { DatosDocente } from './repo'
import { leerExcel } from './export'

const norm = (s: unknown) => quitarTildes(String(s ?? '').toLowerCase()).trim()
const DIAS: DiaKey[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']

function parseHora(v: unknown): string {
  if (v === '' || v == null) return ''
  const s = String(v).trim()
  if (/^\d{1,2}:\d{2}$/.test(s)) return s.padStart(5, '0')
  const n = parseFloat(s)
  if (!isNaN(n) && n < 1) { const m = Math.round(n * 24 * 60); return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }
  return s
}

/** Lee un Excel con columnas Nombre/Apellido/Cargo/Materias/Grupo/Notas/Área y horarios por día. */
export async function parsearExcelDocentes(file: File, nivel: DatosDocente['nivel']): Promise<{ docentes: DatosDocente[]; columnas: string[] }> {
  const rows = await leerExcel(file)
  const columnas = rows.length ? Object.keys(rows[0]) : []
  const docentes = rows.map(row => {
    const col = (aliases: string[]) => { for (const a of aliases) { const k = Object.keys(row).find(x => norm(x) === norm(a)); if (k !== undefined) return String(row[k] ?? '').trim() } return '' }
    const apellido = col(['apellido', 'apellidos', 'last name', 'lastname'])
    const nom = col(['nombre', 'nombres', 'primer nombre', 'name', 'first name', 'firstname'])
    const completo = col(['nombre completo', 'nombre y apellido', 'full name', 'docente'])
    let nombre = completo || (apellido && nom ? `${nom} ${apellido}` : nom || apellido)
    if (!nombre) { const k = columnas.find(c => String(row[c] ?? '').trim().length > 1); nombre = k ? String(row[k]).trim() : '' }
    const horario: Horario = {}
    DIAS.forEach(d => {
      let ent = parseHora(col([`${d} entrada`, `${d} - entrada`, `${d}_entrada`, `entrada ${d}`]))
      let sal = parseHora(col([`${d} salida`, `${d} - salida`, `${d}_salida`, `salida ${d}`]))
      if (!ent || !sal) { const m = col([d]).match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/); if (m) { ent = m[1]; sal = m[2] } }
      if (ent && sal) horario[d] = [{ entrada: ent, salida: sal, materia: '' }]
    })
    return { nombre, apellido, cargo: col(['cargo', 'rol', 'cargo / rol', 'puesto', 'position']), tipoHs: '', horario, grupos: [] as string[],
      materias: col(['materias', 'asignaturas', 'materia', 'asignatura']), notas: col(['notas', 'observaciones', 'nota', 'obs']), jubilado: false, nivel, area: col(['area', 'departamento', 'department']) } satisfies DatosDocente
  }).filter(d => d.nombre.trim().length > 1)
  return { docentes, columnas }
}
