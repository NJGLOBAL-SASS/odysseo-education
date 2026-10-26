import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { verifyAssertionToken } from "@/lib/pending-2fa-token";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      // Permet à un membre déjà créé (email + mot de passe) de se connecter aussi
      // avec Google. Sans danger ici : le callback signIn ci-dessous n'accepte que
      // des adresses déjà enregistrées ET vérifiées par Google.
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        mode: { label: "mode", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
        assertionToken: { label: "assertionToken", type: "text" },
      },
      async authorize(credentials) {
        // Étape finale du flux 2FA : le mot de passe ET le code TOTP ont déjà
        // été vérifiés par /api/auth/2fa/verify, qui a émis ce jeton.
        if (credentials?.mode === "2fa-assertion") {
          const token = credentials.assertionToken as string | undefined;
          if (!token) return null;
          const userId = await verifyAssertionToken(token);
          if (!userId) return null;
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (!user) return null;
          return { id: user.id, email: user.email, name: user.name, role: user.role };
        }

        // Connexion directe (pas de 2FA activée sur le compte).
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Si la 2FA est activée, cette route refuse : le client doit passer
        // par /api/auth/password-check puis /verify-2fa.
        if (user.twoFactorEnabled) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    /**
     * Connexion Google réservée à l'équipe : l'adresse doit déjà exister dans la
     * table users (créée par un administrateur). Un compte Google inconnu est
     * refusé AVANT que l'adapter ne crée quoi que ce soit en base.
     */
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;

      const email = profile?.email?.trim().toLowerCase();
      if (!email || profile?.email_verified !== true) return false;

      const member = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true },
      });
      return Boolean(member);
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "STAFF";
        return token;
      }

      // Revalidation à chaque lecture de session : un membre retiré de l'équipe
      // perd l'accès immédiatement, et un changement de rôle s'applique sans
      // attendre l'expiration du jeton.
      if (token.id) {
        const member = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, name: true },
        });
        if (!member) return null;
        token.role = member.role;
        token.name = member.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "ADMIN" | "STAFF") ?? "STAFF";
      }
      return session;
    },
  },
});
