import { http, HttpResponse } from 'msw';

export const mockNotificationSettings = {
  email: 'frontend.test@example.com',
  weeklyDigestEnabled: true,
  deliveryDay: 'sunday',
  deliveryTime: '09:00',
  habitMilestonesEnabled: true,
  emotionalAlertsEnabled: true,
  webhookUrl: 'https://hooks.slack.com/services/T00/B00/X1',
  webhookEnabled: true,
  deliveryHistory: [],
};

export const mockJournals = [
  {
    id: 'journal_1',
    userId: 'user_123',
    title: 'Morning Meditation',
    content: 'Felt calm and present.',
    mood: 'peaceful',
    tags: ['meditation', 'morning'],
    createdAt: 1717000000000,
    updatedAt: 1717000000000,
    conversation: [],
    insights: null,
    location: null,
    pinned: false,
  },
];

export const handlers = [
  http.get('/api/journals', ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const authHeader = request.headers.get('Authorization');

    if (authHeader === 'Bearer invalid_token') {
      return HttpResponse.json({ status: 'error', detail: 'Unauthorized' }, { status: 401 });
    }

    return HttpResponse.json({
      status: 'success',
      userId,
      entries: mockJournals,
      count: mockJournals.length,
    });
  }),

  http.get('/api/notifications/settings', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    if (authHeader === 'Bearer invalid_token') {
      return HttpResponse.json({ detail: 'Unauthorized token.' }, { status: 401 });
    }
    return HttpResponse.json({
      status: 'success',
      settings: mockNotificationSettings,
    });
  }),

  http.post('/api/notifications/settings', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      status: 'success',
      settings: { ...mockNotificationSettings, ...(body as any) },
    });
  }),

  http.post('/api/notifications/weekly-summary/send', () => {
    return HttpResponse.json({
      message: 'Weekly digest dispatched successfully.',
      deliveryRecord: {
        id: 'del_123',
        timestamp: Date.now(),
        recipientEmail: 'frontend.test@example.com',
        subject: 'Weekly Review',
        status: 'delivered',
        provider: 'in_app_dispatch',
        summarySnippet: 'Great mindfulness progress!',
      },
      digest: {
        timeframe: 'Last 7 Days',
        generatedAt: Date.now(),
        recipientEmail: 'frontend.test@example.com',
        modelUsed: 'gemini-3.6-flash',
        summary: {
          executiveSummary: 'Strong consistency in breathwork.',
          habitScore: 92,
          habitsAnalyzed: 3,
          topHabitStreak: { title: 'Breathwork', streak: 12, emoji: '🧘' },
          habitsCompletionRate: 88,
          emotionalValence: 'Positive',
          keyThemes: ['mindfulness', 'clarity'],
          actionItems: ['Keep up the morning routine'],
          inspirationQuote: 'Peace comes from within.',
        },
        htmlEmail: '<p>Weekly Review</p>',
      },
    });
  }),
];
