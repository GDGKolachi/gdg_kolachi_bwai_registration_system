# Registration System — Redesigned ERD

This is the target data model for extending the registration system to support
multiple **event types** (Workshop, Talks, Community Lounge, Hackathon) with a
**dynamic registration form** whose fields depend on the event's type, and a
**Hackathon-specific check-in flow** that auto-assigns attendees to balanced
teams based on role and domain.

## Entity-Relationship Diagram

```mermaid
erDiagram
    EVENT_TYPES ||--o{ EVENTS : "classifies"
    EVENTS ||--o{ REGISTRATIONS : "has"
    EVENTS ||--o{ EXCEPTION_REQUESTS : "requested for"
    EVENTS ||--o| TEAM_FORMATION_CONFIGS : "configured by (hackathon only)"
    EVENTS ||--o{ TEAMS : "owns (hackathon only)"
    ATTENDEES ||--o{ REGISTRATIONS : "submits"
    ATTENDEES ||--o{ EXCEPTION_REQUESTS : "submits"
    ADMINS ||--o{ EXCEPTION_REQUESTS : "reviews"
    ADMINS ||--o{ TEAMS : "creates / locks"
    REGISTRATIONS ||--o| TEAM_MEMBERS : "assigned to (hackathon only)"
    TEAMS ||--o{ TEAM_MEMBERS : "contains"
    ROLE_CATEGORIES ||--o{ REGISTRATIONS : "buckets via role_bucket"

    EVENT_TYPES {
        uuid id PK
        string name UK "Workshop | Talks | Community Lounge | Hackathon"
        string slug UK
        string description
        boolean is_active
        timestamp created_at
    }

    EVENTS {
        uuid id PK
        uuid event_type_id FK "NEW — links to event_types"
        string title "KEPT — event name shown dynamically"
        text description "KEPT"
        string date "KEPT"
        string time "KEPT"
        string venue "KEPT"
        int max_capacity "KEPT"
        string map_location "KEPT — nullable"
        jsonb speakers "KEPT — [{name, role, photo_url}]"
        text special_instructions "KEPT — nullable"
        string status "KEPT — upcoming|registration_open|closed|disabled"
        boolean allow_exceptions "KEPT"
        boolean is_online "KEPT"
        jsonb tracks "NEW — nullable; Community Lounge track options"
        jsonb slots "NEW — nullable; Community Lounge slot options"
        timestamp created_at "KEPT"
    }

    ATTENDEES {
        uuid id PK
        string name
        string email UK
        string phone
        string university_org
        string github "nullable"
        string linkedin
        string cnic
        string gender
        string best_describes_you "single-select; options vary by event type"
        timestamp created_at
    }

    REGISTRATIONS {
        uuid id PK
        uuid attendee_id FK
        uuid event_id FK
        text motivation "label varies by event type; hidden for Community Lounge"
        string domain "nullable; Hackathon only; single-select from 11 domains"
        string track "nullable; Community Lounge only; from events.tracks"
        string slot "nullable; Community Lounge only; from events.slots"
        string role_bucket "nullable; cached from best_describes_you via role_categories; used by team-formation engine"
        string status "pending | shortlisted | confirmed | rejected | ..."
        boolean checked_in
        timestamp checked_in_at "nullable"
        string qr_code_data "nullable"
        boolean acknowledged
        timestamp registered_at
    }

    EXCEPTION_REQUESTS {
        uuid id PK
        uuid attendee_id FK
        uuid requested_event_id FK
        text reason
        string status "pending | approved | rejected"
        string reviewed_by "nullable"
        timestamp reviewed_at "nullable"
        timestamp created_at
    }

    ADMINS {
        uuid id PK
        string email UK
        string password_hash
        string name
        timestamp created_at
    }

    ROLE_CATEGORIES {
        uuid id PK
        string role_name UK "one of the 15 best_describes_you values for Hackathon"
        string bucket "developer | designer | product_designer | qa | sales | marketing | freelancer | student | other"
        int weight "tie-breaker priority"
        boolean is_active
    }

    TEAM_FORMATION_CONFIGS {
        uuid id PK
        uuid event_id FK "unique; one config per Hackathon event"
        int max_teams "default 25"
        int max_team_size "default 4"
        int target_developers_per_team "default 2"
        int target_designers_per_team "default 1"
        int target_others_per_team "default 1"
        int soft_cap_developers_per_team "default 3"
        int domain_match_weight "default 10"
        int role_gap_weight "default 6"
        int role_overflow_penalty "default 8"
        int near_full_penalty "default 2"
        string assignment_mode "streaming | batch | hybrid (default hybrid)"
        timestamp updated_at
    }

    TEAMS {
        uuid id PK
        uuid event_id FK "must reference a Hackathon event"
        int team_number "1..25; unique per event"
        string name "nullable; admin can rename"
        string primary_domain "set from anchor member; used for domain matching"
        string status "forming | full | locked"
        uuid created_by FK "admin who triggered creation / lock; nullable for auto-formed"
        timestamp formed_at
        timestamp locked_at "nullable"
    }

    TEAM_MEMBERS {
        uuid id PK
        uuid team_id FK
        uuid registration_id FK "unique; one registration -> one team"
        string role_bucket_snapshot "the bucket at assignment time"
        string domain_snapshot "the domain at assignment time"
        boolean is_anchor "first member who set the team's primary_domain"
        timestamp assigned_at
        string assigned_by "auto | admin_id (manual override)"
    }
```

