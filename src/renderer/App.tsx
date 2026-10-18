import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { StudyPage } from "./pages/StudyPage";
import { SettingsPage } from "./pages/SettingsPage";
import { FileHistoryPage } from "./pages/FileHistoryPage";
import { WelcomePage } from "./pages/WelcomePage";
import styles from "./App.module.css";

export default function App() {
  return (
    <div className={styles.app}>
      <Sidebar />
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/study/:folderId" element={<StudyPage />} />
          <Route path="/study/file/:fileId" element={<StudyPage />} />
          <Route path="/history/:fileId" element={<FileHistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
