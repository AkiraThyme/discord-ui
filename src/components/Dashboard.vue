<!-- eslint-disable vue/multi-word-component-names -->
<!-- eslint-disable no-unused-vars -->
<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDashboardStore } from '@/stores/dashboard'

const router = useRouter()
const dashboardStore = useDashboardStore()

const isLoading = ref(true)
const recentActivity = ref([])

// Computed properties from store
const stats = computed(() => dashboardStore.stats)
const hasData = computed(() => dashboardStore.members.length > 0)
const apiError = computed(() => dashboardStore.error)
const isConnected = computed(() => dashboardStore.isConnected)

async function fetchDashboardData() {
  try {
    isLoading.value = true
    await dashboardStore.fetchServers()

    // Fetch additional data if server is selected
    if (dashboardStore.selectedServer) {
      await Promise.all([
        dashboardStore.fetchMembers(),
        dashboardStore.fetchReports(),
        dashboardStore.fetchSettings()
      ])
    }

    // Fetch real activity data from Discord bot API
    if (dashboardStore.selectedServer && dashboardStore.members.length > 0) {
      await fetchRecentActivity()
    }

    isLoading.value = false
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    isLoading.value = false
  }
}

async function fetchRecentActivity() {
  try {
    // Get activity from the first few members to show recent activity
    const activityPromises = dashboardStore.members.slice(0, 5).map(async (member) => {
      const activity = await dashboardStore.fetchMemberActivity(member.id)
      return activity.slice(0, 3).map(item => ({
        id: `${member.id}-${item.id || Date.now()}`,
        type: item.action,
        user: member.name,
        timestamp: item.created_at,
        description: getActivityDescription(item.action, item.details)
      }))
    })

    const allActivity = await Promise.all(activityPromises)
    const flatActivity = allActivity.flat().sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    ).slice(0, 10)

    recentActivity.value = flatActivity
  } catch (error) {
    console.error('Error fetching recent activity:', error)
    recentActivity.value = []
  }
}

function getActivityDescription(action, details) {
  switch (action) {
    case 'sent_message':
      return `Sent a message ${details}`
    case 'joined_vc':
      return `Joined voice channel ${details}`
    case 'left_vc':
      return `Left voice channel ${details}`
    default:
      return `Performed action: ${action}`
  }
}

function refreshData() {
  fetchDashboardData()
}

onMounted(() => {
  fetchDashboardData()
  // Setup real-time WebSocket connection
  dashboardStore.setupRealtimeSubscriptions()
})

onUnmounted(() => {
  // Cleanup WebSocket connection
  dashboardStore.disconnectWebSocket()
})
</script>

