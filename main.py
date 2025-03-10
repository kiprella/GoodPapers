from fastapi import FastAPI, HTTPException
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
from pydantic import BaseModel
import torch
import httpx
import io
import os
import tempfile
import PyPDF2
import re
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for PDF.js
app.mount("/pdfjs", StaticFiles(directory="public/pdfjs"), name="pdfjs")

# Load model and tokenizer
MODEL_NAME = "facebook/bart-large-cnn"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = AutoModelForSeq2SeqLM.from_pretrained(
    MODEL_NAME,
    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
).to(device)

print(f"Using device: {device}")

class SummarizationRequest(BaseModel):
    text: str
    max_length: int = 150  # Reduced for shorter summaries
    min_length: int = 60    # Ensures it's still informative

@app.post("/api/summarize")
async def summarize(request: SummarizationRequest):
    try:
        if not request.text or len(request.text.strip()) < 10:
            raise HTTPException(status_code=400, detail="Text is too short or empty")
            
        text = request.text.strip()
        print(f"\nInput text to summarize:\n{text}\n")  # Added logging
        
        inputs = tokenizer(
            text, 
            max_length=4096,
            truncation=True,
            return_tensors="pt"
        )
        
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        with torch.no_grad():
            summary_ids = model.generate(
                inputs["input_ids"],
                max_length=request.max_length,
                min_length=request.min_length,
                num_beams=6,
                length_penalty=1.2,  # Slightly relaxed to avoid excessive rigidity
                early_stopping=True,
                no_repeat_ngram_size=3,
                do_sample=True,
                temperature=0.9,  # Lowered for better coherence
                top_k=50,
                top_p=0.8,  # Less randomness, more precise outputs
            )
        
        summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)

        # Ensure summary is clean and concise
        summary = re.sub(r"\s+", " ", summary).strip()

        if len(summary) < 10:
            raise HTTPException(status_code=500, detail="Failed to generate a valid summary.")
            
        return {"summary": summary}
    
    except Exception as e:
        print(f"Error during summarization: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate summary. Please try again.")

@app.get("/api/summarize-paper/{paper_id}")
async def summarize_paper(paper_id: str):
    try:
        async with httpx.AsyncClient() as client:
            headers = {"User-Agent": "Mozilla/5.0"}
            
            pdf_response = await client.get(
                f"https://arxiv.org/pdf/{paper_id}.pdf",
                headers=headers,
                follow_redirects=True
            )
            
            if pdf_response.status_code != 200:
                raise HTTPException(status_code=404, detail="PDF not found")

            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
                temp_file.write(pdf_response.content)
                pdf_path = temp_file.name

            try:
                full_text = ""
                with open(pdf_path, 'rb') as file:
                    reader = PyPDF2.PdfReader(file)
                    for page_num in range(min(20, len(reader.pages))):  # Extract first 10 pages max
                        page_text = reader.pages[page_num].extract_text()
                        if page_text:
                            full_text += page_text + "\n\n"
                
                full_text = re.sub(r'\s+', ' ', full_text).strip()
                print(f"\nPaper text to summarize:\n{full_text[:500]}...\n")  # Added logging (first 500 chars)
                
                if len(full_text) < 100:
                    raise ValueError("Extracted text is too short")
                
            except Exception as e:
                print(f"Error extracting text: {str(e)}")
                raise HTTPException(status_code=500, detail="Failed to extract text")
            finally:
                try:
                    os.remove(pdf_path)
                except Exception as e:
                    print(f"Error removing temp file: {str(e)}")

            # Remove the instruction-style prompt and just use the text directly
            inputs = tokenizer(full_text[:4096], return_tensors="pt", truncation=True, max_length=4096)
            inputs = {k: v.to(device) for k, v in inputs.items()}

            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_length=150,  # Control the summary length
                    min_length=60,
                    num_beams=8,
                    length_penalty=2.0,
                    early_stopping=True,
                    no_repeat_ngram_size=3,
                    do_sample=False  # Deterministic generation is usually better for BART-CNN
                )

            summary = tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Remove the instruction check since we're not using prompts
            return {"summary": summary}
    
    except Exception as e:
        print(f"Error summarizing paper: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate summary.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
