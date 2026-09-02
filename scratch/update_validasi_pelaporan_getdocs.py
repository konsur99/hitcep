import re

path = r"c:\Users\User\Documents\ANTIGRAVITY\porprov koni surakarta\src\app\validasi-pelaporan\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add getDocs to import
code = code.replace("onSnapshot, doc", "getDocs, doc")

# 2. Replace the main useEffect with polling
old_use_effect = """  useEffect(() => {
    if (isAuthChecking) return;

    const unsubCabors = onSnapshot(collection(db, "cabors"), (snapshot) => {
      const cDict: any = {};
      snapshot.forEach(doc => { cDict[doc.id] = doc.data().name; });
      setCabors(cDict);
    }, (error) => console.error(error));

    const q = query(collection(db, "reports"));
    
    const unsubReports = onSnapshot(q, (snapshot) => {
      const rData: any[] = [];
      
      snapshot.forEach(doc => {
        rData.push({ id: doc.id, ...(doc.data() as any) });
      });
      
      rData.sort((a, b) => {
        const tA = a.createdAt ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
      
      setReports(rData);
    }, (error) => {
      console.error(error);
    });

    return () => {
      unsubCabors();
    };
  }, [isAuthChecking]);"""

new_use_effect = """  useEffect(() => {
    if (isAuthChecking) return;

    const fetchData = async () => {
      try {
        const [caborsSnap, reportsSnap] = await Promise.all([
          getDocs(collection(db, "cabors")),
          getDocs(query(collection(db, "reports")))
        ]);
        
        const cDict: any = {};
        caborsSnap.forEach(doc => { cDict[doc.id] = doc.data().name; });
        setCabors(cDict);
        
        const rData: any[] = [];
        reportsSnap.forEach(doc => {
          rData.push({ id: doc.id, ...(doc.data() as any) });
        });
        
        rData.sort((a, b) => {
          const tA = a.createdAt ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt ? b.createdAt.toMillis() : 0;
          return tB - tA;
        });
        
        setReports(rData);
      } catch (e) {
        console.error(e);
      }
    };

    fetchData();

    let currentVersion = 0;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/version', { next: { revalidate: 30 } });
        if (res.ok) {
          const { version } = await res.json();
          if (currentVersion === 0) {
            currentVersion = version;
          } else if (version > currentVersion) {
            currentVersion = version;
            fetchData();
          }
        }
      } catch (e) {}
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthChecking]);"""

code = code.replace(old_use_effect, new_use_effect)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)

print("done validasi pelaporan")