<template>
  <div class="dashboard-page">
    <header class="dashboard-header">
      <div>
        <h1>Dashboard</h1>
        <p class="subtitle">Server Overview & Analytics</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" @click="refreshData" :disabled="isLoading">
          🔄 Refresh
        </button>
      </div>
    </header>

    <!-- Server Selection -->
    <div v-if="dashboardStore.servers.length > 0" class="server-selector card mb-4">
      <label for="server-select" class="server-label">Select Server:</label>
      <select
        id="server-select"
        :value="dashboardStore.selectedServer"
        @change="dashboardStore.setSelectedServer($event.target.value)"
        class="server-select"
      >
        <option v-for="server in dashboardStore.servers" :key="server.id" :value="server">
          {{ server.name }}
        </option>
      </select>
    </div>

    <!-- Connection Status -->
    <div class="connection-status card mb-4">
      <div class="status-indicators">
        <div class="status-item">
          <span class="status-dot" :class="{ 'connected': !apiError, 'disconnected': apiError }"></span>
          <span class="status-label">API Connection</span>
          <span class="status-text">{{ apiError ? 'Disconnected' : 'Connected' }}</span>
        </div>
        <div class="status-item">
          <span class="status-dot" :class="{ 'connected': isConnected, 'disconnected': !isConnected }"></span>
          <span class="status-label">Real-time Updates</span>
          <span class="status-text">{{ isConnected ? 'Active' : 'Inactive' }}</span>
        </div>
      </div>
    </div>

    <!-- API Error Display -->
    <div v-if="apiError" class="error-notice card mb-4">
      <div class="error-header">
        <span class="error-icon">⚠️</span>
        <h4>Connection Error</h4>
      </div>
      <p>{{ apiError }}</p>
      <div class="error-actions">
        <button class="btn btn-secondary" @click="fetchDashboardData">
          Retry Connection
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>Loading dashboard data...</p>
    </div>

    <!-- Dashboard Content -->
    <div v-else>
      <!-- Stats Grid -->
      <div class="stats-grid grid grid-4 mb-4">
        <div class="stat-card card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <h3 class="stat-number">{{ stats.totalMembers }}</h3>
            <p class="stat-label">Total Members</p>
          </div>
        </div>

        <div class="stat-card card">
          <div class="stat-icon">🟢</div>
          <div class="stat-content">
            <h3 class="stat-number">{{ stats.onlineMembers }}</h3>
            <p class="stat-label">Online Members</p>
          </div>
        </div>

        <div class="stat-card card">
          <div class="stat-icon">🚨</div>
          <div class="stat-content">
            <h3 class="stat-number">{{ stats.openReports }}</h3>
            <p class="stat-label">Open Reports</p>
          </div>
        </div>

        <div class="stat-card card">
          <div class="stat-icon">📢</div>
          <div class="stat-content">
            <h3 class="stat-number">{{ stats.activeChannels }}</h3>
            <p class="stat-label">Active Channels</p>
          </div>
        </div>
      </div>

      <!-- Content Sections -->
      <div class="dashboard-content">
        <!-- Recent Activity -->
        <div class="activity-section">
          <div class="section-header">
            <h2>Recent Activity</h2>
            <span class="section-subtitle">Latest server events</span>
          </div>

          <div v-if="recentActivity.length === 0" class="empty-state">
            <div class="empty-icon">📊</div>
            <p>No recent activity</p>
            <span class="empty-description">Activity will appear here as members interact with the server.</span>
          </div>

          <div v-else class="activity-list">
            <div
              v-for="activity in recentActivity"
              :key="activity.id"
              class="activity-item card"
            >
              <div class="activity-icon">
                <span v-if="activity.type === 'member_joined'">👋</span>
                <span v-else-if="activity.type === 'message_sent'">💬</span>
                <span v-else-if="activity.type === 'voice_joined'">🔊</span>
                <span v-else>📝</span>
              </div>
              <div class="activity-content">
                <h4 class="activity-title">{{ activity.description }}</h4>
                <p class="activity-user">by {{ activity.user }}</p>
                <span class="activity-time">{{ new Date(activity.timestamp).toLocaleTimeString() }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions-section">
          <div class="section-header">
            <h2>Quick Actions</h2>
            <span class="section-subtitle">Common admin tasks</span>
          </div>

          <div class="actions-grid">
            <router-link to="/members" class="action-card card">
              <div class="action-icon">👥</div>
              <div class="action-content">
                <h3>View All Members</h3>
                <p>Manage server members and their status</p>
              </div>
            </router-link>

            <router-link to="/reports" class="action-card card">
              <div class="action-icon">🚨</div>
              <div class="action-content">
                <h3>Manage Reports</h3>
                <p>Review and handle user reports</p>
              </div>
            </router-link>

            <router-link to="/settings" class="action-card card">
              <div class="action-icon">⚙️</div>
              <div class="action-content">
                <h3>Server Settings</h3>
                <p>Configure bot and server preferences</p>
              </div>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dashboard-page {
  position: relative;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  h1 {
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: var(--text-secondary);
    font-size: 1.1rem;
  }
}

.server-selector {
  .server-label {
    display: block;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .server-select {
    width: 100%;
    max-width: 400px;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 1rem;
    background: var(--bg-surface);
    color: var(--text-primary);

    &:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
  }
}

.connection-status {
  .status-indicators {
    display: flex;
    gap: var(--spacing-lg);
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      transition: var(--transition-fast);

      &.connected {
        background-color: var(--success-color);
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
      }

      &.disconnected {
        background-color: var(--error-color);
        box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
      }
    }

    .status-label {
      color: var(--text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
    }

    .status-text {
      color: var(--text-primary);
      font-size: 0.875rem;
      font-weight: 600;
    }
  }
}

.error-notice {
  border-left: 4px solid var(--error-color);

  .error-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;

    .error-icon {
      font-size: 1.2rem;
    }

    h4 {
      color: var(--text-primary);
      margin: 0;
    }
  }

  p {
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .error-actions {
    display: flex;
    gap: 0.5rem;
  }
}

.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;

  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--border-color);
    border-top: 4px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  p {
    color: var(--text-secondary);
    font-size: 1.1rem;
  }
}

