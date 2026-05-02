"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import Swal from "sweetalert2";
import styles from "../auth.module.css";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("learner");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Store additional user profile data in Firestore
      // We use the same UID for the document ID so it's easy to query
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: role,
        createdAt: new Date(),
        // Default fields for learners
        streakCount: 0,
        longestStreak: 0,
      });

      // 3. Redirect to the onboarding flow where they select their learning path
      if (role === "learner") {
        router.push("/onboarding");
      } else {
        router.push("/mentor");
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      Swal.fire({
        title: "Signup Failed",
        text: err.message || "Failed to create an account. Please try again.",
        icon: "error",
        confirmButtonColor: "#ef4444",
        background: "#12131c",
        color: "#fff"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className={`${styles.title} animate-slide-up`}>Create an Account</h1>
      <p className={`${styles.subtitle} animate-slide-up`}>Begin your personalized learning journey today.</p>

      <form className={`${styles.form} animate-slide-up`} onSubmit={handleSignup}>
        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            minLength={6}
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label} htmlFor="role">I am a...</label>
          <select 
            id="role" 
            className={styles.input}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="learner">Learner</option>
            <option value="mentor">Mentor / Admin</option>
          </select>
        </div>

        <button type="submit" className={styles.submitButton} disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <div className={styles.footer}>
        Already have an account?{" "}
        <Link href="/auth/login" className={styles.link}>
          Log in
        </Link>
      </div>
    </div>
  );
}
