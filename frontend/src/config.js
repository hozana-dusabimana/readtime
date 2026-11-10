// Where the backend API runs. Set VITE_API_URL in a .env file to change it (see .env.example).
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';   // VITE_API_URL="" = same origin (used behind the Kaggle proxy)
