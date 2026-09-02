import re

path_val = r"c:\Users\User\Documents\ANTIGRAVITY\porprov koni surakarta\src\app\validasi\page.tsx"
path_rep = r"c:\Users\User\Documents\ANTIGRAVITY\porprov koni surakarta\src\app\validasi-pelaporan\page.tsx"

for path in [path_val, path_rep]:
    with open(path, "r", encoding="utf-8") as f:
        code = f.read()
    
    if "const [refreshTrigger" not in code:
        code = code.replace("const [isAuthChecking, setIsAuthChecking] = useState(true);", "const [isAuthChecking, setIsAuthChecking] = useState(true);\n  const [refreshTrigger, setRefreshTrigger] = useState(0);")
        
        # update dependency array of the useEffect
        code = code.replace("}, [isAuthChecking]);", "}, [isAuthChecking, refreshTrigger]);")
        
        # add setRefreshTrigger after revalidate
        code = code.replace("fetch('/api/revalidate', { method: 'POST' }).catch(e => console.error(e));", "fetch('/api/revalidate', { method: 'POST' }).then(() => setRefreshTrigger(prev => prev + 1)).catch(e => console.error(e));")

    with open(path, "w", encoding="utf-8") as f:
        f.write(code)

print("added triggers")
