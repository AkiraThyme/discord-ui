<!-- eslint-disable vue/multi-word-component-names -->
<!-- eslint-disable no-unused-vars -->

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useDashboardStore } from '@/stores/dashboard'

const dashboardStore = useDashboardStore()

const isSaving = ref(false)
const saveMessage = ref('')
const showSaveMessage = ref(false)

// Computed properties from store
const settings = computed(() => dashboardStore.settings)
const apiError = computed(() => dashboardStore.error)
const isConnected = computed(() => dashboardStore.isConnected)

// Form data
const formData = ref({
  prefix: '!',
  welcome_message: 'Welcome to the server!',
  log_channel: 'admin-controls',
  auto_role: '',
  auto_mod: false,
  max_warnings: 3,
  mute_duration: 300,
  log_level: 'info'
})

async function fetchSettings() {
  try {
    await dashboardStore.fetchSettings()
    // Update form data with fetched settings
    if (dashboardStore.settings) {
      formData.value = { ...formData.value, ...dashboardStore.settings }
    }
  } catch (error) {
    console.error('Error fetching settings:', error)
  }
}

async function saveSettings() {
  try {
    isSaving.value = true
    await dashboardStore.saveSettings(formData.value)

    saveMessage.value = 'Settings saved successfully!'
    showSaveMessage.value = true

    setTimeout(() => {
      showSaveMessage.value = false
    }, 3000)
  } catch (error) {
    saveMessage.value = 'Failed to save settings. Please try again.'
    showSaveMessage.value = true

    setTimeout(() => {
      showSaveMessage.value = false
    }, 3000)
  } finally {
    isSaving.value = false
  }
}

function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to default values?')) {
    formData.value = {
      prefix: '!',
      welcome_message: 'Welcome to the server!',
      log_channel: 'admin-controls',
      auto_role: '',
      auto_mod: false,
      max_warnings: 3,
      mute_duration: 300,
      log_level: 'info'
    }
  }
}

function clearData() {
  if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
    // This would be implemented to clear data via API
    alert('Data clearing functionality would be implemented here.')
  }
}

onMounted(() => {
  fetchSettings()
  // Setup real-time WebSocket connection
  dashboardStore.setupRealtimeSubscriptions()
})

onUnmounted(() => {
  // Cleanup WebSocket connection
  dashboardStore.disconnectWebSocket()
})
</script>

