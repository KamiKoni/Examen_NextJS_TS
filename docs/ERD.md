# Entity Relationship Diagram

```mermaid
erDiagram
    User {
        string id PK
        string email UK
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
        string tokenHash UK
        datetime expiresAt
        datetime revokedAt
        string userAgent
        string ipAddress
        string replacedByTokenId
        datetime createdAt
    }

    Schedule {
        string id PK
        string title
        string description
        datetime startAt
        datetime endAt
        ScheduleStatus status
        string assignedUserId FK
        string createdById FK
        string updatedById FK
        datetime createdAt
        datetime updatedAt
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
        string extractedText
        json parsedData
        string errorMessage
        datetime createdAt
        datetime updatedAt
    }

    User ||--o{ RefreshToken : owns
    User ||--o{ Schedule : assignedSchedules
    User ||--o{ Schedule : createdSchedules
    User ||--o{ Schedule : updatedSchedules
    User o|--o{ AuditLog : actor
    User ||--o{ Document : uploads
```

## Notes

- `User` is the central entity for authentication, scheduling, auditing, and document uploads.
- `Schedule` keeps separate foreign keys for assignee, creator, and last updater.
- `AuditLog` uses `entityType` and `entityId` so one audit table can track multiple resources.
- `RefreshToken` supports token rotation and revocation without storing raw tokens.
