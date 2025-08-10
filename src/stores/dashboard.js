import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/auth/supabase'
import { useAuthStore } from '@/stores/auth'

// API Configuration
const API_BASE_URL = 'https://discord-adminbot.onrender.com'

export const useDashboardStore = defineStore('dashboard', () => {
  // State
  const members = ref([])
  const reports = ref([])
  const settings = ref({})
  const servers = ref([])
  const selectedServer = ref(null)
  const isLoading = ref(false)
  const error = ref(null)
  const websocket = ref(null)
  const isConnected = ref(false)

  // Computed
  const onlineMembers = computed(() => {
    return members.value.filter(member => member.status !== 'offline').length
  })

  const openReports = computed(() => {
    return reports.value.filter(report => report.status === 'open').length
  })

  const stats = computed(() => {
    return {
      totalMembers: members.value.length,
      onlineMembers: onlineMembers.value,
      openReports: openReports.value,
      activeChannels: 5 // This would be calculated from actual channel data
    }
  })

  // Actions
  async function fetchServers() {
    const { authorizedFetch } = useAuthStore()
    try {
      const response = await authorizedFetch(`${API_BASE_URL}/servers`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      servers.value = data

      // Auto-select first server if available
      if (data.length > 0 && !selectedServer.value) {
        selectedServer.value = data[0]
        await fetchMembers()
        await fetchReports()
      }
    } catch (err) {
      error.value = 'Failed to connect to Discord bot API. Make sure your bot is running.'
      console.error('Error fetching servers:', err)
    }
  }

  async function fetchMembers() {
    const { authorizedFetch } = useAuthStore()
    if (!selectedServer.value) return

    try {
      isLoading.value = true
      const response = await authorizedFetch(`${API_BASE_URL}/servers/${selectedServer.value.id}/members`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      members.value = data
      isLoading.value = false
    } catch (err) {
      error.value = 'Failed to fetch members from Discord bot.'
      isLoading.value = false
      console.error('Error fetching members:', err)
    }
  }

  async function fetchReports() {
    try {
      // For now, we'll use Supabase for reports since they're stored there
      // In the future, you could add a reports endpoint to your Discord bot API
      const { data, error: supabaseError } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (supabaseError) {
        throw supabaseError
      }

      // Normalize statuses so UI counters work consistently
      const normalizeStatus = (raw) => {
        if (!raw) return 'open'
        const normalized = String(raw).toLowerCase().replace(/[\s-]+/g, '_')
        return ['open', 'in_progress', 'resolved'].includes(normalized)
          ? normalized
          : 'open'
      }

      reports.value = (data || []).map((r) => ({
        ...r,
        status: normalizeStatus(r.status)
      }))
    } catch (err) {
      error.value = 'Failed to fetch reports.'
      console.error('Error fetching reports:', err)
    }
  }

  async function fetchSettings() {
    const { authorizedFetch } = useAuthStore()
    if (!selectedServer.value) return

    try {
      const response = await authorizedFetch(`${API_BASE_URL}/servers/${selectedServer.value.id}/settings`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      settings.value = data
    } catch (err) {
      error.value = 'Failed to fetch settings from Discord bot.'
      console.error('Error fetching sett      ings:', err)
    }
  }

  async function updateReportStatus(reportId, status) {
    try {
      const { error: supabaseError } = await supabase
        .from('reports')
        .update({ status })
        .eq('id', reportId)

      if (supabaseError) {
        throw supabaseError
      }

      // Update local state with normalized value
      const normalized = String(status).toLowerCase().replace(/[\s-]+/g, '_')
      const report = reports.value.find(r => r.id === reportId)
      if (report) {
        report.status = ['open', 'in_progress', 'resolved'].includes(normalized)
          ? normalized
          : 'open'
      }
    } catch (err) {
      error.value = 'Failed to update reports.'
      console.error('Error updating report status:', err)
      throw err
    }
  }

  async function saveSettings(newSettings) {
    const { authorizedFetch } = useAuthStore()
    if (!selectedServer.value) return

    try {
      const response = await authorizedFetch(`${API_BASE_URL}/servers/${selectedServer.value.id}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      settings.value = { ...settings.value, ...newSettings }
      return result
    } catch (err) {
      error.value = 'Failed to save settings to Discord bot.'
      console.error('Error saving settings:', err)
      throw err
    }
  }

  async function fetchMemberActivity(memberId) {
    const { authorizedFetch } = useAuthStore()
    if (!selectedServer.value || !memberId) return []

    try {
      const response = await authorizedFetch(`${API_BASE_URL}/servers/${selectedServer.value.id}/members/${memberId}/activity`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data || []
    } catch (err) {
      console.error('Error fetching member activity:', err)
      return []
    }
  }

  // Function to fetch channel members
  async function fetchChannelMembers(channelId) {
    const { authorizedFetch } = useAuthStore()
    if (!selectedServer.value) return []

    try {
      const response = await authorizedFetch(`${API_BASE_URL}/servers/${selectedServer.value.id}/channels/${channelId}/members`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data || []
    } catch (err) {
      console.error('Error fetching channel members:', err)
      return []
    }
  }

  // Function to fetch channel activity
  async function fetchChannelActivity(channelId) {
    const { authorizedFetch } = useAuthStore()
    if (!selectedServer.value) return []

    try {
      const response = await authorizedFetch(`${API_BASE_URL}/servers/${selectedServer.value.id}/channels/${channelId}/activity`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      return data || []
    } catch (err) {
      console.error('Error fetching channel activity:', err)
      return []
    }
  }

  function setupWebSocket() {
    try {
        websocket.value = new WebSocket('wss://discord-adminbot.onrender.com/ws/status')
        websocket.value.onopen = () => {
        console.log('WebSocket connected')
        isConnected    .value = true
        }
        websocket.value.onmessage = (event    ) => {
        const data = JSON.parse(event.data)
        handleWebSocketMessage(data)
      }

      websocket.value.onclose = () => {
        console.log('WebSocket disconnected')
        isConnected.value = false
        setTimeout(() => {
          if (!isConnected.value) {
            setupWebSocket()
          }
        }, 5000)
      }
      websocket.value.onerror = (error) => {
        console.error('WebSocket error:', error)
        isConnected.value = false
      }
    } catch (error) {
      console.error('Failed to setup WebSocket:', error)
    }
  }

  function handleWebSocketMessage(data) {
    switch (data.type) {
      case 'presence_update':
        { const member = members.value.find(m => m.id === parseInt(data.user_id))
        if (member) {
          member.status = data.status
        }
        break }
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

  function setupRealtimeSubscriptions() {
    setupWebSocket()
  }

  function clearError() {
    error.value = null
  }

  function setSelectedServer(server) {
    selectedServer.value = server
    if (server) {
      fetchMembers()
    }
  }

      return {
      // State
      members,
      reports,
      settings,
      servers,
      selectedServer,
      isLoading,
      error,
      isConnected,

      // Computed
      onlineMembers,
      openReports,
      stats,

      // Actions
      fetchServers,
      fetchMembers,
      fetchReports,
      fetchSettings,
      updateReportStatus,
      saveSettings,
      fetchMemberActivity,
      fetchChannelMembers,
      fetchChannelActivity,
      setupRealtimeSubscriptions,
      disconnectWebSocket,
      clearError,
      setSelectedServer
    }
})