## Event creation form — all fields (admin)

This is every field an admin fills in when creating or editing an event.
**Nothing from the current workshop form is removed.** Fields marked NEW are additions.

| Field | Type | Status | Notes |
|---|---|---|---|
| Event type | dropdown (event_types) | **NEW** | Workshop / Talks / Community Lounge / Hackathon. Determines which registration fields are shown and which admin panels appear. |
| Title | text | KEPT | The event name, e.g. "I/O DevFest Workshop: Flutter" |
| Description | rich text | KEPT | Full event description |
| Date | date picker | KEPT | |
| Time | text / time picker | KEPT | |
| Venue | text | KEPT | Physical address or online link |
| Max capacity | number | KEPT | |
| Map location | text / embed URL | KEPT | Nullable; shown as embedded map |
| Speakers | repeatable block `{name, role, photo_url}` | KEPT | |
| Special instructions | text area | KEPT | Nullable; shown to registered attendees |
| Status | dropdown | KEPT | upcoming / registration_open / closed / disabled |
| Allow exceptions | toggle | KEPT | Whether exception requests are permitted |
| Is online | toggle | KEPT | Online vs. in-person |
| Tracks | tag/chip input (string list) | **NEW** | Community Lounge only; options attendees can select at registration |
| Slots | tag/chip input (string list) | **NEW** | Community Lounge only; time-slot options for attendees |

> `tracks` and `slots` are only shown in the admin form when Event Type = **Community Lounge**.
> The Team Formation config panel (max teams, composition targets, weights) is only shown when Event Type = **Hackathon**.

## Registration & check-in across event types

**All four event types share the same `registrations` table.** The event type
is inferred via `registrations.event_id → events.event_type_id`. Only the
*fields populated* on a registration and the *check-in flow* differ per type.

| | Workshop | Talks | Community Lounge | Hackathon |
|---|---|---|---|---|
| Stored in | `registrations` | `registrations` | `registrations` | `registrations` |
| Linked event type | Workshop | Talks | Community Lounge | Hackathon |
| Shared fields (`attendee_id`, `event_id`, `status`, `registered_at`, `qr_code_data`, `checked_in`, `acknowledged`) | ✓ | ✓ | ✓ | ✓ |
| `motivation` | ✓ ("Why attend this workshop?") | ✓ ("Why attend this talk?") | hidden | ✓ ("How will you contribute…") |
| `domain` (single-select, 11 options) | — | — | — | ✓ |
| `role_bucket` (cached from `best_describes_you`) | — | — | — | ✓ |
| `track`, `slot` | — | — | ✓ | — |
| Exception requests | ✓ | ✓ | ✓ | ✓ |
| Check-in flow | generic QR scan → mark present | generic QR scan → mark present | generic QR scan → mark present | **separate Hackathon check-in screen** → mark present + run team-formation engine |
| `teams` / `team_members` | — | — | — | ✓ |

