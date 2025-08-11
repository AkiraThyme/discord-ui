<!-- eslint-disable no-unused-vars -->
<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useDashboardStore } from '@/stores/dashboard'

const dashboardStore = useDashboardStore()

const isLoading = ref(true)
const selectedReport = ref(null)
const showReportModal = ref(false)
const statusFilter = ref('all')
const searchQuery = ref('')
const memberFilter = ref('all')
const reporterFilter = ref('all');
const members = computed(() => dashboardStore.members)

// Computed properties from store
const reports = computed(() => dashboardStore.reports)
const apiError = computed(() => dashboardStore.error)
const isConnected = computed(() => dashboardStore.isConnected)

const reportedUsers = computed(() => {
  const users = reports.value.map(r => r.reported_user).filter(Boolean);
  return [...new Set(users)];
});

const reporters = computed(() => {
  const users = reports.value.map(r => r.reporter_name).filter(Boolean);
  return [...new Set(users)];
});

const filteredReports = computed(() => {
  let filtered = reports.value

  // Filter by search query
  if (searchQuery.value) {
    filtered = filtered.filter(report =>
      report.reported_user.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      report.reporter_name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      report.reason.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  // Filter by status
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(report => report.status === statusFilter.value)
  }

  // Filter by member
  if (memberFilter.value !== 'all') {
    filtered = filtered.filter(report => report.reported_user?.toLowerCase() === memberFilter.value.toLowerCase())
  }

  if (reporterFilter.value !== 'all') {
    filtered = filtered.filter(report => report.reporter_name === reporterFilter.value);
  }

  return filtered
})

const statusCounts = computed(() => {
  const counts = { open: 0, in_progress: 0, resolved: 0 }
  reports.value.forEach(report => {
    counts[report.status] = (counts[report.status] || 0) + 1
  })
  return counts
})

async function fetchReports() {
  try {
    isLoading.value = true
    await dashboardStore.fetchReports()
    isLoading.value = false
  } catch (error) {
    console.error('Error fetching reports:', error)
    isLoading.value = false
  }
}

async function updateReportStatus(reportId, status) {
  try {
    await dashboardStore.updateReportStatus(reportId, status)
  } catch (error) {
    console.error('Error updating report status:', error)
  }
}

function viewReportDetails(report) {
  selectedReport.value = report
  showReportModal.value = true
}

function closeReportModal() {
  showReportModal.value = false
  selectedReport.value = null
}

function getStatusColor(status) {
  const colors = {
    open: 'var(--warning-color)',
    in_progress: 'var(--primary-color)',
    resolved: 'var(--success-color)'
  }
  return colors[status] || colors.open
}

function getStatusIcon(status) {
  const icons = {
    open: '🚨',
    in_progress: '⏳',
    resolved: '✅'
  }
  return icons[status] || icons.open
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown'
  const date = new Date(timestamp)
  return date.toLocaleString()
}

onMounted(() => {
  fetchReports()
  // Setup real-time WebSocket connection
  dashboardStore.setupRealtimeSubscriptions()
})

onUnmounted(() => {
  // Cleanup WebSocket connection
  dashboardStore.disconnectWebSocket()
})

onUnmounted(() => {
  // Cleanup if needed
})
</script>

<template>
  <div class="reports-page">
    <header class="page-header">
      <div>
        <h1>Reports</h1>
        <p class="subtitle">Manage user reports and moderation actions</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" @click="fetchReports" :disabled="isLoading">
          🔄 Refresh
        </button>
      </div>
    </header>



    <!-- API Error Display -->
    <div v-if="apiError" class="error-notice card mb-4">
      <div class="error-header">
        <span class="error-icon">⚠️</span>
        <h4>Connection Error</h4>
      </div>
      <p>{{ apiError }}</p>
      <div class="error-actions">
        <button class="btn btn-secondary" @click="fetchReports">
          Retry Connection
        </button>
      </div>
    </div>

    <!-- Status Overview -->
    <div class="status-overview grid grid-3 mb-4">
      <div class="status-card open glass">
        <div class="status-icon">🚨</div>
        <div class="status-info">
          <h3>{{ statusCounts.open }}</h3>
          <p>Open Reports</p>
        </div>
      </div>
      <div class="status-card in-progress glass">
        <div class="status-icon">⏳</div>
        <div class="status-info">
          <h3>{{ statusCounts.in_progress }}</h3>
          <p>In Progress</p>
        </div>
      </div>
      <div class="status-card resolved glass">
        <div class="status-icon">✅</div>
        <div class="status-info">
          <h3>{{ statusCounts.resolved }}</h3>
          <p>Resolved</p>
        </div>
      </div>
    </div>

    <!-- Toolbar / Filters -->
    <div class="filters toolbar glass mb-4">
      <div class="toolbar-row">
        <div class="search-box input-with-icon">
          <span class="leading-icon">🔎</span>
          <input v-model="searchQuery" type="text" placeholder="Search reports, users, or reasons..."
            class="search-input" />
        </div>
        <div class="toolbar-controls">
          <div class="status-filter">
            <select v-model="statusFilter" class="filter-select">
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <div class="member-filter">
            <select v-model="memberFilter" class="filter-select">
              <option value="all">All Members</option>
              <option v-for="user in reportedUsers" :key="user" :value="user">
                {{ user }}
              </option>
            </select>
          </div>
          <div class="reporter-filter">
            <select v-model="reporterFilter" class="filter-select">
              <option value="all">All Reporters</option>
              <option v-for="user in reporters" :key="user" :value="user">
                {{ user }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Reports List -->
    <div class="reports-list">
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading reports...</p>
      </div>

      <div v-else-if="reports.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No Reports Found</h3>
        <p>No reports have been filed yet.</p>
      </div>

      <div v-else-if="filteredReports.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No Reports Match Your Search</h3>
        <p>Try adjusting your search criteria or status filter.</p>
      </div>

      <div v-else class="modern-reports-grid">
        <div v-for="report in filteredReports" :key="report.id"
          :class="['modern-report-card', `is-${report.status}`]" @click="viewReportDetails(report)">
          <div class="modern-report-header">
            <span class="modern-status-badge" :class="`status-${report.status}`">
              {{ getStatusIcon(report.status) }} {{ report.status.replace('_', ' ').toUpperCase() }}
            </span>
            <span v-if="report.category" class="modern-category-badge">{{ report.category }}</span>
          </div>
          <div class="modern-report-content">
            <div class="modern-report-title">Report against <b>{{ report.reported_user }}</b></div>
            <div class="modern-report-reason">{{ report.reason }}</div>
          </div>
          <div class="modern-report-meta">
            <span>By <b>{{ report.reporter_name }}</b></span>
            <span class="modern-report-date">{{ formatTimestamp(report.created_at) }}</span>
          </div>
          <div class="modern-report-actions">
            <button class="btn btn-secondary btn-sm ghost">View Details</button>
            <button v-if="report.status === 'open'" class="btn btn-warning btn-sm"
              @click.stop="updateReportStatus(report.id, 'in_progress')">Mark In Progress</button>
            <button v-if="report.status !== 'resolved'" class="btn btn-success btn-sm"
              @click.stop="updateReportStatus(report.id, 'resolved')">Resolve</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Report Details Modal -->
    <div v-if="showReportModal" class="modal-overlay" @click="closeReportModal">
      <div class="modal-content glass" @click.stop>
        <div class="modal-header">
          <h2>Report Details</h2>
          <button class="modal-close" @click="closeReportModal">×</button>
        </div>
        <div class="modal-body">
          <div v-if="selectedReport" class="report-details">
            <div class="detail-section">
              <h3>Report Information</h3>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                  <span class="status-badge" :class="`status-${selectedReport.status}`">
                    {{ getStatusIcon(selectedReport.status) }} {{ selectedReport.status }}
                  </span>
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Category:</span>
                <span class="detail-value">{{ selectedReport.category || 'Not specified' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Reported User:</span>
                <span class="detail-value">{{ selectedReport.reported_user }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Reporter:</span>
                <span class="detail-value">{{ selectedReport.reporter_name }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Filed:</span>
                <span class="detail-value">{{ formatTimestamp(selectedReport.created_at) }}</span>
              </div>
            </div>

            <div class="detail-section">
              <h3>Reason</h3>
              <p class="report-reason-full">{{ selectedReport.reason }}</p>
            </div>

            <div class="detail-section">
              <h3>Actions</h3>
              <div class="action-buttons">
                <button v-if="selectedReport.status === 'open'" class="btn btn-warning"
                  @click="updateReportStatus(selectedReport.id, 'in_progress')">
                  ⏳ Mark In Progress
                </button>
                <button v-if="selectedReport.status !== 'resolved'" class="btn btn-success"
                  @click="updateReportStatus(selectedReport.id, 'resolved')">
                  ✅ Resolve Report
                </button>
                <button class="btn btn-error">
                  🚫 Ban User
                </button>
                <button class="btn btn-secondary">
                  ⚠️ Warn User
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>

.modern-reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}
.modern-report-card {
  background: var(--bg-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  border: 1.5px solid var(--border-color);
  padding: 2rem 1.5rem 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  transition: box-shadow 0.2s, border-color 0.2s, transform 0.15s;
  cursor: pointer;
  position: relative;
  min-height: 260px;
}
.modern-report-card:hover {
  box-shadow: 0 8px 32px 0 rgba(99,102,241,0.15);
  border-color: var(--primary-color);
  transform: translateY(-2px) scale(1.01);
}
.modern-report-card.is-open {
  border-top: 4px solid var(--warning-color);
}
.modern-report-card.is-in_progress {
  border-top: 4px solid var(--primary-color);
}
.modern-report-card.is-resolved {
  border-top: 4px solid var(--success-color);
}
.modern-report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.modern-status-badge {
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.35em 1em;
  border-radius: 1.5em;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  border: none;
}
.modern-status-badge.status-open {
  background: linear-gradient(90deg, var(--warning-color), #fbbf24);
  color: #fff;
}
.modern-status-badge.status-in_progress {
  background: linear-gradient(90deg, var(--primary-color), var(--primary-hover));
  color: #fff;
}
.modern-status-badge.status-resolved {
  background: linear-gradient(90deg, var(--success-color), #059669);
  color: #fff;
}
.modern-category-badge {
  background: var(--accent-color);
  color: #fff;
  font-size: 0.8rem;
  padding: 0.25em 0.7em;
  border-radius: 1em;
  font-weight: 500;
  margin-left: 0.5em;
}
.modern-report-content {
  flex: 1;
}
.modern-report-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.3em;
}
.modern-report-reason {
  color: var(--text-secondary);
  font-size: 0.98rem;
  line-height: 1.5;
  margin-bottom: 0.2em;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.modern-report-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.93rem;
  color: var(--text-muted);
  margin-bottom: 0.2em;
}
.modern-report-date {
  font-size: 0.92rem;
  color: var(--text-secondary);
}
.modern-report-actions {
  display: flex;
  gap: 0.7rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.reports-page {
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
    padding: 1.25rem 1.5rem;
    border-radius: var(--radius-lg);
    background: var(--bg-surface);
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-color);

    .status-icon {
      font-size: 1.25rem;
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

.toolbar {
  border: 1px solid var(--border-color);
  padding: 1rem;
  border-radius: var(--radius-lg);
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
    color: var(--text-primary);

    &:focus {
      outline: none;
      border-color: var(--primary-color);
    }
  }
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

.report-card {
  cursor: pointer;
  transition: var(--transition-fast);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
}

.report-card.is-open {
  border-top: 3px solid var(--warning-color);
}

.report-card.is-in_progress {
  border-top: 3px solid var(--primary-color);
}

.report-card.is-resolved {
  border-top: 3px solid var(--success-color);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.report-status {
  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: var(--radius-xl);
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;

    &.status-open {
      background: linear-gradient(135deg, var(--warning-color), #d97706);
      color: var(--text-inverse);
    }

    &.status-in_progress {
      background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
      color: var(--text-inverse);
    }

    &.status-resolved {
      background: linear-gradient(135deg, var(--success-color), #059669);
      color: var(--text-inverse);
    }
  }
}

.report-category {
  .category-badge {
    padding: 0.25rem 0.5rem;
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
  }
}

.chip {
  border: 1px solid var(--border-color);
  background: linear-gradient(135deg, var(--bg-secondary), var(--bg-surface));
}

.report-content {
  margin-bottom: 1rem;

  .report-title {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .report-reason {
    color: var(--text-secondary);
    font-size: 0.875rem;
    line-height: 1.4;
    margin: 0;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

.report-meta {
  margin-bottom: 1rem;

  .meta-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;

    .meta-label {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .meta-value {
      color: var(--text-primary);
      font-size: 0.875rem;
      font-weight: 500;
    }
  }
}

.report-actions {
  display: flex;
  gap: 0.5rem;

  .btn-sm {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
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
    margin-bottom: 0;
    font-size: 1.1rem;
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
  max-width: 700px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid var(--border-color);
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

.report-details {
  .detail-section {
    margin-bottom: var(--spacing-xl);

    h3 {
      color: var(--text-primary);
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: var(--spacing-md);
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border-color);
    }
  }

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

  .report-reason-full {
    color: var(--text-primary);
    line-height: 1.6;
    background: var(--bg-secondary);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    border-left: 4px solid var(--primary-color);
  }

  .action-buttons {
    display: flex;
    gap: var(--spacing-md);
    flex-wrap: wrap;
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
@media (max-width: 900px) {
  .modern-reports-grid {
    grid-template-columns: 1fr;
    gap: 1.2rem;
  }
  .modern-report-card {
    padding: 1.2rem 0.8rem 1rem 0.8rem;
    min-height: 180px;
    font-size: 0.98rem;
  }
  .modern-report-title {
    font-size: 1rem;
  }
  .modern-report-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2em;
    font-size: 0.9rem;
  }
  .modern-report-actions {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }
  .modal-content {
    max-width: 98vw;
    width: 98vw;
    padding: 0.5rem;
  }
  .modal-header, .modal-body {
    padding: 1rem;
  }
  .toolbar-row {
    flex-direction: column;
    gap: 0.7rem;
    align-items: stretch;
  }
  .toolbar-controls {
    flex-direction: column;
    gap: 0.7rem;
    align-items: stretch;
  }
  .filters {
    padding: 0.7rem;
    .search-input {
      width: 100%;
      font-size: 0.98rem;
      padding: 0.6rem 0.8rem;
    }
    .filter-select {
      font-size: 0.98rem;
      padding: 0.6rem 0.8rem;
    }
  }
  .status-overview {
    grid-template-columns: 1fr !important;
    .status-card {
      flex-direction: row;
      align-items: center;
      gap: 0.7rem;
      padding: 1rem 0.7rem;
      font-size: 1rem;
      justify-content: flex-start;
    }
  }
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
}

@media (max-width: 900px) {
  .modern-reports-grid {
    grid-template-columns: 1fr;
    gap: 0.7rem;
  }
  .modern-report-card {
    padding: 0.7rem 0.3rem 0.7rem 0.3rem;
    min-height: 120px;
    font-size: 0.93rem;
    border-radius: var(--radius-md);
  }
  .modern-report-title {
    font-size: 0.98rem;
  }
  .modern-status-badge, .modern-category-badge {
    font-size: 0.7rem;
    padding: 0.18em 0.5em;
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
  .toolbar-row, .toolbar-controls {
    gap: 0.4rem;
  }
  .filters {
    padding: 0.4rem;
    .search-input {
      font-size: 0.93rem;
      padding: 0.5rem 0.6rem;
    }
    .filter-select {
      font-size: 0.93rem;
      padding: 0.5rem 0.6rem;
    }
  }
  // .status-overview {
  //   grid-template-columns: 1fr !important;
  //   .status-card {
  //     flex-direction: column;
  //     align-items: flex-start;
  //     gap: 0.3rem;
  //     padding: 0.7rem 0.3rem;
  //     font-size: 0.93rem;
  //   }
  // }
  .page-header h1 {
    font-size: 1.3rem;
  }
}

@media (max-width: 600px) {
  .reports-page {
    padding: 0 !important;
  }

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

  .status-overview {
    grid-template-columns: 1fr !important;
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

  .modern-reports-grid {
    grid-template-columns: 1fr;
    gap: 0.7rem;
    margin-bottom: 1rem;
  }

  .modern-report-card {
    padding: 0.7rem 0.3rem;
    min-height: 110px;
    font-size: 0.93rem;
    border-radius: var(--radius-md);
    gap: 0.7rem;
  }

  .modern-report-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3rem;
  }

  .modern-report-title {
    font-size: 0.98rem;
  }

  .modern-status-badge, .modern-category-badge {
    font-size: 0.7rem;
    padding: 0.18em 0.5em;
  }

  .modern-report-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2em;
    font-size: 0.9rem;
  }

  .modern-report-actions {
    flex-direction: column;
    gap: 0.4rem;
    align-items: stretch;
    margin-top: 0.3rem;
    button {
      width: 100%;
    }
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
}
</style>
