# Tournament Bracket System Guide

## Overview

The GameVerse Hub tournament system now supports three tournament types with automatic bracket progression:

1. **League** - Round-robin tournament (all teams play each other)
2. **Knockout** - Direct elimination (no group stage)
3. **Group Knockout** - Group stage followed by knockout rounds

## Database Schema

### Key Tables

#### `tournaments`
- `tournament_type`: 'league' | 'knockout' | 'group_knockout'
- `status`: 'draft' | 'group_stage' | 'knockout_stage' | 'completed'
- `current_round`: Stores the current round being played (e.g., 'GROUP_STAGE', 'RO16', 'QUARTERFINAL', 'SEMIFINAL', 'FINAL')

#### `fixtures`
- `stage`: 'GROUP_STAGE', 'RO16', 'QUARTERFINAL', 'SEMIFINAL', 'FINAL'
- `group_name`: For group stage matches (e.g., 'Group A', 'Group B')
- `bracket_position`: Position in the bracket tree
- `next_fixture_id`: Reference to the next round fixture that receives this match's winner
- `winner_slot`: 'home' or 'away' - determines which team slot in next_fixture_id

#### `tournament_standings`
- Tracks group stage stats (W-D-L, goals, points)
- `qualified_to_knockout`: Marks teams that advance to knockout
- `position_in_knockout`: Bracket seed position

## API Endpoints

### 1. Create Tournament
```
POST /tournaments.php?action=create
{
  "name": "Premier League Cup 2026",
  "gameId": 1,
  "tournamentType": "group_knockout", // 'league', 'knockout', or 'group_knockout'
  "rules": "2 teams per group advance to knockout",
  "bgImage": "..."
}
```

### 2. Get Tournament Bracket
```
GET /bracket.php?action=get_bracket&tourn_id=1
Response:
{
  "tournament": { ...tournament details },
  "bracket": {
    "GROUP_STAGE": [...fixtures],
    "RO16": [...fixtures],
    "QUARTERFINAL": [...fixtures],
    "SEMIFINAL": [...fixtures],
    "FINAL": [...fixtures]
  },
  "standings": [...teams with stats]
}
```

### 3. Get Group Standings
```
GET /bracket.php?action=standings&tourn_id=1&group=Group%20A
```

### 4. Advance Teams from Group Stage
```
POST /bracket.php?action=advance_from_groups
{
  "tourn_id": 1,
  "teams_per_group": 2  // top 2 teams from each group
}
Response:
{
  "success": true,
  "qualified_teams": [
    { "name": "Shadow Strikers", "source_group": "Group A", "seed": 1 },
    { "name": "Red Dragons", "source_group": "Group B", "seed": 2 }
  ],
  "fixtures_created": 4
}
```

### 5. Update Fixture & Auto-Advance Winner
```
POST /fixtures.php?action=submit_score
{
  "id": 101,
  "homeScore": 3,
  "awayScore": 1
}
```
- Automatically updates standings if group stage
- Automatically advances winner to next round if knockout stage
- Sends notifications to all users

### 6. Create Group Stage Fixtures
```
POST /fixtures.php?action=create
{
  "tournId": 1,
  "home": "Shadow Strikers",
  "away": "Red Dragons",
  "date": "2026-06-15",
  "weekday": "Monday",
  "time": "18:00",
  "stage": "GROUP_STAGE",
  "groupName": "Group A"
}
```

## Workflow Example: Group Stage → Knockout

### Step 1: Create Tournament
```bash
curl -X POST http://localhost/api/tournaments.php?action=create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Elite Tournament 2026",
    "gameId": 1,
    "tournamentType": "group_knockout"
  }'
# Returns: { "success": true, "id": 5 }
```

### Step 2: Create Group Stage Fixtures
Create fixtures with `stage: "GROUP_STAGE"` and `groupName: "Group A"` or `"Group B"` etc.