### Listing registrations by event type

```sql
SELECT r.*
FROM registrations r
JOIN events       e  ON e.id = r.event_id
JOIN event_types  et ON et.id = e.event_type_id
WHERE et.slug = :type_slug;  -- 'workshop' | 'talks' | 'community-lounge' | 'hackathon'
```

## Dynamic registration form by event type

| Field | Workshop | Talks | Community Lounge | Hackathon |
|---|---|---|---|---|
| name, email, phone, university/org, linkedin, github, cnic, gender | ✓ | ✓ | ✓ | ✓ |
| "What best describes you?" — single-select | 6-item list | 6-item list | 6-item list | 15-item list |
| Domain — **single-select** (11 options) | — | — | — | ✓ |
| Track — single-select from `events.tracks` | — | — | ✓ | — |
| Slot — single-select from `events.slots` | — | — | ✓ | — |
| Motivation textarea | "Why do you want to attend this workshop?" | "Why do you want to attend this talk?" | hidden | "How will you contribute to solving problems in the Hackathon?" |

### "What best describes you?" — option sets

**Default (Workshop / Talks / Community Lounge)** — single-select:
Student · Young Professional · Intermediate Expert · Senior Expert · Freelancer · Other

**Hackathon** — single-select (15 options):
Student · Web Developer · Mobile App Developer · Software Developer · Full Stack Developer · Game Developer · Other Developer · UI/UX Designer · Product Designer · Game Designer · Other Designer · SQA Engineer/Tester · Software Sales Executive · Freelancer · Others

### Domain (Hackathon) — single-select (11 options)

1. Service & Software Solutions
2. Fintech & Digital Economy
3. Healthcare, EdTech & Skill Development
4. Logistics, Retail & E-commerce
5. Infrastructure, Smart City & Government Systems
6. Water, Energy & Waste Management
7. Social Impact, Accessibility & Inclusion
8. Environment & Climate Change Solutions
9. Cybersecurity & Digital Safety
10. AI, Automation & Emerging Technologies
11. SME & Startup Enablement

## Hackathon team formation

### Role-bucket mapping (default — admin-editable in `role_categories`)

| `best_describes_you` value | `role_bucket` |
|---|---|
| Web Developer, Mobile App Developer, Software Developer, Full Stack Developer, Game Developer, Other Developer | developer |
| UI/UX Designer, Game Designer, Other Designer | designer |
| Product Designer | product_designer |
| SQA Engineer/Tester | qa |
| Software Sales Executive | sales |
| Freelancer | freelancer |
| Student | student |
| Others | other |

> **Open question:** the original requirement mentions balancing "marketing" but there's no Marketing option in the role list. Either add a 16th option ("Marketing") to the dropdown, or treat marketing as part of the "sales" bucket. The `role_categories` table makes either choice configurable.

### Caps
- Max **25 teams** per Hackathon event (`team_formation_configs.max_teams`).
- Max **4 members per team** (`max_team_size`).
- Soft cap **3 developers per team** (`soft_cap_developers_per_team`), relaxed only when no alternative team exists.
- Total auto-placeable attendees = 25 × 4 = **100**; overflow flagged for admin manual handling.

### Team composition target (per team)

| Bucket | Target | Notes |
|---|---|---|
| developer | 2 | Largest expected pool |
| designer or product_designer | 1 | Either bucket fills this slot |
| other (qa / sales / marketing / student / freelancer / other) | 1 | The non-tech generalist |

