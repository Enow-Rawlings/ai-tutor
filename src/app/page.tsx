import Link from "next/link";
import { ArrowRight, Brain, Target, Flame } from "lucide-react";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.container}>
      {/* Decorative background glow */}
      <div className={styles.backgroundGlow} />

      <section className={styles.hero}>
        <h1 className={`${styles.title} animate-fade-in`}>
          Master Any Skill with your <br />
          <span className="text-gradient">AI Mentor</span>
        </h1>
        
        <p className={`${styles.subtitle} animate-slide-up`}>
          A highly personalized, adaptive learning platform. Generate customized roadmaps, track daily habits, and stay accountable with AI-driven insights.
        </p>

        <div className={`${styles.ctaContainer} animate-slide-up-delayed`}>
          <Link href="/auth/signup" className={styles.primaryButton}>
            Start Learning <ArrowRight size={20} />
          </Link>
          <Link href="/auth/login" className={styles.secondaryButton}>
            Log In
          </Link>
        </div>
      </section>

      <section className={`${styles.features} animate-slide-up-delayed`}>
        <div className={`glass-panel ${styles.featureCard}`}>
          <Brain className={styles.featureIcon} size={32} />
          <h3 className={styles.featureTitle}>Personalized Curriculum</h3>
          <p className={styles.featureDesc}>
            AI-generated roadmaps tailored specifically to your chosen path, skill level, and long-term goals.
          </p>
        </div>

        <div className={`glass-panel ${styles.featureCard}`}>
          <Target className={styles.featureIcon} size={32} />
          <h3 className={styles.featureTitle}>Daily Micro-Lessons</h3>
          <p className={styles.featureDesc}>
            Bite-sized daily content, quizzes, and mini-projects to ensure you consistently make progress without burning out.
          </p>
        </div>

        <div className={`glass-panel ${styles.featureCard}`}>
          <Flame className={styles.featureIcon} size={32} />
          <h3 className={styles.featureTitle}>Streak & Habit Tracking</h3>
          <p className={styles.featureDesc}>
            Build discipline with visual streak tracking and accountability dashboards monitored by mentors.
          </p>
        </div>
      </section>
    </main>
  );
}
