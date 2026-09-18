import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { connectTODB } from "@utils/database";
import User from "@models/user";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  // NextAuth callbacks: functions that are called at specific stages during authentication
  callbacks: {
    // The session callback is called whenever a session is checked (e.g., useSession(), getSession())
    async session({ session }) {
      try {
        // Ensure database connection is active before querying
        await connectTODB();

        // Find the user document in MongoDB using the session email
        const sessionUser = await User.findOne({
          email: session.user.email,
        });

        // Safety check: only assign the ID if the user was found in the database.
        // This prevents "Cannot read properties of null (reading '_id')" errors.
        if (sessionUser) {
          session.user.id = sessionUser._id.toString();
        }

        return session;
      } catch (error) {
        console.error("Error in session callback:", error);
        return session;
      }
    },

    // The signIn callback is called after the user successfully authenticates with Google,
    // before the session is created. Returning true allows sign-in; returning false denies access.
    async signIn({ profile }) {
      try {
        // Connect to MongoDB to read or write user data
        await connectTODB();

        // Check if the user already exists in the database by email
        const userExists = await User.findOne({
          email: profile.email,
        });

        // If the user does not exist, create a new user profile in MongoDB
        if (!userExists) {
          // Original code (kept commented out):
          // username: profile.name.replace(" ", "").toLowerCase(),

          // 1. Normalize the name:
          // - Use profile.name, or fallback to the email username if name is missing
          // - normalize("NFD") decomposes accented characters (e.g., "é" becomes "e" + accent mark)
          // - replace(/[\u0300-\u036f]/g, "") strips off the accent marks
          // - replace(/[^a-zA-Z0-9._]/g, "") removes spaces, symbols, and emojis so it matches the schema regex
          // - toLowerCase() ensures uniform lowercase usernames
          let username = (profile.name || profile.email.split("@")[0])
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z0-9._]/g, "")
            .toLowerCase();

          // 2. Length validation to satisfy Mongoose schema rules:
          // If the username is too short (< 3 chars), add a random number fallback (e.g., "user_1234")
          if (username.length < 3) {
            username = `user_${Math.floor(1000 + Math.random() * 9000)}`;
          // If the username is too long (> 20 chars), trim it to 20 chars
          } else if (username.length > 20) {
            username = username.slice(0, 20);
          }

          // 3. Uniqueness check:
          // If another user already has this exact username, append random digits
          // so MongoDB doesn't throw an E11000 duplicate key error
          const existingUserWithUsername = await User.findOne({ username });
          if (existingUserWithUsername) {
            username = `${username.slice(0, 15)}_${Math.floor(1000 + Math.random() * 9000)}`;
          }

          // Save the new user document into the MongoDB collection
          await User.create({
            email: profile.email,
            username: username,
            image: profile.picture,
          });
        }

        // Return true to allow NextAuth to complete the sign-in process
        return true;
      } catch (error) {
        // If an error occurs, log it to the terminal for debugging and return false (denies access)
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
  },
});

export { handler as GET, handler as POST };