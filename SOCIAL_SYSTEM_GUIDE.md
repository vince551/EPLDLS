# Social System Guide - Player Discovery, Friends & Live Feed

## Overview

A complete social ecosystem enabling gamers to:
- ✅ Discover other players with advanced search and filtering
- ✅ Send & accept friend requests
- ✅ Follow players to see their activity
- ✅ Create their own forums and discussions
- ✅ View personalized and global live feeds
- ✅ Build influence and community

## Core Features

### 1. Player Discovery System

**Endpoint**: `GET /players.php?action=discover`

Find and connect with other gamers:

```bash
# Basic discovery
GET /players.php?action=discover&user_id=1&limit=20

# Filter by game
GET /players.php?action=discover&user_id=1&game=dls&limit=20

# Filter by team
GET /players.php?action=discover&user_id=1&team=Shadow&limit=20

# Search by name or team
GET /players.php?action=discover&user_id=1&search=Striker&limit=20

# Show only online players
GET /players.php?action=discover&user_id=1&online=true&limit=20

# Pagination
GET /players.php?action=discover&user_id=1&limit=20&offset=40
```

**Response**:
```json
[
  {
    "id": 2,
    "name": "Alex Mercer",
    "team": "Shadow Strikers",
    "online": true,
    "statusColor": "status-online",
    "pic": "https://...",
    "bio": "Competitive DLS player",
    "favoriteGame": "DLS",
    "lastSeen": "2026-08-06 14:30:00",
    "twitter": "@alexmercer",
    "instagram": "alexmercer",
    "friendStatus": null     // null = not friends, "pending" = request sent, "accepted" = friends
  },
  ...
]
```

### 2. Player Profiles

**Endpoint**: `GET /players.php?action=profile`

View detailed player profiles:

```bash
GET /players.php?action=profile&profile_id=2&user_id=1
```

**Response**:
```json
{
  "id": 2,
  "name": "Alex Mercer",
  "team": "Shadow Strikers",
  "pic": "https://...",
  "bio": "Competitive DLS player",
  "favoriteGame": "DLS",
  "joinedDate": "2026-01-15 10:00:00",
  "twitter": "@alexmercer",
  "instagram": "alexmercer",
  "discord": "alexmercer#1234",
  "youtube": "alexmercer",
  "tiktok": "@alexmercer",
  "online": true,
  "friendStatus": null,         // null, "pending", or "accepted"
  "isFollowing": false,         // whether viewer follows this player
  "stats": {
    "forumsCreated": 5,
    "friends": 12,
    "followers": 28
  },
  "recentForums": [
    { "id": 101, "title": "Best DLS Formations", "createdAt": "2026-08-05 10:00:00" },
    ...
  ]
}
```

### 3. Friend System

**Send Friend Request**:
```bash
POST /players.php?action=send_request
{
  "userId": 1,
  "targetId": 2
}
```

**Accept Friend Request**:
```bash
POST /players.php?action=accept_request
{
  "userId": 1,
  "requesterId": 2
}
```

### 4. Following System

**Follow a Player**:
```bash
POST /players.php?action=follow
{
  "follower_id": 1,
  "following_id": 2
}
```

**Unfollow a Player**:
```bash
POST /players.php?action=unfollow
{
  "follower_id": 1,
  "following_id": 2
}
```

**Get Followers**:
```bash
GET /players.php?action=followers&user_id=2
```

**Get Following List**:
```bash
GET /players.php?action=following&user_id=1
```

### 5. Live Feed System

#### Personal Feed (from followed players & friends)
```bash
GET /feed.php?action=personal&user_id=1&limit=20&offset=0
```
Shows forums created by followed players and friends.

#### Global Feed (all recent activity)
```bash
GET /feed.php?action=global&limit=20&offset=0

# Filter by game
GET /feed.php?action=global&game=1&limit=20
```

**Feed Response**:
```json
[
  {
    "id": 101,
    "title": "Best DLS Formations for Season 26",
    "description": "Share your favorite formations and tactics",
    "createdBy": 2,
    "creatorName": "Alex Mercer",
    "creatorPic": "https://...",
    "gameName": "Dream League Soccer",
    "createdAt": "2026-08-05 10:00:00",
    "postCount": 12,
    "isPinned": false
  },
  ...
]
```

#### Player Activity Feed
```bash
GET /feed.php?action=player&player_id=2&limit=20
```
Shows all forums created by a specific player.

#### Trending Forums
```bash
GET /feed.php?action=trending&limit=15

# Filter by game
GET /feed.php?action=trending&game=1&limit=15
```
Shows trending forums based on post count + likes from the last 7 days.

### 6. Forum Creation by Any Gamer

