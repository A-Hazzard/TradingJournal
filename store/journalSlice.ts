import { createSlice, createSelector, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { JournalEntry } from '@/types/journal'

// ── Async Thunks ───────────────────────────────────────────────────────────

export const fetchJournalEntries = createAsyncThunk<JournalEntry[], void>(
  'journal/fetchAll',
  async () => {
    const response = await fetch('/api/journal')
    if (!response.ok) throw new Error('Failed to fetch journal entries')
    return response.json() as Promise<JournalEntry[]>
  }
)

export const upsertJournalEntry = createAsyncThunk<
  JournalEntry,
  Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>
>('journal/upsert', async (entryData) => {
  const response = await fetch('/api/journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entryData),
  })
  if (!response.ok) throw new Error('Failed to save journal entry')
  return response.json() as Promise<JournalEntry>
})

export const deleteJournalEntry = createAsyncThunk<string, string>(
  'journal/delete',
  async (id) => {
    const response = await fetch(`/api/journal/${id}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Failed to delete journal entry')
    return id
  }
)

// ── State ──────────────────────────────────────────────────────────────────

type LoadingState = 'idle' | 'loading' | 'succeeded' | 'failed'

type JournalState = {
  entries: JournalEntry[]
  selectedDate: string
  status: LoadingState
  error: string | null
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

const initialState: JournalState = {
  entries: [],
  selectedDate: today(),
  status: 'idle',
  error: null,
}

// ── Slice ──────────────────────────────────────────────────────────────────

const journalSlice = createSlice({
  name: 'journal',
  initialState,
  reducers: {
    setSelectedDate(state, action: PayloadAction<string>) {
      state.selectedDate = action.payload
    },
  },
  extraReducers(builder) {
    builder
      // fetchJournalEntries
      .addCase(fetchJournalEntries.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchJournalEntries.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.entries = action.payload
      })
      .addCase(fetchJournalEntries.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Failed to load journal'
      })
      // upsertJournalEntry
      .addCase(upsertJournalEntry.fulfilled, (state, action) => {
        const idx = state.entries.findIndex((entry) => entry.date === action.payload.date)
        if (idx >= 0) {
          state.entries[idx] = action.payload
        } else {
          state.entries.unshift(action.payload)
        }
      })
      // deleteJournalEntry
      .addCase(deleteJournalEntry.fulfilled, (state, action) => {
        state.entries = state.entries.filter((entry) => entry.id !== action.payload)
      })
  },
})

export const { setSelectedDate } = journalSlice.actions
export default journalSlice.reducer

// ── Selectors ──────────────────────────────────────────────────────────────

export const selectAllEntries = (state: { journal: JournalState }) => state.journal.entries
export const selectSelectedDate = (state: { journal: JournalState }) => state.journal.selectedDate
export const selectJournalStatus = (state: { journal: JournalState }) => state.journal.status

export const selectEntryByDate = (date: string) =>
  createSelector([selectAllEntries], (entries) => entries.find((entry) => entry.date === date))
