export type Mood = 'great' | 'good' | 'neutral' | 'bad' | 'terrible'

export type JournalEntry = {
  id: string
  date: string
  content: string
  mood: Mood
  dailyGoal: string
  lessonLearned: string
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
