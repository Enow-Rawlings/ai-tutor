"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, setDoc, updateDoc } from "firebase/firestore";
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

        // For this prototype, we assume we are on Module 1, Day 1
        const dayNumber = 1; 
        const currentModule = rData.modules[0];

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
            topics: currentModule.topics
          });

          if (result.success && result.data) {
            await setDoc(lessonRef, result.data);
            setLessonData(result.data);
          } else {
            console.error(result.error);
          }
          setGenerating(false);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleCompleteLesson = async () => {
    if (!userData || !auth.currentUser) return;
    
    // Update streak logic
    const userRef = doc(db, "users", auth.currentUser.uid);
    const newStreak = (userData.streakCount || 0) + 1;
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

  if (!lessonData) return <div>Failed to load lesson.</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.subtitle}><BookOpen size={20} /> Daily Lesson</span>
        <h1 className={styles.title}>{lessonData.title}</h1>
      </header>

      {/* Lesson Notes */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><BookOpen /> Concept Breakdown</h2>
        <div className={styles.notes} dangerouslySetInnerHTML={{ __html: lessonData.notes.replace(/\n/g, '<br/>') }} />
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
          disabled={lessonData.quiz?.length > 0 && !quizSubmitted}
        >
          <CheckCircle size={24} /> Complete Day & Update Streak
        </button>
      </div>
    </div>
  );
}
