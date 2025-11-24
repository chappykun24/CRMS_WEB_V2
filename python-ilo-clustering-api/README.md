# ILO Clustering API Service

Flask API wrapper for ILO-based student clustering analysis. Deployed on Railway to handle clustering requests from the Node.js backend.

## 📚 Deployment Guides

**Choose your preferred guide:**

1. **🚀 Quick Checklist** → [QUICK_DEPLOY_CHECKLIST.md](./QUICK_DEPLOY_CHECKLIST.md) - 5-minute deployment
2. **📖 Detailed Guide** → [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md) - Complete step-by-step with troubleshooting
3. **⚡ Quick Start** → [DEPLOY_NOW.md](./DEPLOY_NOW.md) - Multiple deployment options

**Recommended**: Start with [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md) for detailed instructions.

## Deployment on Railway

1. Connect this directory to a new Railway service
2. Set the environment variables:
   - `PORT=10001` (or let Railway assign it)
   - `DATABASE_URL` (from your database)
   - Any other environment variables needed by the clustering script
3. Railway will automatically:
   - Install Python dependencies from `requirements.txt`
   - Run the Flask app using `gunicorn`

## API Endpoints

### POST `/api/ilo-clustering`

Performs ILO-based clustering analysis.

**Request Body:**
```json
{
  "section_course_id": 15,
  "ilo_id": 83,
  "so_id": 1,           // optional
  "sdg_id": 2,          // optional
  "iga_id": 3,          // optional
  "cdio_id": 4,         // optional
  "min_k": 2,           // optional, default: 2
  "max_k": 6            // optional, default: 6
}
```

**Response:**
```json
{
  "success": true,
  "clusters": [
    {
      "cluster_id": 0,
      "student_count": 10,
      "avg_ilo_percentage": 85.5,
      "students": [...]
    }
  ],
  "summary": {
    "optimal_k": 3,
    "silhouette_score": 0.45
  },
  "optimal_k": 3,
  "silhouette_score": 0.45
}
```

### GET `/`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "ILO Clustering API",
  "timestamp": "2024-01-01T00:00:00"
}
```

## Local Development

```bash
pip install -r requirements.txt
python app.py
```

The service will run on `http://localhost:10001`

