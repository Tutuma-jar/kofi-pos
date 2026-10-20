import { z } from 'zod';

export const dashboardParamsSchema = z.strictObject({
  period: z.enum(['today', 'month']),
});
export const noDashboardInputSchema = z.strictObject({});
