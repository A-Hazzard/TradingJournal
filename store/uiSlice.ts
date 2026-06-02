import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface UiState {
  sidebarCollapsed: boolean
  toasts: Toast[]
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarCollapsed: false, toasts: [] } as UiState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    addToast(state, action: PayloadAction<{ message: string; type: Toast['type'] }>) {
      state.toasts.push({ id: Date.now().toString(), ...action.payload })
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
  },
})

export const { toggleSidebar, addToast, removeToast } = uiSlice.actions
export default uiSlice.reducer

export const selectSidebarCollapsed = (state: { ui: UiState }) => state.ui.sidebarCollapsed
export const selectToasts = (state: { ui: UiState }) => state.ui.toasts
