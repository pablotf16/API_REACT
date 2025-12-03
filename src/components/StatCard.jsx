// StatCard.jsx
import React from 'react';
import styles from './StatCard.module.css';

const StatCard = ({ title, value }) => (
  // Eliminamos 'bg-blue-50', 'shadow-md', 'text-center' porque ya está en el CSS
  <div className={`${styles.card} p-6`}>
    <p className={styles.title}>{title}</p>
    <p className={styles.value}>{value}</p>
  </div>
);

export default StatCard;