.stats-grid {
  .stat-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, var(--bg-surface), var(--bg-secondary));
    border: 1px solid var(--border-color);
    transition: var(--transition-fast);

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
      border-color: var(--primary-color);
    }

    .stat-icon {
      font-size: 2rem;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
      border-radius: var(--radius-lg);
      color: var(--text-inverse);
    }

    .stat-content {
      flex: 1;

      .stat-number {
        font-size: 2rem;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 0.25rem;
        line-height: 1;
      }

      .stat-label {
        color: var(--text-secondary);
        font-size: 0.875rem;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    }
  }
}

.dashboard-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--spacing-xl);

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
}

.section-header {
  margin-bottom: var(--spacing-lg);

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
  }

  .section-subtitle {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
}

.activity-section {
  .empty-state {
    text-align: center;
    padding: 3rem;
    color: var(--text-secondary);

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    p {
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
    }

    .empty-description {
      font-size: 0.875rem;
      opacity: 0.7;
    }
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .activity-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    transition: var(--transition-fast);

    &:hover {
      transform: translateX(4px);
      box-shadow: var(--shadow-md);
    }

    .activity-icon {
      font-size: 1.5rem;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-tertiary);
      border-radius: var(--radius-md);
    }

    .activity-content {
      flex: 1;

      .activity-title {
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.25rem;
      }

      .activity-user {
        color: var(--text-secondary);
        font-size: 0.875rem;
        margin-bottom: 0.25rem;
      }

      .activity-time {
        color: var(--text-muted);
        font-size: 0.75rem;
      }
    }
  }
}

.quick-actions-section {
  .actions-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .action-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    text-decoration: none;
    color: inherit;
    transition: var(--transition-fast);

    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
      border-color: var(--primary-color);
    }

    .action-icon {
      font-size: 1.5rem;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
      border-radius: var(--radius-md);
      color: var(--text-inverse);
    }

    .action-content {
      flex: 1;

      h3 {
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.25rem;
      }

      p {
        color: var(--text-secondary);
        font-size: 0.875rem;
        margin: 0;
        line-height: 1.4;
      }
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// Responsive adjustments
@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-content {
    gap: var(--spacing-lg);
  }

  .server-selector {
    .server-select {
      max-width: 100%;
    }
  }
}

@media (max-width: 600px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.7rem;
    margin-bottom: 1.2rem;
    h1 {
      font-size: 1.3rem;
    }
    .subtitle {
      font-size: 0.98rem;
    }
  }

  .server-selector {
    .server-select {
      max-width: 100%;
      font-size: 0.98rem;
      padding: 0.6rem 0.8rem;
    }
    .server-label {
      font-size: 0.98rem;
    }
  }

  .connection-status {
    .status-indicators {
      flex-direction: column;
      gap: 0.5rem;
    }
    .status-item {
      font-size: 0.95rem;
      gap: 0.5rem;
    }
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 0.7rem;
    .stat-card {
      padding: 1rem;
      .stat-icon {
        width: 40px;
        height: 40px;
        font-size: 1.3rem;
      }
      .stat-content .stat-number {
        font-size: 1.2rem;
      }
    }
  }

  .dashboard-content {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .activity-section {
    .activity-list {
      gap: 0.7rem;
    }
    .activity-item {
      padding: 0.7rem;
      gap: 0.7rem;
      .activity-icon {
        width: 36px;
        height: 36px;
        font-size: 1.1rem;
      }
      .activity-content .activity-title {
        font-size: 0.98rem;
      }
    }
    .empty-state {
      padding: 1.5rem;
      .empty-icon {
        font-size: 2rem;
      }
      p, .empty-description {
        font-size: 0.95rem;
      }
    }
  }

  .quick-actions-section {
    .actions-grid {
      gap: 0.7rem;
    }
    .action-card {
      padding: 1rem;
      gap: 0.7rem;
      .action-icon {
        width: 36px;
        height: 36px;
        font-size: 1.1rem;
      }
      .action-content h3 {
        font-size: 1rem;
      }
      .action-content p {
        font-size: 0.93rem;
      }
    }
  }

  .error-notice {
    padding: 0.7rem;
    .error-header {
      gap: 0.3rem;
      .error-icon {
        font-size: 1rem;
      }
      h4 {
        font-size: 1rem;
      }
    }
    p, .error-actions {
      font-size: 0.93rem;
    }
  }

  .loading-overlay {
    padding: 2rem;
    .loading-spinner {
      width: 32px;
      height: 32px;
    }
    p {
      font-size: 0.98rem;
    }
  }
}
</style>
