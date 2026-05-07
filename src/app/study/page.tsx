"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { BookOpen, CheckCircle, Code, HelpCircle, PenTool } from "lucide-react";
import { auth, db } from "@/lib/firebase/config";
import { generateDailyLessonAction } from "@/app/actions/gemini";
import Swal from "sweetalert2";
import styles from "./study.module.css";

export default function StudyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lessonData, setLessonData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [lessonLocked, setLessonLocked] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  
  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists() || !userSnap.data().roadmapId) {
          router.push("/onboarding");
          return;
        }

        const uData = userSnap.data();
        setUserData(uData);

        // Fetch roadmap
        const roadmapRef = doc(db, "roadmaps", uData.roadmapId);
        const roadmapSnap = await getDoc(roadmapRef);
        
        if (!roadmapSnap.exists()) return;
        const rData = roadmapSnap.data();

        const streak = uData.streakCount || 0;
        const lastActiveValue = uData.lastActiveDate;
        const lastActiveDate = lastActiveValue?.toDate ? lastActiveValue.toDate() : lastActiveValue ? new Date(lastActiveValue) : null;

        let dayNumber = 1;
        let locked = false;
        let unlockText: string | null = null;

        if (!lastActiveDate) {
          dayNumber = Math.max(1, streak + 1);
        } else {
          const elapsedHours = (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60);
          if (elapsedHours >= 24) {
            dayNumber = streak + 1;
          } else {
            dayNumber = Math.max(1, streak);
            if (streak > 0) {
              locked = true;
              const minutesRemaining = Math.ceil(Math.max(0, 24 * 60 - (Date.now() - lastActiveDate.getTime()) / 60000));
              const hoursLeft = Math.floor(minutesRemaining / 60);
              const minsLeft = minutesRemaining % 60;
              unlockText = `Day ${streak + 1} unlocks in ${hoursLeft}h ${minsLeft}m.`;
            }
          }
        }

        if (dayNumber < 1) dayNumber = 1;
        setCurrentDay(dayNumber);
        setLessonLocked(locked);
        setUnlockMessage(unlockText);

        const currentModule = rData.modules[0];

        const previousLessons: Array<{ day: number; title?: string; topics?: string[]; notes?: string }> = [];
        if (dayNumber > 1) {
          const lessonsCollection = collection(db, "roadmaps", uData.roadmapId, "lessons");
          const lessonsSnap = await getDocs(lessonsCollection);
          lessonsSnap.forEach((lessonDoc) => {
            const lessonId = lessonDoc.id;
            const match = lessonId.match(/^day-(\d+)$/);
            if (match) {
              const lessonNumber = Number(match[1]);
              const lessonData = lessonDoc.data();
              previousLessons.push({
                day: lessonNumber,
                title: lessonData.title || "",
                topics: lessonData.topics || [],
                notes: typeof lessonData.notes === "string" ? lessonData.notes : ""
              });
            }
          });
          previousLessons.sort((a, b) => a.day - b.day);
        }

        // Check if lesson already exists in Firestore
        const lessonRef = doc(db, "roadmaps", uData.roadmapId, "lessons", `day-${dayNumber}`);
        const lessonSnap = await getDoc(lessonRef);

        if (lessonSnap.exists()) {
          setLessonData(lessonSnap.data());
          setLoading(false);
        } else {
          // Generate it dynamically
          setGenerating(true);
          const result = await generateDailyLessonAction({
            roadmapTitle: rData.title,
            moduleTitle: currentModule.title,
            dayNumber: dayNumber,
            topics: currentModule.topics,
            previousLessons
          });

          if (result.success && result.data) {
            await setDoc(lessonRef, result.data);
            setLessonData(result.data);
          } else {
            console.error("Study lesson generation failed:", result.error);
            setLoadError(result.error || "Lesson generation failed.");
          }
          setGenerating(false);
          setLoading(false);
        }
      } catch (err: any) {
        console.error(err);
        setLoadError(err.message || "Failed to load lesson.");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, retryKey]);

  const handleRetry = () => {
    setLoadError(null);
    setLoading(true);
    setGenerating(false);
    setRetryKey((prev) => prev + 1);
  };

  const handleCompleteLesson = async () => {
    if (!userData || !auth.currentUser) return;

    if (lessonLocked && userData.streakCount >= currentDay) {
      await Swal.fire({
        title: "Lesson Locked",
        text: "This lesson has already been completed. The next lesson unlocks after 24 hours.",
        icon: "info",
        confirmButtonColor: "#6366f1",
        background: "#12131c",
        color: "#fff"
      });
      return;
    }

    const lastActiveValue = userData.lastActiveDate;
    const lastActiveDate = lastActiveValue?.toDate ? lastActiveValue.toDate() : lastActiveValue ? new Date(lastActiveValue) : null;
    const elapsedHours = lastActiveDate ? (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60) : Infinity;
    const canIncrement = !lastActiveDate || elapsedHours >= 24 || currentDay > (userData.streakCount || 0);

    if (!canIncrement) {
      await Swal.fire({
        title: "Already Completed",
        text: "You have already completed today’s lesson. Please come back after the unlock period.",
        icon: "info",
        confirmButtonColor: "#6366f1",
        background: "#12131c",
        color: "#fff"
      });
      return;
    }

    const userRef = doc(db, "users", auth.currentUser.uid);
    const newStreak = currentDay;
    const newLongest = Math.max(userData.longestStreak || 0, newStreak);

    await updateDoc(userRef, {
      streakCount: newStreak,
      longestStreak: newLongest,
      lastActiveDate: new Date()
    });

    await Swal.fire({
      title: "Lesson Completed!",
      text: "Your streak has increased! 🔥",
      icon: "success",
      confirmButtonColor: "#6366f1",
      background: "#12131c",
      color: "#fff"
    });

    router.push("/dashboard");
  };

  if (loading || generating) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ width: "50px", height: "50px", borderRadius: "50%", border: "4px solid var(--accent-primary)", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
        <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>
          {generating ? "Your AI Mentor is crafting today's lesson..." : "Loading..."}
        </p>
        <style dangerouslySetInnerHTML={{__html: `@keyframes spin { 100% { transform: rotate(360deg); } }`}} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.subtitle}><BookOpen size={20} /> Daily Lesson · Day {currentDay}</span>
          <h1 className={styles.title}>Unable to Load Lesson</h1>
        </div>
        <div style={{ padding: "2rem", background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--bg-surface-border)", color: "var(--text-secondary)" }}>
          <p>{loadError}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1.5rem" }}>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              style={{ padding: "0.9rem 1.25rem", borderRadius: "0.75rem", border: "none", background: "var(--gradient-primary)", color: "white", flex: "1 1 auto" }}
            >
              Back to dashboard
            </button>
            <button
              type="button"
              onClick={handleRetry}
              style={{ padding: "0.9rem 1.25rem", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "white", flex: "1 1 auto" }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!lessonData) return <div>Failed to load lesson.</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.subtitle}><BookOpen size={20} /> Daily Lesson · Day {currentDay}</span>
        <h1 className={styles.title}>{lessonData.title}</h1>
      </header>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem", width: "100%", marginBottom: "1rem" }}>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          style={{
            border: "none",
            background: "var(--bg-surface-border)",
            color: "white",
            padding: "0.75rem 1rem",
            borderRadius: "0.75rem",
            cursor: "pointer"
          }}
        >
          ← Back to dashboard
        </button>
        {unlockMessage && (
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            {unlockMessage}
          </p>
        )}
      </div>

      {/* Lesson Notes */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><BookOpen /> Concept Breakdown</h2>
        <div className={styles.notes} dangerouslySetInnerHTML={{ __html: lessonData.notes }} />
      </section>

      {/* Exercises */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><PenTool /> Practical Exercises</h2>
        {lessonData.exercises?.map((ex: any, idx: number) => (
          <div key={idx} className={styles.exerciseCard}>
            <span className={styles.difficultyBadge}>{ex.difficulty}</span>
            <p>{ex.question}</p>
          </div>
        ))}
      </section>

      {/* Quiz */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><HelpCircle /> Knowledge Check</h2>
        {lessonData.quiz?.map((q: any, qIdx: number) => (
          <div key={qIdx} className={styles.quizCard}>
            <p className={styles.quizQuestion}>{q.question}</p>
            <div>
              {q.options.map((opt: string, optIdx: number) => {
                const isSelected = selectedAnswers[qIdx] === optIdx;
                const isCorrect = optIdx === q.correctAnswerIndex;
                let className = styles.quizOption;
                
                if (quizSubmitted) {
                  if (isCorrect) className += ` ${styles.correct}`;
                  else if (isSelected && !isCorrect) className += ` ${styles.wrong}`;
                } else if (isSelected) {
                  className += ` ${styles.selected}`;
                }

                return (
                  <button 
                    key={optIdx} 
                    className={className}
                    onClick={() => {
                      if (!quizSubmitted) {
                        const newAns = [...selectedAnswers];
                        newAns[qIdx] = optIdx;
                        setSelectedAnswers(newAns);
                      }
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {!quizSubmitted && selectedAnswers[qIdx] !== undefined && (
              <button 
                style={{ marginTop: "1rem", padding: "0.5rem 1rem", background: "var(--bg-surface-border)", borderRadius: "var(--radius-sm)", color: "white" }}
                onClick={() => setQuizSubmitted(true)}
              >
                Check Answer
              </button>
            )}
          </div>
        ))}
      </section>

      {/* Daily Project */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><Code /> Today's Mini-Project</h2>
        <div className={styles.projectBox}>
          <p>{lessonData.project}</p>
        </div>
      </section>

      <div className={styles.completeContainer}>
        <button 
          className={styles.completeButton} 
          onClick={handleCompleteLesson}
          disabled={(lessonData.quiz?.length > 0 && !quizSubmitted) || lessonLocked}
        >
          <CheckCircle size={24} /> {lessonLocked ? "Lesson Completed — Wait for next unlock" : "Complete Day & Update Streak"}
        </button>
      </div>
      {lessonLocked && (
        <p style={{ color: "var(--text-secondary)", marginTop: "1rem", textAlign: "center" }}>
          You’ve completed Day {userData?.streakCount || 1}. Come back after the unlock window to access Day {userData?.streakCount ? userData.streakCount + 1 : 2}.
        </p>
      )}
    </div>
  );
}
