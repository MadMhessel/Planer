
export const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isMember(workspaceId) {
      return exists(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid));
    }

    function isAdminOrOwner(workspaceId) {
      let role = get(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid)).data.role;
      return role == 'ADMIN' || role == 'OWNER';
    }

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
      // Basic workspace read if member or listed in legacy allowedEmails
      allow read: if request.auth != null && 
        (
          resource.data.ownerId == request.auth.uid || 
          resource.data.allowedEmails.hasAny([request.auth.token.email]) ||
          exists(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid))
        );
      
      allow create: if request.auth != null;
      allow update: if request.auth != null && (resource.data.ownerId == request.auth.uid || isAdminOrOwner(workspaceId));

      // Members Subcollection
      match /members/{memberId} {
        allow read: if request.auth != null && isMember(workspaceId);
        // Only admins/owners can add/remove/update members
        allow write: if request.auth != null && isAdminOrOwner(workspaceId); 
      }

      // Invites Subcollection
      match /invites/{token} {
        // Invite link viewer can read the specific token doc to validate it (requires matching email logic in app, but here we might need to open it up slightly or verify email in rule if possible, simpler to rely on random token secrecy + email match on write)
        // Actually, 'list' permissions are dangerous, 'get' specific doc is okay if they have the token.
        // But for 'subscribeToInvites', only admins should see the list.
        allow list: if request.auth != null && isAdminOrOwner(workspaceId);
        allow get: if request.auth != null; 
        
        allow create: if request.auth != null && isAdminOrOwner(workspaceId);
        // Revoke (update)
        allow update: if request.auth != null && (isAdminOrOwner(workspaceId) || request.resource.data.status == 'accepted');
      }

      // Tasks & Projects
      match /{document=**} {
        allow read, write: if request.auth != null && isMember(workspaceId); 
      }
    }
    
    // Global Settings
    match /settings/global {
       allow read: if request.auth != null;
       allow write: if request.auth != null; // Ideally secure this further
    }
  }
}
`;
