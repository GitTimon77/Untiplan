export function toUntisDate(date: Date) { return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate(); }
export function fromUntisDate(value: number) { return new Date(Math.floor(value / 10000), Math.floor((value % 10000) / 100) - 1, value % 100); }
export function mondayFor(input = new Date()) { const date = new Date(input.getFullYear(), input.getMonth(), input.getDate()); const day = date.getDay(); date.setDate(date.getDate() - (day === 0 ? 6 : day - 1)); return date; }
export function addDays(date: Date, days: number) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
export function parseWeek(value?: string | null) { if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return mondayFor(); const parsed = new Date(`${value}T12:00:00`); return Number.isNaN(parsed.valueOf()) ? mondayFor() : mondayFor(parsed); }
export function isoDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
