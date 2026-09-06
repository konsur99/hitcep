import re

with open('src/app/validasi-pelaporan/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if 'const [isLoading, setIsLoading] = useState(true);' not in content:
    # Add isLoading state
    old_state = 'const [isAuthChecking, setIsAuthChecking] = useState(true);\n  const [refreshTrigger, setRefreshTrigger] = useState(0);'
    new_state = 'const [isAuthChecking, setIsAuthChecking] = useState(true);\n  const [isLoading, setIsLoading] = useState(true);\n  const [refreshTrigger, setRefreshTrigger] = useState(0);'
    content = content.replace(old_state, new_state)

    # Add setIsLoading(false) in fetchData
    old_fetch = 'setReports(rData);\n      } catch (e) {\n        console.error(e);\n      }'
    new_fetch = 'setReports(rData);\n      } catch (e) {\n        console.error(e);\n      } finally {\n        setIsLoading(false);\n      }'
    content = content.replace(old_fetch, new_fetch)

    # Add loading spinner in UI
    old_ui = '        {reports.length === 0 ? ('
    new_ui = '        {isLoading ? (\n          <div className="py-20 flex flex-col items-center justify-center">\n            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>\n            <p className="text-gray-500 font-bold text-sm animate-pulse">Memuat data pelaporan...</p>\n          </div>\n        ) : reports.length === 0 ? ('
    content = content.replace(old_ui, new_ui)

    with open('src/app/validasi-pelaporan/page.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated validasi-pelaporan/page.tsx')
else:
    print('Already has isLoading')