These are stored in `team_formation_configs` and tunable per event.

### Assignment scoring (per open team, when an attendee checks in)

```
score(team, attendee) =
    + domain_match_weight       if team.primary_domain == attendee.domain
    + role_gap_weight           if attendee.role_bucket count in team < its target
    − role_overflow_penalty     if attendee.role_bucket count in team >= its target
    − near_full_penalty * (team.size / max_team_size)
```

Teams with `size >= max_team_size` or `status = locked` are excluded.

### Process (recommended: streaming + end-of-window rebalance)

1. **Pre-event configuration**
   - Admin opens the Hackathon event's "Team Formation" panel.
   - Sets `max_teams`, `max_team_size`, target composition, and weights (or accepts defaults).
   - System pre-computes `registrations.role_bucket` for all confirmed registrations.

2. **Hackathon check-in screen (separate from the generic check-in)**
   - Admin scans the attendee's QR or searches by email.
   - System marks `registrations.checked_in = true`, `checked_in_at = now()`.
   - Engine evaluates open teams (`size < max_team_size`, `status != locked`):
     - Computes the score above for each.
     - Picks the highest-scoring team.
     - If no team scores positively **and** `teams_count < max_teams`, creates a new `teams` row:
       - `team_number = next available`
       - `primary_domain = attendee.domain`
       - The attendee becomes the **anchor** (`team_members.is_anchor = true`).
   - Inserts a `team_members` row linking the registration to the team.
   - The attendee is shown / printed their team number.

3. **Hard-constraint failures**
   - If `teams_count == max_teams` AND every open team is at `max_team_size`, the engine refuses and flags **overflow** for admin manual placement (waitlist / exceptional 5th member / decline).
   - If a developer arrives and every open team is at the developer soft-cap, the engine first looks for a team below the developer soft-cap; if none exists, it relaxes the soft-cap on the team with the smallest size.

4. **End-of-check-in rebalance (admin-triggered)**
   - Admin clicks "Optimize Teams."
   - Engine runs pairwise swaps between teams that improve global composition score (e.g. trade an extra dev on Team A for a designer overrepresented on Team B).
   - Admin can also manually drag-move any member between teams.

5. **Lock**
   - Admin clicks "Lock teams." Sets `teams.status = locked`, `locked_at = now()`.
   - No further auto-placement or swaps are permitted after this.

### Why streaming + rebalance (vs. pure batch or pure streaming)

| Approach | Pros | Cons |
|---|---|---|
| **Pure batch (after all check-ins)** | Globally optimal composition. | Attendees wait hours to learn their team; bad UX on event day. |
| **Pure streaming** | Instant assignment at check-in. | Early arrivals skew teams; later attendees have fewer good fits. |
| **Streaming + rebalance (recommended)** | Instant team on arrival, near-optimal final composition after admin runs the swap pass. | Slight churn near end of check-in if many swaps happen. |

## Changes vs. current schema

| Current | New |
|---|---|
| `workshops` table | renamed to `events`; gains `event_type_id`, `tracks`, `slots` |
| `registrations.workshop_id` | `registrations.event_id` |
| `exception_requests.requested_workshop_id` | `exception_requests.requested_event_id` |
| `attendees.defines_you_best` | renamed `attendees.best_describes_you` (label "What best describes you?") |
| — | new `event_types` table, seeded with the 4 types (admin CRUD) |
| — | `registrations.domain` (string, nullable, Hackathon — single-select) |
| — | `registrations.track`, `registrations.slot` (nullable, Community Lounge) |
| — | `registrations.role_bucket` (cached) |
| — | new `role_categories` table (admin-editable mapping) |
| — | new `team_formation_configs` table (per Hackathon event) |
| — | new `teams` table (Hackathon only) |
| — | new `team_members` table (Hackathon only) |

Migration backfills existing `workshops` rows as event type **Workshop**.

> Project submissions remain **out of scope** for now. Teams are back in scope
> only to support automatic team formation at Hackathon check-in.
