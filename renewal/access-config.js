// Which Firebase project keeps the roster of students (set-up: work/bravo/renewal/admin/).
// These values are public identifiers, not passwords: what protects the roster is the project's
// security rules (admin/firestore.rules). While projectId is empty the reader asks for nothing and
// every course is open, exactly as before the roster existed.
// Project bravo-ai-life (Spark, Firestore asia-northeast3), made 2026-11-16 at the user's request.
window.BRAVO_ACCESS_CONFIG={projectId:'bravo-ai-life',apiKey:'AIzaSyC8GypaG0j2e_4OjS5vKEeEUs-AYPBXNfo',authDomain:'bravo-ai-life.firebaseapp.com',appId:'1:37896874609:web:913aeeadeb675e879649d0'};
// The notice on the sign-in screen about collecting the student's name and digits (personal information).
// who: who collects it · keep: how long it is kept. Change the wording here; slides.js shows it.
window.BRAVO_PRIVACY={who:'Bravo AI Life 수업 강사',keep:'수업이 끝난 뒤 3개월까지(그동안 수업 자료를 계속 볼 수 있습니다), 그 안에 삭제'};
