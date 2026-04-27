# Delivery Notes

## JWT Middleware

- `src/lib/middleware/auth.ts`
  expone `verifyToken()`, `verifyRefreshSessionToken()`, `requireRole()`,
  `getAccessTokenFromRequest()` y `getRefreshTokenFromRequest()`.
- Las rutas protegidas aceptan `Authorization: Bearer <token>` y mantienen
  compatibilidad con cookies HttpOnly para el frontend actual.
- Los tokens expirados o inválidos responden con `401`.
- Los roles insuficientes responden con `403`.

## ER Diagram

```mermaid
erDiagram
  User ||--o{ RefreshToken : owns
  User ||--o{ Schedule : assigned
  User ||--o{ Schedule : created
  User ||--o{ Schedule : updated
  User ||--o{ AuditLog : actor
  User ||--o{ Document : uploads

  User {
    string id PK
    string email
    string name
    string passwordHash
    Role role
    UserStatus status
    datetime createdAt
    datetime updatedAt
  }

  RefreshToken {
    string id PK
    string userId FK
    string tokenHash
    datetime expiresAt
    datetime revokedAt
    string replacedByTokenId
    datetime createdAt
  }

  Schedule {
    string id PK
    string assignedUserId FK
    string createdById FK
    string updatedById FK
    string title
    string description
    datetime startAt
    datetime endAt
    ScheduleStatus status
  }

  AuditLog {
    string id PK
    string actorId FK
    AuditAction action
    string entityType
    string entityId
    string description
    json metadata
    datetime createdAt
  }

  Document {
    string id PK
    string uploadedBy FK
    string fileName
    DocumentType fileType
    DocumentStatus status
    int fileSize
    text extractedText
    json parsedData
    string errorMessage
  }
```

## JWT Flow

```mermaid
sequenceDiagram
  participant Client
  participant API as Auth API
  participant DB as PostgreSQL

  Client->>API: POST /api/auth/signup
  API->>DB: create user with bcrypt password hash
  API-->>Client: 201 created

  Client->>API: POST /api/auth/login
  API->>DB: validate user + password
  API->>DB: create refresh session row
  API-->>Client: access_token + refresh_token

  Client->>API: GET protected route with Bearer access_token
  API->>API: verifyToken()
  API-->>Client: protected data

  Client->>API: POST /api/auth/refresh-token
  API->>API: verifyRefreshSessionToken()
  API->>DB: rotate refresh token
  API-->>Client: new access_token + new refresh_token

  Client->>API: POST /api/auth/logout
  API->>DB: revoke refresh token
  API-->>Client: session closed
```
