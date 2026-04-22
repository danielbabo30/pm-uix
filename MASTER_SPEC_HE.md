# מסמך אפיון טכני מלא — PM System
### גרסה 1.0 | עברית | עודכן: אפריל 2026

---

## תוכן עניינים

1. [סקירה כללית](#1-סקירה-כללית)
2. [מיפוי קבצים](#2-מיפוי-קבצים)
3. [מבנה ה-Database — ERD](#3-מבנה-ה-database--erd)
4. [API Routes — תיעוד מלא](#4-api-routes--תיעוד-מלא)
5. [לוגיקה עסקית](#5-לוגיקה-עסקית)
6. [קומפוננטים מרכזיים](#6-קומפוננטים-מרכזיים)
7. [אותנטיקציה והרשאות](#7-אותנטיקציה-והרשאות)
8. [קבועים ומיפויים](#8-קבועים-ומיפויים)
9. [פריסה ו-Docker](#9-פריסה-ו-docker)
10. [נקודות לבדיקה — QA Anchors](#10-נקודות-לבדיקה--qa-anchors)

---

## 1. סקירה כללית

### מטרת המערכת
**PM System** היא מערכת ניהול פרויקטים פנים-ארגונית המיועדת לניהול משימות לאורך מחזור חיי פיתוח: **איפיון → עיצוב → פיתוח**. המערכת מאפשרת מעקב אחר ספרינטים, עומסי פיתוח, תגובות, התראות וארכיון.

### Stack טכנולוגי

| שכבה | טכנולוגיה |
|---|---|
| Frontend | Next.js 14.2 (App Router) + React 18 |
| Backend | Next.js API Routes (Node.js) |
| Database | MongoDB Atlas (Mongoose ODM) |
| Auth | Session-based עם httpOnly cookie |
| Styling | Tailwind CSS |
| Drag & Drop | dnd-kit |
| עריכת טקסט | contenteditable (inline images) |
| שפה | TypeScript (strict mode) |
| פריסה | Docker (standalone build) |
| אזור זמן | Asia/Jerusalem (ישראל) |

### ארכיטקטורה
```
Browser
  │
  ├─ Next.js Client Components (React)
  │    ├─ UserContext (session state)
  │    └─ NotificationsContext (polling 30s)
  │
  ├─ middleware.ts ← בודק pm-session cookie בכל בקשה
  │
  └─ Next.js API Routes
       │
       └─ MongoDB Atlas (Cloud)
            └─ DB: pmdb
```

---

## 2. מיפוי קבצים

### 2.1 עץ תיקיות מלא

```
pm-system/
├── app/                              # Next.js App Router
│   ├── layout.tsx                   # Root layout — providers + NavBar
│   ├── page.tsx                     # / → redirect to /master
│   ├── login/page.tsx               # דף התחברות
│   ├── master/page.tsx              # תצוגה כללית (כל הצוותים)
│   ├── spec/page.tsx                # לוח איפיון
│   ├── design/page.tsx              # לוח עיצוב
│   ├── dev/page.tsx                 # לוח פיתוח + ניהול ספרינטים
│   ├── archive/page.tsx             # ארכיון ספרינטים
│   ├── holidays/page.tsx            # ניהול חופשות
│   ├── users/page.tsx               # ניהול משתמשים (admin)
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts       # POST התחברות
│       │   ├── logout/route.ts      # POST התנתקות
│       │   └── me/route.ts          # GET משתמש נוכחי
│       ├── health/route.ts          # GET בדיקת חיבור DB
│       ├── tasks/
│       │   ├── route.ts             # GET רשימה / POST יצירה
│       │   ├── export/route.ts      # GET ייצוא CSV
│       │   ├── import/route.ts      # POST ייבוא CSV
│       │   └── [id]/
│       │       ├── route.ts         # GET/PATCH/DELETE משימה
│       │       ├── comments/route.ts# GET/POST תגובות
│       │       ├── history/route.ts # GET היסטוריית שינויים
│       │       ├── links/route.ts   # POST/DELETE קישורים
│       │       ├── duplicate/route.ts # POST שכפול
│       │       └── transfer/route.ts  # POST העברה לצוות
│       ├── sprints/
│       │   ├── route.ts             # GET ספרינטים פעילים
│       │   ├── [id]/route.ts        # PATCH עדכון ספרינט
│       │   └── complete/route.ts    # POST סגירת ספרינט
│       ├── users/
│       │   ├── route.ts             # GET/POST משתמשים
│       │   └── [id]/
│       │       ├── route.ts         # PATCH/DELETE משתמש
│       │       ├── permissions/route.ts # PATCH הרשאות
│       │       └── vacations/route.ts   # GET/POST חופשות
│       ├── holidays/
│       │   ├── route.ts             # GET/POST חגים
│       │   └── [id]/route.ts        # PATCH/DELETE חג
│       ├── notifications/
│       │   ├── route.ts             # GET/PATCH/DELETE התראות
│       │   └── [id]/route.ts        # PATCH סמן כנקרא
│       ├── report/sprint/route.ts   # GET דוח ספרינט
│       ├── archive/
│       │   ├── sprints/route.ts     # GET ספרינטים מאורכבים
│       │   └── sprints/[id]/tasks/route.ts # GET משימות ספרינט מאורכב
│       └── upload/route.ts          # POST העלאת קובץ/תמונה
│
├── components/
│   ├── board/
│   │   ├── BoardPage.tsx            # עטיפה גנרית ללוחות צוותים
│   │   ├── BoardView.tsx            # לוח קנבן עם drag-drop
│   │   ├── DevBoardPage.tsx         # לוח פיתוח + ניהול ספרינטים
│   │   ├── MasterView.tsx           # תצוגה כללית — כל הצוותים
│   │   ├── Column.tsx               # עמודת סטטוס בלוח
│   │   ├── TaskCard.tsx             # כרטיסיית משימה
│   │   ├── SprintCloseWizard.tsx    # אשף סגירת ספרינט
│   │   ├── WorkloadTable.tsx        # טבלת עומסי פיתוח
│   │   ├── ClientReportModal.tsx    # מודל דוח ספרינט
│   │   └── ImportExportModal.tsx    # מודל ייצוא/ייבוא CSV
│   ├── task/
│   │   ├── TaskModal.tsx            # עורך משימה מלא
│   │   ├── CreateTaskModal.tsx      # יצירת משימה חדשה
│   │   ├── UserPicker.tsx           # בחירת משתמש (dropdown)
│   │   ├── DescriptionEditor.tsx    # עורך תיאור עם תמונות inline
│   │   ├── CommentThread.tsx        # תגובות מקוננות + @mention
│   │   ├── TaskHistoryPanel.tsx     # פאנל היסטוריית שינויים
│   │   └── ExternalLinks.tsx        # ניהול קישורים חיצוניים
│   ├── holidays/
│   │   └── HolidaysManager.tsx      # ממשק CRUD לחגים
│   ├── users/
│   │   └── UserManager.tsx          # ממשק CRUD למשתמשים
│   └── ui/
│       ├── NavBar.tsx               # ניווט עליון
│       ├── NotificationsSidebar.tsx # פאנל התראות
│       ├── Modal.tsx                # עטיפה גנרית למודלים
│       └── Badge.tsx                # תגי סטטוס/עדיפות
│
├── db/
│   └── mongodb.ts                   # חיבור Mongoose + כל המודלים + helpers
│
├── lib/
│   ├── constants.ts                 # קבועים: תוויות, כללי העברה, עמודות
│   ├── types.ts                     # TypeScript interfaces
│   ├── userContext.tsx              # Provider — session state
│   ├── notificationsContext.tsx     # Provider — התראות (polling)
│   └── dateUtils.ts                 # חישובי ימי עבודה, טיפול בשעון ישראל
│
├── middleware.ts                    # בדיקת אותנטיקציה לפני כל בקשה
├── next.config.mjs                  # הגדרות Next.js (standalone, CSP)
├── Dockerfile                       # Docker multi-stage build
├── docker-compose.yml               # הגדרות Docker Compose
└── .env.production                  # משתני סביבה לפרודקשן
```

---

### 2.2 תפקידי קבצים — טבלה מסכמת

| קובץ | אחראי על |
|---|---|
| `db/mongodb.ts` | **לב המערכת** — חיבור DB, כל 11 המודלים, helpers (formatTask, recordHistory, getNextId) |
| `middleware.ts` | שומר הסף — בודק כל בקשה, חוסם גישה ללא session |
| `lib/types.ts` | חוזה נתונים — כל ה-interfaces בין frontend לbackend |
| `lib/constants.ts` | כל הקבועים: עמודות לוח, כללי העברה, תוויות עברית |
| `lib/userContext.tsx` | state גלובלי של המשתמש המחובר |
| `lib/notificationsContext.tsx` | polling להתראות + state גלובלי |
| `lib/dateUtils.ts` | חישוב ימי עבודה, ניכוי חופשות/חגים, פורמט שעון ישראל |
| `components/board/WorkloadTable.tsx` | חישוב עומסים: שעות פיתוח vs. קיבולת זמינה |
| `app/api/sprints/complete/route.ts` | **הפעולה המורכבת ביותר** — 6 שלבים אטומיים לסגירת ספרינט |
| `app/api/tasks/[id]/route.ts` | **הנתיב הכבד ביותר** — PATCH עם היסטוריה, התראות ועדכון שדות |

---

## 3. מבנה ה-Database — ERD

### 3.1 דיאגרמת קשרים (ERD טקסטואלי)

```
┌─────────────┐         ┌─────────────────┐
│    User     │         │     Session     │
│─────────────│         │─────────────────│
│ id (PK)     │◄────────│ user_id (FK)    │
│ name        │         │ token (unique)  │
│ email       │         │ expires_at      │
│ password_   │         └─────────────────┘
│   hash      │
│ role        │         ┌─────────────────┐
│ is_admin    │         │    Vacation     │
│ can_see_*   │◄────────│ user_id (FK)    │
│ daily_hours │         │ start_date      │
└──────┬──────┘         │ end_date        │
       │                └─────────────────┘
       │ assigned_to
       ▼
┌─────────────────────────────────────────┐
│                  Task                   │
│─────────────────────────────────────────│
│ _id (string: "1", "2", "2.5")  (PK)    │
│ parent_id (self-ref, FK)                │
│ sequence (number, auto-increment)       │
│ title                                   │
│ description                             │
│ responsible_team (Spec/Design/Dev)      │
│ status (team-specific enum)             │
│ priority (Low/Medium/High/Urgent)       │
│ assignee_id       → User.id             │
│ backend_dev_id    → User.id             │
│ frontend_dev_id   → User.id             │
│ backend_effort (שעות)                   │
│ frontend_effort (שעות)                  │
│ tests_passed (0|1)                      │
│ flag (0|1|2)                            │
│ sort_order                              │
│ is_archived (0|1)                       │
│ archived_sprint_id → Sprint.id          │
│ wip_from_sprint_id → Sprint.id          │
│ created_at / updated_at                 │
└────┬──────┬──────┬──────────────────────┘
     │      │      │
     ▼      ▼      ▼
┌────────┐ ┌──────────┐ ┌─────────────────┐
│Comment │ │TaskLink  │ │  TaskHistory    │
│────────│ │──────────│ │─────────────────│
│task_id │ │task_id   │ │ task_id         │
│parent_ │ │url       │ │ user_id → User  │
│ comment│ │label     │ │ user_name       │
│ _id    │ │sort_order│ │ action (string) │
│author_ │ └──────────┘ └─────────────────┘
│ id     │
│body    │
└────────┘

┌─────────────┐       ┌─────────────────┐
│   Sprint    │       │  Notification   │
│─────────────│       │─────────────────│
│ id (PK)     │       │ user_id → User  │
│ sprint_order│       │ type            │
│   ≥0: פעיל │       │   (mention |    │
│   <0: הושלם│       │    assignment)  │
│ name        │       │ message         │
│ start_date  │       │ link            │
│ code_freeze │       │ is_read (0|1)   │
│ prod_date   │       └─────────────────┘
│ status      │
│ sprint_     │       ┌─────────────────┐
│  number     │       │    Holiday      │
└─────────────┘       │─────────────────│
                       │ title           │
                       │ start_date      │
                       │ end_date        │
                       └─────────────────┘
```

### 3.2 שדות מפורטים לכל Collection

#### User
| שדה | טיפוס | חובה | ברירת מחדל | הערות |
|---|---|---|---|---|
| id | Number | ✓ | auto-increment | מזהה מספרי (לא ObjectId) |
| name | String | ✓ | — | שם מלא |
| email | String | — | — | unique, sparse |
| password_hash | String | — | — | bcrypt 10 rounds |
| role | String | — | null | 'מנתח מערכות', 'UI', 'UX', 'מפתח Be', 'מפתח Fe', 'Fs' |
| is_admin | Number | — | 0 | 0 או 1 |
| can_see_master | Number | — | 1 | גישה לתצוגה כללית |
| can_see_spec | Number | — | 1 | גישה ללוח איפיון |
| can_see_design | Number | — | 1 | גישה ללוח עיצוב |
| can_see_dev | Number | — | 1 | גישה ללוח פיתוח |
| daily_hours | Number | — | null | שעות עבודה יומיות (לחישוב קיבולת) |
| created_at | String | — | now() | ISO timestamp |

#### Task
| שדה | טיפוס | הערות |
|---|---|---|
| _id | String | ID מותאם: "1", "2", "2.5" (שכפולים = עשרוני) |
| parent_id | String | מצביע על ה-task שממנו שוכפל |
| sequence | Number | מונה גלובלי, אינקרמנטלי |
| responsible_team | String | Specification / Design / Development |
| status | String | תלוי בצוות (ראה סעיף 8) |
| flag | Number | 0=ללא, 1=ספרינט קרוב 🚩, 2=דחיפות גבוהה 🚩🚩 |
| is_archived | Number | 0=פעיל, 1=בארכיון |
| archived_sprint_id | Number | ב-Sprint.id שבו הושלם |
| wip_from_sprint_id | Number | ב-Sprint.id שממנו הועבר (WIP) |

#### Sprint — ערכי sprint_order
| ערך | משמעות |
|---|---|
| 0 | ספרינט נוכחי |
| 1 | ספרינט הבא |
| 2 | ספרינט הבא הבא |
| < 0 (שלילי) | ספרינט שהסתיים (archived) |

---

## 4. API Routes — תיעוד מלא

### 4.1 אותנטיקציה

| Method | Path | גוף הבקשה | תגובה | הערות |
|---|---|---|---|---|
| POST | `/api/auth/login` | `{email, password}` | `{success, name}` + cookie | מגדיר `pm-session` httpOnly |
| POST | `/api/auth/logout` | — | `{ok: true}` | מוחק session מה-DB וה-cookie |
| GET | `/api/auth/me` | — | User object | מחייב cookie תקף |

### 4.2 משימות (Tasks)

| Method | Path | תיאור |
|---|---|---|
| GET | `/api/tasks` | רשימת כל המשימות הפעילות. Query: `?team=` |
| POST | `/api/tasks` | יצירת משימה. חובה: `title` |
| GET | `/api/tasks/[id]` | משימה מלאה + תגובות + קישורים |
| PATCH | `/api/tasks/[id]` | עדכון שדות + היסטוריה + התראות |
| DELETE | `/api/tasks/[id]` | מחיקה קשיחה |
| POST | `/api/tasks/[id]/transfer` | העברה לצוות אחר |
| POST | `/api/tasks/[id]/duplicate` | שכפול עם ID עשרוני |
| GET | `/api/tasks/[id]/comments` | עץ תגובות |
| POST | `/api/tasks/[id]/comments` | הוספת תגובה + mention notifications |
| GET | `/api/tasks/[id]/history` | יומן שינויים (newest first) |
| POST | `/api/tasks/[id]/links` | הוספת קישור חיצוני |
| DELETE | `/api/tasks/[id]/links?linkId=` | מחיקת קישור |
| GET | `/api/tasks/export` | ייצוא CSV (Query: `?archived=1`) |
| POST | `/api/tasks/import` | ייבוא CSV (`{csv: string}`) |

**שדות מותרים ב-PATCH:**
```
title, description, responsible_team, status, priority,
assignee_id, backend_dev_id, frontend_dev_id,
backend_effort, frontend_effort, tests_passed, flag,
sort_order, wip_from_sprint_id
```

### 4.3 ספרינטים (Sprints)

| Method | Path | תיאור |
|---|---|---|
| GET | `/api/sprints` | ספרינטים פעילים (order ≥ 0), ממוינים |
| PATCH | `/api/sprints/[id]` | עדכון שדות ספרינט (תאריכים, שם) |
| POST | `/api/sprints/complete` | סגירת ספרינט — 6 שלבים (ראה סעיף 5) |

### 4.4 משתמשים (Users)

| Method | Path | תיאור |
|---|---|---|
| GET | `/api/users` | רשימת משתמשים (ללא password_hash) |
| POST | `/api/users` | יצירת משתמש. חובה: name, email, password |
| PATCH | `/api/users/[id]` | עדכון: name, email, role, daily_hours, password |
| DELETE | `/api/users/[id]` | מחיקת משתמש |
| PATCH | `/api/users/[id]/permissions` | עדכון הרשאות לוחות + is_admin |
| GET | `/api/users/[id]/vacations` | חופשות אישיות |
| POST | `/api/users/[id]/vacations` | הוספת חופשה |

### 4.5 חגים, התראות, ארכיון

| Method | Path | תיאור |
|---|---|---|
| GET | `/api/holidays` | רשימת חגים |
| POST | `/api/holidays` | יצירת חג |
| PATCH | `/api/holidays/[id]` | עדכון חג |
| DELETE | `/api/holidays/[id]` | מחיקת חג |
| GET | `/api/notifications` | התראות משתמש (100 אחרונות) |
| PATCH | `/api/notifications` | סמן הכל כנקרא |
| DELETE | `/api/notifications` | מחיקת כל ההתראות |
| PATCH | `/api/notifications/[id]` | סמן התראה בודדת כנקראה |
| GET | `/api/report/sprint` | דוח ספרינט (done/wip/next/backlog) |
| GET | `/api/archive/sprints` | ספרינטים שהסתיימו |
| GET | `/api/archive/sprints/[id]/tasks` | משימות ספרינט מאורכב |
| GET | `/api/health` | בדיקת חיבור DB |
| POST | `/api/upload` | העלאת תמונה → מחזיר URL |

---

## 5. לוגיקה עסקית

### 5.1 מחזור חיי משימה

```
יצירה (POST /api/tasks)
    │
    ▼
[צוות: Specification]
 סטטוס: Awaiting Spec → In Spec → Done
    │
    ▼ (transfer)
[צוות: Design]
 סטטוס: Awaiting UX → In UX → Awaiting UI → In UI → Awaiting Client Approval → Done
    │
    ▼ (transfer)
[צוות: Development]
 סטטוס: Awaiting Dev → Current Sprint → Next Sprint → Sprint After Next
    │
    ▼ (sprint complete)
 is_archived=1 (ארכיון)
```

### 5.2 זרימת סגירת ספרינט (6 שלבים אטומיים)

```
POST /api/sprints/complete
Body: { decisions: { "taskId": "done"|"next"|"backlog" } }

שלב 1: יישום החלטות על משימות ספרינט נוכחי
   "done"    → is_archived=1, archived_sprint_id=currentId, status='Done'
   "next"    → status='Next Sprint', wip_from_sprint_id=currentId
   "backlog" → status='Awaiting Dev'

שלב 2: גלגול סטטוסים (is_archived=0 בלבד)
   'Next Sprint'        → 'Current Sprint'
   'Sprint After Next'  → 'Next Sprint'

שלב 3: חישוב מספר ספרינט (max + 1)

שלב 4: סימון ספרינט כהושלם
   sprint_order = -id (שלילי ← הולך לארכיון)
   status = 'completed'
   completed_at = now()
   sprint_number = חדש

שלב 5: קידום ספרינטים פעילים
   order 1 → 0 (הספרינט הבא הופך לנוכחי)
   order 2 → 1

שלב 6: יצירת ספרינט חדש
   order=2, name='ספרינט הבא הבא'
```

### 5.3 מנגנון העברה בין צוותים

**כללי העברה (TRANSFER_RULES מ-constants.ts):**

| מצוות | לצוות | סטטוס יעד |
|---|---|---|
| Specification | Design | Awaiting UX |
| Specification | Development | Awaiting Dev |
| Design | Development | Awaiting Dev |
| Design | Specification | Awaiting Spec |
| Development | Specification | Awaiting Spec |
| Development | Design | Awaiting UX |

**תצוגה כללית (MasterView)** — מציגה את כל 6 כיווני ההעברה.
**לוח ספציפי** — מציג רק העברות יוצאות מהצוות הנוכחי.

### 5.4 חישוב עומסי פיתוח (WorkloadTable)

```
לכל מפתח:
  sprintWorkDays = countWorkDays(sprint.start_date, sprint.code_freeze_date)
  daysOff = countCombinedDaysOff([
    user.vacations (תוך הספרינט),
    holidays (תוך הספרינט)
  ])
  availableDays  = sprintWorkDays - daysOff
  availableHours = availableDays × (user.daily_hours ?? 8)

  assignedHours = Σ backend_effort (tasks assigned as BE)
                + Σ frontend_effort (tasks assigned as FE)

  utilization% = assignedHours / availableHours × 100
```

**חישוב ימי עבודה:** ימים א׳–ה׳ בלבד (0–4), ו׳–ש׳ אינם נחשבים.

### 5.5 תגובות ו-@mentions

```
POST /api/tasks/[id]/comments
Body: { body, author_id, author_name, parent_comment_id? }

1. שמירת התגובה ב-DB (Comment collection)
2. חיפוש @mentions ב-body: regex /@([^\s@]+)/g
3. לכל mention:
   a. חיפוש משתמש לפי שם
   b. אם נמצא → יצירת Notification:
      { user_id, type:'mention', message, link }
   c. link = '/{teamPath}?open={taskId}'

תגובות מקוננות:
  - רמה 1: parent_comment_id = null
  - רמה 2: parent_comment_id = id של תגובת האב
  - (לא נתמכות יותר מ-2 רמות ב-UI)
```

### 5.6 שכפול משימות

```
POST /api/tasks/[id]/duplicate

1. טעינת המשימה המקורית
2. חישוב ID חדש: getDuplicateTaskId(sequence)
   → מנסה "{sequence}.5", ".6", ".7", ... עד שמוצא פנוי
   → fallback: "{sequence}.{timestamp}"
3. יצירת משימה חדשה עם:
   - _id = newId
   - parent_id = original._id
   - title = original.title + " (עותק)"
   - כל שאר השדות מועתקים
4. שכפול כל הקישורים (TaskLinks)
5. רישום היסטוריה: "שוכפל ממשימה #X"
```

### 5.7 ייצוא/ייבוא CSV

**ייצוא:**
- BOM (`\uFEFF`) בתחילת הקובץ → עברית עובדת ב-Excel
- שמות משתמשים מוצגים (לא IDs)
- עמודות: מזהה, כותרת, תיאור, צוות, סטטוס, עדיפות, גורם מבצע, מפתח BE/FE, מאמץ, בדיקות, דגל, בארכיון, נוצר

**ייבוא:**
- תומך בכותרות עברית (מהייצוא) ואנגלית
- שדה חובה: `כותרת` / `title`
- שמות משתמשים ממופים לפי שם (case-sensitive)
- שורה עם כותרת ריקה — מדולגת עם הסבר
- מחזיר: `{ created, errors[], total }`

### 5.8 היסטוריית שינויים (Audit Log)

כל שינוי ב-PATCH/transfer/duplicate נרשם ב-`TaskHistory`:

| פעולה | תיאור שנשמר |
|---|---|
| שינוי סטטוס | `סטטוס: Awaiting Dev → Current Sprint` |
| שינוי עדיפות | `עדיפות: Medium → High` |
| שינוי גורם מבצע | `גורם מבצע: דני → יוסי` |
| עדכון תיאור | `עדכון תיאור` |
| בדיקות | `תרחישי בדיקות: בוצעו ✓` |
| דגל | `דגל: 🚩🚩 שני דגלים` |
| העברה | `העברה: Design → Development (Awaiting Dev)` |
| שכפול | `שוכפל ממשימה #X` |
| ייבוא CSV | `יובא מקובץ CSV` |

### 5.9 מנגנון התראות

**סוגי התראות:**

| סוג | מתי נוצר | הודעה לדוגמה |
|---|---|---|
| `assignment` | שינוי assignee_id ב-PATCH | "שויכת למשימה #5: כותרת המשימה" |
| `mention` | @שם בתגובה | "צוין בתגובה במשימה #5: כותרת" |

**Polling:** `NotificationsContext` קורא `GET /api/notifications` כל **30 שניות**.
**Badge:** מספר ההתראות שלא נקראו מוצג על אייקון הפעמון.

---

## 6. קומפוננטים מרכזיים

### 6.1 BoardView — לוח קנבן

```
BoardView
├── DndContext (dnd-kit)
│   └── SortableContext (לכל עמודה)
│       ├── Column (per status)
│       │   └── TaskCard (per task)
│       │        ├── Drag handle (כל הכרטיסייה)
│       │        ├── Flag indicator (🚩/🚩🚩)
│       │        ├── Transfer menu (ArrowRightLeft icon)
│       │        └── onClick → TaskModal
│       └── DragOverlay
└── CreateTaskModal (כפתור +)
```

**Drag & Drop:**
- `activation: distance: 5px` — מבדיל בין לחיצה לגרירה
- On drop: `PATCH sort_order` לכל הכרטיסיות בעמודת היעד

### 6.2 TaskModal — מבנה

```
TaskModal
├── Header row
│   ├── #ID + parent link
│   ├── Title input (onBlur → save)
│   └── Action buttons
│       ├── [—|🚩|🚩🚩] Flag toggle
│       ├── ⏱ History (toggle panel)
│       ├── Copy (duplicate)
│       └── 🗑 Delete
├── Meta grid (2 עמודות)
│   ├── צוות אחראי (select)
│   ├── סטטוס (select — תלוי בצוות)
│   ├── עדיפות (select)
│   └── גורם מבצע (UserPicker)
├── Description (DescriptionEditor — contenteditable)
├── Tests checkbox (saves immediately)
├── [Dev fields] — רק לצוות Development
│   ├── מפתח BE / FE (UserPicker)
│   ├── מאמץ BE / FE (number inputs)
│   └── Save button
├── Transfer buttons (מ-TRANSFER_RULES)
├── ExternalLinks
├── CommentThread
└── [History panel — side column, 320px]
    └── TaskHistoryPanel (timeline)
```

### 6.3 SprintCloseWizard

```
שלב 1 — החלטות:
  לכל משימה ב-Current Sprint:
    [הושלם] [ספרינט הבא] [בקלוג]
  [כל הושלמו] [כל ספרינט הבא] — כפתורי bulk

שלב 2 — אישור:
  סיכום: X הושלמו, Y לספרינט הבא, Z לבקלוג
  [אשר סגירת ספרינט] → POST /api/sprints/complete
```

### 6.4 WorkloadTable

```
לכל מפתח:
  שורה: שם | שע׳ BE | שע׳ FE | סה"כ שע׳ | שעות פנויות | עומס%
  
צבעי עומס:
  < 70%  → ירוק (מתחת לקיבולת)
  70-90% → כתום (קרוב לקיבולת)
  > 90%  → אדום (עומס יתר)
```

---

## 7. אותנטיקציה והרשאות

### 7.1 זרימת אותנטיקציה

```
1. משתמש שולח POST /api/auth/login { email, password }
2. שרת: מוצא User לפי email
3. bcrypt.compare(password, user.password_hash)
4. אם תקין: יצירת Session (token=randomUUID, expires=30 ימים)
5. Set-Cookie: pm-session={token}; HttpOnly; SameSite=lax; Path=/
6. תגובה: { success: true, name: user.name }
7. דפדפן: window.location.href = '/master' (reload מלא)
   → UserProvider טוען מחדש → GET /api/auth/me
```

### 7.2 Middleware

**קובץ:** `middleware.ts`

```
כל בקשה נכנסת:
  ├── אם path ב-publicPaths → allow
  ├── אם אין cookie pm-session → redirect /login
  └── allow (validation מלאה ב-route handlers)

publicPaths:
  /login, /api/auth/login, /_next/*, /favicon.ico
```

### 7.3 מטריצת הרשאות

| דף/פיצ׳ר | רגיל | עם הרשאה | admin |
|---|---|---|---|
| `/master` | ✓ (אם can_see_master=1) | — | ✓ |
| `/spec` | ✓ (אם can_see_spec=1) | — | ✓ |
| `/design` | ✓ (אם can_see_design=1) | — | ✓ |
| `/dev` | ✓ (אם can_see_dev=1) | — | ✓ |
| `/archive` | ✓ (אם can_see_dev=1) | — | ✓ |
| דוח סיכום | ✓ (אם can_see_dev=1) | — | ✓ |
| ייצוא/ייבוא CSV | ✗ | ✗ | ✓ |
| `/users` | ✗ | ✗ | ✓ |
| `/holidays` | ✗ | ✗ | ✓ |
| ניהול ספרינטים | ✓ (אם can_see_dev=1) | — | ✓ |

---

## 8. קבועים ומיפויים

### 8.1 סטטוסים לפי צוות

```typescript
// Specification
['Awaiting Spec', 'In Spec', 'Done']

// Design
['Awaiting UX', 'In UX', 'Awaiting UI', 'In UI', 'Awaiting Client Approval', 'Done']

// Development
['Awaiting Dev', 'Current Sprint', 'Next Sprint', 'Sprint After Next']
```

### 8.2 תוויות עברית

```typescript
TEAM_LABELS = {
  Specification: 'איפיון',
  Design:        'עיצוב',
  Development:   'פיתוח',
}

STATUS_LABELS = {
  'Awaiting Spec':           'ממתין לאיפיון',
  'In Spec':                 'באיפיון',
  'Awaiting UX':             'ממתין ל-UX',
  'In UX':                   'ב-UX',
  'Awaiting UI':             'ממתין ל-UI',
  'In UI':                   'ב-UI',
  'Awaiting Client Approval':'ממתין לאישור',
  'Awaiting Dev':            'ממתין לפיתוח',
  'Current Sprint':          'ספרינט נוכחי',
  'Next Sprint':             'ספרינט הבא',
  'Sprint After Next':       'ספרינט הבא הבא',
  'Done':                    'הושלם',
  ...
}
```

### 8.3 תפקידי משתמשים

```typescript
USER_ROLES = [
  'מנתח מערכות',  // Specification
  'UI',           // Design
  'UX',           // Design
  'מפתח Be',      // Development BE
  'מפתח Fe',      // Development FE
  'Fs',           // Full Stack
]
```

---

## 9. פריסה ו-Docker

### 9.1 Dockerfile — Multi-stage Build

```
Stage 1 (deps):    node:20-alpine — npm ci
Stage 2 (builder): npm run build (next build)
Stage 3 (runner):  minimal image — node server.js
```

**next.config.mjs:** `output: 'standalone'` — מייצר `server.js` עצמאי.

### 9.2 פקודות הפעלה ל-DevOps

```bash
# בנה image
docker compose build

# הרץ ברקע
docker compose up -d

# עצור
docker compose down

# לוגים
docker compose logs -f pm-system
```

### 9.3 משתני סביבה נדרשים

| משתנה | ערך | הכרחי |
|---|---|---|
| `MONGODB_URI` | connection string ל-Atlas | ✓ |

### 9.4 MongoDB Atlas — רשימת IPs

אחרי העלאת השרת, **חובה** להוסיף את ה-IP של השרת ב:
> MongoDB Atlas → Network Access → Add IP Address

---

## 10. נקודות לבדיקה — QA Anchors

### 10.1 אותנטיקציה

| # | תרחיש | קלט | תוצאה צפויה |
|---|---|---|---|
| A1 | התחברות תקינה | email + password נכון | redirect ל-/master, NavBar מוצג |
| A2 | סיסמה שגויה | password לא נכון | הודעת שגיאה, לא מתחבר |
| A3 | session פג | cookie ישן | redirect ל-/login |
| A4 | גישה ישירה ללא session | URL ישיר | redirect ל-/login |
| A5 | הרשאות חסרות | can_see_dev=0 | לוח פיתוח לא מוצג בNavBar |
| A6 | התנתקות | לחיצה על logout | cookie נמחק, redirect /login |

### 10.2 ניהול משימות

| # | תרחיש | קלט | תוצאה צפויה |
|---|---|---|---|
| T1 | יצירת משימה | כותרת בלבד | נוצרת עם default status + priority |
| T2 | כותרת ריקה | submit ריק | הודעת שגיאה, לא נשמר |
| T3 | עדכון שדה | שינוי onBlur | נשמר מיידית, היסטוריה מתעדכנת |
| T4 | העברת צוות | לחיצה על "העבר" | צוות + סטטוס מתעדכנים, נרשם בהיסטוריה |
| T5 | שכפול | לחיצה על Copy | משימה חדשה עם ID עשרוני (1.5) |
| T6 | מחיקה | אישור | משימה נמחקת מהלוח |
| T7 | drag-drop | גרירה לעמודה אחרת | sort_order מתעדכן, כרטיסייה במיקום חדש |
| T8 | drag vs click | לחיצה קצרה | פותח modal (לא גרירה) |
| T9 | דגל | לחיצה 🚩 | מוצג על הכרטיסייה, נרשם בהיסטוריה |
| T10 | flag toggle | לחיצה שוב על אותו דגל | מאופס ל-0 |

### 10.3 תגובות ו-mentions

| # | תרחיש | תוצאה צפויה |
|---|---|---|
| C1 | תגובה רגילה | נשמרת ומוצגת |
| C2 | @שם קיים | התראה נשלחת למשתמש |
| C3 | @שם לא קיים | תגובה נשמרת, אין התראה |
| C4 | reply לתגובה | מוצגת כמקוננת |
| C5 | Enter לשליחה | שולח תגובה |
| C6 | Shift+Enter | שורה חדשה (לא שולח) |

### 10.4 ספרינטים

| # | תרחיש | תוצאה צפויה |
|---|---|---|
| S1 | סגירת ספרינט עם כל "הושלם" | כל המשימות עוברות לארכיון |
| S2 | סגירת ספרינט עם "ספרינט הבא" | משימות עוברות ל-Next Sprint, ספרינט הבא הופך לנוכחי |
| S3 | גלגול סטטוסים | Next→Current, After-Next→Next |
| S4 | ספרינט חדש נוצר | מופיע "ספרינט הבא הבא" בסדר 2 |
| S5 | מספור ספרינטים | sprint_number קטן ב-1 מהקודם |
| S6 | ספרינט בארכיון | sprint_order שלילי, לא מוצג בלוח |

### 10.5 עומסי פיתוח (WorkloadTable)

| # | תרחיש | תוצאה צפויה |
|---|---|---|
| W1 | ספרינט ללא תאריכים | שורת מפתח לא מציגה קיבולת |
| W2 | חופשה בתוך ספרינט | שעות פנויות מופחתות |
| W3 | חג בתוך ספרינט | כל המפתחים מקבלים ניכוי |
| W4 | מפתח ללא daily_hours | ברירת מחדל 8 שעות/יום |
| W5 | עומס יתר (>90%) | צבע אדום |

### 10.6 ייצוא/ייבוא CSV

| # | תרחיש | תוצאה צפויה |
|---|---|---|
| I1 | ייצוא רגיל | קובץ CSV נפתח תקין ב-Excel עם עברית |
| I2 | ייצוא עם ארכיון | משימות מאורכבות כלולות |
| I3 | ייבוא קובץ תקין | משימות נוצרות, דוח created/total |
| I4 | ייבוא ללא עמודת כותרת | שגיאה: "לא נמצאה עמודת כותרת" |
| I5 | שורה עם כותרת ריקה | מדולגת עם הסבר בדוח errors |
| I6 | שם משתמש לא קיים | משימה נוצרת ללא assignee_id |
| I7 | צוות לא קיים | ברירת מחדל Specification |
| I8 | קובץ לא-CSV | validation error |

### 10.7 התראות

| # | תרחיש | תוצאה צפויה |
|---|---|---|
| N1 | שיוך משימה | התראה מופיעה ב-30 שניות |
| N2 | mention בתגובה | התראה מופיעה ב-30 שניות |
| N3 | לחיצה על התראה | ניווט לדף הרלוונטי עם task פתוח |
| N4 | "סמן הכל כנקרא" | badge נעלם |
| N5 | מחק הכל | רשימה ריקה |

### 10.8 Docker ופריסה

| # | תרחיש | תוצאה צפויה |
|---|---|---|
| D1 | docker compose up | אפליקציה עולה על פורט 3000 |
| D2 | MONGODB_URI חסר | שגיאה ברורה ב-logs, לא crash שקט |
| D3 | IP לא מורשה ב-Atlas | `/api/health` מחזיר שגיאה עם הסבר |
| D4 | restart container | אפליקציה חוזרת לפעולה, sessions תקפים |
| D5 | גרסה חדשה | docker compose build + up לא מאבדת data |

---

*מסמך זה נוצר אוטומטית מניתוח קוד המקור של PM System.*
*לכל שאלה טכנית — פנה למפתח הראשי.*
