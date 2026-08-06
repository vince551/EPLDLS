# Frontend Social Features - Quick Reference

## Just Completed
The frontend social system has been fully integrated. Players can now:

1. **Discover & Connect**: Find other gamers, send friend requests, and manage relationships
2. **Create Forums**: Any logged-in user can create discussion threads
3. **Live Feed**: See real-time activity from followed players and trending topics
4. **Social Profiles**: View player stats, followers, and shared interests

## Navigation Map

```
Home
├── Players (NEW) - Player discovery & search
├── Gamers - Friends list
├── Forums - Discussion threads
│   └── Create Forum Topic (now available to all users)
├── Tournaments - Tournament listings
├── Fixtures - Match schedule
├── Leaderboard - Rankings
├── Games - Game browser
├── Direct Chat - Messaging
└── Feed (NEW, logged-in only) - Live activity feed

User Menu
├── Profile - Personal profile
└── Admin Panel (admin only)
```

## Key Pages

### PlayersPage.jsx
- **Path**: `/players`
- **Features**: Search, filter by game, online status, pagination
- **Actions**: Add friend, accept request, view profile, chat

### PlayerProfilePage.jsx
- **Path**: `/player/:playerId`
- **Features**: Stats, social links, recent forums, follow button

### FeedPage.jsx
- **Path**: `/feed`
- **Features**: 4 tabs (Your Feed, Global, Trending, Your Activity)
- **Interactions**: Click cards to view forums/profiles

### ForumsPage.jsx (Updated)
- **Change**: All users can create forums (not just admins)
- **UI**: "Create Forum Topic" button visible to logged-in users

## API Endpoints Used

### Discovery & Relationships
```
GET  /players.php?action=discover&user_id=X&search=...&game=...&online=true
GET  /players.php?action=profile&player_id=X&user_id=Y
POST /players.php?action=send_request
POST /players.php?action=accept_request
POST /players.php?action=follow
POST /players.php?action=unfollow
```

### Feed
```
GET /feed.php?action=personal&user_id=X
GET /feed.php?action=global
GET /feed.php?action=trending
GET /feed.php?action=player&player_id=X
```

### Forums
```
POST /forums.php?action=create
```

## Component State Management

### PlayersPage
- `players`: Array of player objects
- `search`: Search query
- `gameFilter`: Selected game ID
- `onlineOnly`: Boolean toggle
- `offset`: For pagination

### FeedPage
- `activeTab`: 'personal' | 'global' | 'trending' | 'player'
- `feed`: Array of activity objects
- `loading`: Boolean

### ForumsPage
- `showCreateModal`: Boolean to toggle create dialog
- `title`, `description`: Form inputs
- `gameId`: Selected game category

## Styling Patterns

All social components follow GameVerse Hub theme:
- Color variables: `--gv-mint`, `--gv-cyan`, `--gv-pink`, `--gv-gold`, `--gv-purple`
- Card class: `.gv-card`
- Button classes: `.gv-btn`, `.gv-btn-primary`, `.gv-btn-mint`, `.gv-btn-secondary`
- Badge class: `.gv-badge` with color variants
- Input class: `.gv-input`
- Icons from lucide-react

## Common Tasks

### Add a new social action
1. Call API endpoint in appropriate component
2. Handle response and update state
3. Refresh relevant lists/data
4. Show success/error feedback

### Add navigation link
Edit `frontend/src/components/Navbar.jsx`:
```jsx
<NavLink to="/new-page" className={({ isActive }) => `gv-nav-link ${isActive ? 'active' : ''}`}>
    <IconName size={15} /> Label
</NavLink>
```

### Create new feed
Update `FeedPage.jsx`:
1. Add tab to tab array
2. Add case to fetchFeed() switch
3. Call appropriate `/feed.php` action
4. Display results in FeedCard component

## Testing Tips

- Test without login to see guest UX
- Test with multiple user accounts to verify friend requests/follows
- Check pagination by loading 50+ players
- Verify feed updates don't require page reload
- Test forum creation flow end-to-end

## Known Limitations

- Forum creation open to all users (as intended, differs from earlier admin-only phase)
- Feed is real-time activity, not historical (based on backend design)
- Player search is name/team based (no advanced filters yet)
- No infinite scroll (uses load-more button)

## Next Enhancements

- Add player search by ID
- Implement notification preferences in Feed
- Add feed filtering by activity type
- Create forum category management
- Add rich text editor for forum posts
- Implement forum search/discovery
