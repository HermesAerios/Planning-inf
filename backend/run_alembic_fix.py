import alembic.config
import sys
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path='c:/Users/jassi/Desktop/Antigravity/.env')
os.environ.setdefault('DATABASE_URL', 'postgresql://admin:changeme_strong_password@localhost:5432/labo_tournees')
os.environ.setdefault('REDIS_URL', 'redis://localhost:6379')
os.environ.setdefault('TWILIO_ACCOUNT_SID', 'ACxxx')
os.environ.setdefault('TWILIO_AUTH_TOKEN', 'xxx')

def main():
    print("Generating migration...")
    alembic.config.main(argv=[
        '--raiseerr',
        'revision', 
        '--autogenerate', 
        '-m', 
        'Recreate settings table'
    ])
    print("Upgrading database...")
    alembic.config.main(argv=[
        '--raiseerr',
        'upgrade', 
        'head'
    ])
    print("Done!")

if __name__ == '__main__':
    main()
