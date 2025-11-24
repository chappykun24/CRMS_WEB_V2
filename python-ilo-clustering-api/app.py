"""
ILO Clustering API Service
==========================
Flask API wrapper for ILO-based student clustering analysis script.
Deployed on Railway to handle clustering requests from the Node.js backend.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import json
import subprocess
from pathlib import Path
from datetime import datetime
import tempfile

app = Flask(__name__)
CORS(app)

# Add scripts directory to path so we can import the clustering module
# Try multiple possible locations for the script (prioritize local scripts directory)
possible_script_dirs = [
    Path(__file__).parent / 'scripts',          # Local scripts directory (preferred)
    Path(__file__).parent.parent / 'scripts',   # Parent directory scripts (for development)
    Path('/app/scripts'),                       # Docker container path
    Path.cwd() / 'scripts'                      # Current working directory
]

SCRIPT_DIR = None
for script_dir in possible_script_dirs:
    script_file = script_dir / 'ilo-clustering-analysis.py'
    if script_file.exists():
        SCRIPT_DIR = script_dir
        print(f"[ILO CLUSTERING API] Found script at: {script_file}")
        break

if not SCRIPT_DIR:
    print(f"[ILO CLUSTERING API] WARNING: Script directory not found. Tried: {[str(d) for d in possible_script_dirs]}")
    print(f"[ILO CLUSTERING API] Current working directory: {Path.cwd()}")
    print(f"[ILO CLUSTERING API] App file location: {Path(__file__).parent}")

if SCRIPT_DIR:
    sys.path.insert(0, str(SCRIPT_DIR))

print("[ILO CLUSTERING API] Starting ILO Clustering API Service...")
print(f"[ILO CLUSTERING API] Python version: {sys.version}")
print(f"[ILO CLUSTERING API] Port: {os.environ.get('PORT', '10001')}")
print(f"[ILO CLUSTERING API] Script directory: {SCRIPT_DIR}")


@app.route("/", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "ILO Clustering API",
        "timestamp": datetime.utcnow().isoformat()
    })


@app.route("/api/ilo-clustering", methods=["POST", "OPTIONS"])
def cluster_ilo():
    """
    ILO-based clustering endpoint.
    
    Accepts JSON with:
    {
        "section_course_id": int,
        "ilo_id": int,
        "so_id": int (optional),
        "sdg_id": int (optional),
        "iga_id": int (optional),
        "cdio_id": int (optional),
        "min_k": int (optional, default: 2),
        "max_k": int (optional, default: 6)
    }
    """
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Extract parameters
        section_course_id = data.get('section_course_id')
        ilo_id = data.get('ilo_id')
        
        if not section_course_id or not ilo_id:
            return jsonify({
                "error": "section_course_id and ilo_id are required"
            }), 400
        
        # Optional filters
        so_id = data.get('so_id')
        sdg_id = data.get('sdg_id')
        iga_id = data.get('iga_id')
        cdio_id = data.get('cdio_id')
        min_k = data.get('min_k', 2)
        max_k = data.get('max_k', 6)
        
        # Create temporary output directory
        output_dir = Path(tempfile.mkdtemp(prefix='ilo_clustering_'))
        
        print(f"[ILO CLUSTERING API] Processing request:")
        print(f"  Section Course ID: {section_course_id}")
        print(f"  ILO ID: {ilo_id}")
        if so_id: print(f"  SO ID: {so_id}")
        if sdg_id: print(f"  SDG ID: {sdg_id}")
        if iga_id: print(f"  IGA ID: {iga_id}")
        if cdio_id: print(f"  CDIO ID: {cdio_id}")
        
        # Build command to run the script
        if not SCRIPT_DIR:
            return jsonify({
                "success": False,
                "error": "Clustering script directory not found",
                "message": "The ILO clustering script could not be located. Please ensure the script is available.",
                "clusters": [],
                "summary": {
                    "error": "Script not found",
                    "optimal_k": None,
                    "silhouette_score": None
                }
            }), 500
        
        script_path = SCRIPT_DIR / 'ilo-clustering-analysis.py'
        
        if not script_path.exists():
            return jsonify({
                "success": False,
                "error": "Clustering script not found",
                "message": f"Script not found at: {script_path}",
                "clusters": [],
                "summary": {
                    "error": "Script not found",
                    "optimal_k": None,
                    "silhouette_score": None
                }
            }), 500
        
        # Build command arguments
        cmd = [
            sys.executable,
            str(script_path),
            '--section_course_id', str(section_course_id),
            '--ilo_id', str(ilo_id),
            '--min_k', str(min_k),
            '--max_k', str(max_k),
            '--output_dir', str(output_dir)
        ]
        
        if so_id:
            cmd.extend(['--so_id', str(so_id)])
        if sdg_id:
            cmd.extend(['--sdg_id', str(sdg_id)])
        if iga_id:
            cmd.extend(['--iga_id', str(iga_id)])
        if cdio_id:
            cmd.extend(['--cdio_id', str(cdio_id)])
        
        print(f"[ILO CLUSTERING API] Executing: {' '.join(cmd)}")
        
        # Run the script
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode != 0:
            error_msg = result.stderr or result.stdout or "Unknown error"
            print(f"[ILO CLUSTERING API] Script failed with code {result.returncode}")
            print(f"[ILO CLUSTERING API] Error: {error_msg}")
            
            return jsonify({
                "success": False,
                "error": "Clustering script failed",
                "message": error_msg[:1000],  # Limit error message length
                "clusters": [],
                "summary": {
                    "error": f"Script exited with code {result.returncode}",
                    "optimal_k": None,
                    "silhouette_score": None
                }
            }), 500
        
        # Read output files
        summary_file = None
        csv_file = None
        
        for file in output_dir.glob('*.json'):
            if 'summary' in file.name:
                summary_file = file
                break
        
        for file in output_dir.glob('*.csv'):
            if 'results' in file.name:
                csv_file = file
                break
        
        if not summary_file:
            return jsonify({
                "success": False,
                "error": "No output files generated",
                "message": "Script completed but no summary file found",
                "clusters": [],
                "summary": {
                    "error": "No output files",
                    "optimal_k": None,
                    "silhouette_score": None
                }
            }), 500
        
        # Parse summary JSON
        with open(summary_file, 'r') as f:
            summary = json.load(f)
        
        # Parse CSV to get cluster assignments
        clusters = []
        if csv_file:
            import pandas as pd
            df = pd.read_csv(csv_file)
            
            # Group by cluster
            for cluster_id in sorted(df['cluster'].unique()):
                cluster_df = df[df['cluster'] == cluster_id]
                cluster_students = []
                
                for _, row in cluster_df.iterrows():
                    cluster_students.append({
                        "student_id": int(row.get('student_id', 0)),
                        "student_number": str(row.get('student_number', '')),
                        "full_name": str(row.get('full_name', '')),
                        "ilo_percentage": float(row.get('ilo_percentage', 0)) if pd.notna(row.get('ilo_percentage')) else 0
                    })
                
                clusters.append({
                    "cluster_id": int(cluster_id),
                    "student_count": len(cluster_students),
                    "avg_ilo_percentage": float(cluster_df['ilo_percentage'].mean()) if 'ilo_percentage' in cluster_df.columns else 0,
                    "students": cluster_students
                })
        
        # Clean up temporary directory
        import shutil
        try:
            shutil.rmtree(output_dir)
        except:
            pass
        
        print(f"[ILO CLUSTERING API] Successfully clustered {len(clusters)} clusters")
        
        return jsonify({
            "success": True,
            "clusters": clusters,
            "summary": summary,
            "optimal_k": summary.get('optimal_k'),
            "silhouette_score": summary.get('silhouette_score')
        })
        
    except subprocess.TimeoutExpired:
        return jsonify({
            "success": False,
            "error": "Script execution timeout",
            "message": "Clustering script took too long to execute",
            "clusters": [],
            "summary": {
                "error": "Timeout",
                "optimal_k": None,
                "silhouette_score": None
            }
        }), 500
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[ILO CLUSTERING API] Unexpected error: {str(e)}")
        print(f"[ILO CLUSTERING API] Traceback: {error_trace}")
        
        return jsonify({
            "success": False,
            "error": "Unexpected error",
            "message": str(e),
            "clusters": [],
            "summary": {
                "error": str(e),
                "optimal_k": None,
                "silhouette_score": None
            }
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10001))
    app.run(host='0.0.0.0', port=port, debug=False)

