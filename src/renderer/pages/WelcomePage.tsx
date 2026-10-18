import React from "react";
import styles from "./WelcomePage.module.css";

export function WelcomePage() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Welcome to Didact</h1>
        <p className={styles.sub}>
          Create a Content Folder in the sidebar to get started. Upload
          Materials and Examinations, then study with AI-generated questions.
        </p>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.num}>1</span>
            <span>Create a Content Folder in the sidebar</span>
          </div>
          <div className={styles.step}>
            <span className={styles.num}>2</span>
            <span>Upload lecture notes to <strong>Materials</strong></span>
          </div>
          <div className={styles.step}>
            <span className={styles.num}>3</span>
            <span>Upload exams to <strong>Examinations</strong></span>
          </div>
          <div className={styles.step}>
            <span className={styles.num}>4</span>
            <span>Generate questions and press ▶ Study Folder</span>
          </div>
        </div>
      </div>
    </div>
  );
}
