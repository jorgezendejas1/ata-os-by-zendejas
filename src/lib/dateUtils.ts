export const MONTHS_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

export interface OperativeWeek {
  id: number;
  number: number;
  label: string;
  start: Date;
  end: Date;
  days: Date[];
}

/**
 * Calcula las semanas operativas (Jueves a Miércoles) de un mes.
 * El mes al que pertenece una semana es el mes en que inicia su jueves.
 */
export function getMonthWeeks(year: number, monthIndex: number): OperativeWeek[] {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const dayOfWeek = firstDayOfMonth.getDay(); // 0=Dom,1=Lun,...,4=Jue,...,6=Sáb

  // Retroceder hasta el jueves más cercano anterior o igual al día 1
  const daysToSubtract = dayOfWeek >= 4 ? dayOfWeek - 4 : dayOfWeek + 3;
  const startOfSem1 = new Date(year, monthIndex, 1 - daysToSubtract);

  const weeks: OperativeWeek[] = [];

  for (let i = 0; i < 6; i++) {
    const start = new Date(startOfSem1);
    start.setDate(startOfSem1.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    // Parar si el inicio ya está más allá del último día del mes
    if (i > 0 && start > new Date(year, monthIndex + 1, 0)) break;

    const startStr = `${start.getDate()} ${MONTHS_ES[start.getMonth()].substring(0, 3)}`;
    const endStr   = `${end.getDate()} ${MONTHS_ES[end.getMonth()].substring(0, 3)}`;

    weeks.push({
      id: i,
      number: i + 1,
      label: `Semana ${i + 1} · ${startStr}–${endStr}`,
      start,
      end,
      days: Array.from({ length: 7 }, (_, d) => {
        const day = new Date(start);
        day.setDate(start.getDate() + d);
        return day;
      }),
    });
  }

  return weeks;
}

export function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function getOperativeWeekForDate(dateStr: string, year: number, monthIndex: number) {
  const weeks = getMonthWeeks(year, monthIndex);
  const d = new Date(dateStr + 'T12:00:00');
  return weeks.find(w => d >= w.start && d <= w.end) || weeks[0];
}