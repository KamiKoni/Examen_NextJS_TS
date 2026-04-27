# Codebase Guide

Este documento resume la responsabilidad de cada carpeta y el flujo principal de la aplicación.

## Flujo principal

1. El usuario entra por `/auth/login`.
2. `AppProvider` intenta restaurar sesión y cargar el resumen del dashboard.
3. El login llama a `POST /api/auth/login`, que genera access token, refresh token y cookies seguras.
4. El dashboard consume `/api/dashboard` para obtener sesión, usuarios, horarios y auditoría.
5. Las mutaciones del panel llaman a las rutas REST de usuarios, horarios y documentos.
6. Cada operación crítica registra auditoría en la base de datos.

## Estructura

### `prisma/`

- `schema.prisma`: modelo de datos principal.
- `seed.ts`: datos demo y horario inicial.

### `src/app/`

- `layout.tsx`: shell global, fuentes y `AppProvider`.
- `page.tsx`: redirección inicial según existencia de cookies.
- `auth/login/page.tsx`: entrada de la pantalla de login.
- `dashboard/page.tsx`: entrada del dashboard.
- `api/**/route.ts`: endpoints del backend en App Router.

### `src/components/`

- `auth/`: componentes de acceso.
- `dashboard/`: panel principal y carga de documentos.
- `providers/`: estado cliente compartido.
- `ui/`: primitivas visuales reutilizables.

### `src/context/`

- Contratos de contexto usados por hooks y provider.

### `src/hooks/`

- Hooks de conveniencia para consumir contextos.

### `src/lib/`

- `api.ts`: helpers de respuesta y parseo.
- `auth.ts`: firma, verificación y cookies de sesión.
- `middleware/auth.ts`: validación de Bearer tokens, refresh tokens y roles.
- `audit.ts`: persistencia de auditoría.
- `permissions.ts`: reglas de acceso por rol.
- `pagination.ts`: parseo de `limit`, `offset` y `page`.
- `schedules.ts`: validaciones de fechas y conflictos.
- `serializers.ts`: adaptación de modelos Prisma a payloads del frontend.
- `schemas.ts`: validación Zod para payloads de entrada.
- `session.ts`: resolución de sesión autenticada desde cookies.
- `parsers.ts`: extracción de contenido desde PDF, CSV y XLSX.

### `src/types/`

- Tipos compartidos entre frontend y backend.

## Notas operativas

- El middleware de `src/proxy.ts` protege la entrada al dashboard.
- Las rutas API protegidas validan `Authorization: Bearer <token>` en `src/lib/middleware/auth.ts`.
- La rotación de refresh token ocurre en `POST /api/auth/refresh`.
- La carga de documentos puede crear horarios automáticamente para archivos tabulares.
- Los archivos binarios como `favicon.ico` o `prisma/dev.db` no requieren comentarios en código.
