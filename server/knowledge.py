import json, os, sqlite3

DB = os.environ.get("ICM_DB") or os.path.expanduser("~/.local/share/icm/memories.db")
out = {"memories": [], "facts": [], "topics": 0, "dbKb": 0}
try:
    out["dbKb"] = round(os.path.getsize(DB) / 1024)
    con = sqlite3.connect("file:%s?mode=ro" % DB, uri=True, timeout=5)
    con.row_factory = sqlite3.Row
    out["memories"] = [
        dict(r) for r in con.execute(
            "select topic, summary, keywords, created_at, source_type from memories "
            "order by created_at desc limit 100")
    ]
    out["facts"] = [
        dict(r) for r in con.execute(
            "select entity, key, value, created_at from facts order by created_at desc limit 50")
    ]
    out["topics"] = con.execute("select count(distinct topic) from memories").fetchone()[0]
    con.close()
except Exception as exc:
    out["error"] = str(exc)[:200]
print(json.dumps(out))
