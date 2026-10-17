import { z } from 'zod';

const emailSchema = z.string().trim().email().toLowerCase();
const fullNameSchema = z.string().trim().min(1).max(160);

export const createUserInputSchema = z.object({
  email: emailSchema,
  fullName: fullNameSchema,
  password: z.string().min(12).max(128),
});

export const updateUserInputSchema = z
  .object({
    email: emailSchema,
    fullName: fullNameSchema,
    role: z.enum(['admin', 'user']),
    password: z.string().max(128).optional(),
  })
  .refine((input) => !input.password || input.password.length >= 12, {
    path: ['password'],
    message: 'La contraseña debe tener al menos 12 caracteres.',
  });

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
});

export const recoverPasswordInputSchema = z.object({
  email: emailSchema,
});

export const resetPasswordInputSchema = z.object({
  newPassword: z.string().min(12).max(128),
});
