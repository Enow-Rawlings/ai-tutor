"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Flame, BookOpen, Target, Clock } from "lucide-react";
import { auth, db } from "@/lib/firebase/config";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [roadmap, setRoadmap] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      try {
        // Fetch User Data
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserData(data);
          
          if (!data.roadmapId) {
            router.push("/onboarding");
            return;
          }

          // Fetch Roadmap Data
          const roadmapDocRef = doc(db, "roadmaps", data.roadmapId);
          const roadmapDocSnap = await getDoc(roadmapDocRef);
          
          if (roadmapDocSnap.exists()) {
            setRoadmap(roadmapDocSnap.data());
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className={styles.loader}>
        <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid var(--accent-primary)", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
        <p>Loading your curriculum...</p>
      </div>
    );
  }

  if (!userData || !roadmap) {
    return <div className={styles.loader}>Failed to load dashboard.</div>;
  }

  return (
    <div className={styles.container}>
      <header className={`${styles.header} animate-fade-in`}>
        <div>
          <h1 className={styles.greeting}>Welcome back, {userData.email?.split("@")[0]}</h1>
          <p className={styles.subGreeting}>Continue mastering {userData.selectedPath}.</p>
        </div>
        <div className={styles.streakBadge}>
          <Flame size={24} />
          <span>{userData.streakCount || 0} Day Streak</span>
        </div>
      </header>

      <div className={`${styles.mainGrid} animate-slide-up`}>
        {/* Left Column: Today's Focus & Progress */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div className={`glass-panel ${styles.card}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}><Target className="text-accent" /> Today's Focus</h2>
              <span className={styles.statusBadge} style={{ background: "var(--bg-surface-border)" }}>Day 1</span>
            </div>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
              Ready to learn? Your AI tutor has prepared today's lesson, exercises, and mini-project based on your roadmap.
            </p>
            <Link href="/study" className={styles.primaryAction}>
              Start Today's Lesson
            </Link>
          </div>

          <div className={`glass-panel ${styles.card}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}><BookOpen /> Your Curriculum Roadmap</h2>
            </div>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              {roadmap.description}
            </p>
            
            <div className={styles.moduleList}>
              {roadmap.modules?.map((module: any, index: number) => (
                <div key={module.id || index} className={styles.moduleItem}>
                  <div className={styles.moduleInfo}>
                    <h4>{index + 1}. {module.title}</h4>
                    <p style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Clock size={14} /> {module.estimatedDays} Days
                    </p>
                  </div>
                  {/* For prototyping, we assume module 1 is active, rest are locked */}
                  <div className={`${styles.statusBadge} ${index === 0 ? styles.active : styles.locked}`}>
                    {index === 0 ? "In Progress" : "Locked"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Stats & Habits */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div className={`glass-panel ${styles.card}`}>
            <h2 className={styles.cardTitle} style={{ marginBottom: "1rem" }}>Habit Tracker</h2>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Current Streak</span>
              <strong style={{ fontSize: "1.25rem", color: "var(--warning)" }}>{userData.streakCount || 0} 🔥</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Longest Streak</span>
              <strong style={{ fontSize: "1.25rem" }}>{userData.longestStreak || 0}</strong>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick inline animation for the spinner */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