### Step 3: Submit Match Results
As matches are played, submit scores:
```bash
curl -X POST http://localhost/api/fixtures.php?action=submit_score \
  -H "Content-Type: application/json" \
  -d '{
    "id": 101,
    "homeScore": 2,
    "awayScore": 1
  }'
```
This automatically updates the standings.

### Step 4: View Current Standings
```bash
curl "http://localhost/api/bracket.php?action=standings&tourn_id=5&group=Group%20A"
```

### Step 5: Advance Top Teams to Knockout
Once all group stage matches are complete:
```bash
curl -X POST http://localhost/api/bracket.php?action=advance_from_groups \
  -H "Content-Type: application/json" \
  -d '{
    "tourn_id": 5,
    "teams_per_group": 2
  }'
```

This automatically:
- Marks qualified teams in standings
- Generates all knockout fixtures (RO16, Quarterfinals, Semifinals, Finals)
- Links fixtures so winners automatically advance
- Updates tournament status to `knockout_stage`

### Step 6: Continue Submitting Knockout Results
Submit knockout match results using the same `submit_score` endpoint. Winners automatically appear in the next round fixtures.

## Bracket Structure

### Automatic Fixture Generation

When advancing from groups, the system generates brackets based on number of qualified teams:

| Teams | Bracket |
|-------|---------|
| 2     | FINAL |
| 4     | SEMIFINAL → FINAL |
| 4-8   | QUARTERFINAL → SEMIFINAL → FINAL |
| 9-16  | RO16 → QUARTERFINAL → SEMIFINAL → FINAL |
| 17-32 | RO32 → RO16 → QUARTERFINAL → SEMIFINAL → FINAL |

### Example: 8 Teams from Groups
```
RO16 Fixtures (0 generated - need 16 teams)
QUARTERFINAL:
  Fixture 101: Team1 vs Team2 → Winner to SEMIFINAL Fixture 201 (home slot)
  Fixture 102: Team3 vs Team4 → Winner to SEMIFINAL Fixture 201 (away slot)
  Fixture 103: Team5 vs Team6 → Winner to SEMIFINAL Fixture 202 (home slot)
  Fixture 104: Team7 vs Team8 → Winner to SEMIFINAL Fixture 202 (away slot)

SEMIFINAL:
  Fixture 201: (Winner 101) vs (Winner 102) → Winner to FINAL (home slot)
  Fixture 202: (Winner 103) vs (Winner 104) → Winner to FINAL (away slot)

FINAL:
  Fixture 301: (Winner 201) vs (Winner 202)
```

## Admin Management

### Operations Admins Can Perform

1. **Create tournament** - Set type (league/knockout/group_knockout)
2. **Manage group stage** - Add/edit group fixtures
3. **Monitor standings** - View real-time group standings
4. **Trigger bracket generation** - Advance teams to knockout
5. **Update results** - Submit match scores (auto-advances winners)
6. **View bracket** - See complete bracket with all rounds

### Important: Preserving Ongoing Fixtures

- When advancing from group stage, **existing group fixtures are NOT deleted**
- Only new knockout fixtures are created
- You can still edit group fixtures after advancing to knockout
- This allows corrections to be made retroactively

## Key Features

✅ **Automatic Progression**: Winners automatically populate next round matches
✅ **Smart Bracket Generation**: Adapts to number of qualified teams  
✅ **Group Stage Tracking**: Real-time standings with W-D-L records
✅ **Flexible Round Names**: Support for RO32, RO16, QUARTERFINAL, SEMIFINAL, FINAL
✅ **Non-destructive**: Advancing to knockout doesn't delete group fixtures
✅ **Admin-only**: Regular users see brackets but only admins can modify
✅ **Notifications**: All results sent to users automatically
✅ **Seeding**: Teams seeded based on group position

## Database Migrations

On first run, `db.php` automatically:
1. Creates `tournaments` table with new columns (tournament_type, status, current_round)
2. Creates `fixtures` table with bracket fields (stage, group_name, bracket_position, next_fixture_id, winner_slot)
3. Creates `tournament_standings` table for tracking group performance

No manual schema updates needed for existing installations.
