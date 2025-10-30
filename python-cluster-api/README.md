# Python KMeans Clustering API

## How to Deploy on Render.com

1. Push this folder to a new GitHub repo (or as subdirectory).
2. Create a new Web Service on [Render](https://render.com/):
   - Connect your repo
   - Build command: (leave blank)
   - Start command: `gunicorn app:app --bind 0.0.0.0:10000`
   - (Optional) Set environment variable `PORT=10000`
3. The API exposes:
   - `POST /api/cluster` - Accepts JSON, returns clusters.
   - `GET /` - Health check

## Local Development
```bash
pip install -r requirements.txt
python app.py
```

You can test with curl or Postman:
curl -X POST -H "Content-Type: application/json" \
--data '[{"student_id": 1, "attendance_percentage": 90, "average_score": 85, "average_days_late": 2}, {...}]' \
http://localhost:10000/api/cluster
