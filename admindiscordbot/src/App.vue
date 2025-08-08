<!-- eslint-disable no-unused-vars -->
<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const router = useRouter()
const isSidebarOpen = ref(window.innerWidth > 768)
const isDarkMode = ref(true)
const isMobile = ref(false)

onMounted(() => {
  authStore.init()
  // sync from DOM class set in main.js
  isDarkMode.value = document.documentElement.classList.contains('dark-mode')
})


const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value
  document.documentElement.classList.toggle('dark-mode', isDarkMode.value)
  try { localStorage.setItem('theme', isDarkMode.value ? 'dark' : 'light') } catch {
    //
  }
}

const closeSidebarOnMobile = () => {
  if (window.innerWidth <= 768) {
    isSidebarOpen.value = false
  }
}

const navigation = [
  { name: 'Dashboard', path: '/', icon: '📊' },
  { name: 'Members', path: '/members', icon: '👥' },
  { name: 'Reports', path: '/reports', icon: '🚨' },
  { name: 'Settings', path: '/settings', icon: '⚙️' }
]

const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768
  if (isMobile.value) {
    isSidebarOpen.value = false
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', checkScreenSize)
  checkScreenSize()
}
</script>

<template>
  <div v-if="authStore.user" class="app-container" :class="{ 'dark-mode': isDarkMode }">
    <div
      v-if="isSidebarOpen"
      class="mobile-overlay"
      @click="toggleSidebar"
    ></div>

    <aside class="sidebar" :class="{ 'sidebar-closed': !isSidebarOpen }">
      <div class="sidebar-header">
        <h2 class="logo" v-show="isSidebarOpen">Admin Bot</h2>
        <div class="sidebar-controls">
          <button
            class="theme-toggle"
            @click="toggleDarkMode"
            :title="isDarkMode ? 'Light Mode' : 'Dark Mode'"
          >
            {{ isDarkMode ? '☀️' : '🌙' }}
          </button>
          <button
            class="sidebar-toggle"
            @click="toggleSidebar"
            :title="
              isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'
            "
          >
            {{ isSidebarOpen ? '◀' : '▶' }}
          </button>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in navigation"
          :key="item.name"
          :to="item.path"
          class="nav-item"
          active-class="nav-item-active"
          @click="closeSidebarOnMobile"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-text" v-show="isSidebarOpen">{{ item.name }}</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <button class="btn btn-secondary logout-btn" @click="authStore.signOut">
          <span class="nav-icon">🚪</span>
          <span v-show="isSidebarOpen" class="nav-text">Logout</span>
        </button>
      </div>
    </aside>

    <button
      class="mobile-menu-btn"
      @click="toggleSidebar"
      :title="isSidebarOpen ? 'Close Menu' : 'Open Menu'"
    >
      <span class="menu-icon">{{ isSidebarOpen ? '✕' : '☰' }}</span>
    </button>

    <main class="main-content" :class="{ 'main-expanded': !isSidebarOpen }">
      <RouterView />
    </main>
  </div>

  <div v-else class="login-container">
    <div class="login-card card">
      <h1>Welcome to Admin Bot</h1>
      <p>Please log in with Discord to continue.</p>
      <button class="btn btn-primary" @click="authStore.signInWithDiscord">
        <span class="nav-icon">💬</span>
        Login with Discord
      </button>
    </div>
  </div>
</template>

<style lang="scss">

.sidebar {
  display: flex;
  flex-direction: column;
}
.sidebar-nav {
  flex-grow: 1;
}
.sidebar-footer {
  padding: var(--spacing-sm);
  border-top: 1px solid var(--border-color);
}
.logout-btn {
  width: 100%;
  justify-content: flex-start;
  padding: var(--spacing-md);
}
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--bg-tertiary);
}
.login-card {
  text-align: center;
  padding: var(--spacing-2xl);
  max-width: 400px;
}
.login-card h1 {
  margin-bottom: var(--spacing-sm);
}
.login-card p {
  margin-bottom: var(--spacing-lg);
  color: var(--text-secondary);
}
// Modern Color Palette
:root {
  // Light Mode Colors
  --primary-color: #6366f1;
  --primary-hover: #4f46e5;
  --secondary-color: #64748b;
  --accent-color: #8b5cf6;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;

  // Background Colors
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --bg-surface: #ffffff;
  --bg-overlay: rgba(0, 0, 0, 0.5);

  // Text Colors
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --text-inverse: #ffffff;

  // Border Colors
  --border-color: #e2e8f0;
  --border-hover: #cbd5e1;

  // Shadow
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

  // Border Radius
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  // Transitions
  --transition-fast: 150ms ease-in-out;
  --transition-normal: 250ms ease-in-out;
  --transition-slow: 350ms ease-in-out;

  // Spacing
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
}

// Dark Mode Colors
.dark-mode {
  --primary-color: #818cf8;
  --primary-hover: #6366f1;
  --secondary-color: #94a3b8;
  --accent-color: #a78bfa;
  --success-color: #34d399;
  --warning-color: #fbbf24;
  --error-color: #f87171;

  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --bg-surface: #1e293b;
  --bg-overlay: rgba(0, 0, 0, 0.7);

  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #64748b;
  --text-inverse: #0f172a;

  --border-color: #334155;
  --border-hover: #475569;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  transition: var(--transition-normal);
}

.app-container {
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-primary);
  position: relative;
}

// Mobile Overlay
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  z-index: 999;
  backdrop-filter: blur(4px);
}

