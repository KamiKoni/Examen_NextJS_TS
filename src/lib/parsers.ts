import * as XLSX from 'xlsx';

import { PDFParse } from 'pdf-parse';

// Generic document parsing used by the upload route before persistence and schedule import.
export interface ParsedSheet {
  name: string;
  rows: Record<string, unknown>[];
}

export async function parseExcelFile(buffer: Buffer): Promise<ParsedSheet[]> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheets: ParsedSheet[] = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet);
      sheets.push({
        name: sheetName,
        rows: rows as Record<string, unknown>[],
      });
    }

    return sheets;
  } catch (error) {
    throw new Error(
      `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function parsePdfFile(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  } catch (error) {
    throw new Error(
      `Failed to parse PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function extractFileContent(
  buffer: Buffer,
  fileType: 'PDF' | 'XLSX' | 'CSV'
): Promise<{ text: string; data?: unknown }> {
  if (fileType === 'XLSX' || fileType === 'CSV') {
    const sheets = await parseExcelFile(buffer);
    return {
      text: sheets
        .map((s) => `Sheet: ${s.name}\n${JSON.stringify(s.rows)}`)
        .join('\n\n'),
      data: sheets,
    };
  } else if (fileType === 'PDF') {
    const text = await parsePdfFile(buffer);
    return { text };
  }

  throw new Error('Unsupported file type');
}
