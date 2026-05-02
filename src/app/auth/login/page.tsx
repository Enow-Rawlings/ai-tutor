"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import Swal from "sweetalert2";
import styles from "../auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Authenticate the user with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Fetch the user's role from Firestore to route them correctly
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        // 3. Route based on role and onboarding status
        if (userData.role === "mentor") {
          router.push("/mentor");
        } else {
          // If learner has a roadmapId, they've finished onboarding.
          // Otherwise, send them to onboarding.
          if (userData.roadmapId) {
            router.push("/dashboard");
          } else {
            router.push("/onboarding");
          }
        }
      } else {
        // Fallback if firestore document is missing
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      Swal.fire({
        title: "Login Failed",
        text: "Invalid email or password. Please try again.",
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
      <h1 className={`${styles.title} animate-slide-up`}>Welcome Back</h1>
      <p className={`${styles.subtitle} animate-slide-up`}>Log in to continue your learning journey.</p>

      <form className={`${styles.form} animate-slide-up`} onSubmit={handleLogin}>
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
          />
        </div>

        <button type="submit" className={styles.submitButton} disabled={loading}>
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>

      <div className={styles.footer}>
        Don't have an account?{" "}
        <Link href="/auth/signup" className={styles.link}>
          Sign up
        </Link>
      </div>
    </div>
  );
}
