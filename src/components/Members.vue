<!-- eslint-disable vue/multi-word-component-names -->
<!-- eslint-disable no-unused-vars -->
<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/auth/supabase'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'

const router = useRouter()
const dashboardStore = useDashboardStore()
const members = ref([])
const channels = ref([])
const servers = ref([])
const selectedServer = ref(null)
const isLoading = ref(true)
const searchQuery = ref('')
const statusFilter = ref('all')
const selectedChannel = ref(null)
const selectedMember = ref(null)
const showMemberModal = ref(false)
const showChannelModal = ref(false)
const hasData = ref(false)
const apiError = ref(null)
const memberActivity = ref([])
const isLoadingActivity = ref(false)
const channelMembers = ref([])
const channelActivity = ref([])
const channelStats = ref({
  total_members: 0,
  online_members: 0,
  online_percentage: 0
})
const websocket = ref(null)
const isConnected = ref(false)
const activeTab = ref('members')


// API Configuration
const API_BASE_URL = 'https://discord-adminbot.onrender.com'

// Real-time subscription for member updates
let membersSubscription = null

const filteredMembers = computed(() => {
  let filtered = members.value

  // Filter by search query
  if (searchQuery.value) {
    filtered = filtered.filter(member =>
      member.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      member.id.toString().includes(searchQuery.value) ||
      (member.nick && member.nick.toLowerCase().includes(searchQuery.value.toLowerCase()))
    )
  }

  // Filter by status
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(member => member.status === statusFilter.value)
  }

  return filtered
})

const statusCounts = computed(() => {
  const counts = { online: 0, idle: 0, dnd: 0, offline: 0 }
  members.value.forEach(member => {
    const status = member.status || 'offline'
    counts[status] = (counts[status] || 0) + 1
  })
  return counts
})



const authStore = useAuthStore()

async function fetchServers() {
  try {
    const response = await authStore.authorizedFetch(`${API_BASE_URL}/servers`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    servers.value = data

    // Auto-select first server if available
    if (data.length > 0 && !selectedServer.value) {
      selectedServer.value = data[0]
      await fetchMembers()
      await fetchChannels()
    }
  } catch (error) {
    console.error('Error fetching servers:', error)
    apiError.value = 'Failed to connect to Discord bot API. Make sure your bot is running.'
  }
}

async function fetchMembers() {
  if (!selectedServer.value) return

  try {
    isLoading.value = true
    const response = await authStore.authorizedFetch(`${API_BASE_URL}/servers/${(selectedServer.value.id)}/members`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    members.value = data
    hasData.value = data.length > 0
    isLoading.value = false
  } catch (error) {
    console.error('Error fetching members:', error)
    apiError.value = 'Failed to fetch members from Discord bot.'
    isLoading.value = false
  }
}

async function fetchChannels() {
  if (!selectedServer.value) return

  try {
    const response = await authStore.authorizedFetch(`${API_BASE_URL}/servers/${selectedServer.value.id}/channels`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    channels.value = data
  } catch (error) {
    console.error('Error fetching channels:', error)
    apiError.value = 'Failed to fetch channels from Discord bot.'
  }
}

async function fetchMemberActivity(memberId) {
  if (!selectedServer.value || !memberId) return
  try {
    isLoadingActivity.value = true
    const response = await authStore.authorizedFetch(`${API_BASE_URL}/servers/${selectedServer.value.id}/members/${memberId}/activity`)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    memberActivity.value = await response.json()
  } catch (error) {
    console.error('Error fetching member activity:', error)
    memberActivity.value = []
  } finally {
    isLoadingActivity.value = false
  }
}

function setupWebSocket() {
  try {
    websocket.value = new WebSocket('wss://discord-adminbot.onrender.com/ws/status')

    websocket.value.onopen = () => {
      console.log('Members WebSocket connected')
      isConnected.value = true
    }

    websocket.value.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleWebSocketMessage(data)
    }

    websocket.value.onclose = () => {
      console.log('Members WebSocket disconnected')
      isConnected.value = false
      setTimeout(() => {
        if (!isConnected.value) {
          setupWebSocket()
        }
      }, 5000)
    }

    websocket.value.onerror = (error) => {
      console.error('Members WebSocket error:', error)
      isConnected.value = false
    }
  } catch (error) {
    console.error('Failed to setup Members WebSocket:', error)
  }
}

function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'presence_update':
      // Update member status in real-time
      {
        const member = members.value.find(m => m.id === parseInt(data.user_id))
        if (member) {
          member.status = data.status
        }
        break
      }
    default:
      console.log('Unknown WebSocket message type:', data.type)
  }
}

