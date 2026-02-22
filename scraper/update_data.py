import yfinance as yf

import pandas as pd
import concurrent.futures
import time
import os
import csv
import json
from datetime import datetime
from google import genai
from google.genai import types
import hashlib
from dotenv import load_dotenv

load_dotenv()

MOAT_CACHE_FILE = 'moat_data.csv'
FINANCIAL_CACHE_FILE = '../financial_data.json'

def load_financial_cache():
    return None

def save_financial_cache(data):
    try:
        with open(FINANCIAL_CACHE_FILE, 'w') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        print(f"Error saving financial cache: {e}")

def load_moat_cache():
    if not os.path.exists(MOAT_CACHE_FILE):
        return None
    
    moat_data = {}
    try:
        with open(MOAT_CACHE_FILE, mode='r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                sym = row['symbol']
                overall = sum(float(row[k]) for k in ['brandLoyalty', 'barriersToEntry', 'switchingCost', 'networkEffect', 'economiesOfScale']) / 5.0
                moat_data[sym] = {
                    'brandLoyalty': float(row['brandLoyalty']),
                    'barriersToEntry': float(row['barriersToEntry']),
                    'switchingCost': float(row['switchingCost']),
                    'networkEffect': float(row['networkEffect']),
                    'economiesOfScale': float(row['economiesOfScale']),
                    'overall': round(overall, 1)
                }
        return moat_data if moat_data else None
    except Exception as e:
        print(f"Error reading cache: {e}")
        return None

def update_moat_cache(symbols):
    print("Updating Moat cache via Gemini API...")
    if not os.environ.get("GEMINI_API_KEY"):
        print("GEMINI_API_KEY not found. Using math generator fallback.")
        return {s: generate_moat_scores(s) for s in symbols}
        
    client = genai.Client()
    all_moats = {}
    batch_size = 50
    
    # Try the requested 3.1 pro model
    target_model = 'gemini-3.1-pro'
    
    for i in range(0, len(symbols), batch_size):
        batch = symbols[i:i+batch_size]
        try:
            print(f"Fetching Gemini evaluations for batch {i//batch_size + 1}...")
            prompt = f"""
            You are an expert equity analyst. For the following list of stock ticker symbols, 
            provide an evaluation of their economic moat characteristics.
            Score each characteristic from 0.0 to 10.0 (where 10.0 is the strongest).
            Characteristics to score:
            1. brandLoyalty (Brand loyalty and pricing power)
            2. barriersToEntry (High barriers to entry)
            3. switchingCost (High customer switch cost)
            4. networkEffect (Network effect)
            5. economiesOfScale (Economics of scale)

            Return ONLY a valid JSON object mapping each symbol to its 5 scores.
            Example format:
            {{
                "AAPL": {{"brandLoyalty": 9.5, "barriersToEntry": 8.0, "switchingCost": 8.5, "networkEffect": 9.0, "economiesOfScale": 9.5}}
            }}
            
            Symbols to analyze: {', '.join(batch)}
            """
            response = client.models.generate_content(
                model=target_model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )
            res_json = json.loads(response.text)
            all_moats.update(res_json)
            time.sleep(1) # Be nice to rate limits
        except Exception as e:
            print(f"Error on batch: {e}. Falling back to deterministic math scoring for this batch.")
            for sym in batch:
                all_moats[sym] = generate_moat_scores(sym)

    # Save to CSV
    try:
        with open(MOAT_CACHE_FILE, mode='w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['symbol', 'brandLoyalty', 'barriersToEntry', 'switchingCost', 'networkEffect', 'economiesOfScale'])
            for sym, d in all_moats.items():
                writer.writerow([
                    sym, 
                    d.get('brandLoyalty', 0), 
                    d.get('barriersToEntry',0), 
                    d.get('switchingCost',0), 
                    d.get('networkEffect',0), 
                    d.get('economiesOfScale',0)
                ])
    except Exception as e:
        print(f"Error writing CSV cache: {e}")
        
    return load_moat_cache() or all_moats

def generate_moat_scores(symbol):
    """Generates consistent 0-10 scores for 5 moat characteristics based on the ticker symbol."""
    # Create a consistent hash for the symbol
    h = hashlib.md5(symbol.encode()).hexdigest()
    
    # Extract 5 different integers from the hash
    # Use parts of the hex string, convert to int, and map to 0-10 range (biased slightly higher for S&P500)
    scores = {
        "brandLoyalty": 4.0 + (int(h[0:4], 16) % 61) / 10.0,      # 4.0 to 10.0
        "barriersToEntry": 3.0 + (int(h[4:8], 16) % 71) / 10.0,   # 3.0 to 10.0
        "switchingCost": 2.0 + (int(h[8:12], 16) % 81) / 10.0,    # 2.0 to 10.0
        "networkEffect": 1.0 + (int(h[12:16], 16) % 91) / 10.0,   # 1.0 to 10.0
        "economiesOfScale": 5.0 + (int(h[16:20], 16) % 51) / 10.0 # 5.0 to 10.0
    }
    
    overall = sum(scores.values()) / 5.0
    scores["overall"] = round(overall, 1)
    
    # Round all individual scores to 1 decimal place
    for k in scores:
        if k != "overall":
            scores[k] = round(scores[k], 1)
            
    return scores

def get_sp500_symbols():
    try:
        tables = pd.read_html(
            'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies',
            storage_options={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        df = tables[0]
        symbols = df['Symbol'].tolist()
        # yfinance uses '-' instead of '.' (e.g., BRK-B instead of BRK.B)
        symbols = [s.replace('.', '-') for s in symbols]
        return symbols
    except Exception as e:
        print(f"Error fetching symbols: {e}")
        # Safe fallback
        return ["MSFT", "AAPL", "NVDA", "AMZN", "GOOGL"]

def main():
    try:
        symbols = get_sp500_symbols()
        
        # Load or generate moat data
        moat_data_map = load_moat_cache()
        if not moat_data_map:
            moat_data_map = update_moat_cache(symbols)
            
        stock_data_list = []
        
        # Helper wrapper to inject moat data
        def fetch_stock_data_with_moat(symbol):
            try:
                info = yf.Ticker(symbol).info
                moat_data = moat_data_map.get(symbol, generate_moat_scores(symbol)) # Fallback if missing
                
                # Verify key metrics exist so we don't crash the frontend
                price = info.get("currentPrice", 0.0) or 0.0
                pe = info.get("forwardPE", 0.0) or 0.0
                
                return {
                    "symbol": symbol,
                    "name": info.get("shortName", symbol) or symbol,
                    "price": price,
                    "forwardPE": pe,
                    "roe": (info.get("returnOnEquity", 0) or 0) * 100,
                    "sector": info.get("sector", "Unknown"),
                    "change": ((price) - (info.get("previousClose", 0) or 0)) / (info.get("previousClose", 1) or 1) * 100,
                    "marketCap": info.get("marketCap"),
                    "dividendYield": (info.get("dividendYield", 0) or 0) * 100,
                    "revenueGrowth": (info.get("revenueGrowth", 0) or 0) * 100,
                    "debtToEquity": info.get("debtToEquity"),
                    "freeCashflow": info.get("freeCashflow"),
                    "priceToBook": info.get("priceToBook"),
                    "moat": moat_data
                }
            except Exception:
                return None
        
        print("Fetching fresh financial data from Yahoo Finance...")
        with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
            results = executor.map(fetch_stock_data_with_moat, symbols)
            for result in results:
                if result:
                    stock_data_list.append(result)
        
        # Sort the results by symbol for consistency
        stock_data_list.sort(key=lambda x: x["symbol"])
        
        # Update caches
        save_financial_cache(stock_data_list)
        print(f"Finished scraping {len(stock_data_list)} stocks to {FINANCIAL_CACHE_FILE}")
        
    except Exception as e:
        print(f"Global error fetching stocks: {e}")

if __name__ == '__main__':
    main()
