import styles from "./layout.module.css";
import Link from "next/link";
import { Brain } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.container}>
      <div className={styles.leftPane}>
        {/* Simple navigation back home */}
        <div style={{ position: "absolute", top: "2rem", left: "2rem" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "bold" }}>
            <Brain color="var(--accent-primary)" />
            <span>AI Mentor</span>
          </Link>
        </div>
        
        <div className={styles.formContainer}>
          {children}
        </div>
      </div>
      
      <div className={styles.rightPane}>
        <div className={styles.rightContent}>
          <h2 className={styles.rightTitle}>Your journey to mastery starts here.</h2>
          <p className={styles.rightDesc}>
            Join thousands of learners building discipline, accountability, and real-world skills through personalized AI mentorship.
          </p>
        </div>
      </div>
    </div>
  );
}
