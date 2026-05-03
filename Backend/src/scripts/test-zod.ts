import { z } from 'zod';

const transactionSchema = z.object({
    description: z.string(),
    amount: z.number(),
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
    category: z.string(),
    paymentMethod: z.string(),
    date: z.string(), // ISO Date string
    isPaid: z.boolean().optional(),
    isRecurrent: z.boolean().optional(),
    recurrenceFrequency: z.string().optional(),
});

const payload = {
    description: "test",
    amount: 100,
    type: "EXPENSE",
    category: "Outros",
    paymentMethod: "PIX",
    date: new Date("2026-05-03").toISOString(),
    isPaid: true,
    isRecurrent: false,
    recurrenceFrequency: "NONE"
};

try {
    const data = transactionSchema.parse(payload);
    console.log("Success:", data);
} catch (err: any) {
    console.error(err.issues);
}
