import re

path = r"c:\Users\User\Documents\ANTIGRAVITY\porprov koni surakarta\src\app\validasi\page.tsx"
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

    const q = collection(db, "medals");
    
    const unsubMedals = onSnapshot(q, (snapshot) => {
      const mData: any[] = [];
      snapshot.forEach(doc => {
        mData.push({ id: doc.id, ...(doc.data() as any) });
      });
      
      mData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
      setMedals(mData);
    }, (error) => console.error(error));

    return () => {
      unsubCabors();
      unsubMedals();
    };
  }, [isAuthChecking]);"""

new_use_effect = """  useEffect(() => {
    if (isAuthChecking) return;

    const fetchData = async () => {
      try {
        const [caborsSnap, medalsSnap] = await Promise.all([
          getDocs(collection(db, "cabors")),
          getDocs(collection(db, "medals"))
        ]);
        
        const cDict: any = {};
        caborsSnap.forEach(doc => { cDict[doc.id] = doc.data().name; });
        setCabors(cDict);
        
        const mData: any[] = [];
        medalsSnap.forEach(doc => {
          mData.push({ id: doc.id, ...(doc.data() as any) });
        });
        mData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis() || 0;
          const timeB = b.createdAt?.toMillis() || 0;
          return timeB - timeA;
        });
        setMedals(mData);
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

# 3. Replace the athletes onSnapshot
old_athletes = """  useEffect(() => {
    if (!editCaborId) return;
    const q = query(collection(db, "athletes"), where("caborId", "==", editCaborId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAthletes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });
    return () => unsubscribe();
  }, [editCaborId]);"""

new_athletes = """  useEffect(() => {
    if (!editCaborId) return;
    const q = query(collection(db, "athletes"), where("caborId", "==", editCaborId));
    getDocs(q).then((snapshot) => {
      setAthletes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });
  }, [editCaborId]);"""

code = code.replace(old_athletes, new_athletes)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)

print("done validasi")