.sidebar {
  background: var(--bg-surface);
  border-right: 1px solid var(--border-color);
  transition: width var(--transition-normal), transform var(--transition-normal);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: fixed; // Stays fixed on the screen
  z-index: 1000;
  overflow-x: hidden;
}

.sidebar-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
}

// Nav items, buttons, etc. (your existing styles are good)
.sidebar-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.theme-toggle, .sidebar-toggle {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: var(--spacing-sm);
  border-radius: var(--radius-md);
  transition: var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  &:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }
}
.sidebar-nav {
  padding: var(--spacing-md) 0;
  flex-grow: 1;
  overflow-y: auto;
}
.nav-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  text-decoration: none;
  color: var(--text-secondary);
  transition: var(--transition-fast);
  margin: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-md);
  white-space: nowrap;
  &:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }
  &.nav-item-active {
    background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
    color: var(--text-inverse);
    box-shadow: var(--shadow-md);
  }
}
.nav-icon {
  font-size: 1.2rem;
  margin-right: var(--spacing-md);
  min-width: 1.5rem;
  text-align: center;
}
.nav-text {
  font-weight: 500;
}

// Mobile Menu Button
.mobile-overlay {
  display: none; // Hidden by default
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-overlay);
  z-index: 999;
  backdrop-filter: blur(4px);
}

.mobile-menu-btn {
  display: none; // Hidden by default
  position: fixed;
  top: var(--spacing-md);
  left: var(--spacing-md);
  z-index: 1001;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm);
  cursor: pointer;
  box-shadow: var(--shadow-lg);
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  .menu-icon {
    font-size: 1.2rem;
  }
}

// Main Content
.main-content {
  flex: 1;
  padding: var(--spacing-xl);
  transition: margin-left var(--transition-normal);
  background-color: var(--bg-primary);
}

// Global Component Styles
.card {
  background: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  border: 1px solid var(--border-color);
  transition: var(--transition-fast);

  &:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
  }
}

.btn {
  padding: var(--spacing-md) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-fast);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: 0.875rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: var(--transition-normal);
  }

  &:hover::before {
    left: 100%;
  }

  &.btn-primary {
    background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
    color: var(--text-inverse);

    &:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-lg);
    }
  }

  &.btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);

    &:hover {
      background: var(--bg-secondary);
      border-color: var(--border-hover);
    }
  }

  &.btn-success {
    background: linear-gradient(135deg, var(--success-color), #059669);
    color: var(--text-inverse);

    &:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-lg);
    }
  }

  &.btn-warning {
    background: linear-gradient(135deg, var(--warning-color), #d97706);
    color: var(--text-inverse);

    &:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-lg);
    }
  }

  &.btn-error {
    background: linear-gradient(135deg, var(--error-color), #dc2626);
    color: var(--text-inverse);

    &:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-lg);
    }
  }

  &.btn-sm {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 0.75rem;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
}

.status-badge {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-xl);
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  &.status-online {
    background: linear-gradient(135deg, var(--success-color), #059669);
    color: var(--text-inverse);
  }

  &.status-idle {
    background: linear-gradient(135deg, var(--warning-color), #d97706);
    color: var(--text-inverse);
  }

  &.status-dnd {
    background: linear-gradient(135deg, var(--error-color), #dc2626);
    color: var(--text-inverse);
  }

  &.status-offline {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
  }
}

.grid {
  display: grid;
  gap: var(--spacing-md);

  &.grid-2 {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }

  &.grid-3 {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }

  &.grid-4 {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}

.flex {
  display: flex;

  &.flex-col {
    flex-direction: column;
  }

  &.items-center {
    align-items: center;
  }

  &.justify-between {
    justify-content: space-between;
  }

  &.gap-2 {
    gap: var(--spacing-sm);
  }

  &.gap-4 {
    gap: var(--spacing-md);
  }
}

.text-center {
  text-align: center;
}

.mb-4 {
  margin-bottom: var(--spacing-md);
}

.mt-4 {
  margin-top: var(--spacing-md);
}

// Responsive Design
@media (max-width: 768px) {
  .sidebar {
    width: 280px;
    transform: translateX(-100%); // Starts off-screen

    // When sidebar is open on mobile
    &.sidebar-closed {
       transform: translateX(-100%); // Stays off-screen
    }
    &:not(.sidebar-closed) {
       transform: translateX(0); // Slides in
    }
  }

  // Hide the desktop sidebar toggle
  .sidebar-toggle {
    display: none;
  }

  .main-content {
    margin-left: 0 !important; // No margin on mobile
    padding: var(--spacing-lg);
  }

  .mobile-menu-btn {
    display: flex; // Show the hamburger menu
  }

  .mobile-overlay {
    display: block; // Show overlay when sidebar is open
  }
}

@media (min-width: 769px) {
  .sidebar {
    width: 280px;
    transform: translateX(0); // Always visible

    &.sidebar-closed {
      width: 80px; // Collapsed width
    }
  }

  .main-content {
    margin-left: 280px; // Default margin for open sidebar

    &.main-expanded {
      margin-left: 80px; // Margin for collapsed sidebar
    }
  }
}

// Scrollbar Styling
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: var(--radius-sm);

  &:hover {
    background: var(--border-hover);
  }
}

// Focus Styles
*:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

// Animation Classes
.fade-enter-active,
.fade-leave-active {
  transition: var(--transition-normal);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.slide-enter-active,
.slide-leave-active {
  transition: var(--transition-normal);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
