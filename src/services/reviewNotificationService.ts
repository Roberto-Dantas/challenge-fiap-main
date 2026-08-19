export async function scheduleReviewReminder(
  _subjectTitle: string,
  _topicTitle: string,
  _reviewAt: number,
): Promise<string | undefined> {
  return undefined;
}

export async function cancelReviewReminder(_notificationId?: string): Promise<void> {
  return undefined;
}

export async function getScheduledReviewCount(): Promise<number> {
  return 0;
}