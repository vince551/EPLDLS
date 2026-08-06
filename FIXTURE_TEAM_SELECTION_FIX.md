# Fixture Team Selection Bug Fix ✓

## Problem
When scheduling a match fixture and selecting teams from the dropdown, the form would revert to default teams (first two users) whenever you changed a selection. This prevented admins from scheduling matches with custom team selections.

## Root Cause
The issue was in `AdminDashboard.jsx`:

1. **`loadAdminData()` function** was called to fetch all users/tournaments/fixtures
2. This function would **always reset the team selections** to defaults if not editing:
   ```javascript
   // BUGGY CODE
   if (!editingFixtureId) {
       setFixHome(uData[0].team);  // Always resets to first user
       setFixAway(uData[1].team);  // Always resets to second user
   }
   ```

3. **`useEffect` dependency array** was set to `[currentUser]`, which includes the full user object
4. Every render could trigger `loadAdminData()`, which would reset the form

## Solution Applied

### Change 1: Smart Form Initialization
Modified `loadAdminData()` to only reset teams if the form is truly empty:

```javascript
// FIXED CODE
if (!editingFixtureId && !fixHome && !fixAway) {
    if (tData.length > 0) setFixTournId(tData[0].id);
    if (uData.length >= 2) {
        setFixHome(uData[0].team);
        setFixAway(uData[1].team);
    }
}
```

Now it only sets defaults if:
- Not editing an existing fixture (`!editingFixtureId`)
- AND form is empty (`!fixHome && !fixAway`)
- Preserves user selections once made

### Change 2: Stable Effect Dependencies
Changed `useEffect` dependency from `[currentUser]` to `[currentUser?.id]`:

```javascript
useEffect(() => {
    // ... code
    loadAdminData();
}, [currentUser?.id]); // Only re-run when user ID changes
```

This prevents unnecessary re-renders and form resets. The effect now only runs when:
- Component mounts (initial load)
- User logs in/out (ID changes)

NOT on every render cycle

## Result
✓ Admin can now select any teams from the dropdown
✓ Form selection persists when making changes
✓ Fixtures can be created with non-default teams
✓ Form resets only when explicitly submitting or canceling

## Testing Steps

1. Open Admin Panel
2. Navigate to "Schedule Match Fixture" form
3. Select any tournament
4. Click home team dropdown → select a different team (not first)
5. ✓ Selection should persist (not revert to default)
6. Click away team dropdown → select a different team (not second)
7. ✓ Selection should persist
8. Fill date and time
9. ✓ Should be able to submit fixture with custom teams

## Files Modified
- `frontend/src/pages/AdminDashboard.jsx` (2 changes)

## Impact
- ✓ No breaking changes
- ✓ Admins can now schedule matches with custom team selections
- ✓ Form behavior is more predictable
- ✓ Better performance (fewer unnecessary renders)
