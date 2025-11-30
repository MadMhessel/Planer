
export const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // User Profiles
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      
      match /notifications/{notificationId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Workspaces
    match /workspaces/{workspaceId} {
      // Allow read if user is in 'allowedEmails' or is the owner
      allow read: if request.auth != null && 
        (resource.data.ownerId == request.auth.uid || resource.data.allowedEmails.hasAny([request.auth.token.email]));
      
      allow create: if request.auth != null;
      allow update: if request.auth != null; 

      // Subcollections (Tasks, Projects, Members)
      match /{document=**} {
        allow read, write: if request.auth != null; 
      }
    }
    
    // Global Settings (Bot Token) - only owner can read/write strictly, but for MVP:
    match /settings/global {
       allow read: if request.auth != null;
       allow write: if request.auth != null; // Ideally check for hardcoded admin email or specific role
    }
  }
}
`;
