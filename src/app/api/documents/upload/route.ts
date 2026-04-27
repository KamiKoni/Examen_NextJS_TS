import { NextRequest } from 'next/server';

import { ok, fail } from '@/lib/api';
import { createAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import type { PrismaClient } from '@prisma/client';
import { AppError } from '@/lib/errors';
import { requireSession } from '@/lib/session';
import { extractFileContent } from '@/lib/parsers';
import { canManageUsers } from '@/lib/permissions';
import { assertNoScheduleConflict } from '@/lib/schedules';
import { hash } from 'bcryptjs';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Handles document upload, extraction and optional schedule creation for tabular files.
// Converts parsed spreadsheet rows into users and schedules while collecting row-level errors.
async function processScheduleData(
  parsedData: unknown,
  sessionId: string,
  db: PrismaClient
): Promise<{ created: number; errors: string[] }> {
  const result: { created: number; errors: string[] } = {
    created: 0,
    errors: [],
  };

  if (!parsedData || !Array.isArray(parsedData)) {
    result.errors.push('No se encontraron datos válidos en el archivo');
    return result;
  }

  for (const sheet of parsedData) {
    if (!sheet.rows || !Array.isArray(sheet.rows)) continue;

    for (const row of sheet.rows) {
      try {
        // Support both English and Spanish spreadsheet headers during import.
        const employeeId = row['Employee ID'] || row['ID Empleado'];
        const name = row['Name'] || row['Nombre'];
        const date = row['Date'] || row['Fecha'];
        const startTime = row['Start Time'] || row['Hora Inicio'];
        const endTime = row['End Time'] || row['Hora Fin'];
        const department = row['Department'] || row['Departamento'];

        if (!employeeId || !name || !date || !startTime || !endTime) {
          result.errors.push(`Fila incompleta: ${JSON.stringify(row)}`);
          continue;
        }

        // Imported schedules can bootstrap employees if they are missing from the directory.
        let user = await db.user.findFirst({
          where: {
            OR: [
              { email: `${employeeId.toLowerCase()}@company.com` },
              { name: name },
            ],
          },
        });

        if (!user) {
          user = await db.user.create({
            data: {
              name: name,
              email: `${employeeId.toLowerCase()}@company.com`,
              passwordHash: await hash('defaultPass123', 12),
              role: 'EMPLOYEE',
              status: 'ACTIVE',
            },
          });
        }

        // Build concrete Date objects by combining the row date with time columns.
        const scheduleDate = new Date(date);
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        const startAt = new Date(scheduleDate);
        startAt.setHours(startHour, startMinute, 0, 0);

        const endAt = new Date(scheduleDate);
        endAt.setHours(endHour, endMinute, 0, 0);

        await assertNoScheduleConflict(db, {
          assignedUserId: user.id,
          startAt,
          endAt,
        });

        const title = `Turno ${department || 'General'} - ${name}`;
        const description = `Horario importado desde archivo. Departamento: ${department || 'N/A'}`;

        await db.schedule.create({
          data: {
            title,
            description,
            assignedUserId: user.id,
            startAt,
            endAt,
            status: 'PLANNED',
            createdById: sessionId,
            updatedById: sessionId,
          },
        });

        result.created++;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Error desconocido';
        result.errors.push(
          `Error procesando fila ${JSON.stringify(row)}: ${errorMsg}`
        );
      }
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(request);

    if (!canManageUsers(session.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Only admins can upload documents.');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new AppError(400, 'INVALID_INPUT', 'No file provided.');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(
        413,
        'FILE_TOO_LARGE',
        `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.`
      );
    }

    let fileType: 'PDF' | 'XLSX' | 'CSV';
    if (file.type === 'application/pdf') {
      fileType = 'PDF';
    } else if (
      file.type ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      fileType = 'XLSX';
    } else if (file.type === 'text/csv') {
      fileType = 'CSV';
    } else {
      throw new AppError(
        400,
        'INVALID_FILE_TYPE',
        'Only PDF, XLSX, and CSV files are allowed.'
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let extractedText = '';
    let parsedData: unknown = null;
    let errorMessage: string | null = null;

    try {
      const result = await extractFileContent(buffer, fileType);
      extractedText = result.text;
      parsedData = result.data;
    } catch (parseError) {
      errorMessage =
        parseError instanceof Error
          ? parseError.message
          : 'Unknown parsing error';
    }

    const document = await prisma.document.create({
      data: {
        uploadedBy: session.id,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        extractedText: extractedText || undefined,
        parsedData: parsedData ? JSON.stringify(parsedData) : undefined,
        errorMessage: errorMessage || undefined,
        status: errorMessage ? 'FAILED' : 'PROCESSED',
      },
    });

    // Only tabular formats can be translated into schedule rows.
    let processingResult = null;
    if (
      !errorMessage &&
      (fileType === 'CSV' || fileType === 'XLSX') &&
      parsedData
    ) {
      try {
        processingResult = await processScheduleData(
          parsedData,
          session.id,
          prisma
        );
      } catch (processError) {
        console.error('Error processing schedule data:', processError);
        // Keep the uploaded document even if downstream schedule creation partially fails.
      }
    }

    await createAuditLog(prisma, {
      actorId: session.id,
      action: 'DOCUMENT_UPLOADED',
      entityType: 'document',
      entityId: document.id,
      description: `${session.email} uploaded ${file.name} (${fileType}).`,
      metadata: {
        fileName: file.name,
        fileType,
        fileSize: file.size,
        status: document.status,
        schedulesCreated: processingResult?.created || 0,
        processingErrors: processingResult?.errors?.length || 0,
      },
    });

    return ok(
      {
        document,
        processingResult: processingResult
          ? {
              schedulesCreated: processingResult.created,
              errors: processingResult.errors,
            }
          : null,
      },
      201
    );
  } catch (error) {
    return fail(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);

    const documents = await prisma.document.findMany({
      where: {
        uploadedBy: session.id,
      },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        status: true,
        fileSize: true,
        errorMessage: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return ok({ documents });
  } catch (error) {
    return fail(error);
  }
}
