# First ensure these packages are installed:
# pip install optimum auto-gptq

# pip install optimum
#pip install auto-gptq

from transformers import AutoModelForCausalLM, AutoTokenizer

model_name = "TheBloke/Mistral-7B-Instruct-v0.2-GPTQ"

# Load model and tokenizer
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    device_map="auto",
    trust_remote_code=True  # Required for some GPTQ models
)

print("Mistral 7B is ready!")
