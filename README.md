# AI Ingredient-Based Recipe Finder

Welcome to the AI Ingredient-Based Recipe Finder! This is a full-stack Machine Learning web application designed to take messy, unstructured user ingredients and instantly map them to over 62,000 professional recipes via semantic vector similarities.

## 🧠 How the System Works

Unlike rigid traditional search engines, this system uses **Natural Language Processing (NLP)** and **Machine Learning** to truly understand what you are cooking. 

1. **Typo Normalization (`all-MiniLM-L6-v2`)**: When a user inputs an ingredient (e.g., `"chiken breasts"`, `"chopped up tomatoes"`), an AI NLP Transformer converts the text into a 384-dimensional geometric array. It compares this against a database of 20,000+ known master ingredients and instantly maps it to the strictly validated text (e.g., `"chicken breast"`).
2. **Semantic Recipe Matching (FAISS)**: Once it has a list of clean ingredients, it merges them to find the "theme" of the meal. Using **Facebook AI Similarity Search (FAISS)**, it executes an instantaneous K-Nearest Neighbor scan across 62,000 compiled recipe vectors to bring back recipes that perfectly capture the geometric grouping of the ingredients.

---

## 🛠️ Setup & Installation Guide

To keep the repository lightweight, the database and the massive Machine Learning Indexes are **not** fully tracked in this repository. However, a zipped bundle of the data is provided (`recipe_extended.zip`). 

If you just cloned this repo, you **must run the following setup scripts in sequential order** to build your MongoDB database and train the AI locally on your machine before the server can start!

### 1. Prerequisites
*   **Python 3.9+** installed on your system.
*   **Node.js & npm** installed (for the React Frontend).
*   **MongoDB Server** running locally on port `27017` (A blank instance is fine, the scripts below will build the tables).

### 2. Install Backend Dependencies
Open your terminal in the root directory and install the required Python libraries (including FastAPI, FAISS, and Sentence-Transformers):
```bash
pip install -r requirements.txt
```

### 3. Build & Seed MongoDB
The core recipe dataset is compressed. We first need to unpack it and extract its unique ingredients before we can seed it into the database.
1. Extract `recipe_extended.zip` strictly into a `db/` folder so that your path becomes `db/recipes_extended.json`.
2. **Extract all unique components** first to build `unique_ingredients.json`:
```bash
python scripts/extract_ingredients.py
```
3. **Seed the main `recipes` collection** and unique ingredients dictionary into MongoDB by running:
```bash
python scripts/seed_extended_db.py
```

### 4. Build the Master Ingredients & Categories
Next, we must categorize those unique ingredients into semantic groups and push them to their own MongoDB collection.
1. **Categorize the ingredients** into semantic groups (outputs `categories.json`):
```bash
python scripts/categorize_ingredients.py
```
2. **Upload the categorized master list** into your MongoDB `ingredient_categories` collection:
```bash
python scripts/upload_categories_to_mongo.py
```
3. **Generate the Mathematical Matrix** for these master ingredients in MongoDB (so the system can autocorrect typos via semantic vectors):
```bash
python scripts/generate_ingredient_vectors.py
```

### 5. Train the Machine Learning Engines
Finally, we build the fast-access NLP logic and the FAISS mapping arrays.
1. **Discover multi-word phrases** (tells the NLP not to split "cream cheese" into two strings):
```bash
python scripts/build_ingredient_dictionary.py
```
2. **Scrub and clean the dictionary** of punctuation and bad data:
```bash
python scripts/clean_dictionary.py
```
3. **Compile the FAISS Index** (Takes a few minutes). This generates the massive `recipe_faiss.index` mapping file and the `index_to_mongo_id.json` bridge so the engine can locate recipes in milliseconds instead of checking MongoDB manually.
```bash
python build_recipe_faiss.py
```

---

### 6. Start the Application!

**Start the FastAPI Backend:**
Now that your models and indexes are generated locally, you can start the Python server.
```bash
python main.py
```
*(Note: Initial startup takes several seconds as it aggressively caches the NLP Models and the 62,000+ FAISS arrays directly into your system's RAM).*

**Start the React Frontend:**
Open a second terminal window, navigate to the frontend folder, and launch Vite:
```bash
cd frontend
npm install
npm run dev
```

You're done! The web app will now be running perfectly at `http://localhost:5173`.
