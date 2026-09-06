import re

with open('src/app/profil/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the @gmail.com check
content = re.sub(
    r"if \(\!email\.toLowerCase\(\)\.endsWith\('@gmail\.com'\)\) \{\s*setLoginError\('Harap gunakan email @gmail\.com yang terdaftar\.'\);\s*return;\s*\}",
    "",
    content
)

# 2. Modify the handleLogin try block
old_login = '''      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error: any) {'''

new_login = '''      try {
        let finalEmail = email.toLowerCase().replace(/\s+/g, '');
        if (!finalEmail.includes('@')) {
          try {
            await signInWithEmailAndPassword(auth, finalEmail + '@quikkoni.admin', password);
          } catch (e: any) {
             // If failed, try cabor domain
            await signInWithEmailAndPassword(auth, finalEmail + '@quikkoni.cabor', password);
          }
        } else {
          await signInWithEmailAndPassword(auth, finalEmail, password);
        }
      } catch (error: any) {'''

content = content.replace(old_login, new_login)

with open('src/app/profil/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated profil/page.tsx')
