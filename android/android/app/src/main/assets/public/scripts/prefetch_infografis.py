import sqlite3, os, urllib.request
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQLITE_DIR = os.path.join(BASE_DIR, 'sqlite')
INFO_DIR = os.path.join(SQLITE_DIR, 'infografis')
os.makedirs(INFO_DIR, exist_ok=True)
DB_PATH = os.path.join(SQLITE_DIR, 'dimsum.db')


def safe_filename(name):
    keep = set('-_.() abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
    return ''.join(c for c in (name or '') if c in keep)[:160] or 'file.png'


def filename_from_url(url):
    try:
        path = str(url).split('?')[0].replace('\\\\','/').replace('\\','/').split('/')[-1]
        return safe_filename(path)
    except Exception:
        return 'file.png'


def main():
    if not os.path.isfile(DB_PATH):
        print('DB not found:', DB_PATH)
        return
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('SELECT image_url FROM infografis')
    rows = cur.fetchall()
    conn.close()
    downloaded = skipped = failed = 0
    for (url,) in rows:
        if not url:
            skipped += 1
            continue
        name = filename_from_url(url)
        target = os.path.join(INFO_DIR, name)
        if os.path.isfile(target):
            skipped += 1
            continue
        try:
            with urllib.request.urlopen(url) as resp:
                data = resp.read()
            with open(target, 'wb') as f:
                f.write(data)
            downloaded += 1
            print('Saved', name)
        except Exception as e:
            failed += 1
            print('Fail', url, e)
    print('Done: downloaded', downloaded, 'skipped', skipped, 'failed', failed)


if __name__ == '__main__':
    main()