<template>
  <div class="settings-page">
    <header class="page-header">
      <div>
        <h1>Settings</h1>
        <p class="subtitle">Configure bot and server preferences</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" @click="saveSettings" :disabled="isSaving">
          {{ isSaving ? 'Saving...' : '💾 Save Settings' }}
        </button>
      </div>
    </header>

    <!-- Save Message -->
    <div v-if="showSaveMessage" class="save-message card mb-4" :class="{ 'success': saveMessage.includes('successfully'), 'error': saveMessage.includes('Failed') }">
      <div class="message-content">
        <span class="message-icon">{{ saveMessage.includes('successfully') ? '✅' : '❌' }}</span>
        <span class="message-text">{{ saveMessage }}</span>
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
        <button class="btn btn-secondary" @click="fetchSettings">
          Retry Connection
        </button>
      </div>
    </div>

    <!-- Settings Form -->
    <div class="settings-content">
      <!-- General Settings -->
      <div class="setting-group card mb-4">
        <div class="group-header">
          <h2>General Settings</h2>
          <p>Basic bot configuration</p>
        </div>

        <div class="settings-grid">
          <div class="setting-item">
            <label for="prefix" class="setting-label">Command Prefix</label>
            <input
              id="prefix"
              v-model="formData.prefix"
              type="text"
              class="setting-input"
              placeholder="!"
              maxlength="5"
            />
            <span class="setting-description">The prefix used for bot commands</span>
          </div>

          <div class="setting-item">
            <label for="welcome_message" class="setting-label">Welcome Message</label>
            <textarea
              id="welcome_message"
              v-model="formData.welcome_message"
              class="setting-textarea"
              placeholder="Welcome to the server!"
              rows="3"
            ></textarea>
            <span class="setting-description">Message sent to new members</span>
          </div>

          <div class="setting-item">
            <label for="log_channel" class="setting-label">Log Channel</label>
            <input
              id="log_channel"
              v-model="formData.log_channel"
              type="text"
              class="setting-input"
              placeholder="admin-controls"
            />
            <span class="setting-description">Channel for bot logs and notifications</span>
          </div>

          <div class="setting-item">
            <label for="auto_role" class="setting-label">Auto Role</label>
            <input
              id="auto_role"
              v-model="formData.auto_role"
              type="text"
              class="setting-input"
              placeholder="Member"
            />
            <span class="setting-description">Role automatically assigned to new members</span>
          </div>
        </div>
      </div>

      <!-- Moderation Settings -->
      <div class="setting-group card mb-4">
        <div class="group-header">
          <h2>Moderation Settings</h2>
          <p>Automated moderation configuration</p>
        </div>

        <div class="settings-grid">
          <div class="setting-item">
            <label class="setting-label">
              <input
                v-model="formData.auto_mod"
                type="checkbox"
                class="setting-checkbox"
              />
              Enable Auto Moderation
            </label>
            <span class="setting-description">Automatically moderate messages and content</span>
          </div>

          <div class="setting-item">
            <label for="max_warnings" class="setting-label">Max Warnings</label>
            <input
              id="max_warnings"
              v-model.number="formData.max_warnings"
              type="number"
              class="setting-input"
              min="1"
              max="10"
            />
            <span class="setting-description">Maximum warnings before automatic action</span>
          </div>

          <div class="setting-item">
            <label for="mute_duration" class="setting-label">Default Mute Duration (seconds)</label>
            <input
              id="mute_duration"
              v-model.number="formData.mute_duration"
              type="number"
              class="setting-input"
              min="60"
              max="86400"
            />
            <span class="setting-description">Default duration for mute commands</span>
          </div>

          <div class="setting-item">
            <label for="log_level" class="setting-label">Log Level</label>
            <select id="log_level" v-model="formData.log_level" class="setting-select">
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
            <span class="setting-description">Level of detail in bot logs</span>
          </div>
        </div>
      </div>

      <!-- Connection Status -->
      <div class="setting-group card mb-4">
        <div class="group-header">
          <h2>Connection Status</h2>
          <p>Bot and API connection information</p>
        </div>

        <div class="connection-status">
          <div class="status-item">
            <span class="status-label">Discord Bot:</span>
            <span class="status-value" :class="{ 'connected': !apiError, 'disconnected': apiError }">
              {{ apiError ? 'Disconnected' : 'Connected' }}
            </span>
          </div>
          <div class="status-item">
            <span class="status-label">Real-time Updates:</span>
            <span class="status-value" :class="{ 'connected': isConnected, 'disconnected': !isConnected }">
              {{ isConnected ? 'Active' : 'Inactive' }}
            </span>
          </div>
          <div class="status-item">
            <span class="status-label">API Version:</span>
            <span class="status-value">v1.0.0</span>
          </div>
          <div class="status-item">
            <span class="status-label">Last Updated:</span>
            <span class="status-value">{{ new Date().toLocaleString() }}</span>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="setting-group card danger-zone">
        <div class="group-header">
          <h2>Danger Zone</h2>
          <p>Irreversible actions - use with caution</p>
        </div>

        <div class="danger-actions">
          <div class="danger-item">
            <div class="danger-content">
              <h3>Reset Settings</h3>
              <p>Reset all settings to their default values</p>
            </div>
            <button class="btn btn-warning" @click="resetSettings">
              🔄 Reset Settings
            </button>
          </div>

          <div class="danger-item">
            <div class="danger-content">
              <h3>Clear All Data</h3>
              <p>Permanently delete all stored data and logs</p>
            </div>
            <button class="btn btn-error" @click="clearData">
              🗑️ Clear Data
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings-page {
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

.save-message {
  border-left: 4px solid;

  &.success {
    border-color: var(--success-color);
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));
  }

  &.error {
    border-color: var(--error-color);
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1));
  }

  .message-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .message-icon {
      font-size: 1.2rem;
    }

    .message-text {
      color: var(--text-primary);
      font-weight: 500;
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

.setting-group {
  .group-header {
    margin-bottom: var(--spacing-lg);

    h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }

    p {
      color: var(--text-secondary);
      font-size: 0.875rem;
      margin: 0;
    }
  }
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.setting-item {
  .setting-label {
    display: block;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.5rem;

    &.checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }
  }

  .setting-input,
  .setting-textarea,
  .setting-select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 1rem;
    background: var(--bg-surface);
    transition: var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }
  }

  .setting-textarea {
    resize: vertical;
    min-height: 80px;
  }

  .setting-checkbox {
    width: 1.2rem;
    height: 1.2rem;
    accent-color: var(--primary-color);
  }

  .setting-description {
    display: block;
    color: var(--text-secondary);
    font-size: 0.875rem;
    margin-top: 0.5rem;
    line-height: 1.4;
  }
}

.connection-status {
  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border-color);

    &:last-child {
      border-bottom: none;
    }

    .status-label {
      color: var(--text-secondary);
      font-weight: 500;
    }

    .status-value {
      font-weight: 600;

      &.connected {
        color: var(--success-color);
      }

      &.disconnected {
        color: var(--error-color);
      }
    }
  }
}

.danger-zone {
  border-left: 4px solid var(--error-color);

  .group-header {
    h2 {
      color: var(--error-color);
    }
  }

  .danger-actions {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
  }

  .danger-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-lg);
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-color);

    .danger-content {
      h3 {
        color: var(--text-primary);
        font-size: 1.1rem;
        font-weight: 600;
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

// Responsive adjustments
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }

  .danger-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-md);

    .danger-content {
      width: 100%;
    }
  }
}
</style>
