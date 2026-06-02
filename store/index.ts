import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import tradesReducer from './tradesSlice'
import journalReducer from './journalSlice'
import uiReducer from './uiSlice'

export const store = configureStore({
  reducer: {
    trades: tradesReducer,
    journal: journalReducer,
    ui: uiReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector = <T>(selector: (state: RootState) => T) =>
  useSelector<RootState, T>(selector)
