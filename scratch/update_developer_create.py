import re

with open('src/app/developer/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_create = '''      // 1. Initialize Secondary Firebase App so we don't log out the Developer
      const apps = getApps();
      const secondaryApp = apps.find(app => app.name === "SecondaryAppInstance") || initializeApp(firebaseConfig, "SecondaryAppInstance");
      const secondaryAuth = getAuth(secondaryApp);
      
      // 2. Create the user
      const finalEmail = \\\\;
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, finalEmail, newPassword);
      const newUserId = userCredential.user.uid;
      
      // 3. Save profile to Firestore
      await setDoc(doc(db, "users", newUserId), {
        name: newName,
        email: finalEmail,
        role: newRole,
        createdAt: new Date().toISOString()
      });
      
      // 4. Clean up secondary auth (sign out)
      await signOut(secondaryAuth);'''

new_create = '''      const finalEmail = \\\\;
      const token = await auth.currentUser?.getIdToken();
      
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Authorization': \Bearer \\, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: finalEmail,
          password: newPassword,
          name: newName,
          role: newRole
        })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal membuat pengguna');
      }'''

if old_create in content:
    content = content.replace(old_create, new_create)
    with open('src/app/developer/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated developer/page.tsx')
else:
    print('Failed to find old code in developer/page.tsx')
