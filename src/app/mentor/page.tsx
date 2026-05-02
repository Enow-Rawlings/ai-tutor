"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import styles from "./mentor.module.css";
import { Users, Flame, Activity, Target } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface LearnerData {
  id: string;
  email: string;
  selectedPath?: string;
  selectedLevel?: string;
  streak?: number;
  lastStudyDate?: string;
  createdAt?: any;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];

export default function MentorDashboard() {
  const [mentorData, setMentorData] = useState<any>(null);
  const [learners, setLearners] = useState<LearnerData[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if user is a mentor
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === "mentor") {
          setMentorData(userDoc.data());
          fetchLearners();
        } else {
          // Not a mentor, redirect to their dashboard
          router.push("/dashboard");
        }
      } else {
        router.push("/auth/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const fetchLearners = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "learner"));
      const querySnapshot = await getDocs(q);
      const learnersData: LearnerData[] = [];
      querySnapshot.forEach((doc) => {
        learnersData.push({ id: doc.id, ...doc.data() } as LearnerData);
      });
      setLearners(learnersData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching learners:", error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Calculate Metrics
  const totalLearners = learners.length;
  const activeLearners = learners.filter(l => (l.streak || 0) > 0).length;
  const avgStreak = totalLearners > 0 
    ? Math.round(learners.reduce((acc, curr) => acc + (curr.streak || 0), 0) / totalLearners) 
    : 0;

  // Process data for Path Distribution Chart
  const pathDistribution = learners.reduce((acc: Record<string, number>, learner) => {
    const path = learner.selectedPath || 'Unassigned';
    acc[path] = (acc[path] || 0) + 1;
    return acc;
  }, {});

  const pathData = Object.keys(pathDistribution).map(key => ({
    name: key,
    value: pathDistribution[key]
  }));

  // Process data for Level Distribution Chart
  const levelDistribution = learners.reduce((acc: Record<string, number>, learner) => {
    const level = learner.selectedLevel || 'Unassigned';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  const levelData = Object.keys(levelDistribution).map(key => ({
    name: key,
    count: levelDistribution[key]
  }));

  return (
    <div className={styles.container}>
      <header className={`${styles.header} animate-fade-in`}>
        <div>
          <h1 className={styles.title}>Mentor Dashboard</h1>
          <p className={styles.subtitle}>Welcome back. Here is the overview of your learners.</p>
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          Sign Out
        </button>
      </header>

      <div className={`${styles.metricsGrid} animate-slide-up`}>
        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <Users size={24} />
          </div>
          <div className={styles.metricInfo}>
            <h3>Total Learners</h3>
            <div className={styles.metricValue}>{totalLearners}</div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <Activity size={24} />
          </div>
          <div className={styles.metricInfo}>
            <h3>Active Learners</h3>
            <div className={styles.metricValue}>{activeLearners}</div>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <Flame size={24} color="#fb923c" />
          </div>
          <div className={styles.metricInfo}>
            <h3>Average Streak</h3>
            <div className={styles.metricValue}>{avgStreak} days</div>
          </div>
        </div>
      </div>

      <div className={`${styles.chartsContainer} animate-slide-up-delayed`}>
        {/* Bar Chart for Levels */}
        <div className={styles.chartCard}>
          <h2>Skill Level Distribution</h2>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#12131c', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart for Paths */}
        <div className={styles.chartCard}>
          <h2>Learning Paths</h2>
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pathData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pathData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#12131c', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {pathData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  {entry.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`${styles.usersSection} animate-slide-up-delayed`}>
        <h2>Learner Directory</h2>
        <table className={styles.userTable}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Learning Path</th>
              <th>Level</th>
              <th>Current Streak</th>
            </tr>
          </thead>
          <tbody>
            {learners.map((learner) => (
              <tr key={learner.id}>
                <td>{learner.email}</td>
                <td>
                  {learner.selectedPath ? (
                    <span className={styles.pathBadge}>{learner.selectedPath}</span>
                  ) : (
                    <span className="text-gray-500 text-sm">Not Started</span>
                  )}
                </td>
                <td>
                  {learner.selectedLevel ? (
                    <span className={styles.levelBadge}>{learner.selectedLevel}</span>
                  ) : (
                    <span className="text-gray-500 text-sm">-</span>
                  )}
                </td>
                <td>
                  <div className={styles.streakCell}>
                    <Flame size={16} />
                    {learner.streak || 0} days
                  </div>
                </td>
              </tr>
            ))}
            {learners.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-500">
                  No learners have registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
