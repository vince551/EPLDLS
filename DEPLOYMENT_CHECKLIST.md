# Tournament System - Deployment Checklist

## Pre-Deployment

- [ ] All new API files are present:
  - `/api/bracket.php`
  - `/api/admin_tournament.php`
- [ ] All modified API files have been updated:
  - `/api/fixtures.php`
  - `/api/tournaments.php`
  - `/api/db.php`
- [ ] `/api/schema.sql` updated with new tables and columns

## Deployment Steps

1. **Upload Files**
   - [ ] Upload new bracket.php to /api/
   - [ ] Upload new admin_tournament.php to /api/
   - [ ] Overwrite existing fixtures.php in /api/
   - [ ] Overwrite existing tournaments.php in /api/
   - [ ] Overwrite existing db.php in /api/
   - [ ] Update schema.sql in /api/

2. **Database Verification**
   - [ ] First API call triggers auto-migration
   - [ ] No manual SQL execution needed
   - [ ] Tables created: tournament_standings ✓
   - [ ] Columns added to tournaments ✓
   - [ ] Columns added to fixtures ✓

3. **Test Endpoints**
   - [ ] GET /tournaments.php?action=list (should work)
   - [ ] GET /fixtures.php?action=list (should work)
   - [ ] GET /bracket.php?action=get_bracket&tourn_id=1 (may error if no tournament, but should be callable)

## Functionality Verification

### Test 1: Create Group Knockout Tournament
```bash
curl -X POST http://your-domain/api/tournaments.php?action=create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tournament",
    "gameId": 1,
    "tournamentType": "group_knockout"
  }'
```
Expected: `{ "success": true, "id": X }`

### Test 2: Create Group Fixtures
```bash
curl -X POST http://your-domain/api/fixtures.php?action=create \
  -H "Content-Type: application/json" \
  -d '{
    "tournId": X,
    "home": "Team A",
    "away": "Team B",
    "date": "2026-06-20",
    "stage": "GROUP_STAGE",
    "groupName": "Group A"
  }'
```
Expected: `{ "success": true, "id": Y }`

### Test 3: Submit Match Result
```bash
curl -X POST http://your-domain/api/fixtures.php?action=submit_score \
  -H "Content-Type: application/json" \
  -d '{
    "id": Y,
    "homeScore": 2,
    "awayScore": 1
  }'
```
Expected: `{ "success": true }`

### Test 4: Check Standings Updated
```bash
curl "http://your-domain/api/bracket.php?action=standings&tourn_id=X&group=Group%20A"
```
Expected: Array with Team A: 3 pts, Team B: 0 pts

### Test 5: Advance to Knockout
```bash
curl -X POST http://your-domain/api/bracket.php?action=advance_from_groups \
  -H "Content-Type: application/json" \
  -d '{
    "tourn_id": X,
    "teams_per_group": 1
  }'
```
Expected: `{ "success": true, "qualified_teams": [...], "fixtures_created": N }`

### Test 6: Get Full Bracket
```bash
curl "http://your-domain/api/bracket.php?action=get_bracket&tourn_id=X"
```
Expected: Complete bracket with GROUP_STAGE and knockout rounds

## Rollback Plan

If issues occur:
1. Revert uploaded files to previous versions
2. Keep database as-is (migrations are safe)
3. Old API calls still work with new schema
4. No data loss

## Performance Baseline

After deployment, verify:
- [ ] List tournaments: < 100ms
- [ ] Get bracket: < 200ms for 32-team bracket
- [ ] Submit score: < 100ms
- [ ] Advance from groups: < 500ms

## Production Hardening

### Optional Security Enhancements

1. **Add Admin Authentication Check**
   In `/api/admin_tournament.php`, add auth validation:
   ```php
   // Validate admin access
   if ($_SERVER['REQUEST_METHOD'] === 'POST' && strpos($action, 'create') !== false) {
       // Check user is admin
       if (!isAdmin($_SESSION['user_id'])) {
           jsonResponse(['error' => 'Admin access required'], 403);
       }
   }
   ```

2. **Rate Limiting** (optional)
   Add rate limiting for score submissions to prevent abuse

3. **Audit Logging** (optional)
   Log all admin actions for compliance

### Environment Variables
Consider storing in config:
- Admin role check
- Tournament creation limits
- Max teams per bracket
- Date/time validation rules

## Documentation for Users

Share these with your team:
- [ ] `/TOURNAMENT_QUICK_START.md` - For admins
- [ ] `/api/TOURNAMENT_BRACKET_GUIDE.md` - For reference
- [ ] `/TOURNAMENT_IMPLEMENTATION_SUMMARY.md` - For developers

## Post-Deployment Monitoring

- [ ] Monitor error logs for bracket.php errors
- [ ] Track fixture submission performance
- [ ] Monitor database query performance
- [ ] Check for N+1 query issues
- [ ] Verify auto-advancement working correctly

## First Tournament Success Criteria

Create a test tournament and verify:

1. **Group Stage**
   - [ ] Fixtures created with GROUP_STAGE
   - [ ] Standings calculated after each match
   - [ ] Multiple groups supported

2. **Advancement**
   - [ ] Advance to knockout generates fixtures
   - [ ] Status changed to knockout_stage
   - [ ] Winners properly seeded

3. **Knockout**
   - [ ] Winners auto-appear in next round
   - [ ] All rounds show correct opponents
   - [ ] Final produces a champion

## Deployment Complete Checklist

- [ ] All files uploaded
- [ ] Database migrations completed (verify columns exist)
- [ ] Test endpoints working
- [ ] Create test tournament (group_knockout type)
- [ ] Run through full workflow
- [ ] Verify standings calculations
- [ ] Verify bracket generation
- [ ] Verify auto-advancement
- [ ] Check notifications sending
- [ ] Review error logs (should be clean)
- [ ] Communicate to admins/users
- [ ] Set up monitoring

## Quick Verification Command

Run this to verify schema changes applied:
```sql
-- Check tournaments table
DESCRIBE tournaments;
-- Should see: tournament_type, status, current_round

-- Check fixtures table
DESCRIBE fixtures;
-- Should see: stage, group_name, bracket_position, next_fixture_id, winner_slot

-- Check tournament_standings exists
DESCRIBE tournament_standings;
-- Should show all standing columns
```

## Issues During Deployment?

### If bracket.php not found (404)
- [ ] Verify file is in /api/ directory
- [ ] Check file permissions (755)
- [ ] Check web server can read file

### If auto-migration fails
- [ ] Check database user has ALTER TABLE permissions
- [ ] Review error logs for constraint conflicts
- [ ] Manually run schema.sql if needed

### If standings not calculating
- [ ] Verify group_name is set in fixture
- [ ] Check fixture stage = 'GROUP_STAGE'
- [ ] Verify tournament_standings table created

### If winners not advancing
- [ ] Check next_fixture_id is set on fixture
- [ ] Verify winner_slot is 'home' or 'away'
- [ ] Check knockout fixtures were generated

## Support Contact

For issues post-deployment:
1. Check error logs: `/api/bracket.php`, `/api/fixtures.php`
2. Review this checklist
3. Consult TOURNAMENT_IMPLEMENTATION_SUMMARY.md
4. Test endpoints individually to isolate issue

## Green Light to Production

You're ready for production when:
✅ All tests pass
✅ Full workflow successful
✅ Error logs clean
✅ Performance acceptable
✅ Admin team trained
✅ Users notified

**Deployment Status: Ready to Go! 🚀**