function disconnectWebSocket() {
  if (websocket.value) {
    websocket.value.close()
    websocket.value = null
  }
  isConnected.value = false
}

function setupRealtimeSubscription() {
  // Setup WebSocket connection for real-time updates
  setupWebSocket()
}

async function viewMemberHistory(member) {
  selectedMember.value = member
  showMemberModal.value = true
  await fetchMemberActivity(member.id)
}


// Modal state for warning/ban
const showWarnModal = ref(false)
const showBanModal = ref(false)
const warnReason = ref('')
const banReason = ref('')
const warnTarget = ref(null)
const banTarget = ref(null)
const warnLoading = ref(false)
const banLoading = ref(false)
const warnError = ref('')
const banError = ref('')

function openWarnModal(member) {
  warnTarget.value = member
  warnReason.value = ''
  warnError.value = ''
  showWarnModal.value = true
}
function openBanModal(member) {
  banTarget.value = member
  banReason.value = ''
  banError.value = ''
  showBanModal.value = true
}
function closeWarnModal() {
  showWarnModal.value = false
  warnTarget.value = null
  warnReason.value = ''
  warnError.value = ''
}
function closeBanModal() {
  showBanModal.value = false
  banTarget.value = null
  banReason.value = ''
  banError.value = ''
}

async function submitWarn() {
  if (!warnReason.value.trim()) {
    warnError.value = 'Please enter a reason.'
    return
  }
  warnLoading.value = true
  warnError.value = ''
  try {
    const member = warnTarget.value
    const response = await authStore.authorizedFetch(`${API_BASE_URL}/servers/${selectedServer.value.id}/members/${member.id}/warn?reason=${encodeURIComponent(warnReason.value)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.detail || 'Failed to warn the member.')
    closeWarnModal()
    // Optionally show a toast/notification here
  } catch (error) {
    warnError.value = error.message
  } finally {
    warnLoading.value = false
  }
}

async function submitBan() {
  if (!banReason.value.trim()) {
    banError.value = 'Please enter a reason.'
    return
  }
  banLoading.value = true
  banError.value = ''
  try {
    const member = banTarget.value
    const response = await authStore.authorizedFetch(`${API_BASE_URL}/servers/${selectedServer.value.id}/members/${member.id}/ban?reason=${encodeURIComponent(banReason.value)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.detail || 'Failed to ban the member.')
    members.value = members.value.filter(m => m.id !== member.id)
    closeBanModal()
    // Optionally show a toast/notification here
  } catch (error) {
    banError.value = error.message
  } finally {
    banLoading.value = false
  }
}


function viewChannelDetails(channel) {
  selectedChannel.value = channel
  showChannelModal.value = true

  // Only fetch data for actual channels, not categories
  if (channel.type === 'category') {
    channelMembers.value = []
    channelActivity.value = []
    channelStats.value = {
      total_members: 0,
      online_members: 0,
      online_percentage: 0
    }
    return
  }

  // Fetch channel members and activity separately
  Promise.all([
    dashboardStore.fetchChannelMembers(channel.id),
    dashboardStore.fetchChannelActivity(channel.id)
  ]).then(([members, activity]) => {
    channelMembers.value = members || []
    channelActivity.value = activity || []

    // Calculate stats from members
    const totalMembers = members.length
    const onlineMembers = members.filter(m => m.status !== 'offline').length
    channelStats.value = {
      total_members: totalMembers,
      online_members: onlineMembers,
      online_percentage: totalMembers > 0 ? Math.round((onlineMembers / totalMembers) * 100) : 0
    }
  }).catch(error => {
    console.error('Error fetching channel data:', error)
    // Set default values if API fails
    channelMembers.value = []
    channelActivity.value = []
    channelStats.value = {
      total_members: 0,
      online_members: 0,
      online_percentage: 0
    }
  })
}

function closeMemberModal() {
  showMemberModal.value = false
  selectedMember.value = null
  memberActivity.value = []
}

function closeChannelModal() {
  showChannelModal.value = false
  selectedChannel.value = null
}

function getStatusIcon(status) {
  const icons = {
    online: '🟢',
    idle: '🟡',
    dnd: '🔴',
    offline: '⚫'
  }
  return icons[status] || icons.offline
}

function getChannelIcon(type) {
  const icons = {
    text: '#',
    voice: '🔊',
    announcement: '📢',
    category: '📁'
  }
  return icons[type] || '#'
}

function formatLastSeen(timestamp) {
  if (!timestamp) return 'Never'
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return date.toLocaleDateString()
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

function getActivityIcon(action) {
  switch (action) {
    case 'sent_message':
      return '💬'
    case 'joined_vc':
      return '🔊'
    case 'left_vc':
      return '🔇'
    default:
      return '📝'
  }
}

function handleServerChange() {
  if (selectedServer.value) {
    fetchMembers()
    fetchChannels()
  }
}

onMounted(() => {
  fetchServers()
  setupRealtimeSubscription()
})

onUnmounted(() => {
  disconnectWebSocket()
})
</script>

<template>
  <div class="members-page">
    <header class="page-header">
      <div>
        <h1>Members & Channels</h1>
        <p class="subtitle">Discord server members and channel overview</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" @click="fetchMembers">
          🔄 Refresh
        </button>
      </div>
    </header>

    <!-- Server Selection -->
    <div v-if="servers.length > 0" class="server-selector card mb-4">
      <label for="server-select" class="server-label">Select Server:</label>
      <select id="server-select" v-model="selectedServer" @change="handleServerChange" class="server-select">
        <option v-for="server in servers" :key="server.id" :value="server">
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
        <button class="btn btn-secondary" @click="fetchServers">
          Retry Connection
        </button>
      </div>
    </div>

    <!-- Status Overview -->
    <div v-if="hasData" class="status-overview grid grid-4 mb-4">
      <div class="status-card online">
        <div class="status-icon">🟢</div>
        <div class="status-info">
          <h3>{{ statusCounts.online }}</h3>
          <p>Online</p>
        </div>
      </div>
      <div class="status-card idle">
        <div class="status-icon">🟡</div>
        <div class="status-info">
          <h3>{{ statusCounts.idle }}</h3>
          <p>Idle</p>
        </div>
      </div>
      <div class="status-card dnd">
        <div class="status-icon">🔴</div>
        <div class="status-info">
          <h3>{{ statusCounts.dnd }}</h3>
          <p>Do Not Disturb</p>
        </div>
      </div>
      <div class="status-card offline">
        <div class="status-icon">⚫</div>
        <div class="status-info">
          <h3>{{ statusCounts.offline }}</h3>
          <p>Offline</p>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div v-if="hasData" class="filters toolbar glass mb-4">
      <div class="toolbar-row">
        <div class="search-box input-with-icon">
          <span class="leading-icon">🔎</span>
          <input v-model="searchQuery" type="text" placeholder="Search by name, nickname, or ID..."
            class="search-input" />
        </div>
        <div class="toolbar-controls">
          <div class="status-filter">
            <select v-model="statusFilter" class="filter-select">
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="idle">Idle</option>
              <option value="dnd">Do Not Disturb</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Content Tabs -->
    <div v-if="hasData" class="content-tabs">
      <div class="tab-buttons">
        <button class="tab-btn" :class="{ active: activeTab === 'members' }" @click="activeTab = 'members'">👥 All
          Members</button>
        <button class="tab-btn" :class="{ active: activeTab === 'channels' }" @click="activeTab = 'channels'">📢
          Channels</button>
      </div>
    </div>

    <!-- Members List -->
    <div v-if="activeTab === 'members'" class="members-list">
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading members...</p>
      </div>

      <div v-else-if="!selectedServer" class="empty-state">
        <div class="empty-icon">🏠</div>
        <h3>No Server Selected</h3>
        <p>Please select a Discord server to view its members and channels.</p>
      </div>

      <div v-else-if="!hasData" class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>No Members Found</h3>
        <p>This server doesn't have any members or the bot doesn't have permission to view them.</p>
        <div class="setup-instructions">
          <h4>Required Bot Permissions:</h4>
          <ul>
            <li><strong>View Channels:</strong> To see all channels</li>
            <li><strong>View Server Insights:</strong> To access member data</li>
            <li><strong>Read Message History:</strong> To track channel activity</li>
          </ul>
        </div>
      </div>

      <div v-else-if="filteredMembers.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No Members Match Your Search</h3>
        <p>Try adjusting your search criteria or status filter.</p>
      </div>

      <div v-else class="members-grid grid grid-3">
        <div v-for="member in filteredMembers" :key="member.id" class="member-card card glass">
          <div class="member-header">
            <div class="member-avatar">
              <img :src="member.avatar_url || '/default-avatar.png'" :alt="member.name"
                @error="$event.target.src = '/default-avatar.png'" />
              <span class="status-indicator" :class="`status-${member.status}`"></span>
            </div>
            <div class="member-info">
              <h3 class="member-name">{{ member.nick || member.name }}</h3>
              <p v-if="member.nick" class="member-username">@{{ member.name }}</p>
            </div>
            <div class="member-status">
              <span class="status-badge" :class="`status-${member.status}`">
                {{ member.status }}
              </span>
            </div>
          </div>

          <div class="member-details">
            <div class="detail-item">
              <span class="detail-label">Roles:</span>
              <span class="detail-value">{{ member.roles.join(', ') || 'None' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">User ID:</span>
              <span class="detail-value">{{ member.id }}</span>
            </div>
          </div>

          <div class="member-actions">
            <button class="btn btn-secondary btn-sm" @click="viewMemberHistory(member)">
              📊 History
            </button>
          <button class="btn btn-warning btn-sm" @click="openWarnModal(member)">
            ⚠️ Warn
          </button>
          <button class="btn btn-error btn-sm" @click="openBanModal(member)">
            🚫 Ban
          </button>
    <!-- Warn Modal -->
    <div v-if="showWarnModal" class="modal-overlay" @click="closeWarnModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Warn Member</h2>
          <button class="modal-close" @click="closeWarnModal">×</button>
        </div>
        <div class="modal-body">
          <p>Enter a reason for warning <strong>{{ warnTarget?.nick || warnTarget?.name }}</strong>:</p>
          <textarea v-model="warnReason" class="modal-textarea" placeholder="Reason..." rows="3"></textarea>
          <div v-if="warnError" class="modal-error">{{ warnError }}</div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="closeWarnModal" :disabled="warnLoading">Cancel</button>
            <button class="btn btn-warning" @click="submitWarn" :disabled="warnLoading">
              <span v-if="warnLoading">Sending...</span>
              <span v-else>Warn</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Ban Modal -->
    <div v-if="showBanModal" class="modal-overlay" @click="closeBanModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Ban Member</h2>
          <button class="modal-close" @click="closeBanModal">×</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to <span style="color:var(--error-color);font-weight:bold">permanently ban</span> <strong>{{ banTarget?.nick || banTarget?.name }}</strong>?</p>
          <p>Please provide a reason for the ban:</p>
          <textarea v-model="banReason" class="modal-textarea" placeholder="Reason..." rows="3"></textarea>
          <div v-if="banError" class="modal-error">{{ banError }}</div>
          <div class="modal-actions">
            <button class="btn btn-secondary" @click="closeBanModal" :disabled="banLoading">Cancel</button>
            <button class="btn btn-error" @click="submitBan" :disabled="banLoading">
              <span v-if="banLoading">Banning...</span>
              <span v-else>Ban</span>
            </button>
          </div>
        </div>
      </div>
    </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Channels Section -->
    <div v-if="activeTab === 'channels' && channels.length > 0" class="channels-section mt-4">
      <h2 class="section-title">Discord Channels</h2>
      <div class="channels-grid">
        <div v-for="channel in channels" :key="channel.id" class="channel-card card"
          @click="viewChannelDetails(channel)">
          <div class="channel-header">
            <div class="channel-icon">
              {{ getChannelIcon(channel.type) }}
            </div>
            <div class="channel-info">
              <h3 class="channel-name">{{ channel.name }}</h3>
              <p class="channel-type">{{ channel.type === 'category' ? 'Category' : channel.type + ' channel' }}</p>
            </div>
            <div class="channel-stats">
              <div class="stat-item">
                <span class="stat-number">{{ channel.type === 'category' ? 'N/A' : '-' }}</span>
                <span class="stat-label">Members</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ channel.type === 'category' ? 'N/A' : '-' }}</span>
                <span class="stat-label">Online</span>
              </div>
            </div>
          </div>

          <div class="channel-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: 0%"></div>
            </div>
            <span class="progress-text">
              {{ channel.type === 'category' ? 'Category - Click to view info' : 'Click to view details' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Member History Modal -->
    <div v-if="showMemberModal" class="modal-overlay" @click="closeMemberModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ selectedMember?.nick || selectedMember?.name }}'s History</h2>
          <button class="modal-close" @click="closeMemberModal">×</button>
        </div>
        <div class="modal-body">
          <div class="member-details-modal">
            <div class="detail-row">
              <span class="detail-label">User ID:</span>
              <span class="detail-value">{{ selectedMember?.id }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Username:</span>
              <span class="detail-value">@{{ selectedMember?.name }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Display Name:</span>
              <span class="detail-value">{{ selectedMember?.nick || selectedMember?.name }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value">{{ selectedMember?.status }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Roles:</span>
              <span class="detail-value">{{ selectedMember?.roles.join(', ') || 'None' }}</span>
            </div>
          </div>
          <!-- Activity Timeline -->
          <div class="activity-timeline">
            <h3>Recent Activity</h3>

            <div v-if="isLoadingActivity" class="activity-loading">
              <div class="loading-spinner"></div>
              <p>Loading activity...</p>
            </div>

            <div v-else-if="memberActivity.length === 0" class="activity-empty">
              <p>No recent activity found for this member.</p>
            </div>

            <div v-else class="activity-list">
              <div v-for="activity in memberActivity" :key="activity.id" class="activity-item">
                <div class="activity-icon">
                  {{ getActivityIcon(activity.action) }}
                </div>
                <div class="activity-content">
                  <p class="activity-description">
                    {{ getActivityDescription(activity.action, activity.details) }}
                  </p>
                  <span class="activity-time">
                    {{ formatLastSeen(activity.created_at) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Channel Details Modal -->
    <div v-if="showChannelModal" class="modal-overlay" @click="closeChannelModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ selectedChannel?.name }} Channel</h2>
          <button class="modal-close" @click="closeChannelModal">×</button>
        </div>
        <div class="modal-body">
          <div class="channel-details">
            <div class="detail-row">
              <span class="detail-label">Channel ID:</span>
              <span class="detail-value">{{ selectedChannel?.id }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Channel Type:</span>
              <span class="detail-value">{{ selectedChannel?.type }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Total Members:</span>
              <span class="detail-value">{{ channelStats.total_members }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Online Members:</span>
              <span class="detail-value">{{ channelStats.online_members }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Online Percentage:</span>
              <span class="detail-value">{{ channelStats.online_percentage }}%</span>
            </div>
          </div>

          <!-- Channel Members -->
          <div class="channel-members" v-if="channelMembers.length > 0">
            <h3>Channel Members</h3>
            <div class="member-list">
              <div v-for="member in channelMembers" :key="member.id" class="member-item">
                <img :src="member.avatar_url" :alt="member.name" class="member-avatar">
                <div class="member-info">
                  <span class="member-name">{{ member.nick || member.name }}</span>
                  <span class="member-status" :class="member.status">{{ member.status }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Channel Activity -->
          <div class="channel-activity" v-if="channelActivity.length > 0">
            <h3>Recent Activity</h3>
            <div class="activity-timeline">
              <div v-for="activity in channelActivity" :key="activity.id" class="activity-item">
                <div class="activity-icon">{{ getActivityIcon(activity.action) }}</div>
                <div class="activity-content">
                  <div class="activity-user">{{ activity.username }}</div>
                  <div class="activity-description">{{ getActivityDescription(activity.action, activity.details) }}
                  </div>
                  <div class="activity-time">{{ formatLastSeen(activity.created_at) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Category Info -->
          <div v-if="selectedChannel?.type === 'category'" class="category-info">
            <h3>Category Information</h3>
            <p>This is a category channel that organizes other channels. Categories don't have members or activity
              directly.</p>
            <p>To view member data, click on individual text or voice channels within this category.</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="channelMembers.length === 0 && channelActivity.length === 0" class="empty-state">
            <p>No channel data available. This could be because:</p>
            <ul>
              <li>The channel is empty or has no recent activity</li>
              <li>Channel tracking is not yet implemented for this channel type</li>
              <li>The Discord bot API is not responding</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.members-page {
  position: relative;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
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

.status-overview {
  .status-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    background: var(--bg-surface);
    box-shadow: var(--shadow-md);

    .status-icon {
      font-size: 1.5rem;
    }

    .status-info {
      h3 {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 0.25rem;
      }

      p {
        color: var(--text-secondary);
        font-size: 0.875rem;
        margin: 0;
      }
    }
  }
}

.filters {
  .search-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 1rem;

    &:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
  }

  .filter-select {
    padding: 0.75rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 1rem;
    background: var(--bg-surface);

    &:focus {
      outline: none;
      border-color: var(--primary-color);
    }
  }
}

.toolbar {
  border: 1px solid var(--border-color);
  padding: 1rem;
  border-radius: var(--radius-lg);
}

.toolbar-row {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
  flex-wrap: wrap;
}

.toolbar-controls {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.input-with-icon {
  position: relative;
  flex: 1 1 360px;
}

.leading-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.7;
}

.input-with-icon .search-input {
  padding-left: 2.25rem;
}

.content-tabs {
  margin-bottom: var(--spacing-lg);

  .tab-buttons {
    display: flex;
    gap: var(--spacing-sm);
  }

  .tab-btn {
    padding: var(--spacing-md) var(--spacing-lg);
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: var(--transition-fast);
    font-weight: 500;

    &:hover {
      background: var(--bg-tertiary);
    }

    &.active {
      background: var(--primary-color);
      color: var(--text-inverse);
      border-color: var(--primary-color);
    }
  }
}

.member-card {
  min-width: 320px;
  max-width: 380px;
  width: 100%;
  transition: var(--transition-fast);
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  padding: 1.5rem;
  border-radius: var(--radius-lg);

  border-top: 3px solid transparent;

  &:hover {
    border-top-color: var(--primary-color);
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    border-color: var(--primary-color);
  }
}

.member-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  flex-wrap: nowrap;
  justify-content: space-between;
}

.member-avatar {
  position: relative;

  img {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid var(--bg-tertiary);
  }

  .status-indicator {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 3px solid var(--bg-surface);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    &.status-online {
      background-color: var(--success-color);
    }

    &.status-idle {
      background-color: var(--warning-color);
    }

    &.status-dnd {
      background-color: var(--error-color);
    }

    &.status-offline {
      background-color: var(--text-secondary);
    }
  }
}

.member-status {
  .status-badge {
    padding: 0.375rem 0.75rem;
    border-radius: var(--radius-md);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    &.status-online {
      background-color: var(--success-color);
      color: white;
    }

    &.status-idle {
      background-color: var(--warning-color);
      color: white;
    }

    &.status-dnd {
      background-color: var(--error-color);
      color: white;
    }

    &.status-offline {
      background-color: var(--text-secondary);
      color: white;
    }
  }
}

.member-info {
  flex: 1;

  .member-name {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
    font-size: 1.1rem;
  }

  .member-username {
    color: var(--text-muted);
    font-size: 0.875rem;
    margin: 0;
  }
}

.member-details {
  margin-bottom: 1rem;

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding: 0.5rem;
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);

    .detail-label {
      color: var(--text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
    }

    .detail-value {
      font-weight: 600;
      font-size: 0.875rem;
      max-width: 60%;
      text-align: right;
      word-break: break-word;
      color: var(--text-primary);
    }
  }
}

.member-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--border-color);

  .btn-sm {
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: var(--radius-md);
    transition: var(--transition-fast);

    &:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--border-color);
    border-top: 4px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  h3 {
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  p {
    margin-bottom: 2rem;
    font-size: 1.1rem;
  }

  .setup-instructions {
    text-align: left;
    max-width: 600px;
    margin: 0 auto;
    background: var(--bg-surface);
    padding: 1.5rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);

    h4 {
      color: var(--text-primary);
      margin-bottom: 1rem;
    }

    ul {
      margin: 0;
      padding-left: 1.5rem;

      li {
        margin-bottom: 0.5rem;
        line-height: 1.5;

        strong {
          color: var(--text-primary);
        }
      }
    }
  }
}

// Channels Section
.channels-section {
  .section-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-lg);
  }
}

.channels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.channel-card {
  cursor: pointer;
  transition: var(--transition-fast);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
}

.channel-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.channel-icon {
  font-size: 1.5rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
}

.channel-info {
  flex: 1;

  .channel-name {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
  }

  .channel-type {
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin: 0;
    text-transform: capitalize;
  }
}

.channel-stats {
  display: flex;
  gap: var(--spacing-md);

  .stat-item {
    text-align: center;

    .stat-number {
      display: block;
      font-weight: 700;
      color: var(--text-primary);
      font-size: 1.1rem;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  }
}

.channel-progress {
  .progress-bar {
    width: 100%;
    height: 6px;
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    overflow: hidden;
    margin-bottom: var(--spacing-xs);

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--success-color), var(--primary-color));
      transition: width 0.3s ease;
    }
  }

  .progress-text {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
}

// Modal Styles
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  padding: 0;
}

.modal-body {
  padding: var(--spacing-lg);
}

.modal-textarea {
  width: 100%;
  min-height: 80px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  font-size: 1rem;
  margin: 0.5rem 0 1rem 0;
  background: var(--bg-secondary);
  color: var(--text-primary);
  resize: vertical;
  transition: border-color 0.2s;
}
.modal-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(99,102,241,0.1);
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}
.modal-error {
  color: var(--error-color);
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
  font-weight: 500;
}


.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);

  h2 {
    margin: 0;
    color: var(--text-primary);
  }

  .modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: var(--text-secondary);

    &:hover {
      color: var(--text-primary);
    }
  }
}

.modal-body {
  padding: var(--spacing-lg);
}

.member-details-modal {
  margin-bottom: var(--spacing-lg);

  .detail-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--spacing-md);

    .detail-label {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .detail-value {
      font-weight: 600;
      color: var(--text-primary);
      max-width: 60%;
      text-align: right;
      word-break: break-word;
    }
  }
}

.channel-details {
  margin-bottom: var(--spacing-lg);

  .detail-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--spacing-md);

    .detail-label {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .detail-value {
      font-weight: 600;
      color: var(--text-primary);
    }
  }
}

.activity-note {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
}

.channel-members {
  margin-top: 2rem;

  h3 {
    color: var(--text-primary);
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .member-list {
    display: grid;
    gap: 0.75rem;
  }

  .member-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);

    .member-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }

    .member-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      .member-name {
        font-weight: 500;
        color: var(--text-primary);
      }

      .member-status {
        font-size: 0.875rem;
        text-transform: uppercase;
        font-weight: 500;

        &.online {
          color: var(--success-color);
        }

        &.idle {
          color: var(--warning-color);
        }

        &.dnd {
          color: var(--error-color);
        }

        &.offline {
          color: var(--text-secondary);
        }
      }
    }
  }
}

