"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, collection, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { generateRoadmapAction } from "@/app/actions/gemini";
import Swal from "sweetalert2";
import styles from "./onboarding.module.css";

const PATHS = [
  "Data Analysis", "Data Science", "Python Programming", 
  "JavaScript Development", "Web Development", "AI / Machine Learning",
  "SQL & Databases", "Cybersecurity", "UI/UX Design", 
  "Cloud Computing", "Product Management", "Business Analytics"
];

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

const GOALS = [
  "Career switch", "Job readiness", "Freelancing", 
  "Academic mastery", "Portfolio building"
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedPath, setSelectedPath] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    );
  };

  const handleSubmit = async () => {
    if (!selectedPath || !selectedLevel || selectedGoals.length === 0) return;
    
    setIsGenerating(true);
    
    try {
      // 1. Call the Next.js Server Action to securely communicate with Gemini
      const result = await generateRoadmapAction({ 
        path: selectedPath, 
        level: selectedLevel, 
        goals: selectedGoals 
      });
      
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to generate roadmap.");
      }

      const roadmapData = result.data;
      
      // 2. Ensure user is logged in
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be logged in to save your roadmap.");
      }

      // 3. Save the generated roadmap to Firestore
      const roadmapRef = doc(collection(db, "roadmaps"));
      await setDoc(roadmapRef, {
        ...roadmapData,
        uid: user.uid,
        path: selectedPath,
        level: selectedLevel,
        createdAt: new Date(),
      });

      // 4. Update the user's profile with their new roadmapId and preferences
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        roadmapId: roadmapRef.id,
        selectedPath,
        selectedLevel,
        goals: selectedGoals,
      });
      
      // 5. Success Alert and Redirect
      await Swal.fire({
        title: "Curriculum Ready!",
        text: "Your personalized AI roadmap has been generated successfully.",
        icon: "success",
        confirmButtonColor: "#6366f1",
        background: "#12131c",
        color: "#fff"
      });
      router.push("/dashboard");
      
    } catch (error: any) {
      console.error("Error generating roadmap:", error);
      Swal.fire({
        title: "Generation Failed",
        text: error.message || "Something went wrong generating your roadmap. Please check your API key and try again.",
        icon: "error",
        confirmButtonColor: "#ef4444",
        background: "#12131c",
        color: "#fff"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isFormComplete = selectedPath !== "" && selectedLevel !== "" && selectedGoals.length > 0;

  return (
    <div className={styles.container}>
      <div className={`${styles.header} animate-fade-in`}>
        <h1 className={styles.title}>Design Your Learning Path</h1>
        <p className={styles.subtitle}>
          Tell us what you want to achieve, and our AI will generate a personalized daily curriculum just for you.
        </p>
      </div>

      <div className={`glass-panel ${styles.formCard} animate-slide-up`}>
        
        {/* Path Selection */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>1. What do you want to learn?</h2>
          <div className={styles.grid}>
            {PATHS.map(path => (
              <div 
                key={path}
                className={`${styles.selectableCard} ${selectedPath === path ? styles.selected : ""}`}
                onClick={() => setSelectedPath(path)}
              >
                <span className={styles.cardTitle}>{path}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Level Selection */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>2. What is your current skill level?</h2>
          <div className={styles.grid}>
            {LEVELS.map(level => (
              <div 
                key={level}
                className={`${styles.selectableCard} ${selectedLevel === level ? styles.selected : ""}`}
                onClick={() => setSelectedLevel(level)}
              >
                <span className={styles.cardTitle}>{level}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Goals Selection */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>3. What are your primary goals? (Select multiple)</h2>
          <div className={styles.grid}>
            {GOALS.map(goal => (
              <div 
                key={goal}
                className={`${styles.selectableCard} ${selectedGoals.includes(goal) ? styles.selected : ""}`}
                onClick={() => toggleGoal(goal)}
              >
                <span className={styles.cardTitle}>{goal}</span>
              </div>
            ))}
          </div>
        </div>

        <button 
          className={styles.submitBtn} 
          disabled={!isFormComplete || isGenerating}
          onClick={handleSubmit}
        >
          {isGenerating ? "Building Your AI Curriculum..." : "Generate My Roadmap"}
        </button>
      </div>
    </div>
  );
}
