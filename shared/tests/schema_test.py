"""Exercise the exported SQL using SQLite, without extra dependencies."""
from pathlib import Path
import sqlite3
sql = Path(__file__).resolve().parents[1].joinpath('database/schema.js').read_text().split('`')[1]
db = sqlite3.connect(':memory:')
db.executescript(sql)
def reject(sql, params=()):
    try:
        db.execute(sql, params)
    except sqlite3.IntegrityError:
        return
    raise AssertionError('Expected constraint failure: ' + sql)
for t in ['t1','t2']:
    db.execute('INSERT INTO trips(id,name,destination,start_date,end_date,created_at) VALUES(?,?,?,?,?,?)', (t,'Demo','City','2026-11-01','2026-11-02','2026-10-17T00:00:00Z'))
    db.execute('INSERT INTO members(id,trip_id,subject_id,display_name) VALUES(?,?,?,?)', ('m'+t,t,'subject','Name'))
    db.execute('INSERT INTO places(id,trip_id,name,identity_key,match_status) VALUES(?,?,?,?,?)', ('p'+t,t,'Demo','provider:1','confirmed'))
db.execute("INSERT INTO trips(id,name,destination,start_date,end_date,created_at) VALUES('draft','Draft','City',NULL,NULL,'now')")
reject("INSERT INTO trips(id,name,destination,start_date,end_date,created_at) VALUES('half','Half','City','2026-11-01',NULL,'now')")
db.execute("INSERT INTO imports VALUES('i','t1','https://www.instagram.com/reel/DEMO/','queued','https://images.example/reel.jpg',NULL,'now')")
reject("INSERT INTO imports VALUES('duplicate','t1','https://www.instagram.com/reel/DEMO/','queued',NULL,NULL,'now')")
reject("INSERT INTO import_contributors VALUES('t1','i','mt2')")
db.execute("INSERT INTO import_contributors VALUES('t1','i','mt1')")
reject("INSERT INTO reactions VALUES('t1','pt2','mt1','interested')")
reject("INSERT INTO reactions VALUES('t1','pt1','mt1','unknown')")
db.execute("INSERT INTO reactions VALUES('t1','pt1','mt1','pass')")
reject("INSERT INTO reactions VALUES('t1','pt1','mt1','interested')")
db.execute("INSERT INTO recommendations VALUES('t1','pt1','recommended',80,'Recommended','Good fit','confirmed','now')")
db.execute("INSERT INTO member_place_evaluations VALUES('t1','pt1','mt1','good','[\"food\"]','[]')")
reject("INSERT INTO member_place_evaluations VALUES('t1','pt1','mt2','good','[]','[]')")
reject("INSERT INTO recommendations VALUES('t2','pt2','unknown',80,'Bad','Bad','confirmed','now')")
db.execute("INSERT INTO day_assignments VALUES('t1','pt1',NULL,0,1,'Manual removal')")
db.execute("INSERT INTO provider_spend VALUES('s1','glasser','/instagram',0.00188,'key-1','now')")
reject("INSERT INTO provider_spend VALUES('s2','glasser','/instagram',0.00188,'key-1','now')")
reject("INSERT INTO provider_spend VALUES('s3','glasser','/instagram',-1,'key-2','now')")
# Exercise optimistic concurrency: a stale expected revision cannot win.
assert db.execute("UPDATE trips SET plan_revision=plan_revision+1 WHERE id='t1' AND plan_revision=0").rowcount == 1
assert db.execute("UPDATE trips SET plan_revision=plan_revision+1 WHERE id='t1' AND plan_revision=0").rowcount == 0
assert db.execute('PRAGMA foreign_key_check').fetchall() == []
print('SQLite schema checks passed')

# Supabase schema is checked statically here; execute it against a disposable
# Supabase/Postgres project before making it a production migration.
supabase = Path(__file__).resolve().parents[1].joinpath('database/supabase.sql').read_text()
for table in ['trips', 'members', 'imports', 'places', 'recommendations', 'reactions', 'concerns', 'day_assignments', 'provider_spend']:
    assert f'create table if not exists public.{table}' in supabase
    assert f'alter table public.{table} enable row level security' in supabase
for required in ['auth.uid()', 'security definer', 'to authenticated', 'supabase_realtime', 'is_trip_member']:
    assert required in supabase
assert 'grant select on public.invites' not in supabase
assert 'grant select on public.provider_spend' not in supabase
verification = Path(__file__).resolve().parents[1].joinpath('database/supabase.verify.sql').read_text()
for required in ['Missing Travel Sync tables', 'RLS is disabled on', 'Missing Realtime tables']:
    assert required in verification
print('Supabase schema contract checks passed')
