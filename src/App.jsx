import { useEffect, useMemo, useState } from "react";

// -------------------- Helpers --------------------
const STORAGE_KEY = "manhwa_system_v1";

function xpNeeded(level) {
  // XP needed = 100 + (level - 1) * 50
  return 100 + (level - 1) * 50;
}

function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

function formatDate(d = new Date()) {
  // YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getXpRange(difficulty) {
  switch (difficulty) {
    case "Easy":
      return [5, 15];
    case "Medium":
      return [20, 40];
    case "Hard":
      return [50, 100];
    case "Boss":
      return [120, 250];
    default:
      return [5, 15];
  }
}

// -------------------- App --------------------
export default function App() {
  const today = useMemo(() => formatDate(), []);

  const [user, setUser] = useState({
    name: "Hunter",
    level: 1,
    xp: 0,
    coins: 0,
  });

  const [tasks, setTasks] = useState([]);

  // Form state
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [xp, setXp] = useState(10);
  const [coins, setCoins] = useState(5);

  // Load from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      if (data.user) setUser(data.user);
      if (data.tasks) setTasks(data.tasks);
    } catch {
      // ignore
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user,
        tasks,
      })
    );
  }, [user, tasks]);

  // Keep XP inside difficulty range
  useEffect(() => {
    const [min, max] = getXpRange(difficulty);
    setXp((prev) => clamp(prev, min, max));
  }, [difficulty]);

  const todaysTasks = tasks.filter((t) => t.date === today);

  const totalXpToday = todaysTasks
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + t.xp, 0);

  const xpToNext = xpNeeded(user.level);
  const progressPercent = Math.floor((user.xp / xpToNext) * 100);

  function addTask() {
    if (!title.trim()) return;

    const [min, max] = getXpRange(difficulty);
    const safeXp = clamp(xp, min, max);

    const newTask = {
      id: makeId(),
      title: title.trim(),
      difficulty,
      xp: safeXp,
      coins: Math.max(0, Number(coins) || 0),
      completed: false,
      date: today,
    };

    setTasks((prev) => [newTask, ...prev]);

    // reset input
    setTitle("");
    setDifficulty("Easy");
    setXp(10);
    setCoins(5);
  }

  function completeTask(taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.completed) return;

    // Mark completed
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, completed: true } : t
      )
    );

    // Give rewards
    gainRewards(task.xp, task.coins);
  }

  function gainRewards(gainXp, gainCoins) {
    setUser((prev) => {
      let level = prev.level;
      let xp = prev.xp + gainXp;
      let coins = prev.coins + gainCoins;

      // Level up loop
      while (xp >= xpNeeded(level)) {
        xp -= xpNeeded(level);
        level += 1;
      }

      return { ...prev, level, xp, coins };
    });
  }

  function resetToday() {
    // deletes today's tasks only
    setTasks((prev) => prev.filter((t) => t.date !== today));
  }

  function wipeAll() {
    if (!confirm("Wipe everything? This deletes all progress.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setUser({ name: "Hunter", level: 1, xp: 0, coins: 0 });
    setTasks([]);
  }

  const [minXp, maxXp] = getXpRange(difficulty);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={styles.small}>SYSTEM STATUS</div>
            <div style={styles.title}>Manhwa Task System</div>
            <div style={styles.small}>Date: {today}</div>
          </div>

          <div style={styles.profile}>
            <div style={styles.profileRow}>
              <span style={styles.badge}>LVL {user.level}</span>
              <span style={styles.badge}>💰 {user.coins}</span>
            </div>

            <div style={styles.progressWrap}>
              <div style={styles.progressLabel}>
                XP: {user.xp} / {xpToNext}
              </div>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${clamp(progressPercent, 0, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Add Task */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>Create Daily Quest</div>

          <div style={styles.form}>
            <input
              style={styles.input}
              placeholder="Task name (ex: Study 1 hour)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
            />

            <div style={styles.row}>
              <select
                style={styles.input}
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
                <option>Boss</option>
              </select>

              <input
                style={styles.input}
                type="number"
                value={xp}
                min={minXp}
                max={maxXp}
                onChange={(e) => setXp(Number(e.target.value))}
              />

              <input
                style={styles.input}
                type="number"
                value={coins}
                min={0}
                onChange={(e) => setCoins(Number(e.target.value))}
              />
            </div>

            <div style={styles.small}>
              XP range for {difficulty}: {minXp}–{maxXp} | Rewards: Coins
            </div>

            <button style={styles.button} onClick={addTask}>
              + Add Quest
            </button>
          </div>
        </div>

        {/* Tasks */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>Today’s Quests</div>
          <div style={styles.small}>
            Completed XP today: <b>{totalXpToday}</b>
          </div>

          {todaysTasks.length === 0 ? (
            <div style={styles.empty}>No quests yet. Add one.</div>
          ) : (
            <div style={styles.taskList}>
              {todaysTasks.map((t) => (
                <div key={t.id} style={styles.task}>
                  <div>
                    <div style={styles.taskTitle}>
                      {t.completed ? "✅" : "🟦"} {t.title}
                    </div>
                    <div style={styles.small}>
                      {t.difficulty} • +{t.xp} XP • +{t.coins} coins
                    </div>
                  </div>

                  <button
                    style={{
                      ...styles.smallButton,
                      opacity: t.completed ? 0.4 : 1,
                      cursor: t.completed ? "not-allowed" : "pointer",
                    }}
                    disabled={t.completed}
                    onClick={() => completeTask(t.id)}
                  >
                    Complete
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={styles.row}>
            <button style={styles.dangerButton} onClick={resetToday}>
              Reset Today
            </button>
            <button style={styles.dangerButton} onClick={wipeAll}>
              Wipe All
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          Tip: Make “Boss” quests for your biggest tasks.
        </div>
      </div>
    </div>
  );
}

// -------------------- Styles --------------------
const styles = {
  page: {
    minHeight: "100vh",
    background: "#0b0f1a",
    color: "white",
    padding: 20,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  container: {
    maxWidth: 850,
    margin: "0 auto",
    display: "grid",
    gap: 14,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    padding: 18,
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  title: { fontSize: 22, fontWeight: 800, marginTop: 4 },
  small: { fontSize: 13, opacity: 0.8 },
  profile: {
    minWidth: 260,
    display: "grid",
    gap: 10,
  },
  profileRow: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  badge: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    fontWeight: 700,
  },
  progressWrap: { display: "grid", gap: 6 },
  progressLabel: { fontSize: 13, opacity: 0.9, textAlign: "right" },
  progressBar: {
    height: 10,
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #5b8cff, #9b5bff)",
  },
  card: {
    padding: 18,
    borderRadius: 16,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    display: "grid",
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: 800 },
  form: { display: "grid", gap: 10 },
  row: { display: "flex", gap: 10, flexWrap: "wrap" },
  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "white",
    outline: "none",
    flex: 1,
    minWidth: 140,
  },
  button: {
    padding: 12,
    borderRadius: 12,
    border: "none",
    fontWeight: 800,
    cursor: "pointer",
    background: "white",
    color: "black",
  },
  dangerButton: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
    flex: 1,
    minWidth: 160,
  },
  taskList: { display: "grid", gap: 10 },
  task: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  taskTitle: { fontWeight: 800 },
  smallButton: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "none",
    fontWeight: 800,
    background: "white",
    color: "black",
  },
  empty: {
    padding: 14,
    borderRadius: 14,
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.12)",
    opacity: 0.85,
  },
  footer: { textAlign: "center", opacity: 0.65, fontSize: 13, padding: 10 },
};