.channel-activity {
  margin-top: 2rem;

  h3 {
    color: var(--text-primary);
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .activity-timeline {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .activity-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);

    .activity-icon {
      font-size: 1.2rem;
      margin-top: 0.125rem;
    }

    .activity-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      .activity-user {
        font-weight: 500;
        color: var(--text-primary);
      }

      .activity-description {
        color: var(--text-secondary);
        font-size: 0.875rem;
      }

      .activity-time {
        color: var(--text-secondary);
        font-size: 0.75rem;
      }
    }
  }
}

.category-info {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--bg-info);
  border-radius: var(--radius-md);
  border: 1px solid var(--info-color);

  h3 {
    color: var(--text-primary);
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  p {
    color: var(--text-secondary);
    margin-bottom: 0.75rem;
    line-height: 1.5;
  }
}

.empty-state {
  margin-top: 2rem;
  padding: 1.5rem;
  background: var(--bg-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);

  p {
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }

  ul {
    color: var(--text-secondary);
    font-size: 0.875rem;
    padding-left: 1.5rem;

    li {
      margin-bottom: 0.5rem;
    }
  }
}

// Activity Timeline Styles
.activity-timeline {
  margin-top: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
  padding-top: var(--spacing-lg);

  h3 {
    color: var(--text-primary);
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: var(--spacing-md);
  }
}

