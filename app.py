from dotenv import load_dotenv
import fastapi
import uvicorn
import streamlit as st
from qdrant_client import QdrantClient, models
import os
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from qdrant_client.http.models import PointStruct
import uuid
from fastapi import File , UploadFile

load_dotenv()

app = fastapi.FastAPI()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "Attention_Qdrant"

# Initialize Qdrant client
qdrant_client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
)

#Initialize embedder
embeddings = OpenAIEmbeddings()

#Check if collection exists
def check_collection(client, collection_name:str):
    try:
        client.get_collection(collection_name=collection_name)
        return True
    except Exception as e:
        return False

# Create collection if not exist
if not check_collection(qdrant_client, COLLECTION_NAME):
    qdrant_client.recreate_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(size=1536, distance=models.Distance.COSINE), 
    )


@app.get("/")
def index():
    return {"message": "Hello, Qdrant"}

# Function to process and upload PDF
def upload_pdf_to_qdrant(pdf_file_path: str):
    try:
        # 1. Load PDF
        loader = PyPDFLoader(pdf_file_path)
        documents = loader.load()
       
        # 2. Split into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500, chunk_overlap=50, length_function=len
        )
        texts = text_splitter.split_documents(documents)
        
        # 3. Generate embeddings
        texts_list = [t.page_content for t in texts]
        embeddings_list = embeddings.embed_documents(texts_list)

        # 4. Prepare points for Qdrant
        points = []
        for i, text in enumerate(texts):
            points.append(
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=embeddings_list[i],
                    payload={"text": text.page_content, "page": text.metadata.get('page',0) }, # You can add more metadata here if available
                )
            )

        # 5. Upload to Qdrant
        operation_info = qdrant_client.upsert(
            collection_name=COLLECTION_NAME,
            wait=True,
            points=points
        )

        return {"message": "PDF uploaded and processed successfully!", "operation_status":operation_info.status}

    except Exception as e:
        return {"error": str(e)}

#API route to upload pdf
@app.post("/upload_pdf")
async def upload_pdf(file: UploadFile):
    # print("Uploading file")
    # Save file to local storage temporarily
    # print(file.filename)
    temp_file_path = f"./{file.filename}"
    try:
        with open(temp_file_path, "wb") as temp_file:
            temp_file.write(await file.read())
    except Exception as e:
        return {"error": str(e)}
    
    result = upload_pdf_to_qdrant(temp_file_path)
    
    return result

@app.get("/search")
def search(query: str):
    try:
        query_embedding = embeddings.embed_query(query)

        search_result = qdrant_client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_embedding,
            limit=5,  # Adjust as needed
        )

        return search_result
    
    except Exception as e:
        return {"error":str(e)}


if __name__ == "__main__":
    uvicorn.run(app, host="localhost")
