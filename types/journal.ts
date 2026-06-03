export type Mood = 'great' | 'good' | 'neutral' | 'bad' | 'terrible'

export type PreSessionChecklist = {
  sleptWell: boolean
  focused: boolean
  reviewedPlan: boolean
  notDistracted: boolean
  acceptedRisk: boolean
}

export type JournalEntry = {
  id: string
  date: string
  content: string
  mood: Mood
  dailyGoal: string
  lessonLearned: string
  preSessionChecklist?: PreSessionChecklist | null
  mentalScore?: number | null
  createdAt: string
  updatedAt: string
}

export type DailyStats = {
  date: string
  trades: number
  pnl: number
  wins: number
  losses: number
  winRate: number
}
