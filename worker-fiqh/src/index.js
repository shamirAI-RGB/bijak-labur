// Titik masuk worker: hanya pengendali fetch dieksport. Pemalar dan fungsi lain (untuk ujian) berada dalam app.js,
// kerana runtime Workers menolak eksport bernama yang bukan fungsi daripada modul utama.
export { default } from './app.js';
