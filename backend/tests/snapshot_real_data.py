# Snapshot of real (non-TEST_) projects/items/components to verify tests don't alter customer data
import os, sys, json, hashlib
from pymongo import MongoClient
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')
db = MongoClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]

def h(docs):
    return hashlib.md5(json.dumps(docs, sort_keys=True, default=str).encode()).hexdigest()

projs = list(db.projects.find({'name': {'$not': {'$regex': '^TEST_'}}}, {'_id': 0}))
pids = [p['id'] for p in projs]
items = sorted(db.items.find({'project_id': {'$in': pids}}, {'_id': 0}), key=lambda x: x['id'])
comps = sorted(db.components.find({'description': {'$not': {'$regex': '^TEST_'}}}, {'_id': 0}), key=lambda x: x['id'])
snap = {'projects': len(projs), 'items': len(items), 'components': len(comps),
        'proj_hash': h(sorted(projs, key=lambda x: x['id'])), 'items_hash': h(items), 'comps_hash': h(comps),
        'backup_count': db.items_backup_20261103.count_documents({})}
out = sys.argv[1] if len(sys.argv) > 1 else None
if out:
    json.dump(snap, open(out, 'w'))
print(json.dumps(snap))
