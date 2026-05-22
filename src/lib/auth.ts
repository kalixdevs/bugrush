import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";
import { generateUniqueHandle } from "./handle";

function expandWww(url: string): string[] {
  try {
    const u = new URL(url);
    const host = u.host;
    if (host.startsWith("www.")) {
      return [url, `${u.protocol}//${host.slice(4)}`];
    }
    return [url, `${u.protocol}//www.${host}`];
  } catch {
    return [url];
  }
}

const baseUrl = process.env.BETTER_AUTH_URL;
const trustedOrigins = [
  ...(baseUrl ? expandWww(baseUrl) : []),
  "http://localhost:3000",
];

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins,
  advanced: {
    cookies: {
      session_token: {
        attributes: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        },
      },
    },
  },
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