**Create Forum** (any authenticated user):
```bash
POST /forums.php?action=create
{
  "userId": 1,
  "title": "Best DLS Formations",
  "description": "Share your favorite formations and tactics",
  "gameId": 1
}
```

**Response**:
```json
{
  "success": true,
  "id": 101
}
```

**Key Changes**:
- ✅ Any authenticated gamer can now create forums
- ✅ No admin approval needed
- ✅ Admins get notified of new forums
- ✅ Forums are immediately visible on feeds

## User Workflows

### Workflow 1: Discovering Players

```
1. User goes to Players page
2. Browse online players / search by name
3. Click "Add Friend" to send request
4. Accept incoming requests
5. Follow interesting players
6. See their forums and activity
```

### Workflow 2: Creating a Forum

```
1. User clicks "Create Forum"
2. Selects game (e.g., DLS)
3. Adds title and description
4. Forum is instantly created
5. Shows up on:
   - Their profile activity
   - Personal feeds of followers
   - Global feed
   - Trending section
```

### Workflow 3: Building Influence

```
1. Create compelling forums
2. Get followers through:
   - Great forum discussions
   - Helpful posts
   - Community engagement
3. See follower count on profile
4. Influence grows as followers increase
5. Forums get visibility in trending
```

## Database Schema

### `followers` Table (NEW)
```sql
CREATE TABLE followers (
    id INT PRIMARY KEY,
    follower_id INT (who is following),
    following_id INT (who they follow),
    created_at TIMESTAMP,
    UNIQUE(follower_id, following_id)
)
```

### User Stats Calculated From:
- **Friends**: Count in `friends` table with status='accepted'
- **Followers**: Count in `followers` table
- **Forums Created**: Count in `forums` table where created_by=user_id

## API Endpoints Summary

| Feature | Endpoint | Method |
|---------|----------|--------|
| Discover players | `/players.php?action=discover` | GET |
| Get profile | `/players.php?action=profile` | GET |
| Send friend request | `/players.php?action=send_request` | POST |
| Accept request | `/players.php?action=accept_request` | POST |
| Follow player | `/players.php?action=follow` | POST |
| Unfollow player | `/players.php?action=unfollow` | POST |
| Get followers | `/players.php?action=followers` | GET |
| Get following | `/players.php?action=following` | GET |
| Personal feed | `/feed.php?action=personal` | GET |
| Global feed | `/feed.php?action=global` | GET |
| Player activity | `/feed.php?action=player` | GET |
| Trending forums | `/feed.php?action=trending` | GET |
| Create forum | `/forums.php?action=create` | POST |

## Notifications

Users automatically receive notifications for:
- ✅ Friend request received
- ✅ Friend request accepted
- ✅ New follower
- ✅ Forum creation (to admins)

## Performance Optimization

- Indexed queries on: user_id, follower_id, following_id, created_by
- Limit pagination to prevent large result sets
- Trending calculated using query-time aggregation
- No N+1 queries in feed generation

## Gamification Aspects

### Build Influence Through:
1. **Forum Creation** - Create interesting discussions
2. **Followers** - Build audience
3. **Activity** - Appear in global feed
4. **Engagement** - Comments, reactions, likes

### Social Proof:
- Follower counts visible on profiles
- Active players highlighted (online status)
- Trending forums show popular discussions
- Creator reputation via contribution

## Frontend Integration Points

### Player Discovery Page
- Search/filter bar
- Grid of players
- Add friend / Accept request buttons
- View profile modal

### Player Profile
- Stats (friends, followers, forums)
- Follow button
- Activity section
- Recent forums section

### Forums Page
- Create forum button (for all users)
- Global feed of all forums
- Filter by game
- See creator info and follow them

### Home Feed
- Personal feed: forums from followed players
- Global feed: all recent forums
- Trending section: hottest discussions

## Example Frontend Code

```javascript
// Discover players
const players = await fetch('/players.php?action=discover&user_id=1').then(r => r.json());

// Send friend request
await fetch('/players.php?action=send_request', {
  method: 'POST',
  body: JSON.stringify({ userId: 1, targetId: 2 })
});

// Get personal feed
const feed = await fetch('/feed.php?action=personal&user_id=1').then(r => r.json());

// Create forum
await fetch('/forums.php?action=create', {
  method: 'POST',
  body: JSON.stringify({
    userId: 1,
    title: 'Best Tactics',
    description: 'Share your tips',
    gameId: 1
  })
});
```

## Future Enhancements

- Direct messaging integration with discovered players
- Player reputation badges (helpful, knowledgeable, etc.)
- Follow notifications ("X followed you")
- Forum recommendations based on interests
- Social stats on dashboard
- Block/mute players
- Private profiles
- Player teams/clans
