from fastapi import FastAPI, HTTPException
from transformers import AutoModelForCausalLM, AutoTokenizer
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
import gc
from functools import lru_cache

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

# Load model and tokenizer with optimizations
MODEL_NAME = "TheBloke/Mistral-7B-Instruct-v0.2-GPTQ"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    device_map="auto",
    trust_remote_code=True,
    torch_dtype=torch.float16,  
    low_cpu_mem_usage=False      
)

# Clear CUDA cache after loading
torch.cuda.empty_cache()
gc.collect()

print("Model loaded successfully!")

def create_prompt(text: str) -> str:
    return f"""<s>[INST] Please summarize the following text in a structured format with a human-like summary, main points, and a conclusion:

### 🔷 **Human-Like Summary**  
Provide a high-level overview in one paragraph.

### 🔷 **Main Points**  
- Extract key findings and concepts.  
- Highlight the most important arguments and results.  
- Keep the bullet points concise and informative.

### 🔷 **Conclusion**  
- Summarize the key takeaways and implications.  
- Mention any recommendations or final thoughts.

Text:
{text}

Ensure the summary is **clear, concise, and professional**. [/INST]</s>"""


class SummarizationRequest(BaseModel):
    text: str
    max_length: int = 350  # Longer for Mistral as it's more verbose
    min_length: int = 64

@app.post("/api/summarize")
async def summarize(request: SummarizationRequest):
    try:
        if not request.text or len(request.text.strip()) < 10:
            raise HTTPException(status_code=400, detail="Text is too short or empty")
            
        text = request.text.strip()
        print(f"\nInput text to summarize:\n{text}\n")
        
        prompt = create_prompt(text)
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_length=inputs['input_ids'].shape[1] + request.max_length,
                min_length=inputs['input_ids'].shape[1] + request.min_length,
                temperature=0.7,
                do_sample=True,
                top_p=0.85,
                top_k=50,
                num_return_sequences=1,
                pad_token_id=tokenizer.eos_token_id,
                use_cache=True,
                repetition_penalty=1.1
            )
        
        summary = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Clean up the response to extract just the summary
        # Remove the original prompt and any potential instruction markers
        summary = summary.split("[/INST]")[-1].strip()
        summary = re.sub(r'\s+', ' ', summary).strip()

        if len(summary) < 10:
            raise HTTPException(status_code=500, detail="Failed to generate a valid summary.")
            
        # Clear cache after generation
        torch.cuda.empty_cache()
        
        return {"summary": summary}
    
    except Exception as e:
        print(f"Error during summarization: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate summary. Please try again.")

@app.get("/api/pdf/{paper_id}")
async def get_pdf(paper_id: str):
    try:
        print(f"Fetching PDF for paper: {paper_id}") 
        async with httpx.AsyncClient() as client:
            headers = {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/pdf"
            }
            
            url = f"https://arxiv.org/pdf/{paper_id}.pdf"
            print(f"Requesting from arXiv: {url}")  
            
            response = await client.get(
                url,
                headers=headers,
                follow_redirects=True
            )
            
            print(f"arXiv response status: {response.status_code}")  
            
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="PDF not found")

            content_length = len(response.content)
            print(f"PDF content length: {content_length} bytes")  

            # Add more detailed headers
            return StreamingResponse(
                iter([response.content]),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"inline; filename={paper_id}.pdf",
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/pdf",
                    "Content-Length": str(content_length),
                    "Cache-Control": "no-cache"
                }
            )
    except Exception as e:
        print(f"Error fetching PDF: {str(e)}") 
        raise HTTPException(status_code=500, detail=f"Failed to fetch PDF: {str(e)}")

@app.get("/")
async def test_endpoint():
    return {"status": "ok", "message": "Server is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)