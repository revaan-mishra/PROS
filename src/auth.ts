import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Credentials({
      credentials: {
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (credentials?.password === process.env.AUTH_SECRET) {
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
