// src/lib/parsers/excelParser.ts
import XLSX from 'xlsx';

// Legacy helper for extracting schedule-like rows from a single spreadsheet sheet.
export async function parseExcelSchedules(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName]
  );

  // Normalize the expected spreadsheet columns into a simpler schedule import shape.
  return data.map((row) => ({
    email: String(row.Email ?? ''),
    startTime: new Date(String(row.Inicio ?? '')),
    endTime: new Date(String(row.Fin ?? '')),
  }));
}
