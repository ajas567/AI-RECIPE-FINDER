# Use the official Python 3.11 image
FROM python:3.11

# For security, Hugging Face Spaces requires apps to run as a non-root user.
# We create a user named 'user' with ID 1000.
RUN useradd -m -u 1000 user
USER user

# Set environment variables for the user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONPATH=/home/user/app

# Set the working directory
WORKDIR $HOME/app

# Copy everything into the container container and give ownership to 'user'
COPY --chown=user . $HOME/app

# Install all Python dependencies
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Pre-download the NLTK Machine Learning models so they are baked into the server
RUN python -m nltk.downloader popular averaged_perceptron_tagger_eng

# Hugging Face Spaces always expects web servers to run on Port 7860
EXPOSE 7860

# Start the FastAPI Server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
