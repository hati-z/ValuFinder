from flask import Flask, jsonify
from flask_cors import CORS
import yfinance as yf

app = Flask(__name__)
CORS(app)

# A strong selection of large-cap, high-quality companies to track
SYMBOLS = [
    "MSFT", "GOOGL", "AAPL", "V", "MA", 
    "JNJ", "PG", "PEP", "UNH", "HD",
    "META", "TSLA", "NVDA", "ASML", "COST",
    "LLY", "ORCL", "CSCO", "INTC", "DIS"
]

@app.route('/api/stocks')
def get_stocks():
    try:
        tickers = yf.Tickers(' '.join(SYMBOLS))
        stock_data_list = []
        
        for symbol in SYMBOLS:
            try:
                info = tickers.tickers[symbol].info
                
                # Extract requested data, providing fallbacks if Yahoo Finance is missing a field
                stock_data_list.append({
                    "symbol": symbol,
                    "name": info.get("shortName", symbol),
                    "price": info.get("currentPrice", 0.0),
                    "forwardPE": info.get("forwardPE", 0.0),
                    # We are using Return on Equity to replace the proprietary Moat rating
                    "roe": info.get("returnOnEquity", 0) * 100 if info.get("returnOnEquity") else 0.0,
                    "sector": info.get("sector", "Unknown"),
                    # Calculate daily change percentage if not directly available
                    "change": ((info.get("currentPrice", 0) - info.get("previousClose", 0)) / info.get("previousClose", 1)) * 100 if info.get("previousClose") else 0.0
                })
            except Exception as e:
                print(f"Error fetching data for {symbol}: {e}")
                
        return jsonify(stock_data_list)
        
    except Exception as e:
        print(f"Global error fetching stocks: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=3000, debug=True)
