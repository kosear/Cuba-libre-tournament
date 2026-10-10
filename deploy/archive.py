#!/usr/bin/env python3
"""Tournament archive: an outside observer of the app, it never touches the app's code or DB.

Listens to the public SSE stream like one more TV and appends every new tournament state
to /var/lib/cubalibre-archive/<env>/YYYY-MM-DD.jsonl (one JSON object per line, UTC dates).
The stored state is already computed, so the archive stays readable after engine changes.

Usage: archive.py <env>   (prod -> port 3000, dev -> port 3001). Run by cubalibre-archive@<env>.service.
"""
import datetime
import hashlib
import json
import os
import sys
import time
import urllib.request

PORTS = {'prod': 3000, 'dev': 3001}


def now():
    return datetime.datetime.now(datetime.timezone.utc)


class Archive:
    def __init__(self, env):
        self.env = env
        self.base = f'http://127.0.0.1:{PORTS[env]}'
        self.dir = os.environ.get('STATE_DIRECTORY', f'/var/lib/cubalibre-archive/{env}')
        self.commit = None
        self.last_hash = None

    def write(self, record):
        ts = now()
        record = {'ts': ts.isoformat(timespec='seconds'), 'env': self.env, 'commit': self.commit, **record}
        path = os.path.join(self.dir, ts.strftime('%Y-%m-%d') + '.jsonl')
        with open(path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(record, ensure_ascii=False, separators=(',', ':')) + '\n')

    def on_state(self, state):
        tournament = state.get('tournament')
        h = hashlib.sha256(json.dumps(tournament, sort_keys=True).encode()).hexdigest()
        if h == self.last_hash:
            return  # same state again (reconnect, undo+redo of nothing)
        self.last_hash = h
        self.write({'type': 'state', 'tournament': tournament})

    def on_hello(self, data):
        commit = data.get('commit')
        if commit != self.commit:
            if self.commit is not None:
                self.write({'type': 'deploy', 'from': self.commit, 'to': commit})
            self.commit = commit
        # Whatever happened while we were disconnected: catch up with the current state.
        with urllib.request.urlopen(self.base + '/api/state', timeout=10) as r:
            self.on_state(json.load(r))

    def listen(self):
        with urllib.request.urlopen(self.base + '/api/events', timeout=60) as stream:
            event, data = None, []
            for raw in stream:
                line = raw.decode('utf-8').rstrip('\r\n')
                if line.startswith('event:'):
                    event = line[6:].strip()
                elif line.startswith('data:'):
                    data.append(line[5:].lstrip())
                elif line == '':
                    if event in ('hello', 'state') and data:
                        payload = json.loads('\n'.join(data))
                        (self.on_hello if event == 'hello' else self.on_state)(payload)
                    event, data = None, []

    def run(self):
        os.makedirs(self.dir, exist_ok=True)
        print(f'[archive] {self.env}: {self.base} -> {self.dir}', flush=True)
        while True:
            try:
                self.listen()
            except Exception as e:  # app restarting, deploy, timeout without pings
                print(f'[archive] {self.env}: {type(e).__name__}: {e}', flush=True)
            time.sleep(2)


if __name__ == '__main__':
    if len(sys.argv) != 2 or sys.argv[1] not in PORTS:
        sys.exit('usage: archive.py prod|dev')
    Archive(sys.argv[1]).run()
