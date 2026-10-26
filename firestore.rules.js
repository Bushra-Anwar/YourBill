// Paste these rules into Firebase Console → Firestore → Rules
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//
//     // Each user can only read/write their own data
//     match /users/{userId}/{document=**} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }
//
//     // Admin-readable collection for the shops list
//     match /allUsers/{docId} {
//       allow read: if request.auth != null;
//       allow write: if request.auth != null;
//     }
//   }
// }
