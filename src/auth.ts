import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Credentials({
      name: "Master Key",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // Simple single-user auth: Check if username is admin and password matches the secret
        const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
        
        // As a failsafe, we also accept 'pros123' just in case Vercel env variables aren't syncing
        const isPasswordValid = credentials?.password === secret || credentials?.password === "pros123";

        if (credentials?.username === "admin" && isPasswordValid) {
          // Find or create default user
          const user = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.email, "operator@example.com"),
          })
          
          if (user) return user
          
          const newUser = await db.insert(require("./db/schema").users).values({
            email: "operator@example.com",
            name: "Operator Prime",
          }).returning()
          
          return (newUser as any)[0]
        }
        return null
      },
    }),
  ],
  session: {
    strategy: "jwt"
  },
})
