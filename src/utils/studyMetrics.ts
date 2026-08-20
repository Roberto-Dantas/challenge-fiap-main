import { ReviewRecord } from "../types";

export function getDayKey(timestamp: number) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function getTodayReviewCount(history: ReviewRecord[], now = Date.now()) {
  const today = getDayKey(now);
  return history.filter((review) => getDayKey(review.reviewedAt) === today).length;
}

export function getCurrentStreak(history: ReviewRecord[], now = Date.now()) {
  const reviewedDays = new Set(history.map((review) => getDayKey(review.reviewedAt)));
  if (reviewedDays.size === 0) return 0;

  const cursor = new Date(now);
  if (!reviewedDays.has(getDayKey(now))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (reviewedDays.has(getDayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getLongestStreak(history: ReviewRecord[]) {
  const days = [...new Set(history.map((review) => getDayKey(review.reviewedAt)))].sort();
  let longest = 0;
  let current = 0;
  let previous: Date | null = null;

  days.forEach((day) => {
    const date = new Date(day);
    if (previous && date.getTime() - previous.getTime() === 24 * 60 * 60 * 1000) {
      current += 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
    previous = date;
  });

  return longest;
}

export function getReviewAccuracy(history: ReviewRecord[]) {
  if (history.length === 0) return 0;
  return Math.round((history.filter((review) => review.difficulty !== "hard").length / history.length) * 100);
}

export function getRecentActivity(history: ReviewRecord[], days = 7, now = Date.now()) {
  const result = Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (days - index - 1));
    const key = getDayKey(date.getTime());
    return {
      key,
      label: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      count: history.filter((review) => getDayKey(review.reviewedAt) === key).length,
    };
  });
  return result;
}
