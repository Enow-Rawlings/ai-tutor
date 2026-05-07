"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const [activeDay, setActiveDay] = useState<number>(1);
  const [lessonLocked, setLessonLocked] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);

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
          
          const streak = data.streakCount || 0;
          const lastActiveValue = data.lastActiveDate;
          const lastActiveDate = lastActiveValue?.toDate ? lastActiveValue.toDate() : lastActiveValue ? new Date(lastActiveValue) : null;

          let nextDay = 1;
          let locked = false;
          let unlockText: string | null = null;

          if (!lastActiveDate) {
            nextDay = Math.max(1, streak + 1);
          } else {
            const elapsedHours = (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60);
            if (elapsedHours >= 24) {
              nextDay = streak + 1;
            } else {
              nextDay = Math.max(1, streak);
              if (streak > 0) {
                locked = true;
                const minutesRemaining = Math.ceil(Math.max(0, 24 * 60 - (Date.now() - lastActiveDate.getTime()) / 60000));
                const hoursLeft = Math.floor(minutesRemaining / 60);
                const minsLeft = minutesRemaining % 60;
                unlockText = `Next lesson unlocks in ${hoursLeft}h ${minsLeft}m.`;
              }
            }
          }

          setActiveDay(nextDay);
          setLessonLocked(locked);
          setUnlockMessage(unlockText);

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
              <span className={`${styles.statusBadge} ${lessonLocked ? styles.locked : styles.active}`}>
                Day {activeDay} {lessonLocked ? "Locked" : "Available"}
              </span>
            </div>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
              {lessonLocked
                ? `You’ve completed Day ${userData.streakCount || 1}. Next day unlocks soon.`
                : `You can continue to Day ${activeDay} now. Your AI tutor has prepared today's lesson, exercises, and mini-project.`}
            </p>
            {unlockMessage && (
              <>
                <p style={{ color: "var(--warning)", marginBottom: "1rem" }}>{unlockMessage}</p>
                <div className={styles.unlockBanner}>
                  <strong>Unlock info</strong>
                  <span>{unlockMessage}</span>
                </div>
              </>
            )}
            <button
              type="button"
              className={styles.primaryAction}
              onClick={() => router.push("/study")}
              disabled={lessonLocked}
              style={{ opacity: lessonLocked ? 0.6 : 1, cursor: lessonLocked ? "not-allowed" : "pointer" }}
            >
              {lessonLocked ? "Next lesson locked" : "Start Today's Lesson"}
            </button>
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
