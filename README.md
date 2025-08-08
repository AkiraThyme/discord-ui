# Admin Discord Bot Dashboard

A modern, real-time web dashboard for managing Discord bot administration tasks. Built with Vue 3, Supabase, and SCSS.

## Features

### 🏠 Dashboard Home
- **Real-time server statistics** - Total members, online members, open reports
- **Activity overview** - Recent member activity and server events
- **Quick actions** - Direct links to key management features
- **Live updates** - Automatic data synchronization

### 👥 Member Management
- **Real-time member list** - Live status updates (online, idle, do not disturb, offline)
- **Member search & filtering** - Find members by name, ID, or status
- **Member profiles** - View detailed member information and history
- **Moderation actions** - Warn, ban, or view member history directly from the dashboard
- **Status indicators** - Visual status badges and last seen timestamps

### 🚨 Report Management System
- **Comprehensive report tracking** - View all user reports with detailed information
- **Status management** - Update report status (open, in-progress, resolved, closed)
- **Search & filtering** - Find reports by user, reporter, or reason
- **Real-time updates** - New reports appear instantly
- **Detailed view** - Modal with full report details and action buttons

### ⚙️ Server Settings
- **Bot configuration** - Prefix, welcome messages, log channels
- **Moderation settings** - Auto-moderation, warning limits, mute durations
- **Real-time connection status** - Database and API health monitoring
- **Danger zone** - Administrative actions for data management

## Tech Stack

- **Frontend**: Vue 3 with Composition API
- **Styling**: SCSS with CSS custom properties
- **State Management**: Pinia
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime subscriptions
- **Build Tool**: Vite
- **Routing**: Vue Router 4

## Prerequisites

- Node.js 20.19.0 or higher
- Supabase account and project
- Discord bot with appropriate permissions

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd admindiscordbot
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Supabase Database Setup

Create the following tables in your Supabase project:

#### Members Table
```sql
CREATE TABLE members (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  username VARCHAR(255) NOT NULL,
  discriminator VARCHAR(4),
  avatar_url TEXT,
  status VARCHAR(20) DEFAULT 'offline',
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Reports Table
```sql
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  reported_user VARCHAR(255) NOT NULL,
  reporter_name VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Activity Log Table
```sql
CREATE TABLE activity_log (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  username VARCHAR(255) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  channel_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Server Config Table
```sql
CREATE TABLE server_config (
  id SERIAL PRIMARY KEY,
  welcome_message TEXT,
  auto_mod_enabled BOOLEAN DEFAULT true,
  log_channel VARCHAR(255),
  prefix VARCHAR(5) DEFAULT '!',
  max_warnings INTEGER DEFAULT 3,
  mute_duration INTEGER DEFAULT 300,
  auto_role VARCHAR(255),
  log_level VARCHAR(20) DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Enable Row Level Security (RLS)

For production, enable RLS on your tables and create appropriate policies:

```sql
-- Example RLS policy for members table
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to members" ON members
  FOR SELECT USING (true);
```

### 5. Discord Bot Integration

Your Discord bot should:

1. **Track member presence** using `on_presence_update`
2. **Log member activity** using `on_message` and `on_voice_state_update`
3. **Handle reports** using slash commands
4. **Update Supabase** when events occur

Example bot event handlers:

```javascript
// Member presence update
client.on('presenceUpdate', async (oldPresence, newPresence) => {
  const { data, error } = await supabase
    .from('members')
    .upsert({
      user_id: newPresence.user.id,
      username: newPresence.user.username,
      status: newPresence.status,
      last_seen: new Date().toISOString()
    })
    .eq('user_id', newPresence.user.id);
});

// Message logging
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  const { data, error } = await supabase
    .from('activity_log')
    .insert({
      user_id: message.author.id,
      username: message.author.username,
      action_type: 'sent_message',
      channel_name: message.channel.name
    });
});
```

### 6. Development Server

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### 7. Production Build

```bash
npm run build
```

## Features in Detail

### Real-Time Updates
- **Supabase Realtime** subscriptions provide instant updates
- **Member status changes** appear immediately
- **New reports** show up without page refresh
- **Activity logs** update in real-time

### Responsive Design
- **Mobile-friendly** layout with collapsible sidebar
- **Grid-based** responsive components
- **Touch-friendly** buttons and interactions
- **Progressive enhancement** for older browsers

### Modern UI/UX
- **Discord-inspired** color scheme and design
- **Smooth animations** and transitions
- **Loading states** and error handling
- **Accessible** design with proper ARIA labels

## Customization

### Styling
The dashboard uses SCSS with CSS custom properties for easy theming:

```scss
:root {
  --primary-color: #5865f2;
  --secondary-color: #36393f;
  --success-color: #43b581;
  --warning-color: #faa61a;
  --error-color: #f04747;
}
```

### Adding New Features
1. Create new components in `src/components/`
2. Add routes in `src/router/index.js`
3. Update the navigation in `src/App.vue`
4. Add state management in `src/stores/dashboard.js`

## Troubleshooting

### Common Issues

1. **Supabase connection errors**
   - Verify your environment variables
   - Check your Supabase project settings
   - Ensure RLS policies are configured correctly

2. **Real-time not working**
   - Verify Supabase Realtime is enabled
   - Check browser console for subscription errors
   - Ensure proper table permissions

3. **Build errors**
   - Clear `node_modules` and reinstall
   - Check for SCSS compilation issues
   - Verify all dependencies are installed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the Supabase and Vue.js documentation