.activity-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-lg);
  color: var(--text-secondary);

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border-color);
    border-top: 2px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: var(--spacing-sm);
  }
}

.activity-empty {
  text-align: center;
  padding: var(--spacing-lg);
  color: var(--text-secondary);
  font-style: italic;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--primary-color);

  .activity-icon {
    font-size: 1.2rem;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    flex-shrink: 0;
  }

  .activity-content {
    flex: 1;

    .activity-description {
      color: var(--text-primary);
      font-weight: 500;
      margin-bottom: var(--spacing-xs);
      line-height: 1.4;
    }

    .activity-time {
      color: var(--text-secondary);
      font-size: 0.75rem;
    }
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .grid.grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }

  .grid.grid-3 {
    grid-template-columns: 1fr;
  }

  .filters {
    .search-input {
      width: 100%;
    }
  }

  .member-actions {
    flex-direction: column;
  }

  .channels-grid {
    grid-template-columns: 1fr;
  }

  .empty-state {
    padding: 2rem;

    .setup-instructions {
      padding: 1rem;
    }
  }

  .server-selector {
    .server-select {
      max-width: 100%;
    }
  }
}

@media (max-width: 600px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.7rem;
    margin-bottom: 1.2rem;
    h1 {
      font-size: 1.2rem;
    }
    .subtitle {
      font-size: 0.95rem;
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

  .status-overview.grid.grid-4 {
    grid-template-columns: 1fr 1fr !important;
    gap: 0.7rem !important;
    .status-card {
      flex-direction: row;
      align-items: center;
      gap: 0.5rem;
      padding: 0.7rem 0.5rem;
      font-size: 0.95rem;
      h3 {
        font-size: 1.1rem;
      }
    }
  }

  .filters.toolbar {
    padding: 0.5rem;
    border-radius: var(--radius-md);
  }

  .toolbar-row {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }

  .toolbar-controls {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }

  .search-box.input-with-icon {
    flex: 1 1 100%;
    .search-input {
      width: 100%;
      font-size: 0.98rem;
      padding: 0.5rem 0.8rem 0.5rem 2.2rem;
    }
    .leading-icon {
      left: 10px;
      font-size: 1.1rem;
    }
  }

  .filter-select {
    width: 100%;
    font-size: 0.98rem;
    padding: 0.5rem 0.8rem;
  }

  .content-tabs .tab-buttons {
    flex-direction: column;
    gap: 0.5rem;
    .tab-btn {
      width: 100%;
      text-align: left;
      padding: 0.7rem 1rem;
      font-size: 1rem;
    }
  }

  .members-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 0.5rem;
    height: auto;
  }

  .member-card {
    min-width: unset;
    max-width: unset;
    padding: 1rem 0.5rem;
    border-radius: var(--radius-md);
  }

  .member-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.7rem;
    margin-bottom: 0.7rem;
    padding-bottom: 0.7rem;
  }

  .member-avatar img {
    width: 44px;
    height: 44px;
  }
  .member-avatar .status-indicator {
    width: 12px;
    height: 12px;
    border-width: 2px;
  }

  .member-info .member-name {
    font-size: 1rem;
  }

  .member-details .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
    padding: 0.4rem;
    .detail-value {
      max-width: 100%;
      text-align: left;
      font-size: 0.93rem;
    }
  }

  .member-actions {
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.7rem;
    margin-top: 0.7rem;
    .btn-sm {
      width: 100%;
      font-size: 0.93rem;
      padding: 0.6rem 0.7rem;
    }
  }

  .channels-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .channel-card {
    padding: 1rem 0.5rem;
    border-radius: var(--radius-md);
  }

  .channel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.7rem;
    margin-bottom: 0.7rem;
  }

  .channel-icon {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }

  .modal-content {
    max-width: 100vw;
    width: 100vw;
    padding: 0.2rem;
    border-radius: var(--radius-sm);
  }
  .modal-header, .modal-body {
    padding: 0.7rem;
  }

  .modal-textarea {
    font-size: 0.95rem;
    padding: 0.5rem 0.7rem;
  }

  .modal-actions {
    flex-direction: column;
    gap: 0.5rem;
    button {
      width: 100%;
    }
  }

  .member-details-modal .detail-row,
  .channel-details .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
    .detail-value {
      max-width: 100%;
      text-align: left;
    }
  }

  .activity-list,
  .channel-members .member-list {
    gap: 0.5rem;
  }

  .activity-item,
  .channel-members .member-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.4rem;
    padding: 0.5rem;
  }

  .activity-icon,
  .channel-members .member-avatar {
    width: 28px;
    height: 28px;
    font-size: 1rem;
  }

  .empty-state,
  .category-info {
    padding: 1rem;
    margin-top: 1rem;
    .empty-icon {
      font-size: 2rem;
    }
    h3 {
      font-size: 1.1rem;
    }
    p, ul {
      font-size: 0.95rem;
    }
  }
}
</style>
