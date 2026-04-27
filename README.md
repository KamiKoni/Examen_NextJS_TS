# ClockHub

Aplicación full-stack para operación interna con autenticación segura, gestión de usuarios y horarios, auditoría operativa y carga de documentos, construida con Next.js, TypeScript y PostgreSQL vía Prisma.

## Vista general

ClockHub arranca con una pantalla de acceso enfocada en producto: presenta el contexto operativo, muestra credenciales demo sembradas y redirige automáticamente al dashboard cuando ya existe una sesión válida. Desde ahí, el dashboard centraliza:

- control de acceso por roles
- administración de usuarios
- creación y edición de horarios
- auditoría de acciones críticas
- carga y análisis de documentos

## Documentación técnica

- [Diagrama ER](./docs/ERD.md)
- [Guía de entrega](./docs/DELIVERY.md)
- [Recorrido del código](./docs/CODEBASE.md)

## Stack

- Next.js 16 + React 19
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT + Refresh Tokens + HttpOnly Cookies
- Tailwind CSS 4
- Zod para validaciones

## Funcionalidades

- Autenticación con access token corto y refresh token rotado.
- Cookies `HttpOnly`, `SameSite=Lax` y `Secure` en producción.
- Compatibilidad con `Authorization: Bearer <token>` en rutas protegidas.
- Roles `ADMIN`, `MANAGER` y `EMPLOYEE`.
- Pantalla de login responsiva con credenciales demo visibles para entorno local.
- CRUD REST para usuarios y horarios.
- Paginación por `limit`, `offset` o `page` en endpoints de listado.
- Detección de conflictos por solapamiento de horarios.
- Auditoría de login, logout, refresh, cambios de usuarios y horarios.
- Carga y procesamiento de documentos desde el dashboard.
- Dashboard responsivo con `Context API` y hooks.
- Manejo centralizado de errores en backend y frontend.

## Modelo de permisos

- `ADMIN`
  Administra todos los usuarios, horarios y auditoría.
- `MANAGER`
  Administra usuarios con rol `EMPLOYEE`, sus horarios y auditoría.
- `EMPLOYEE`
  Consulta su sesión y sus propios horarios.

## Variables de entorno

Copia `.env.example` a `.env` y ajusta los valores:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/clockhub?schema=public"
JWT_ACCESS_SECRET="change-me-with-a-long-random-secret"
JWT_REFRESH_SECRET="change-me-with-a-different-long-random-secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
```

## Puesta en marcha

1. Instala dependencias:

```bash
npm install
```

2. Genera el cliente de Prisma:

```bash
npm run prisma:generate
```

3. Aplica el esquema a PostgreSQL:

```bash
npm run prisma:push
```

4. Carga datos de ejemplo:

```bash
npm run db:seed
```

5. Inicia el entorno de desarrollo:

```bash
npm run dev
```

6. Abre `http://localhost:3000/auth/login` e ingresa con alguna de las credenciales demo.

## PostgreSQL con Docker

Si no tienes PostgreSQL local, puedes levantarlo con Docker usando el archivo `docker-compose.yml` incluido en la raíz del proyecto.

1. Inicia la base:

```bash
docker compose up -d
```

2. Verifica que el contenedor esté sano:

```bash
docker compose ps
```

3. Aplica el esquema y carga datos:

```bash
npm run prisma:push
npm run db:seed
```

4. Cuando termines, puedes detenerlo con:

```bash
docker compose down
```

Si quieres eliminar también el volumen persistente:

```bash
docker compose down -v
```

## Credenciales de seed

- `admin@clockhub.local` / `ChangeMe123!`
- `manager@clockhub.local` / `ChangeMe123!`
- `employee@clockhub.local` / `ChangeMe123!`

## Endpoints principales

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Usuarios

- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`

### Horarios

- `GET /api/schedules`
- `POST /api/schedules`
- `GET /api/schedules/:id`
- `PUT /api/schedules/:id`
- `PATCH /api/schedules/:id`
- `DELETE /api/schedules/:id`

### Auditoría y dashboard

- `GET /api/audit`
- `GET /api/dashboard`
- `GET /api/health`

## Reglas de negocio destacadas

- Un horario no puede terminar antes o al mismo tiempo que empieza.
- No se permite crear ni editar horarios que se solapen para el mismo usuario, salvo que el horario previo esté cancelado.
- Los managers no pueden crear, modificar o desactivar admins ni managers.
- Un usuario no puede desactivar su propia cuenta desde el panel.
- Cada acción crítica genera una entrada en `AuditLog`.

## Autenticación en rutas protegidas

Las rutas protegidas aceptan cualquiera de estos mecanismos:

```http
Authorization: Bearer <access_token>
```

o las cookies HttpOnly generadas por el login.

Respuestas esperadas:

- `401` cuando falta token, está expirado o es inválido.
- `403` cuando el usuario está autenticado pero no tiene el rol suficiente.

## Paginación

Los endpoints de listado aceptan:

- `limit`
- `offset`
- `page`

Ejemplo:

```bash
curl "http://localhost:3000/api/schedules?limit=10&page=2" \
  -H "Authorization: Bearer <access_token>"
```

La respuesta incluye `meta.pagination` con `total`, `page`, `offset`, `limit` y `totalPages`.

## Filtros de auditoría

`GET /api/audit` acepta además:

- `action`
- `actorId`
- `entityType`

Ejemplo:

```bash
curl "http://localhost:3000/api/audit?action=AUTH_LOGIN&entityType=session" \
  -H "Authorization: Bearer <access_token>"
```

## Comandos útiles

```bash
npm run dev
npm run lint
npm run typecheck
npm run prisma:generate
npm run prisma:push
npm run db:seed
```

## Estructura

```text
prisma/
  schema.prisma
  seed.ts
src/
  app/
    api/
    auth/login/
    dashboard/
  components/
    auth/
    dashboard/
    ui/
  hooks/
  lib/
  types/
```

## Notas

 - `src/proxy.ts` protege `/dashboard` y evita mostrar el login cuando ya existe sesión.
- El login precarga las credenciales del usuario administrador para acelerar pruebas locales.
- La app espera PostgreSQL real; sin `DATABASE_URL` válido, Prisma y las rutas protegidas no podrán inicializarse.
- Para producción, usa secretos largos y distintos para access y refresh tokens.
- La guía de módulos y flujo interno está en `docs/CODEBASE.md`.
- El diagrama ER y el flujo JWT están en `docs/DELIVERY.md`.
