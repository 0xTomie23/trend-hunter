from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# Import the library under test
from clustering import cluster_tokens


class TokenItem(BaseModel):
    name: str
    symbol: str


class ClusterRequest(BaseModel):
    tokens: List[TokenItem]


app = FastAPI(title="MemeCoin Clustering Service")


@app.get("/")
def read_root():
    return {"status": "ok", "service": "memecoin-cluster"}


@app.post("/cluster")
def cluster_endpoint(payload: ClusterRequest):
    try:
        tokens = [t.dict() for t in payload.tokens]
        clusters = cluster_tokens(tokens)
        return {"total_topics": len(clusters), "clusters": clusters}
    except Exception as e:
        # cluster_tokens has internal fallback, but guard here for unexpected errors
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    # Minimal debug run for local development (not used by uvicorn invocation)
    import uvicorn
    uvicorn.run("cluster_service:app", host="127.0.0.1", port=8000, reload=False)
