# AlgoTrack

## AI based Competitive Programming Progress Tracker

AlgoTrack analyzes a Codeforces profile and turns submission history into a practical progress dashboard. It shows solved problems, weak topics, language usage, submission activity, rating progression, and personalized problem recommendations.

## Stack

- Frontend: React.js, Vite, Recharts
- Backend: FastAPI, SQLAlchemy, SQLite
- Data source: Codeforces API

## Run Locally

### Backend

```bash
cd Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API is available at `http://localhost:8000`, with interactive documentation at `http://localhost:8000/docs`.

### Frontend

In a second terminal:

```bash
cd Frontend
npm install
npm run dev
```

Open `http://localhost:5173` and enter a Codeforces handle.

## Checks

```bash
cd Frontend
npm run build
npm run lint
```

The backend can be syntax-checked with:

```bash
cd Backend
python3 -m compileall -q app
```
