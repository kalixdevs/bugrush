import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";
import { generateUniqueHandle } from "./handle";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            const seed = user.name || user.email.split("@")[0] || "player";
            const handle = await generateUniqueHandle(seed, prisma);
            await prisma.user.update({
              where: { id: user.id },
              data: { handle },
            });
          } catch {
            // Never block signup on handle generation.
          }
        },
      },
    },
  },
});
